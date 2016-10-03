import {Credential} from './credential';
import {FirebaseTokenGenerator} from './token-generator';
import {FirebaseApp, FirebaseAppOptions} from '../firebase-app';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {CertCredential, Certificate, GoogleOAuthAccessToken, UnauthenticatedCredential} from './credential';

/**
 * Gets a Credential from app options.
 *
 * @return {Credential}
 */
function getCredential(app: FirebaseApp): Credential {
  const opts: FirebaseAppOptions = app.options;
  if (opts.credential) {
    return opts.credential as Credential;
  }

  // We must be careful because '' is falsy. An opt || env test would coalesce '' || undefined as undefined.
  const certificateOrPath = typeof opts.serviceAccount === 'undefined' ?
    process.env.GOOGLE_APPLICATION_CREDENTIALS :
    opts.serviceAccount;
  if (typeof certificateOrPath === 'undefined') {
    return new UnauthenticatedCredential();
  } else if (typeof certificateOrPath === 'string') {
    return new CertCredential(Certificate.fromPath(certificateOrPath));
  } else if (typeof certificateOrPath === 'object') {
    return new CertCredential(new Certificate(certificateOrPath));
  } else {
    throw new Error('Invalid service account provided');
  }
}

/**
 * Auth service bound to the provided app.
 *
 * @param {Object} app The app for this auth service
 * @constructor
 */
class Auth implements FirebaseServiceInterface {
  private app_: FirebaseApp;
  private tokenGenerator_: FirebaseTokenGenerator;
  private authTokenManager_: AuthTokenManager;

  constructor(app: FirebaseApp) {
    if (typeof app !== 'object' || !('options' in app)) {
      throw new Error('First parameter to Auth constructor must be an instance of firebase.App');
    }
    this.app_ = app;

    const credential = getCredential(app);
    if (credential && typeof credential.getAccessToken !== 'function') {
      throw new Error('Called firebase.initializeApp() with an invalid credential parameter');
    }
    this.authTokenManager_ = new AuthTokenManager(credential);

    // TODO (inlined): plumb this into a factory method for tokenGenerator_ once we
    // can generate custom tokens from access tokens.
    let serviceAccount;
    if (typeof credential.getCertificate === 'function') {
      serviceAccount = credential.getCertificate();
    }
    if (serviceAccount) {
      this.tokenGenerator_ = new FirebaseTokenGenerator(serviceAccount);
    }
  }

  get app(): FirebaseApp {
    return this.app_;
  }

  get INTERNAL(): AuthTokenManager {
    return this.authTokenManager_;
  }

  /**
   * Creates a new custom token that can be sent back to a client to use with
   * signInWithCustomToken().
   *
   * @param {string} uid The uid to use as the JWT subject.
   * @param {Object=} developerClaims Optional additional claims to include in the JWT payload.
   *
   * @return {string} A JWT for the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: Object): string {
    if (typeof this.tokenGenerator_ === 'undefined') {
      throw new Error('Must initialize FirebaseApp with a service account to call auth().createCustomToken()');
    }
    return this.tokenGenerator_.createCustomToken(uid, developerClaims);
  };

  /**
   * Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified.
   *
   * @param {string} idToken The JWT to verify.
   * @return {Object} A Promise that will be fulfilled after a successful verification.
   */
  public verifyIdToken(idToken: string): Promise<Object> {
    if (typeof this.tokenGenerator_ === 'undefined') {
      throw new Error('Must initialize FirebaseApp with a service account to call auth().verifyIdToken()');
    }
    return this.tokenGenerator_.verifyIdToken(idToken);
  };
};

class FirebaseAccessToken {
  public accessToken: string;
  public expirationTime: number;
}

class AuthTokenManager implements FirebaseServiceInternalsInterface {
  private credential: Credential;
  private cachedToken: FirebaseAccessToken;
  private tokenListeners: Array<(token: string) => void>;

  constructor(credential: Credential) {
    this.credential = credential;
    this.tokenListeners = [];
  }

  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up
    return Promise.resolve(undefined);
  }

  /**
   * Gets an auth token for the associated app.
   *
   * @param {boolean} forceRefresh Whether or not to force a token refresh.
   * @return {Promise<Object>} A Promise that will be fulfilled with the current or new token.
   */
  public getToken(forceRefresh?: boolean): Promise<FirebaseAccessToken> {
    const expired = this.cachedToken && this.cachedToken.expirationTime < Date.now();
    if (this.cachedToken && !forceRefresh && !expired) {
      return Promise.resolve(this.cachedToken);
    } else {
      // credential may be an external class; resolving it in a promise helps us
      // protect against exceptions and upgrades the result to a promise in all cases.
      return Promise.resolve()
        .then(() => {
          return this.credential.getAccessToken();
        })
        .then((result: GoogleOAuthAccessToken) => {
          if (result === null) {
            return null;
          }
          // Since the customer can provide the credential implementation, we want to weakly verify
          // the return type until the type is properly exported.
          if (typeof result !== 'object' ||
            typeof result.expires_in !== 'number' ||
            typeof result.access_token !== 'string') {
            throw new Error('firebase.initializeApp was called with a credential ' +
              'that creates invalid access tokens: ' + JSON.stringify(result));
          }
          const token: FirebaseAccessToken = {
            accessToken: result.access_token,
            expirationTime: Date.now() + (result.expires_in * 1000),
          };

          const hasAccessTokenChanged = (this.cachedToken && this.cachedToken.accessToken !== token.accessToken);
          const hasExpirationChanged = (this.cachedToken && this.cachedToken.expirationTime !== token.expirationTime);
          if (!this.cachedToken || hasAccessTokenChanged || hasExpirationChanged) {
            this.cachedToken = token;
            this.tokenListeners.forEach((listener) => {
              listener(token.accessToken);
            });
          }

          return token;
        });
    }
  }

  /**
   * Adds a listener that is called each time a token changes.
   *
   * @param {function(string)} listener The listener that will be called with each new token.
   */
  public addAuthTokenListener(listener: (token: string) => void) {
    this.tokenListeners.push(listener);
    if (this.cachedToken) {
      listener(this.cachedToken.accessToken);
    }
  }

  /**
   * Removes a token listener.
   *
   * @param {function(string)} listener The listener to remove.
   */
  public removeAuthTokenListener(listener: (token: string) => void) {
    this.tokenListeners = this.tokenListeners.filter((other) => other !== listener);
  }
}


export {
  Auth,
  FirebaseAccessToken,
}

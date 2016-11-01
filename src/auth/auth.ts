import {Credential} from './credential';
import {FirebaseTokenGenerator} from './token-generator';
import {FirebaseApp, FirebaseAppOptions} from '../firebase-app';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {CertCredential, Certificate, GoogleOAuthAccessToken, UnauthenticatedCredential} from './credential';
import {FirebaseAuthRequestHandler} from './auth-api-request';
import {UserRecord} from './user-record';

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
 * Interface representing single user write queue.
 */
interface SingleUserWriteQueue {
  pending: number;
  queue: Promise<any>;
}

/**
 * Interface representing the write queue map for users identified by uid.
 */
interface UserWriteMap {
  [uid: string]: SingleUserWriteQueue;
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
  private authRequestHandler: FirebaseAuthRequestHandler;
  private userWriteMap: UserWriteMap;

  constructor(app: FirebaseApp) {
    if (typeof app !== 'object' || !('options' in app)) {
      throw new Error('First parameter to Auth constructor must be an instance of FirebaseApp');
    }
    this.app_ = app;

    const credential = getCredential(app);
    if (credential && typeof credential.getAccessToken !== 'function') {
      throw new Error('Called initializeApp() with an invalid credential parameter');
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
    // Initialize auth request handler with the credential.
    this.authRequestHandler = new FirebaseAuthRequestHandler(credential);
    // Initialize user record write map (uid to queue).
    // Firebase auth backend does not lock transactions running on the same user record.
    // Edits on the same user record could overwrite each other, depending on the last one
    // to execute.
    // Multiple create user requests with the same email could create multiple
    // records where one will always be used depending on the backend lookup algorithm.
    // This promise queue ensures user record writes are serialized.
    // TODO(bojeil): Remove this logic (b/32584015) which is currently blocked by b/32556583
    this.userWriteMap = {};
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
   * @return {Promise<string>} A JWT for the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: Object): Promise<string> {
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

  /**
   * Looks up the user identified by the provided user id and returns a promise that is
   * fulfilled with a user record for the given user if that user is found.
   *
   * @param {string} uid The uid of the user to look up.
   * @return {Promise<UserRecord>} A promise that resolves with the corresponding user record.
   */
  public getUser(uid: string): Promise<UserRecord> {
    return this.authRequestHandler.getAccountInfoByUid(uid)
      .then((response: any) => {
        // Returns the user record populated with server response.
        return new UserRecord(response.users[0]);
      });
  };

  /**
   * Looks up the user identified by the provided email and returns a promise that is
   * fulfilled with a user record for the given user if that user is found.
   *
   * @param {string} email The email of the user to look up.
   * @return {Promise<UserRecord>} A promise that resolves with the corresponding user record.
   */
  public getUserByEmail(email: string): Promise<UserRecord> {
    return this.authRequestHandler.getAccountInfoByEmail(email)
      .then((response: any) => {
        // Returns the user record populated with server response.
        return new UserRecord(response.users[0]);
      });
  };

  /**
   * Creates a new user with the properties provided.
   *
   * @param {Object} properties The properties to set on the new user record to be created.
   * @return {Promise<UserRecord>} A promise that resolves with the newly created user record.
   */
  public createUser(properties: Object): Promise<UserRecord> {
    return this.authRequestHandler.createNewAccount(properties)
      .then((uid) => {
        // Return the corresponding user record.
        return this.getUser(uid);
      })
      .catch((error) => {
        if (error.message && error.message === 'User not found') {
          // Something must have happened after creating the user and then retrieving it.
          throw new Error('Unable to create the user record provided.');
        }
        throw error;
      });
  };

  /**
   * Deletes the user identified by the provided user id and returns a promise that is
   * fulfilled when the user is found and successfully deleted.
   *
   * @param {string} uid The uid of the user to delete.
   * @return {Promise<void>} A promise that resolves when the user is successfully deleted.
   */
  public deleteUser(uid: string): Promise<void> {
    // Add to queue and wait for it to execute.
    return this.serializeApiRequest(uid, this.deleteUserUnserialized.bind(this, uid));
  };

  /**
   * Updates an existing user with the properties provided.
   *
   * @param {string} uid The uid identifier of the user to update.
   * @param {Object} properties The properties to update on the existing user.
   * @return {Promise<UserRecord>} A promise that resolves with the modified user record.
   */
  public updateUser(uid: string, properties: Object): Promise<UserRecord> {
    // Add to queue and wait for it to execute.
    return this.serializeApiRequest(
        uid, this.updateUserUnserialized.bind(this, uid, properties));
  };

  /**
   * Deletes the user identified by the provided user id and returns a promise that is
   * fulfilled when the user is found and successfully deleted.
   * This will run without being serialized in the user write queue.
   *
   * @param {string} uid The uid of the user to delete.
   * @return {Promise<void>} A promise that resolves when the user is successfully deleted.
   */
  private deleteUserUnserialized(uid: string): Promise<void> {
    return this.authRequestHandler.deleteAccount(uid)
      .then((response) => {
        // Return nothing on success.
      });
  };

  /**
   * Updates an existing user with the properties provided.
   * This will run without being serialized in the user write queue.
   *
   * @param {string} uid The uid identifier of the user to update.
   * @param {Object} properties The properties to update on the existing user.
   * @return {Promise<UserRecord>} A promise that resolves with the modified user record.
   */
  private updateUserUnserialized(uid: string, properties: Object): Promise<UserRecord> {
    return this.authRequestHandler.updateExistingAccount(uid, properties)
      .then((existingUid) => {
        // Return the corresponding user record.
        return this.getUser(existingUid);
      });
  };

  /**
   * @param {string} uid The uid identifier of the request.
   * @param {() => Promise<any>} boundFn Promise returning function to queue with this
   *     context and arguments already bound.
   * @return {Promise<any>} The resulting promise which resolves when all pending previous
   *     promises on the same user are resolved.
   */
  private serializeApiRequest(
      uid: string,
      boundFn: () => Promise<any>): Promise<any> {
    // Check if there is a pending queue for the current user.
    // If not initialize one.
    if (typeof this.userWriteMap[uid] === 'undefined') {
      this.userWriteMap[uid] = {
        queue: Promise.resolve(),
        pending: 0,
      };
    }
    // Increment pending counter for current user.
    this.userWriteMap[uid].pending++;
    this.userWriteMap[uid].queue = this.userWriteMap[uid].queue
      .then(() => {
        return boundFn();
      }, (error) => {
        return boundFn();
      })
      // On completion, cleanup user queue if no other pending promises found.
      .then((result) => {
        // Clean up any user specific queues that are no longer pending.
        if (--this.userWriteMap[uid].pending === 0) {
          delete this.userWriteMap[uid];
        }
        // Funnel result back.
        return result;
      }, (error) => {
        // Clean up any user specific queues that are no longer pending.
        if (--this.userWriteMap[uid].pending === 0) {
          delete this.userWriteMap[uid];
        }
        // Rethrow error.
        throw error;
      });
    return this.userWriteMap[uid].queue;
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
            throw new Error('initializeApp() was called with a credential ' +
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

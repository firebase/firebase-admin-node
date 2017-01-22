import {UserRecord} from './user-record';
import {FirebaseApp} from '../firebase-app';
import {FirebaseTokenGenerator} from './token-generator';
import {FirebaseAuthRequestHandler} from './auth-api-request';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';


/**
 * Internals of an Auth instance.
 */
export class AuthInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up
    return Promise.resolve(undefined);
  }
}


/**
 * Auth service bound to the provided app.
 */
class Auth implements FirebaseServiceInterface {
  public INTERNAL: AuthInternals = new AuthInternals();

  private app_: FirebaseApp;
  private tokenGenerator_: FirebaseTokenGenerator;
  private authRequestHandler: FirebaseAuthRequestHandler;

  /**
   * @param {Object} app The app for this Auth service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (typeof app !== 'object' || app === null || !('options' in app)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.auth() must be a valid Firebase app instance.'
      );
    }

    this.app_ = app;

    // TODO (inlined): plumb this into a factory method for tokenGenerator_ once we
    // can generate custom tokens from access tokens.
    let serviceAccount;
    if (typeof app.options.credential.getCertificate === 'function') {
      serviceAccount = app.options.credential.getCertificate();
    }
    if (serviceAccount) {
      this.tokenGenerator_ = new FirebaseTokenGenerator(serviceAccount);
    }
    // Initialize auth request handler with the app.
    this.authRequestHandler = new FirebaseAuthRequestHandler(app);
  }

  /**
   * Returns the app associated with this Auth instance.
   *
   * @return {FirebaseApp} The app associated with this Auth instance.
   */
  get app(): FirebaseApp {
    return this.app_;
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
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'Must initialize app with a cert credential to call auth().createCustomToken()');
    }
    return this.tokenGenerator_.createCustomToken(uid, developerClaims);
  };

  /**
   * Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified.
   *
   * @param {string} idToken The JWT to verify.
   * @return {Promise<Object>} A Promise that will be fulfilled after a successful verification.
   */
  public verifyIdToken(idToken: string): Promise<Object> {
    if (typeof this.tokenGenerator_ === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'Must initialize app with a cert credential to call auth().verifyIdToken()');
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
        if (error.code === 'auth/user-not-found') {
          // Something must have happened after creating the user and then retrieving it.
          throw new FirebaseAuthError(
            AuthClientErrorCode.INTERNAL_ERROR,
            'Unable to create the user record provided.');
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
    return this.authRequestHandler.deleteAccount(uid)
      .then((response) => {
        // Return nothing on success.
      });
  };

  /**
   * Updates an existing user with the properties provided.
   *
   * @param {string} uid The uid identifier of the user to update.
   * @param {Object} properties The properties to update on the existing user.
   * @return {Promise<UserRecord>} A promise that resolves with the modified user record.
   */
  public updateUser(uid: string, properties: Object): Promise<UserRecord> {
    return this.authRequestHandler.updateExistingAccount(uid, properties)
      .then((existingUid) => {
        // Return the corresponding user record.
        return this.getUser(existingUid);
      });
  };
};


export {
  Auth,
}

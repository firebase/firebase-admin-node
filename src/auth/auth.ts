/*!
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {UserRecord, CreateRequest, UpdateRequest} from './user-record';
import {FirebaseApp} from '../firebase-app';
import {FirebaseTokenGenerator} from './token-generator';
import {FirebaseAuthRequestHandler} from './auth-api-request';
import {AuthClientErrorCode, FirebaseAuthError, ErrorInfo} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {
  UserImportOptions, UserImportRecord, UserImportResult,
} from './user-import-builder';

import * as utils from '../utils/index';
import * as validator from '../utils/validator';


/**
 * Internals of an Auth instance.
 */
class AuthInternals implements FirebaseServiceInternalsInterface {
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


/** Response object for a listUsers operation. */
export interface ListUsersResult {
  users: UserRecord[];
  pageToken?: string;
}


/** Interface representing a decoded ID token. */
export interface DecodedIdToken {
  aud: string;
  auth_time: number;
  exp: number;
  firebase: {
    identities: {
      [key: string]: any;
    };
    sign_in_provider: string;
    [key: string]: any;
  };
  iat: number;
  iss: string;
  sub: string;
  [key: string]: any;
}


/** Interface representing the session cookie options. */
export interface SessionCookieOptions {
  expiresIn: number;
}


/**
 * Auth service bound to the provided app.
 */
export class Auth implements FirebaseServiceInterface {
  public INTERNAL: AuthInternals = new AuthInternals();

  private app_: FirebaseApp;
  private tokenGenerator_: FirebaseTokenGenerator;
  private authRequestHandler: FirebaseAuthRequestHandler;

  /**
   * @param {object} app The app for this Auth service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (typeof app !== 'object' || app === null || !('options' in app)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.auth() must be a valid Firebase app instance.',
      );
    }

    this.app_ = app;
    const projectId = utils.getProjectId(app);

    // TODO (inlined): plumb this into a factory method for tokenGenerator_ once we
    // can generate custom tokens from access tokens.
    let serviceAccount;
    if (typeof app.options.credential.getCertificate === 'function') {
      serviceAccount = app.options.credential.getCertificate();
    }
    if (serviceAccount) {
      // Cert credentials and Application Default Credentials created from a service account file
      // provide a certificate we can use to mint custom tokens and verify ID tokens.
      this.tokenGenerator_ = new FirebaseTokenGenerator(serviceAccount);
    } else if (validator.isNonEmptyString(projectId)) {
      // Google infrastructure like GAE, GCE, and GCF store the GCP / Firebase project ID in an
      // environment variable that we can use to get verifyIdToken() to work. createCustomToken()
      // still won't work since it requires a private key and client email which we do not have.
      const cert: any = {
        projectId,
      };
      this.tokenGenerator_ = new FirebaseTokenGenerator(cert);
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
   * @param {object=} developerClaims Optional additional claims to include in the JWT payload.
   *
   * @return {Promise<string>} A JWT for the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: object): Promise<string> {
    if (typeof this.tokenGenerator_ === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'Must initialize app with a cert credential to call auth().createCustomToken().',
      );
    }
    return this.tokenGenerator_.createCustomToken(uid, developerClaims);
  }

  /**
   * Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified. If checkRevoked is set to true,
   * verifies if the session corresponding to the ID token was revoked. If the corresponding
   * user's session was invalidated, an auth/id-token-revoked error is thrown. If not specified
   * the check is not applied.
   *
   * @param {string} idToken The JWT to verify.
   * @param {boolean=} checkRevoked Whether to check if the ID token is revoked.
   * @return {Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful
   *     verification.
   */
  public verifyIdToken(idToken: string, checkRevoked: boolean = false): Promise<object> {
    if (typeof this.tokenGenerator_ === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'Must initialize app with a cert credential or set your Firebase project ID as the ' +
        'GOOGLE_CLOUD_PROJECT environment variable to call auth().verifyIdToken().',
      );
    }
    return this.tokenGenerator_.verifyIdToken(idToken)
      .then((decodedIdToken: DecodedIdToken) => {
        // Whether to check if the token was revoked.
        if (!checkRevoked) {
          return decodedIdToken;
        }
        return this.verifyDecodedJWTNotRevoked(
          decodedIdToken,
          AuthClientErrorCode.ID_TOKEN_REVOKED);
      });
  }

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
  }

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
  }

  /**
   * Looks up the user identified by the provided phone number and returns a promise that is
   * fulfilled with a user record for the given user if that user is found.
   *
   * @param {string} phoneNumber The phone number of the user to look up.
   * @return {Promise<UserRecord>} A promise that resolves with the corresponding user record.
   */
  public getUserByPhoneNumber(phoneNumber: string): Promise<UserRecord> {
    return this.authRequestHandler.getAccountInfoByPhoneNumber(phoneNumber)
      .then((response: any) => {
        // Returns the user record populated with server response.
        return new UserRecord(response.users[0]);
      });
  }

  /**
   * Exports a batch of user accounts. Batch size is determined by the maxResults argument.
   * Starting point of the batch is determined by the pageToken argument.
   *
   * @param {number=} maxResults The page size, 1000 if undefined. This is also the maximum
   *     allowed limit.
   * @param {string=} pageToken The next page token. If not specified, returns users starting
   *     without any offset.
   * @return {Promise<{users: UserRecord[], pageToken?: string}>} A promise that resolves with
   *     the current batch of downloaded users and the next page token. For the last page, an
   *     empty list of users and no page token are returned.
   */
  public listUsers(maxResults?: number, pageToken?: string): Promise<ListUsersResult> {
    return this.authRequestHandler.downloadAccount(maxResults, pageToken)
      .then((response: any) => {
        // List of users to return.
        const users: UserRecord[] = [];
        // Convert each user response to a UserRecord.
        response.users.forEach((userResponse) => {
          users.push(new UserRecord(userResponse));
        });
        // Return list of user records and the next page token if available.
        const result = {
          users,
          pageToken: response.nextPageToken,
        };
        // Delete result.pageToken if undefined.
        if (typeof result.pageToken === 'undefined') {
          delete result.pageToken;
        }
        return result;
      });
  }

  /**
   * Creates a new user with the properties provided.
   *
   * @param {CreateRequest} properties The properties to set on the new user record to be created.
   * @return {Promise<UserRecord>} A promise that resolves with the newly created user record.
   */
  public createUser(properties: CreateRequest): Promise<UserRecord> {
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
  }

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
  }

  /**
   * Updates an existing user with the properties provided.
   *
   * @param {string} uid The uid identifier of the user to update.
   * @param {UpdateRequest} properties The properties to update on the existing user.
   * @return {Promise<UserRecord>} A promise that resolves with the modified user record.
   */
  public updateUser(uid: string, properties: UpdateRequest): Promise<UserRecord> {
    return this.authRequestHandler.updateExistingAccount(uid, properties)
      .then((existingUid) => {
        // Return the corresponding user record.
        return this.getUser(existingUid);
      });
  }

  /**
   * Sets additional developer claims on an existing user identified by the provided UID.
   *
   * @param {string} uid The user to edit.
   * @param {object} customUserClaims The developer claims to set.
   * @return {Promise<void>} A promise that resolves when the operation completes
   *     successfully.
   */
  public setCustomUserClaims(uid: string, customUserClaims: object): Promise<void> {
    return this.authRequestHandler.setCustomUserClaims(uid, customUserClaims)
      .then((existingUid) => {
        // Return nothing on success.
      });
  }

  /**
   * Revokes all refresh tokens for the specified user identified by the provided UID.
   * In addition to revoking all refresh tokens for a user, all ID tokens issued before
   * revocation will also be revoked on the Auth backend. Any request with an ID token
   * generated before revocation will be rejected with a token expired error.
   *
   * @param {string} uid The user whose tokens are to be revoked.
   * @return {Promise<void>} A promise that resolves when the operation completes
   *     successfully.
   */
  public revokeRefreshTokens(uid: string): Promise<void> {
    return this.authRequestHandler.revokeRefreshTokens(uid)
      .then((existingUid) => {
        // Return nothing on success.
      });
  }

  /**
   * Imports the list of users provided to Firebase Auth. This is useful when
   * migrating from an external authentication system without having to use the Firebase CLI SDK.
   * At most, 1000 users are allowed to be imported one at a time.
   * When importing a list of password users, UserImportOptions are required to be specified.
   *
   * @param {UserImportRecord[]} users The list of user records to import to Firebase Auth.
   * @param {UserImportOptions=} options The user import options, required when the users provided
   *     include password credentials.
   * @return {Promise<UserImportResult>} A promise that resolves when the operation completes
   *     with the result of the import. This includes the number of successful imports, the number
   *     of failed uploads and their corresponding errors.
   */
  public importUsers(
      users: UserImportRecord[], options?: UserImportOptions): Promise<UserImportResult> {
    return this.authRequestHandler.uploadAccount(users, options);
  }

  /**
   * Creates a new Firebase session cookie with the specified options that can be used for
   * session management (set as a server side session cookie with custom cookie policy).
   * The session cookie JWT will have the same payload claims as the provided ID token.
   *
   * @param {string} idToken The Firebase ID token to exchange for a session cookie.
   * @param {SessionCookieOptions} sessionCookieOptions The session cookie options which includes
   *     custom session duration.
   *
   * @return {Promise<string>} A promise that resolves on success with the created session cookie.
   */
  public createSessionCookie(
      idToken: string, sessionCookieOptions: SessionCookieOptions): Promise<string> {
    // Return rejected promise if expiresIn is not available.
    if (!validator.isNonNullObject(sessionCookieOptions) ||
        !validator.isNumber(sessionCookieOptions.expiresIn)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_SESSION_COOKIE_DURATION));
    }
    return this.authRequestHandler.createSessionCookie(
      idToken, sessionCookieOptions.expiresIn);
  }

  /**
   * Verifies a Firebase session cookie. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified. If checkRevoked is set to true,
   * verifies if the session corresponding to the session cookie was revoked. If the corresponding
   * user's session was invalidated, an auth/session-cookie-revoked error is thrown. If not
   * specified the check is not performed.
   *
   * @param {string} sessionCookie The session cookie to verify.
   * @param {boolean=} checkRevoked Whether to check if the session cookie is revoked.
   * @return {Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful
   *     verification.
   */
  public verifySessionCookie(
      sessionCookie: string, checkRevoked: boolean = false): Promise<DecodedIdToken> {
    if (typeof this.tokenGenerator_ === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'Must initialize app with a cert credential or set your Firebase project ID as the ' +
        'GOOGLE_CLOUD_PROJECT environment variable to call auth().verifySessionCookie().',
      );
    }
    return this.tokenGenerator_.verifySessionCookie(sessionCookie)
      .then((decodedIdToken: DecodedIdToken) => {
        // Whether to check if the token was revoked.
        if (!checkRevoked) {
          return decodedIdToken;
        }
        return this.verifyDecodedJWTNotRevoked(
          decodedIdToken,
          AuthClientErrorCode.SESSION_COOKIE_REVOKED);
      });
  }

  /**
   * Verifies the decoded Firebase issued JWT is not revoked. Returns a promise that resolves
   * with the decoded claims on success. Rejects the promise with revocation error if revoked.
   *
   * @param {DecodedIdToken} decodedIdToken The JWT's decoded claims.
   * @param {ErrorInfo} revocationErrorInfo The revocation error info to throw on revocation
   *     detection.
   * @return {Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful
   *     verification.
   */
  private verifyDecodedJWTNotRevoked(
      decodedIdToken: DecodedIdToken, revocationErrorInfo: ErrorInfo): Promise<DecodedIdToken> {
    // Get tokens valid after time for the corresponding user.
    return this.getUser(decodedIdToken.sub)
      .then((user: UserRecord) => {
        // If no tokens valid after time available, token is not revoked.
        if (user.tokensValidAfterTime) {
          // Get the ID token authentication time and convert to milliseconds UTC.
          const authTimeUtc = decodedIdToken.auth_time * 1000;
          // Get user tokens valid after time in milliseconds UTC.
          const validSinceUtc = new Date(user.tokensValidAfterTime).getTime();
          // Check if authentication time is older than valid since time.
          if (authTimeUtc < validSinceUtc) {
            throw new FirebaseAuthError(revocationErrorInfo);
          }
        }
        // All checks above passed. Return the decoded token.
        return decodedIdToken;
      });
  }
}

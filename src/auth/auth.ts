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
import {FirebaseTokenGenerator, CryptoSigner, cryptoSignerFromApp} from './token-generator';
import {FirebaseAuthRequestHandler} from './auth-api-request';
import {AuthClientErrorCode, FirebaseAuthError, ErrorInfo} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {
  UserImportOptions, UserImportRecord, UserImportResult,
} from './user-import-builder';

import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { FirebaseTokenVerifier, createSessionCookieVerifier, createIdTokenVerifier } from './token-verifier';
import {ActionCodeSettings} from './action-code-settings-builder';
import {
  AuthProviderConfig, AuthProviderConfigFilter, ListProviderConfigResults, UpdateAuthProviderRequest,
  SAMLConfig, OIDCConfig, OIDCConfigServerResponse, SAMLConfigServerResponse,
} from './auth-config';


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
 * Base Auth class. Mainly used for user management APIs.
 */
class BaseAuth {
  protected readonly tokenGenerator: FirebaseTokenGenerator;
  protected readonly idTokenVerifier: FirebaseTokenVerifier;
  protected readonly sessionCookieVerifier: FirebaseTokenVerifier;

  /**
   * The BaseAuth class constructor.
   *
   * @param {string} projectId The corresponding project ID.
   * @param {FirebaseAuthRequestHandler} authRequestHandler The RPC request handler
   *     for this instance.
   * @param {CryptoSigner} cryptoSigner The instance crypto signer used for custom token
   *     minting.
   * @constructor
   */
  constructor(protected readonly projectId: string,
              protected readonly authRequestHandler: FirebaseAuthRequestHandler,
              cryptoSigner: CryptoSigner) {
    this.tokenGenerator = new FirebaseTokenGenerator(cryptoSigner);
    this.sessionCookieVerifier = createSessionCookieVerifier(projectId);
    this.idTokenVerifier = createIdTokenVerifier(projectId);
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
    return this.tokenGenerator.createCustomToken(uid, developerClaims);
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
  public verifyIdToken(idToken: string, checkRevoked: boolean = false): Promise<DecodedIdToken> {
    return this.idTokenVerifier.verifyJWT(idToken)
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
        response.users.forEach((userResponse: any) => {
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
    return this.sessionCookieVerifier.verifyJWT(sessionCookie)
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
   * Generates the out of band email action link for password reset flows for the
   * email specified using the action code settings provided.
   * Returns a promise that resolves with the generated link.
   *
   * @param {string} email The email of the user whose password is to be reset.
   * @param {ActionCodeSettings=} actionCodeSettings The optional action code setings which defines whether
   *     the link is to be handled by a mobile app and the additional state information to be passed in the
   *     deep link, etc.
   * @return {Promise<string>} A promise that resolves with the password reset link.
   */
  public generatePasswordResetLink(email: string, actionCodeSettings?: ActionCodeSettings): Promise<string> {
    return this.authRequestHandler.getEmailActionLink('PASSWORD_RESET', email, actionCodeSettings);
  }

  /**
   * Generates the out of band email action link for email verification flows for the
   * email specified using the action code settings provided.
   * Returns a promise that resolves with the generated link.
   *
   * @param {string} email The email of the user to be verified.
   * @param {ActionCodeSettings=} actionCodeSettings The optional action code setings which defines whether
   *     the link is to be handled by a mobile app and the additional state information to be passed in the
   *     deep link, etc.
   * @return {Promise<string>} A promise that resolves with the email verification link.
   */
  public generateEmailVerificationLink(email: string, actionCodeSettings?: ActionCodeSettings): Promise<string> {
    return this.authRequestHandler.getEmailActionLink('VERIFY_EMAIL', email, actionCodeSettings);
  }

  /**
   * Generates the out of band email action link for email link sign-in flows for the
   * email specified using the action code settings provided.
   * Returns a promise that resolves with the generated link.
   *
   * @param {string} email The email of the user signing in.
   * @param {ActionCodeSettings} actionCodeSettings The required action code setings which defines whether
   *     the link is to be handled by a mobile app and the additional state information to be passed in the
   *     deep link, etc.
   * @return {Promise<string>} A promise that resolves with the email sign-in link.
   */
  public generateSignInWithEmailLink(email: string, actionCodeSettings: ActionCodeSettings): Promise<string> {
    return this.authRequestHandler.getEmailActionLink('EMAIL_SIGNIN', email, actionCodeSettings);
  }

  /**
   * Returns the list of existing provider configuation matching the filter provided.
   * At most, 100 provider configs are allowed to be imported at a time.
   *
   * @param {AuthProviderConfigFilter} options The provider config filter to apply.
   * @return {Promise<ListProviderConfigResults>} A promise that resolves with the list of provider configs
   *     meeting the filter requirements.
   */
  public listProviderConfigs(options: AuthProviderConfigFilter): Promise<ListProviderConfigResults> {
    const processResponse = (response: any, providerConfigs: AuthProviderConfig[]): ListProviderConfigResults => {
      // Return list of provider configuration and the next page token if available.
      const result: ListProviderConfigResults = {
        providerConfigs,
      };
      // Delete result.pageToken if undefined.
      if (response.hasOwnProperty('nextPageToken')) {
        result.pageToken = response.nextPageToken;
      }
      return result;
    };
    if (options && options.type === 'oidc') {
      return this.authRequestHandler.listOAuthIdpConfigs(options.maxResults, options.pageToken)
        .then((response: any) => {
          // List of provider configurations to return.
          const providerConfigs: OIDCConfig[] = [];
          // Convert each provider config response to a OIDCConfig.
          response.oauthIdpConfigs.forEach((configResponse: any) => {
            providerConfigs.push(new OIDCConfig(configResponse));
          });
          // Return list of provider configuration and the next page token if available.
          return processResponse(response, providerConfigs);
        });
    } else if (options && options.type === 'saml') {
      return this.authRequestHandler.listInboundSamlConfigs(options.maxResults, options.pageToken)
        .then((response: any) => {
          // List of provider configurations to return.
          const providerConfigs: SAMLConfig[] = [];
          // Convert each provider config response to a SAMLConfig.
          response.inboundSamlConfigs.forEach((configResponse: any) => {
            providerConfigs.push(new SAMLConfig(configResponse));
          });
          // Return list of provider configuration and the next page token if available.
          return processResponse(response, providerConfigs);
        });
    }
    return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `"AuthProviderConfigFilter.type" must be either "saml' or "oidc"`));
  }

  /**
   * Looks up an Auth provider configuration by ID.
   * Returns a promise that resolves with the provider configuration corresponding to the provider ID specified.
   *
   * @param {string} providerId  The provider ID corresponding to the provider config to return.
   * @return {Promise<AuthProviderConfig>}
   */
  public getProviderConfig(providerId: string): Promise<AuthProviderConfig> {
    if (OIDCConfig.isProviderId(providerId)) {
      return this.authRequestHandler.getOAuthIdpConfig(providerId)
        .then((response: OIDCConfigServerResponse) => {
          return new OIDCConfig(response);
        });
    } else if (SAMLConfig.isProviderId(providerId)) {
      return this.authRequestHandler.getInboundSamlConfig(providerId)
        .then((response: SAMLConfigServerResponse) => {
          return new SAMLConfig(response);
        });
    }
    return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
  }

  /**
   * Deletes the provider configuration corresponding to the provider ID passed.
   *
   * @param {string} providerId The provider ID corresponding to the provider config to delete.
   * @return {Promise<void>} A promise that resolves on completion.
   */
  public deleteProviderConfig(providerId: string): Promise<void> {
    if (OIDCConfig.isProviderId(providerId)) {
      return this.authRequestHandler.deleteOAuthIdpConfig(providerId);
    } else if (SAMLConfig.isProviderId(providerId)) {
      return this.authRequestHandler.deleteInboundSamlConfig(providerId);
    }
    return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
  }

  /**
   * Returns a promise that resolves with the updated AuthProviderConfig when the provider configuration corresponding
   * to the provider ID specified is updated with the specified configuration.
   *
   * @param {string} providerId The provider ID corresponding to the provider config to update.
   * @param {UpdateAuthProviderRequest} updatedConfig The updated configuration.
   * @return {Promise<AuthProviderConfig>} A promise that resolves with the updated provider configuration.
   */
  public updateProviderConfig(
      providerId: string, updatedConfig: UpdateAuthProviderRequest): Promise<AuthProviderConfig> {
    if (!validator.isNonNullObject(updatedConfig)) {
      return Promise.reject(new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        'Request is missing "UpdateAuthProviderRequest" configuration.',
      ));
    }
    if (OIDCConfig.isProviderId(providerId)) {
      return this.authRequestHandler.updateOAuthIdpConfig(providerId, updatedConfig)
        .then((response) => {
          return new OIDCConfig(response);
        });
    } else if (SAMLConfig.isProviderId(providerId)) {
      return this.authRequestHandler.updateInboundSamlConfig(providerId, updatedConfig)
        .then((response) => {
          return new SAMLConfig(response);
        });
    }
    return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
  }

  /**
   * Returns a promise that resolves with the newly created AuthProviderConfig when the new provider configuration is
   * created.
   * @param {AuthProviderConfig} config The provider configuration to create.
   * @return {Promise<AuthProviderConfig>} A promise that resolves with the created provider configuration.
   */
  public createProviderConfig(config: AuthProviderConfig): Promise<AuthProviderConfig> {
    if (!validator.isNonNullObject(config)) {
      return Promise.reject(new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        'Request is missing "AuthProviderConfig" configuration.',
      ));
    }
    if (OIDCConfig.isProviderId(config.providerId)) {
      return this.authRequestHandler.createOAuthIdpConfig(config)
        .then((response) => {
          return new OIDCConfig(response);
        });
    } else if (SAMLConfig.isProviderId(config.providerId)) {
      return this.authRequestHandler.createInboundSamlConfig(config)
        .then((response) => {
          return new SAMLConfig(response);
        });
    }
    return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
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


/**
 * Auth service bound to the provided app.
 */
export class Auth extends BaseAuth implements FirebaseServiceInterface {
  public INTERNAL: AuthInternals = new AuthInternals();
  private readonly app_: FirebaseApp;

  /**
   * Returns the FirebaseApp's project ID.
   *
   * @param {FirebaseApp} app The project ID for an app.
   * @return {string} The FirebaseApp's project ID.
   */
  private static getProjectId(app: FirebaseApp): string {
    if (typeof app !== 'object' || app === null || !('options' in app)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.auth() must be a valid Firebase app instance.',
      );
    }
    return utils.getProjectId(app);
  }

  /**
   * @param {object} app The app for this Auth service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    super(
        Auth.getProjectId(app),
        new FirebaseAuthRequestHandler(app),
        cryptoSignerFromApp(app));
    this.app_ = app;
  }

  /**
   * Returns the app associated with this Auth instance.
   *
   * @return {FirebaseApp} The app associated with this Auth instance.
   */
  get app(): FirebaseApp {
    return this.app_;
  }
}

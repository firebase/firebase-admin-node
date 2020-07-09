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
import { UserIdentifier } from './identifier';
import {
  AuthImpl,
} from './auth-internal';
import {FirebaseApp} from '../firebase-app';
import * as admin from '../';
import {
  AbstractAuthRequestHandler, AuthRequestHandler, TenantAwareAuthRequestHandler,
} from './auth-api-request';
import {FirebaseArrayIndexError} from '../utils/error';
import {FirebaseServiceInterface} from '../firebase-service';
import {
  UserImportOptions, UserImportRecord, UserImportResult,
} from './user-import-builder';

import {ActionCodeSettings} from './action-code-settings-builder';
import {
  AuthProviderConfig, AuthProviderConfigFilter, ListProviderConfigResults, UpdateAuthProviderRequest,
} from './auth-config';
import {TenantManager} from './tenant-manager';

const Auth_: {[name: string]: Auth} = {};


/** Represents the result of the {@link admin.auth.getUsers()} API. */
export interface GetUsersResult {
  /**
   * Set of user records, corresponding to the set of users that were
   * requested. Only users that were found are listed here. The result set is
   * unordered.
   */
  users: UserRecord[];

  /** Set of identifiers that were requested, but not found. */
  notFound: UserIdentifier[];
}


/** Response object for a listUsers operation. */
export interface ListUsersResult {
  users: UserRecord[];
  pageToken?: string;
}


/** Response object for deleteUsers operation. */
export interface DeleteUsersResult {
  failureCount: number;
  successCount: number;
  errors: FirebaseArrayIndexError[];
}


/** Interface representing a decoded ID token. */
export interface DecodedIdToken {
  aud: string;
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  exp: number;
  firebase: {
    identities: {
      [key: string]: any;
    };
    sign_in_provider: string;
    sign_in_second_factor?: string;
    second_factor_identifier?: string;
    [key: string]: any;
  };
  iat: number;
  iss: string;
  phone_number?: string;
  picture?: string;
  sub: string;
  tenant?: string;
  [key: string]: any;
}


/** Interface representing the session cookie options. */
export interface SessionCookieOptions {
  expiresIn: number;
}

/**
 * The tenant aware Auth class.
 */
export interface TenantAwareAuth extends BaseAuth<TenantAwareAuthRequestHandler> {
  readonly tenantId: string;
}

/**
 * Base Auth class. Mainly used for user management APIs.
 */
export interface BaseAuth<T extends AbstractAuthRequestHandler> {

  /**
   * Creates a new custom token that can be sent back to a client to use with
   * signInWithCustomToken().
   *
   * @param {string} uid The uid to use as the JWT subject.
   * @param {object=} developerClaims Optional additional claims to include in the JWT payload.
   *
   * @return {Promise<string>} A JWT for the provided payload.
   */
  createCustomToken(uid: string, developerClaims?: object): Promise<string>;

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
  verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken>;

  /**
   * Looks up the user identified by the provided user id and returns a promise that is
   * fulfilled with a user record for the given user if that user is found.
   *
   * @param {string} uid The uid of the user to look up.
   * @return {Promise<UserRecord>} A promise that resolves with the corresponding user record.
   */
  getUser(uid: string): Promise<UserRecord>;

  /**
   * Looks up the user identified by the provided email and returns a promise that is
   * fulfilled with a user record for the given user if that user is found.
   *
   * @param {string} email The email of the user to look up.
   * @return {Promise<UserRecord>} A promise that resolves with the corresponding user record.
   */
  getUserByEmail(email: string): Promise<UserRecord>;

  /**
   * Looks up the user identified by the provided phone number and returns a promise that is
   * fulfilled with a user record for the given user if that user is found.
   *
   * @param {string} phoneNumber The phone number of the user to look up.
   * @return {Promise<UserRecord>} A promise that resolves with the corresponding user record.
   */
  getUserByPhoneNumber(phoneNumber: string): Promise<UserRecord>;

  /**
   * Gets the user data corresponding to the specified identifiers.
   *
   * There are no ordering guarantees; in particular, the nth entry in the result list is not
   * guaranteed to correspond to the nth entry in the input parameters list.
   *
   * Only a maximum of 100 identifiers may be supplied. If more than 100 identifiers are supplied,
   * this method will immediately throw a FirebaseAuthError.
   *
   * @param identifiers The identifiers used to indicate which user records should be returned. Must
   *     have <= 100 entries.
   * @return {Promise<GetUsersResult>} A promise that resolves to the corresponding user records.
   * @throws FirebaseAuthError If any of the identifiers are invalid or if more than 100
   *     identifiers are specified.
   */
  getUsers(identifiers: UserIdentifier[]): Promise<GetUsersResult>;

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
  listUsers(maxResults?: number, pageToken?: string): Promise<ListUsersResult>;

  /**
   * Creates a new user with the properties provided.
   *
   * @param {CreateRequest} properties The properties to set on the new user record to be created.
   * @return {Promise<UserRecord>} A promise that resolves with the newly created user record.
   */
  createUser(properties: CreateRequest): Promise<UserRecord>;

  /**
   * Deletes the user identified by the provided user id and returns a promise that is
   * fulfilled when the user is found and successfully deleted.
   *
   * @param {string} uid The uid of the user to delete.
   * @return {Promise<void>} A promise that resolves when the user is successfully deleted.
   */
  deleteUser(uid: string): Promise<void>;

  deleteUsers(uids: string[]): Promise<DeleteUsersResult>;
  /**
   * Updates an existing user with the properties provided.
   *
   * @param {string} uid The uid identifier of the user to update.
   * @param {UpdateRequest} properties The properties to update on the existing user.
   * @return {Promise<UserRecord>} A promise that resolves with the modified user record.
   */
  updateUser(uid: string, properties: UpdateRequest): Promise<UserRecord>;

  /**
   * Sets additional developer claims on an existing user identified by the provided UID.
   *
   * @param {string} uid The user to edit.
   * @param {object} customUserClaims The developer claims to set.
   * @return {Promise<void>} A promise that resolves when the operation completes
   *     successfully.
   */
  setCustomUserClaims(uid: string, customUserClaims: object|null): Promise<void>;

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
  revokeRefreshTokens(uid: string): Promise<void>;

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
  importUsers(
    users: UserImportRecord[], options?: UserImportOptions): Promise<UserImportResult>;

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
  createSessionCookie(
    idToken: string, sessionCookieOptions: SessionCookieOptions): Promise<string>;

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
  verifySessionCookie(
    sessionCookie: string, checkRevoked: boolean): Promise<DecodedIdToken>;

  /**
   * TODO: CHECK DEFAULT IMPORT!!!
   * Verifies a Firebase session cookie. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified. If checkRevoked is set to true,
   * verifies if the session corresponding to the session cookie was revoked. If the corresponding
   * user's session was invalidated, an auth/session-cookie-revoked error is thrown. If not
   * specified the check is not performed.
   *
   * @param {string} sessionCookie The session cookie to verify.
   * @return {Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful
   *     verification.
   */
  verifySessionCookie(
    sessionCookie: string): Promise<DecodedIdToken>;

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
  generatePasswordResetLink(email: string, actionCodeSettings?: ActionCodeSettings): Promise<string>;

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
  generateEmailVerificationLink(email: string, actionCodeSettings?: ActionCodeSettings): Promise<string>;

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
  generateSignInWithEmailLink(email: string, actionCodeSettings: ActionCodeSettings): Promise<string>;

  /**
   * Returns the list of existing provider configuation matching the filter provided.
   * At most, 100 provider configs are allowed to be imported at a time.
   *
   * @param {AuthProviderConfigFilter} options The provider config filter to apply.
   * @return {Promise<ListProviderConfigResults>} A promise that resolves with the list of provider configs
   *     meeting the filter requirements.
   */
  listProviderConfigs(options: AuthProviderConfigFilter): Promise<ListProviderConfigResults>;

  /**
   * Looks up an Auth provider configuration by ID.
   * Returns a promise that resolves with the provider configuration corresponding to the provider ID specified.
   *
   * @param {string} providerId  The provider ID corresponding to the provider config to return.
   * @return {Promise<AuthProviderConfig>}
   */
  getProviderConfig(providerId: string): Promise<AuthProviderConfig>;

  /**
   * Deletes the provider configuration corresponding to the provider ID passed.
   *
   * @param {string} providerId The provider ID corresponding to the provider config to delete.
   * @return {Promise<void>} A promise that resolves on completion.
   */
  deleteProviderConfig(providerId: string): Promise<void>;

  /**
   * Returns a promise that resolves with the updated AuthProviderConfig when the provider configuration corresponding
   * to the provider ID specified is updated with the specified configuration.
   *
   * @param {string} providerId The provider ID corresponding to the provider config to update.
   * @param {UpdateAuthProviderRequest} updatedConfig The updated configuration.
   * @return {Promise<AuthProviderConfig>} A promise that resolves with the updated provider configuration.
   */
  updateProviderConfig(
    providerId: string, updatedConfig: UpdateAuthProviderRequest): Promise<AuthProviderConfig>;

  /**
   * Returns a promise that resolves with the newly created AuthProviderConfig when the new provider configuration is
   * created.
   * @param {AuthProviderConfig} config The provider configuration to create.
   * @return {Promise<AuthProviderConfig>} A promise that resolves with the created provider configuration.
   */
  createProviderConfig(config: AuthProviderConfig): Promise<AuthProviderConfig>;
}

/**
 * Auth service bound to the provided app.
 * An Auth instance can have multiple tenants.
 */
export interface Auth extends BaseAuth<AuthRequestHandler>, FirebaseServiceInterface {
  app: FirebaseApp;
  /** @return The current Auth instance's tenant manager. */
  tenantManager(): TenantManager;
}

export function auth(app?: FirebaseApp): Auth {
  if (typeof(app) === 'undefined') {
    app = admin.app();
  }
  if (!(app.name in Auth_)) {
    Auth_[app.name] = new AuthImpl(app);
  }
  return Auth_[app.name];
}

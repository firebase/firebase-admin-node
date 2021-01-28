/*!
 * @license
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

import * as validator from '../utils/validator';

import { deepCopy, deepExtend } from '../utils/deep-copy';
import {
  isUidIdentifier, isEmailIdentifier, isPhoneIdentifier, isProviderIdentifier
} from './identifier';
import { FirebaseApp } from '../firebase-app';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import {
  ApiSettings, AuthorizedHttpClient, HttpRequestConfig, HttpError,
} from '../utils/api-request';
import {
  UserImportBuilder, AuthFactorInfo, convertMultiFactorInfoToServerFormat,
} from './user-import-builder';
import * as utils from '../utils/index';
import { ActionCodeSettingsBuilder } from './action-code-settings-builder';
import {
  SAMLConfig, OIDCConfig, OIDCConfigServerResponse, SAMLConfigServerResponse,
  OIDCConfigServerRequest, SAMLConfigServerRequest,
} from './auth-config';
import { Tenant, TenantServerResponse } from './tenant';
import { auth } from './index';

import CreateRequest = auth.CreateRequest;
import UpdateRequest = auth.UpdateRequest;
import UserIdentifier = auth.UserIdentifier;
import UidIdentifier = auth.UidIdentifier;
import EmailIdentifier = auth.EmailIdentifier;
import PhoneIdentifier = auth.PhoneIdentifier;
import ProviderIdentifier = auth.ProviderIdentifier;
import UserImportOptions = auth.UserImportOptions;
import UserImportRecord = auth.UserImportRecord;
import UserImportResult = auth.UserImportResult;
import ActionCodeSettings = auth.ActionCodeSettings;
import OIDCAuthProviderConfig = auth.OIDCAuthProviderConfig;
import SAMLAuthProviderConfig = auth.SAMLAuthProviderConfig;
import OIDCUpdateAuthProviderRequest = auth.OIDCUpdateAuthProviderRequest;
import SAMLUpdateAuthProviderRequest = auth.SAMLUpdateAuthProviderRequest;
import CreateTenantRequest = auth.CreateTenantRequest;
import UpdateTenantRequest = auth.UpdateTenantRequest;

/** Firebase Auth request header. */
const FIREBASE_AUTH_HEADER = {
  'X-Client-Version': `Node/Admin/${utils.getSdkVersion()}`,
};
/** Firebase Auth request timeout duration in milliseconds. */
const FIREBASE_AUTH_TIMEOUT = 25000;


/** List of reserved claims which cannot be provided when creating a custom token. */
export const RESERVED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat',
  'iss', 'jti', 'nbf', 'nonce', 'sub', 'firebase',
];

/** List of supported email action request types. */
export const EMAIL_ACTION_REQUEST_TYPES = [
  'PASSWORD_RESET', 'VERIFY_EMAIL', 'EMAIL_SIGNIN',
];

/** Maximum allowed number of characters in the custom claims payload. */
const MAX_CLAIMS_PAYLOAD_SIZE = 1000;

/** Maximum allowed number of users to batch download at one time. */
const MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE = 1000;

/** Maximum allowed number of users to batch upload at one time. */
const MAX_UPLOAD_ACCOUNT_BATCH_SIZE = 1000;

/** Maximum allowed number of users to batch get at one time. */
const MAX_GET_ACCOUNTS_BATCH_SIZE = 100;

/** Maximum allowed number of users to batch delete at one time. */
const MAX_DELETE_ACCOUNTS_BATCH_SIZE = 1000;

/** Minimum allowed session cookie duration in seconds (5 minutes). */
const MIN_SESSION_COOKIE_DURATION_SECS = 5 * 60;

/** Maximum allowed session cookie duration in seconds (2 weeks). */
const MAX_SESSION_COOKIE_DURATION_SECS = 14 * 24 * 60 * 60;

/** Maximum allowed number of provider configurations to batch download at one time. */
const MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE = 100;

/** The Firebase Auth backend base URL format. */
const FIREBASE_AUTH_BASE_URL_FORMAT =
    'https://identitytoolkit.googleapis.com/{version}/projects/{projectId}{api}';

/** Firebase Auth base URlLformat when using the auth emultor. */
const FIREBASE_AUTH_EMULATOR_BASE_URL_FORMAT =
  'http://{host}/identitytoolkit.googleapis.com/{version}/projects/{projectId}{api}';

/** The Firebase Auth backend multi-tenancy base URL format. */
const FIREBASE_AUTH_TENANT_URL_FORMAT = FIREBASE_AUTH_BASE_URL_FORMAT.replace(
  'projects/{projectId}', 'projects/{projectId}/tenants/{tenantId}');

/** Firebase Auth base URL format when using the auth emultor with multi-tenancy. */
const FIREBASE_AUTH_EMULATOR_TENANT_URL_FORMAT = FIREBASE_AUTH_EMULATOR_BASE_URL_FORMAT.replace(
  'projects/{projectId}', 'projects/{projectId}/tenants/{tenantId}');


/** Maximum allowed number of tenants to download at one time. */
const MAX_LIST_TENANT_PAGE_SIZE = 1000;


/**
 * Enum for the user write operation type.
 */
enum WriteOperationType {
  Create = 'create',
  Update = 'update',
  Upload = 'upload',
}


/** Defines a base utility to help with resource URL construction. */
class AuthResourceUrlBuilder {

  protected urlFormat: string;
  private projectId: string;

  /**
   * The resource URL builder constructor.
   *
   * @param {string} projectId The resource project ID.
   * @param {string} version The endpoint API version.
   * @constructor
   */
  constructor(protected app: FirebaseApp, protected version: string = 'v1') {
    if (useEmulator()) {
      this.urlFormat = utils.formatString(FIREBASE_AUTH_EMULATOR_BASE_URL_FORMAT, {
        host: emulatorHost()
      });
    } else {
      this.urlFormat = FIREBASE_AUTH_BASE_URL_FORMAT;
    }
  }

  /**
   * Returns the resource URL corresponding to the provided parameters.
   *
   * @param {string=} api The backend API name.
   * @param {object=} params The optional additional parameters to substitute in the
   *     URL path.
   * @return {Promise<string>} The corresponding resource URL.
   */
  public getUrl(api?: string, params?: object): Promise<string> {
    return this.getProjectId()
      .then((projectId) => {
        const baseParams = {
          version: this.version,
          projectId,
          api: api || '',
        };
        const baseUrl = utils.formatString(this.urlFormat, baseParams);
        // Substitute additional api related parameters.
        return utils.formatString(baseUrl, params || {});
      });
  }

  private getProjectId(): Promise<string> {
    if (this.projectId) {
      return Promise.resolve(this.projectId);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_CREDENTIAL,
            'Failed to determine project ID for Auth. Initialize the '
              + 'SDK with service account credentials or set project ID as an app option. '
              + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.',
          );
        }

        this.projectId = projectId;
        return projectId;
      });
  }
}


/** Tenant aware resource builder utility. */
class TenantAwareAuthResourceUrlBuilder extends AuthResourceUrlBuilder {
  /**
   * The tenant aware resource URL builder constructor.
   *
   * @param {string} projectId The resource project ID.
   * @param {string} version The endpoint API version.
   * @param {string} tenantId The tenant ID.
   * @constructor
   */
  constructor(protected app: FirebaseApp, protected version: string, protected tenantId: string) {
    super(app, version);
    if (useEmulator()) {
      this.urlFormat = utils.formatString(FIREBASE_AUTH_EMULATOR_TENANT_URL_FORMAT, {
        host: emulatorHost()
      });
    } else {
      this.urlFormat = FIREBASE_AUTH_TENANT_URL_FORMAT;
    }
  }

  /**
   * Returns the resource URL corresponding to the provided parameters.
   *
   * @param {string=} api The backend API name.
   * @param {object=} params The optional additional parameters to substitute in the
   *     URL path.
   * @return {Promise<string>} The corresponding resource URL.
   */
  public getUrl(api?: string, params?: object): Promise<string> {
    return super.getUrl(api, params)
      .then((url) => {
        return utils.formatString(url, { tenantId: this.tenantId });
      });
  }
}

/**
 * Auth-specific HTTP client which uses the special "owner" token
 * when communicating with the Auth Emulator.
 */
class AuthHttpClient extends AuthorizedHttpClient {

  protected getToken(): Promise<string> {
    if (useEmulator()) {
      return Promise.resolve('owner');
    }

    return super.getToken();
  }

}

/**
 * Validates an AuthFactorInfo object. All unsupported parameters
 * are removed from the original request. If an invalid field is passed
 * an error is thrown.
 *
 * @param request The AuthFactorInfo request object.
 * @param writeOperationType The write operation type.
 */
function validateAuthFactorInfo(request: AuthFactorInfo, writeOperationType: WriteOperationType): void {
  const validKeys = {
    mfaEnrollmentId: true,
    displayName: true,
    phoneInfo: true,
    enrolledAt: true,
  };
  // Remove unsupported keys from the original request.
  for (const key in request) {
    if (!(key in validKeys)) {
      delete request[key];
    }
  }
  // No enrollment ID is available for signupNewUser. Use another identifier.
  const authFactorInfoIdentifier =
      request.mfaEnrollmentId || request.phoneInfo || JSON.stringify(request);
  const uidRequired = writeOperationType !== WriteOperationType.Create;
  if ((typeof request.mfaEnrollmentId !== 'undefined' || uidRequired) &&
      !validator.isNonEmptyString(request.mfaEnrollmentId)) {
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_UID,
      'The second factor "uid" must be a valid non-empty string.',
    );
  }
  if (typeof request.displayName !== 'undefined' &&
      !validator.isString(request.displayName)) {
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_DISPLAY_NAME,
      `The second factor "displayName" for "${authFactorInfoIdentifier}" must be a valid string.`,
    );
  }
  // enrolledAt must be a valid UTC date string.
  if (typeof request.enrolledAt !== 'undefined' &&
      !validator.isISODateString(request.enrolledAt)) {
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_ENROLLMENT_TIME,
      `The second factor "enrollmentTime" for "${authFactorInfoIdentifier}" must be a valid ` +
      'UTC date string.');
  }
  // Validate required fields depending on second factor type.
  if (typeof request.phoneInfo !== 'undefined') {
    // phoneNumber should be a string and a valid phone number.
    if (!validator.isPhoneNumber(request.phoneInfo)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_PHONE_NUMBER,
        `The second factor "phoneNumber" for "${authFactorInfoIdentifier}" must be a non-empty ` +
        'E.164 standard compliant identifier string.');
    }
  } else {
    // Invalid second factor. For example, a phone second factor may have been provided without
    // a phone number. A TOTP based second factor may require a secret key, etc.
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_ENROLLED_FACTORS,
      'MFAInfo object provided is invalid.');
  }
}


/**
 * Validates a providerUserInfo object. All unsupported parameters
 * are removed from the original request. If an invalid field is passed
 * an error is thrown.
 *
 * @param {any} request The providerUserInfo request object.
 */
function validateProviderUserInfo(request: any): void {
  const validKeys = {
    rawId: true,
    providerId: true,
    email: true,
    displayName: true,
    photoUrl: true,
  };
  // Remove invalid keys from original request.
  for (const key in request) {
    if (!(key in validKeys)) {
      delete request[key];
    }
  }
  if (!validator.isNonEmptyString(request.providerId)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);
  }
  if (typeof request.displayName !== 'undefined' &&
      typeof request.displayName !== 'string') {
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_DISPLAY_NAME,
      `The provider "displayName" for "${request.providerId}" must be a valid string.`,
    );
  }
  if (!validator.isNonEmptyString(request.rawId)) {
    // This is called localId on the backend but the developer specifies this as
    // uid externally. So the error message should use the client facing name.
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_UID,
      `The provider "uid" for "${request.providerId}" must be a valid non-empty string.`,
    );
  }
  // email should be a string and a valid email.
  if (typeof request.email !== 'undefined' && !validator.isEmail(request.email)) {
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_EMAIL,
      `The provider "email" for "${request.providerId}" must be a valid email string.`,
    );
  }
  // photoUrl should be a URL.
  if (typeof request.photoUrl !== 'undefined' &&
      !validator.isURL(request.photoUrl)) {
    // This is called photoUrl on the backend but the developer specifies this as
    // photoURL externally. So the error message should use the client facing name.
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_PHOTO_URL,
      `The provider "photoURL" for "${request.providerId}" must be a valid URL string.`,
    );
  }
}


/**
 * Validates a create/edit request object. All unsupported parameters
 * are removed from the original request. If an invalid field is passed
 * an error is thrown.
 *
 * @param request The create/edit request object.
 * @param writeOperationType The write operation type.
 */
function validateCreateEditRequest(request: any, writeOperationType: WriteOperationType): void {
  const uploadAccountRequest = writeOperationType === WriteOperationType.Upload;
  // Hash set of whitelisted parameters.
  const validKeys = {
    displayName: true,
    localId: true,
    email: true,
    password: true,
    rawPassword: true,
    emailVerified: true,
    photoUrl: true,
    disabled: true,
    disableUser: true,
    deleteAttribute: true,
    deleteProvider: true,
    sanityCheck: true,
    phoneNumber: true,
    customAttributes: true,
    validSince: true,
    // Pass tenantId only for uploadAccount requests.
    tenantId: uploadAccountRequest,
    passwordHash: uploadAccountRequest,
    salt: uploadAccountRequest,
    createdAt: uploadAccountRequest,
    lastLoginAt: uploadAccountRequest,
    providerUserInfo: uploadAccountRequest,
    mfaInfo: uploadAccountRequest,
    // Only for non-uploadAccount requests.
    mfa: !uploadAccountRequest,
  };
  // Remove invalid keys from original request.
  for (const key in request) {
    if (!(key in validKeys)) {
      delete request[key];
    }
  }
  if (typeof request.tenantId !== 'undefined' &&
      !validator.isNonEmptyString(request.tenantId)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_TENANT_ID);
  }
  // For any invalid parameter, use the external key name in the error description.
  // displayName should be a string.
  if (typeof request.displayName !== 'undefined' &&
      !validator.isString(request.displayName)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISPLAY_NAME);
  }
  if ((typeof request.localId !== 'undefined' || uploadAccountRequest) &&
      !validator.isUid(request.localId)) {
    // This is called localId on the backend but the developer specifies this as
    // uid externally. So the error message should use the client facing name.
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
  }
  // email should be a string and a valid email.
  if (typeof request.email !== 'undefined' && !validator.isEmail(request.email)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
  }
  // phoneNumber should be a string and a valid phone number.
  if (typeof request.phoneNumber !== 'undefined' &&
      !validator.isPhoneNumber(request.phoneNumber)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
  }
  // password should be a string and a minimum of 6 chars.
  if (typeof request.password !== 'undefined' &&
      !validator.isPassword(request.password)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD);
  }
  // rawPassword should be a string and a minimum of 6 chars.
  if (typeof request.rawPassword !== 'undefined' &&
      !validator.isPassword(request.rawPassword)) {
    // This is called rawPassword on the backend but the developer specifies this as
    // password externally. So the error message should use the client facing name.
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD);
  }
  // emailVerified should be a boolean.
  if (typeof request.emailVerified !== 'undefined' &&
      typeof request.emailVerified !== 'boolean') {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL_VERIFIED);
  }
  // photoUrl should be a URL.
  if (typeof request.photoUrl !== 'undefined' &&
      !validator.isURL(request.photoUrl)) {
    // This is called photoUrl on the backend but the developer specifies this as
    // photoURL externally. So the error message should use the client facing name.
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PHOTO_URL);
  }
  // disabled should be a boolean.
  if (typeof request.disabled !== 'undefined' &&
      typeof request.disabled !== 'boolean') {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISABLED_FIELD);
  }
  // validSince should be a number.
  if (typeof request.validSince !== 'undefined' &&
      !validator.isNumber(request.validSince)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_TOKENS_VALID_AFTER_TIME);
  }
  // createdAt should be a number.
  if (typeof request.createdAt !== 'undefined' &&
      !validator.isNumber(request.createdAt)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_CREATION_TIME);
  }
  // lastSignInAt should be a number.
  if (typeof request.lastLoginAt !== 'undefined' &&
      !validator.isNumber(request.lastLoginAt)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_LAST_SIGN_IN_TIME);
  }
  // disableUser should be a boolean.
  if (typeof request.disableUser !== 'undefined' &&
      typeof request.disableUser !== 'boolean') {
    // This is called disableUser on the backend but the developer specifies this as
    // disabled externally. So the error message should use the client facing name.
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_DISABLED_FIELD);
  }
  // customAttributes should be stringified JSON with no blacklisted claims.
  // The payload should not exceed 1KB.
  if (typeof request.customAttributes !== 'undefined') {
    let developerClaims: object;
    try {
      developerClaims = JSON.parse(request.customAttributes);
    } catch (error) {
      // JSON parsing error. This should never happen as we stringify the claims internally.
      // However, we still need to check since setAccountInfo via edit requests could pass
      // this field.
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_CLAIMS, error.message);
    }
    const invalidClaims: string[] = [];
    // Check for any invalid claims.
    RESERVED_CLAIMS.forEach((blacklistedClaim) => {
      if (Object.prototype.hasOwnProperty.call(developerClaims, blacklistedClaim)) {
        invalidClaims.push(blacklistedClaim);
      }
    });
    // Throw an error if an invalid claim is detected.
    if (invalidClaims.length > 0) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.FORBIDDEN_CLAIM,
        invalidClaims.length > 1 ?
          `Developer claims "${invalidClaims.join('", "')}" are reserved and cannot be specified.` :
          `Developer claim "${invalidClaims[0]}" is reserved and cannot be specified.`,
      );
    }
    // Check claims payload does not exceed maxmimum size.
    if (request.customAttributes.length > MAX_CLAIMS_PAYLOAD_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.CLAIMS_TOO_LARGE,
        `Developer claims payload should not exceed ${MAX_CLAIMS_PAYLOAD_SIZE} characters.`,
      );
    }
  }
  // passwordHash has to be a base64 encoded string.
  if (typeof request.passwordHash !== 'undefined' &&
      !validator.isString(request.passwordHash)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD_HASH);
  }
  // salt has to be a base64 encoded string.
  if (typeof request.salt !== 'undefined' &&
      !validator.isString(request.salt)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD_SALT);
  }
  // providerUserInfo has to be an array of valid UserInfo requests.
  if (typeof request.providerUserInfo !== 'undefined' &&
      !validator.isArray(request.providerUserInfo)) {
    throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_DATA);
  } else if (validator.isArray(request.providerUserInfo)) {
    request.providerUserInfo.forEach((providerUserInfoEntry: any) => {
      validateProviderUserInfo(providerUserInfoEntry);
    });
  }
  // mfaInfo is used for importUsers.
  // mfa.enrollments is used for setAccountInfo.
  // enrollments has to be an array of valid AuthFactorInfo requests.
  let enrollments: AuthFactorInfo[] | null = null;
  if (request.mfaInfo) {
    enrollments = request.mfaInfo;
  } else if (request.mfa && request.mfa.enrollments) {
    enrollments = request.mfa.enrollments;
  }
  if (enrollments) {
    if (!validator.isArray(enrollments)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ENROLLED_FACTORS);
    }
    enrollments.forEach((authFactorInfoEntry: AuthFactorInfo) => {
      validateAuthFactorInfo(authFactorInfoEntry, writeOperationType);
    });
  }
}


/** Instantiates the createSessionCookie endpoint settings. */
export const FIREBASE_AUTH_CREATE_SESSION_COOKIE =
    new ApiSettings(':createSessionCookie', 'POST')
    // Set request validator.
      .setRequestValidator((request: any) => {
        // Validate the ID token is a non-empty string.
        if (!validator.isNonEmptyString(request.idToken)) {
          throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ID_TOKEN);
        }
        // Validate the custom session cookie duration.
        if (!validator.isNumber(request.validDuration) ||
              request.validDuration < MIN_SESSION_COOKIE_DURATION_SECS ||
              request.validDuration > MAX_SESSION_COOKIE_DURATION_SECS) {
          throw new FirebaseAuthError(AuthClientErrorCode.INVALID_SESSION_COOKIE_DURATION);
        }
      })
    // Set response validator.
      .setResponseValidator((response: any) => {
        // Response should always contain the session cookie.
        if (!validator.isNonEmptyString(response.sessionCookie)) {
          throw new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR);
        }
      });


/** Instantiates the uploadAccount endpoint settings. */
export const FIREBASE_AUTH_UPLOAD_ACCOUNT = new ApiSettings('/accounts:batchCreate', 'POST');


/** Instantiates the downloadAccount endpoint settings. */
export const FIREBASE_AUTH_DOWNLOAD_ACCOUNT = new ApiSettings('/accounts:batchGet', 'GET')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // Validate next page token.
    if (typeof request.nextPageToken !== 'undefined' &&
        !validator.isNonEmptyString(request.nextPageToken)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PAGE_TOKEN);
    }
    // Validate max results.
    if (!validator.isNumber(request.maxResults) ||
        request.maxResults <= 0 ||
        request.maxResults > MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'Required "maxResults" must be a positive integer that does not exceed ' +
        `${MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE}.`,
      );
    }
  });

interface GetAccountInfoRequest {
  localId?: string[];
  email?: string[];
  phoneNumber?: string[];
  federatedUserId?: Array<{
    providerId: string;
    rawId: string;
  }>;
}

/** Instantiates the getAccountInfo endpoint settings. */
export const FIREBASE_AUTH_GET_ACCOUNT_INFO = new ApiSettings('/accounts:lookup', 'POST')
  // Set request validator.
  .setRequestValidator((request: GetAccountInfoRequest) => {
    if (!request.localId && !request.email && !request.phoneNumber && !request.federatedUserId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    if (!response.users || !response.users.length) {
      throw new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    }
  });

/**
 * Instantiates the getAccountInfo endpoint settings for use when fetching info
 * for multiple accounts.
 */
export const FIREBASE_AUTH_GET_ACCOUNTS_INFO = new ApiSettings('/accounts:lookup', 'POST')
  // Set request validator.
  .setRequestValidator((request: GetAccountInfoRequest) => {
    if (!request.localId && !request.email && !request.phoneNumber && !request.federatedUserId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
  });


/** Instantiates the deleteAccount endpoint settings. */
export const FIREBASE_AUTH_DELETE_ACCOUNT = new ApiSettings('/accounts:delete', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!request.localId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
  });

interface BatchDeleteAccountsRequest {
  localIds?: string[];
  force?: boolean;
}

interface BatchDeleteErrorInfo {
  index?: number;
  localId?: string;
  message?: string;
}

export interface BatchDeleteAccountsResponse {
  errors?: BatchDeleteErrorInfo[];
}

export const FIREBASE_AUTH_BATCH_DELETE_ACCOUNTS = new ApiSettings('/accounts:batchDelete', 'POST')
  .setRequestValidator((request: BatchDeleteAccountsRequest) => {
    if (!request.localIds) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifiers');
    }
    if (typeof request.force === 'undefined' || request.force !== true) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing force=true field');
    }
  })
  .setResponseValidator((response: BatchDeleteAccountsResponse) => {
    const errors = response.errors || [];
    errors.forEach((batchDeleteErrorInfo) => {
      if (typeof batchDeleteErrorInfo.index === 'undefined') {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INTERNAL_ERROR,
          'INTERNAL ASSERT FAILED: Server BatchDeleteAccountResponse is missing an errors.index field');
      }
      if (!batchDeleteErrorInfo.localId) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INTERNAL_ERROR,
          'INTERNAL ASSERT FAILED: Server BatchDeleteAccountResponse is missing an errors.localId field');
      }
      // Allow the (error) message to be missing/undef.
    });
  });

/** Instantiates the setAccountInfo endpoint settings for updating existing accounts. */
export const FIREBASE_AUTH_SET_ACCOUNT_INFO = new ApiSettings('/accounts:update', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // localId is a required parameter.
    if (typeof request.localId === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Server request is missing user identifier');
    }
    // Throw error when tenantId is passed in POST body.
    if (typeof request.tenantId !== 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"tenantId" is an invalid "UpdateRequest" property.');
    }
    validateCreateEditRequest(request, WriteOperationType.Update);
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    // If the localId is not returned, then the request failed.
    if (!response.localId) {
      throw new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    }
  });

/**
 * Instantiates the signupNewUser endpoint settings for creating a new user with or without
 * uid being specified. The backend will create a new one if not provided and return it.
 */
export const FIREBASE_AUTH_SIGN_UP_NEW_USER = new ApiSettings('/accounts', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // signupNewUser does not support customAttributes.
    if (typeof request.customAttributes !== 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"customAttributes" cannot be set when creating a new user.',
      );
    }
    // signupNewUser does not support validSince.
    if (typeof request.validSince !== 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"validSince" cannot be set when creating a new user.',
      );
    }
    // Throw error when tenantId is passed in POST body.
    if (typeof request.tenantId !== 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"tenantId" is an invalid "CreateRequest" property.');
    }
    validateCreateEditRequest(request, WriteOperationType.Create);
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    // If the localId is not returned, then the request failed.
    if (!response.localId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new user');
    }
  });

const FIREBASE_AUTH_GET_OOB_CODE = new ApiSettings('/accounts:sendOobCode', 'POST')
  // Set request validator.
  .setRequestValidator((request: any) => {
    if (!validator.isEmail(request.email)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_EMAIL,
      );
    }
    if (EMAIL_ACTION_REQUEST_TYPES.indexOf(request.requestType) === -1) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"${request.requestType}" is not a supported email action request type.`,
      );
    }
  })
  // Set response validator.
  .setResponseValidator((response: any) => {
    // If the oobLink is not returned, then the request failed.
    if (!response.oobLink) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create the email action link');
    }
  });

/** Instantiates the retrieve OIDC configuration endpoint settings. */
const GET_OAUTH_IDP_CONFIG = new ApiSettings('/oauthIdpConfigs/{providerId}', 'GET')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain the OIDC provider resource name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to get OIDC configuration',
      );
    }
  });

/** Instantiates the delete OIDC configuration endpoint settings. */
const DELETE_OAUTH_IDP_CONFIG = new ApiSettings('/oauthIdpConfigs/{providerId}', 'DELETE');

/** Instantiates the create OIDC configuration endpoint settings. */
const CREATE_OAUTH_IDP_CONFIG = new ApiSettings('/oauthIdpConfigs?oauthIdpConfigId={providerId}', 'POST')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain the OIDC provider resource name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new OIDC configuration',
      );
    }
  });

/** Instantiates the update OIDC configuration endpoint settings. */
const UPDATE_OAUTH_IDP_CONFIG = new ApiSettings('/oauthIdpConfigs/{providerId}?updateMask={updateMask}', 'PATCH')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain the configuration resource name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to update OIDC configuration',
      );
    }
  });

/** Instantiates the list OIDC configuration endpoint settings. */
const LIST_OAUTH_IDP_CONFIGS = new ApiSettings('/oauthIdpConfigs', 'GET')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // Validate next page token.
    if (typeof request.pageToken !== 'undefined' &&
        !validator.isNonEmptyString(request.pageToken)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PAGE_TOKEN);
    }
    // Validate max results.
    if (!validator.isNumber(request.pageSize) ||
        request.pageSize <= 0 ||
        request.pageSize > MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'Required "maxResults" must be a positive integer that does not exceed ' +
        `${MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE}.`,
      );
    }
  });

/** Instantiates the retrieve SAML configuration endpoint settings. */
const GET_INBOUND_SAML_CONFIG = new ApiSettings('/inboundSamlConfigs/{providerId}', 'GET')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain the SAML provider resource name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to get SAML configuration',
      );
    }
  });

/** Instantiates the delete SAML configuration endpoint settings. */
const DELETE_INBOUND_SAML_CONFIG = new ApiSettings('/inboundSamlConfigs/{providerId}', 'DELETE');

/** Instantiates the create SAML configuration endpoint settings. */
const CREATE_INBOUND_SAML_CONFIG = new ApiSettings('/inboundSamlConfigs?inboundSamlConfigId={providerId}', 'POST')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain the SAML provider resource name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new SAML configuration',
      );
    }
  });

/** Instantiates the update SAML configuration endpoint settings. */
const UPDATE_INBOUND_SAML_CONFIG = new ApiSettings('/inboundSamlConfigs/{providerId}?updateMask={updateMask}', 'PATCH')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain the configuration resource name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to update SAML configuration',
      );
    }
  });

/** Instantiates the list SAML configuration endpoint settings. */
const LIST_INBOUND_SAML_CONFIGS = new ApiSettings('/inboundSamlConfigs', 'GET')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // Validate next page token.
    if (typeof request.pageToken !== 'undefined' &&
        !validator.isNonEmptyString(request.pageToken)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PAGE_TOKEN);
    }
    // Validate max results.
    if (!validator.isNumber(request.pageSize) ||
        request.pageSize <= 0 ||
        request.pageSize > MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'Required "maxResults" must be a positive integer that does not exceed ' +
        `${MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE}.`,
      );
    }
  });

/**
 * Class that provides the mechanism to send requests to the Firebase Auth backend endpoints.
 */
export abstract class AbstractAuthRequestHandler {

  protected readonly httpClient: AuthorizedHttpClient;
  private authUrlBuilder: AuthResourceUrlBuilder;
  private projectConfigUrlBuilder: AuthResourceUrlBuilder;

  /**
   * @param {any} response The response to check for errors.
   * @return {string|null} The error code if present; null otherwise.
   */
  private static getErrorCode(response: any): string | null {
    return (validator.isNonNullObject(response) && response.error && response.error.message) || null;
  }

  private static addUidToRequest(id: UidIdentifier, request: GetAccountInfoRequest): GetAccountInfoRequest {
    if (!validator.isUid(id.uid)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
    }
    request.localId ? request.localId.push(id.uid) : request.localId = [id.uid];
    return request;
  }

  private static addEmailToRequest(id: EmailIdentifier, request: GetAccountInfoRequest): GetAccountInfoRequest {
    if (!validator.isEmail(id.email)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
    }
    request.email ? request.email.push(id.email) : request.email = [id.email];
    return request;
  }

  private static addPhoneToRequest(id: PhoneIdentifier, request: GetAccountInfoRequest): GetAccountInfoRequest {
    if (!validator.isPhoneNumber(id.phoneNumber)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
    }
    request.phoneNumber ? request.phoneNumber.push(id.phoneNumber) : request.phoneNumber = [id.phoneNumber];
    return request;
  }

  private static addProviderToRequest(id: ProviderIdentifier, request: GetAccountInfoRequest): GetAccountInfoRequest {
    if (!validator.isNonEmptyString(id.providerId)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);
    }
    if (!validator.isNonEmptyString(id.providerUid)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_UID);
    }
    const federatedUserId = {
      providerId: id.providerId,
      rawId: id.providerUid,
    };
    request.federatedUserId
      ? request.federatedUserId.push(federatedUserId)
      : request.federatedUserId = [federatedUserId];
    return request;
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(protected readonly app: FirebaseApp) {
    if (typeof app !== 'object' || app === null || !('options' in app)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.auth() must be a valid Firebase app instance.',
      );
    }

    this.httpClient = new AuthHttpClient(app);
  }

  /**
   * Creates a new Firebase session cookie with the specified duration that can be used for
   * session management (set as a server side session cookie with custom cookie policy).
   * The session cookie JWT will have the same payload claims as the provided ID token.
   *
   * @param {string} idToken The Firebase ID token to exchange for a session cookie.
   * @param {number} expiresIn The session cookie duration in milliseconds.
   *
   * @return {Promise<string>} A promise that resolves on success with the created session cookie.
   */
  public createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
    const request = {
      idToken,
      // Convert to seconds.
      validDuration: expiresIn / 1000,
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_CREATE_SESSION_COOKIE, request)
      .then((response: any) => response.sessionCookie);
  }

  /**
   * Looks up a user by uid.
   *
   * @param {string} uid The uid of the user to lookup.
   * @return {Promise<object>} A promise that resolves with the user information.
   */
  public getAccountInfoByUid(uid: string): Promise<object> {
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    }

    const request = {
      localId: [uid],
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Looks up a user by email.
   *
   * @param {string} email The email of the user to lookup.
   * @return {Promise<object>} A promise that resolves with the user information.
   */
  public getAccountInfoByEmail(email: string): Promise<object> {
    if (!validator.isEmail(email)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL));
    }

    const request = {
      email: [email],
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Looks up a user by phone number.
   *
   * @param {string} phoneNumber The phone number of the user to lookup.
   * @return {Promise<object>} A promise that resolves with the user information.
   */
  public getAccountInfoByPhoneNumber(phoneNumber: string): Promise<object> {
    if (!validator.isPhoneNumber(phoneNumber)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER));
    }

    const request = {
      phoneNumber: [phoneNumber],
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_GET_ACCOUNT_INFO, request);
  }

  /**
   * Looks up multiple users by their identifiers (uid, email, etc).
   *
   * @param {UserIdentifier[]} identifiers The identifiers indicating the users
   *     to be looked up. Must have <= 100 entries.
   * @param {Promise<object>} A promise that resolves with the set of successfully
   *     looked up users. Possibly empty if no users were looked up.
   */
  public getAccountInfoByIdentifiers(identifiers: UserIdentifier[]): Promise<object> {
    if (identifiers.length === 0) {
      return Promise.resolve({ users: [] });
    } else if (identifiers.length > MAX_GET_ACCOUNTS_BATCH_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.MAXIMUM_USER_COUNT_EXCEEDED,
        '`identifiers` parameter must have <= ' + MAX_GET_ACCOUNTS_BATCH_SIZE + ' entries.');
    }

    let request: GetAccountInfoRequest = {};

    for (const id of identifiers) {
      if (isUidIdentifier(id)) {
        request = AbstractAuthRequestHandler.addUidToRequest(id, request);
      } else if (isEmailIdentifier(id)) {
        request = AbstractAuthRequestHandler.addEmailToRequest(id, request);
      } else if (isPhoneIdentifier(id)) {
        request = AbstractAuthRequestHandler.addPhoneToRequest(id, request);
      } else if (isProviderIdentifier(id)) {
        request = AbstractAuthRequestHandler.addProviderToRequest(id, request);
      } else {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'Unrecognized identifier: ' + id);
      }
    }

    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_GET_ACCOUNTS_INFO, request);
  }

  /**
   * Exports the users (single batch only) with a size of maxResults and starting from
   * the offset as specified by pageToken.
   *
   * @param {number=} maxResults The page size, 1000 if undefined. This is also the maximum
   *     allowed limit.
   * @param {string=} pageToken The next page token. If not specified, returns users starting
   *     without any offset. Users are returned in the order they were created from oldest to
   *     newest, relative to the page token offset.
   * @return {Promise<object>} A promise that resolves with the current batch of downloaded
   *     users and the next page token if available. For the last page, an empty list of users
   *     and no page token are returned.
   */
  public downloadAccount(
    maxResults: number = MAX_DOWNLOAD_ACCOUNT_PAGE_SIZE,
    pageToken?: string): Promise<{users: object[]; nextPageToken?: string}> {
    // Construct request.
    const request = {
      maxResults,
      nextPageToken: pageToken,
    };
    // Remove next page token if not provided.
    if (typeof request.nextPageToken === 'undefined') {
      delete request.nextPageToken;
    }
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_DOWNLOAD_ACCOUNT, request)
      .then((response: any) => {
        // No more users available.
        if (!response.users) {
          response.users = [];
        }
        return response as {users: object[]; nextPageToken?: string};
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
  public uploadAccount(
    users: UserImportRecord[], options?: UserImportOptions): Promise<UserImportResult> {
    // This will throw if any error is detected in the hash options.
    // For errors in the list of users, this will not throw and will report the errors and the
    // corresponding user index in the user import generated response below.
    // No need to validate raw request or raw response as this is done in UserImportBuilder.
    const userImportBuilder = new UserImportBuilder(users, options, (userRequest: any) => {
      // Pass true to validate the uploadAccount specific fields.
      validateCreateEditRequest(userRequest, WriteOperationType.Upload);
    });
    const request = userImportBuilder.buildRequest();
    // Fail quickly if more users than allowed are to be imported.
    if (validator.isArray(users) && users.length > MAX_UPLOAD_ACCOUNT_BATCH_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.MAXIMUM_USER_COUNT_EXCEEDED,
        `A maximum of ${MAX_UPLOAD_ACCOUNT_BATCH_SIZE} users can be imported at once.`,
      );
    }
    // If no remaining user in request after client side processing, there is no need
    // to send the request to the server.
    if (!request.users || request.users.length === 0) {
      return Promise.resolve(userImportBuilder.buildResponse([]));
    }
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_UPLOAD_ACCOUNT, request)
      .then((response: any) => {
        // No error object is returned if no error encountered.
        const failedUploads = (response.error || []) as Array<{index: number; message: string}>;
        // Rewrite response as UserImportResult and re-insert client previously detected errors.
        return userImportBuilder.buildResponse(failedUploads);
      });
  }

  /**
   * Deletes an account identified by a uid.
   *
   * @param {string} uid The uid of the user to delete.
   * @return {Promise<object>} A promise that resolves when the user is deleted.
   */
  public deleteAccount(uid: string): Promise<object> {
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    }

    const request = {
      localId: uid,
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_DELETE_ACCOUNT, request);
  }

  public deleteAccounts(uids: string[], force: boolean): Promise<BatchDeleteAccountsResponse> {
    if (uids.length === 0) {
      return Promise.resolve({});
    } else if (uids.length > MAX_DELETE_ACCOUNTS_BATCH_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.MAXIMUM_USER_COUNT_EXCEEDED,
        '`uids` parameter must have <= ' + MAX_DELETE_ACCOUNTS_BATCH_SIZE + ' entries.');
    }

    const request: BatchDeleteAccountsRequest = {
      localIds: [],
      force,
    };

    uids.forEach((uid) => {
      if (!validator.isUid(uid)) {
        throw new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
      }
      request.localIds!.push(uid);
    });

    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_BATCH_DELETE_ACCOUNTS, request);
  }

  /**
   * Sets additional developer claims on an existing user identified by provided UID.
   *
   * @param {string} uid The user to edit.
   * @param {object} customUserClaims The developer claims to set.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was edited.
   */
  public setCustomUserClaims(uid: string, customUserClaims: object | null): Promise<string> {
    // Validate user UID.
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    } else if (!validator.isObject(customUserClaims)) {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'CustomUserClaims argument must be an object or null.',
        ),
      );
    }
    // Delete operation. Replace null with an empty object.
    if (customUserClaims === null) {
      customUserClaims = {};
    }
    // Construct custom user attribute editting request.
    const request: any = {
      localId: uid,
      customAttributes: JSON.stringify(customUserClaims),
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_SET_ACCOUNT_INFO, request)
      .then((response: any) => {
        return response.localId as string;
      });
  }

  /**
   * Edits an existing user.
   *
   * @param {string} uid The user to edit.
   * @param {object} properties The properties to set on the user.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was edited.
   */
  public updateExistingAccount(uid: string, properties: UpdateRequest): Promise<string> {
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    } else if (!validator.isNonNullObject(properties)) {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'Properties argument must be a non-null object.',
        ),
      );
    }

    // Build the setAccountInfo request.
    const request: any = deepCopy(properties);
    request.localId = uid;
    // For deleting displayName or photoURL, these values must be passed as null.
    // They will be removed from the backend request and an additional parameter
    // deleteAttribute: ['PHOTO_URL', 'DISPLAY_NAME']
    // with an array of the parameter names to delete will be passed.

    // Parameters that are deletable and their deleteAttribute names.
    // Use client facing names, photoURL instead of photoUrl.
    const deletableParams: {[key: string]: string} = {
      displayName: 'DISPLAY_NAME',
      photoURL: 'PHOTO_URL',
    };
    // Properties to delete if available.
    request.deleteAttribute = [];
    for (const key in deletableParams) {
      if (request[key] === null) {
        // Add property identifier to list of attributes to delete.
        request.deleteAttribute.push(deletableParams[key]);
        // Remove property from request.
        delete request[key];
      }
    }
    if (request.deleteAttribute.length === 0) {
      delete request.deleteAttribute;
    }

    // For deleting phoneNumber, this value must be passed as null.
    // It will be removed from the backend request and an additional parameter
    // deleteProvider: ['phone'] with an array of providerIds (phone in this case),
    // will be passed.
    // Currently this applies to phone provider only.
    if (request.phoneNumber === null) {
      request.deleteProvider = ['phone'];
      delete request.phoneNumber;
    } else {
      // Doesn't apply to other providers in admin SDK.
      delete request.deleteProvider;
    }

    // Rewrite photoURL to photoUrl.
    if (typeof request.photoURL !== 'undefined') {
      request.photoUrl = request.photoURL;
      delete request.photoURL;
    }
    // Rewrite disabled to disableUser.
    if (typeof request.disabled !== 'undefined') {
      request.disableUser = request.disabled;
      delete request.disabled;
    }
    // Construct mfa related user data.
    if (validator.isNonNullObject(request.multiFactor)) {
      if (request.multiFactor.enrolledFactors === null) {
        // Remove all second factors.
        request.mfa = {};
      } else if (validator.isArray(request.multiFactor.enrolledFactors)) {
        request.mfa = {
          enrollments: [],
        };
        try {
          request.multiFactor.enrolledFactors.forEach((multiFactorInfo: any) => {
            request.mfa.enrollments.push(convertMultiFactorInfoToServerFormat(multiFactorInfo));
          });
        } catch (e) {
          return Promise.reject(e);
        }
        if (request.mfa.enrollments.length === 0) {
          delete request.mfa.enrollments;
        }
      }
      delete request.multiFactor;
    }
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_SET_ACCOUNT_INFO, request)
      .then((response: any) => {
        return response.localId as string;
      });
  }

  /**
   * Revokes all refresh tokens for the specified user identified by the uid provided.
   * In addition to revoking all refresh tokens for a user, all ID tokens issued
   * before revocation will also be revoked on the Auth backend. Any request with an
   * ID token generated before revocation will be rejected with a token expired error.
   * Note that due to the fact that the timestamp is stored in seconds, any tokens minted in
   * the same second as the revocation will still be valid. If there is a chance that a token
   * was minted in the last second, delay for 1 second before revoking.
   *
   * @param {string} uid The user whose tokens are to be revoked.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     successfully with the user id of the corresponding user.
   */
  public revokeRefreshTokens(uid: string): Promise<string> {
    // Validate user UID.
    if (!validator.isUid(uid)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_UID));
    }
    const request: any = {
      localId: uid,
      // validSince is in UTC seconds.
      validSince: Math.floor(new Date().getTime() / 1000),
    };
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_SET_ACCOUNT_INFO, request)
      .then((response: any) => {
        return response.localId as string;
      });
  }

  /**
   * Create a new user with the properties supplied.
   *
   * @param {object} properties The properties to set on the user.
   * @return {Promise<string>} A promise that resolves when the operation completes
   *     with the user id that was created.
   */
  public createNewAccount(properties: CreateRequest): Promise<string> {
    if (!validator.isNonNullObject(properties)) {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          'Properties argument must be a non-null object.',
        ),
      );
    }

    // Build the signupNewUser request.
    const request: any = deepCopy(properties);
    // Rewrite photoURL to photoUrl.
    if (typeof request.photoURL !== 'undefined') {
      request.photoUrl = request.photoURL;
      delete request.photoURL;
    }
    // Rewrite uid to localId if it exists.
    if (typeof request.uid !== 'undefined') {
      request.localId = request.uid;
      delete request.uid;
    }
    // Construct mfa related user data.
    if (validator.isNonNullObject(request.multiFactor)) {
      if (validator.isNonEmptyArray(request.multiFactor.enrolledFactors)) {
        const mfaInfo: AuthFactorInfo[] = [];
        try {
          request.multiFactor.enrolledFactors.forEach((multiFactorInfo: any) => {
            // Enrollment time and uid are not allowed for signupNewUser endpoint.
            // They will automatically be provisioned server side.
            if (multiFactorInfo.enrollmentTime) {
              throw new FirebaseAuthError(
                AuthClientErrorCode.INVALID_ARGUMENT,
                '"enrollmentTime" is not supported when adding second factors via "createUser()"');
            } else if (multiFactorInfo.uid) {
              throw new FirebaseAuthError(
                AuthClientErrorCode.INVALID_ARGUMENT,
                '"uid" is not supported when adding second factors via "createUser()"');
            }
            mfaInfo.push(convertMultiFactorInfoToServerFormat(multiFactorInfo));
          });
        } catch (e) {
          return Promise.reject(e);
        }
        request.mfaInfo = mfaInfo;
      }
      delete request.multiFactor;
    }
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_SIGN_UP_NEW_USER, request)
      .then((response: any) => {
        // Return the user id.
        return response.localId as string;
      });
  }

  /**
   * Generates the out of band email action link for the email specified using the action code settings provided.
   * Returns a promise that resolves with the generated link.
   *
   * @param {string} requestType The request type. This could be either used for password reset,
   *     email verification, email link sign-in.
   * @param {string} email The email of the user the link is being sent to.
   * @param {ActionCodeSettings=} actionCodeSettings The optional action code setings which defines whether
   *     the link is to be handled by a mobile app and the additional state information to be passed in the
   *     deep link, etc. Required when requestType == 'EMAIL_SIGNIN'
   * @return {Promise<string>} A promise that resolves with the email action link.
   */
  public getEmailActionLink(
    requestType: string, email: string,
    actionCodeSettings?: ActionCodeSettings): Promise<string> {
    let request = { requestType, email, returnOobLink: true };
    // ActionCodeSettings required for email link sign-in to determine the url where the sign-in will
    // be completed.
    if (typeof actionCodeSettings === 'undefined' && requestType === 'EMAIL_SIGNIN') {
      return Promise.reject(
        new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          "`actionCodeSettings` is required when `requestType` === 'EMAIL_SIGNIN'",
        ),
      );
    }
    if (typeof actionCodeSettings !== 'undefined' || requestType === 'EMAIL_SIGNIN') {
      try {
        const builder = new ActionCodeSettingsBuilder(actionCodeSettings!);
        request = deepExtend(request, builder.buildRequest());
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return this.invokeRequestHandler(this.getAuthUrlBuilder(), FIREBASE_AUTH_GET_OOB_CODE, request)
      .then((response: any) => {
        // Return the link.
        return response.oobLink as string;
      });
  }

  /**
   * Looks up an OIDC provider configuration by provider ID.
   *
   * @param {string} providerId The provider identifier of the configuration to lookup.
   * @return {Promise<OIDCConfigServerResponse>} A promise that resolves with the provider configuration information.
   */
  public getOAuthIdpConfig(providerId: string): Promise<OIDCConfigServerResponse> {
    if (!OIDCConfig.isProviderId(providerId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
    }
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), GET_OAUTH_IDP_CONFIG, {}, { providerId });
  }

  /**
   * Lists the OIDC configurations (single batch only) with a size of maxResults and starting from
   * the offset as specified by pageToken.
   *
   * @param {number=} maxResults The page size, 100 if undefined. This is also the maximum
   *     allowed limit.
   * @param {string=} pageToken The next page token. If not specified, returns OIDC configurations
   *     without any offset. Configurations are returned in the order they were created from oldest to
   *     newest, relative to the page token offset.
   * @return {Promise<object>} A promise that resolves with the current batch of downloaded
   *     OIDC configurations and the next page token if available. For the last page, an empty list of provider
   *     configuration and no page token are returned.
   */
  public listOAuthIdpConfigs(
    maxResults: number = MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE,
    pageToken?: string): Promise<object> {
    const request: {pageSize: number; pageToken?: string} = {
      pageSize: maxResults,
    };
    // Add next page token if provided.
    if (typeof pageToken !== 'undefined') {
      request.pageToken = pageToken;
    }
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), LIST_OAUTH_IDP_CONFIGS, request)
      .then((response: any) => {
        if (!response.oauthIdpConfigs) {
          response.oauthIdpConfigs = [];
          delete response.nextPageToken;
        }
        return response as {oauthIdpConfigs: object[]; nextPageToken?: string};
      });
  }

  /**
   * Deletes an OIDC configuration identified by a providerId.
   *
   * @param {string} providerId The identifier of the OIDC configuration to delete.
   * @return {Promise<void>} A promise that resolves when the OIDC provider is deleted.
   */
  public deleteOAuthIdpConfig(providerId: string): Promise<void> {
    if (!OIDCConfig.isProviderId(providerId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
    }
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), DELETE_OAUTH_IDP_CONFIG, {}, { providerId })
      .then(() => {
        // Return nothing.
      });
  }

  /**
   * Creates a new OIDC provider configuration with the properties provided.
   *
   * @param {AuthProviderConfig} options The properties to set on the new OIDC provider configuration to be created.
   * @return {Promise<OIDCConfigServerResponse>} A promise that resolves with the newly created OIDC
   *     configuration.
   */
  public createOAuthIdpConfig(options: OIDCAuthProviderConfig): Promise<OIDCConfigServerResponse> {
    // Construct backend request.
    let request;
    try {
      request = OIDCConfig.buildServerRequest(options) || {};
    } catch (e) {
      return Promise.reject(e);
    }
    const providerId = options.providerId;
    return this.invokeRequestHandler(
      this.getProjectConfigUrlBuilder(), CREATE_OAUTH_IDP_CONFIG, request, { providerId })
      .then((response: any) => {
        if (!OIDCConfig.getProviderIdFromResourceName(response.name)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INTERNAL_ERROR,
            'INTERNAL ASSERT FAILED: Unable to create new OIDC provider configuration');
        }
        return response as OIDCConfigServerResponse;
      });
  }

  /**
   * Updates an existing OIDC provider configuration with the properties provided.
   *
   * @param {string} providerId The provider identifier of the OIDC configuration to update.
   * @param {OIDCUpdateAuthProviderRequest} options The properties to update on the existing configuration.
   * @return {Promise<OIDCConfigServerResponse>} A promise that resolves with the modified provider
   *     configuration.
   */
  public updateOAuthIdpConfig(
    providerId: string, options: OIDCUpdateAuthProviderRequest): Promise<OIDCConfigServerResponse> {
    if (!OIDCConfig.isProviderId(providerId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
    }
    // Construct backend request.
    let request: OIDCConfigServerRequest;
    try {
      request = OIDCConfig.buildServerRequest(options, true) || {};
    } catch (e) {
      return Promise.reject(e);
    }
    const updateMask = utils.generateUpdateMask(request);
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), UPDATE_OAUTH_IDP_CONFIG, request,
      { providerId, updateMask: updateMask.join(',') })
      .then((response: any) => {
        if (!OIDCConfig.getProviderIdFromResourceName(response.name)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INTERNAL_ERROR,
            'INTERNAL ASSERT FAILED: Unable to update OIDC provider configuration');
        }
        return response as OIDCConfigServerResponse;
      });
  }

  /**
   * Looks up an SAML provider configuration by provider ID.
   *
   * @param {string} providerId The provider identifier of the configuration to lookup.
   * @return {Promise<SAMLConfigServerResponse>} A promise that resolves with the provider configuration information.
   */
  public getInboundSamlConfig(providerId: string): Promise<SAMLConfigServerResponse> {
    if (!SAMLConfig.isProviderId(providerId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
    }
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), GET_INBOUND_SAML_CONFIG, {}, { providerId });
  }

  /**
   * Lists the SAML configurations (single batch only) with a size of maxResults and starting from
   * the offset as specified by pageToken.
   *
   * @param {number=} maxResults The page size, 100 if undefined. This is also the maximum
   *     allowed limit.
   * @param {string=} pageToken The next page token. If not specified, returns SAML configurations starting
   *     without any offset. Configurations are returned in the order they were created from oldest to
   *     newest, relative to the page token offset.
   * @return {Promise<object>} A promise that resolves with the current batch of downloaded
   *     SAML configurations and the next page token if available. For the last page, an empty list of provider
   *     configuration and no page token are returned.
   */
  public listInboundSamlConfigs(
    maxResults: number = MAX_LIST_PROVIDER_CONFIGURATION_PAGE_SIZE,
    pageToken?: string): Promise<object> {
    const request: {pageSize: number; pageToken?: string} = {
      pageSize: maxResults,
    };
    // Add next page token if provided.
    if (typeof pageToken !== 'undefined') {
      request.pageToken = pageToken;
    }
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), LIST_INBOUND_SAML_CONFIGS, request)
      .then((response: any) => {
        if (!response.inboundSamlConfigs) {
          response.inboundSamlConfigs = [];
          delete response.nextPageToken;
        }
        return response as {inboundSamlConfigs: object[]; nextPageToken?: string};
      });
  }

  /**
   * Deletes a SAML configuration identified by a providerId.
   *
   * @param {string} providerId The identifier of the SAML configuration to delete.
   * @return {Promise<void>} A promise that resolves when the SAML provider is deleted.
   */
  public deleteInboundSamlConfig(providerId: string): Promise<void> {
    if (!SAMLConfig.isProviderId(providerId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
    }
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), DELETE_INBOUND_SAML_CONFIG, {}, { providerId })
      .then(() => {
        // Return nothing.
      });
  }

  /**
   * Creates a new SAML provider configuration with the properties provided.
   *
   * @param {AuthProviderConfig} options The properties to set on the new SAML provider configuration to be created.
   * @return {Promise<SAMLConfigServerResponse>} A promise that resolves with the newly created SAML
   *     configuration.
   */
  public createInboundSamlConfig(options: SAMLAuthProviderConfig): Promise<SAMLConfigServerResponse> {
    // Construct backend request.
    let request;
    try {
      request = SAMLConfig.buildServerRequest(options) || {};
    } catch (e) {
      return Promise.reject(e);
    }
    const providerId = options.providerId;
    return this.invokeRequestHandler(
      this.getProjectConfigUrlBuilder(), CREATE_INBOUND_SAML_CONFIG, request, { providerId })
      .then((response: any) => {
        if (!SAMLConfig.getProviderIdFromResourceName(response.name)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INTERNAL_ERROR,
            'INTERNAL ASSERT FAILED: Unable to create new SAML provider configuration');
        }
        return response as SAMLConfigServerResponse;
      });
  }

  /**
   * Updates an existing SAML provider configuration with the properties provided.
   *
   * @param {string} providerId The provider identifier of the SAML configuration to update.
   * @param {SAMLUpdateAuthProviderRequest} options The properties to update on the existing configuration.
   * @return {Promise<SAMLConfigServerResponse>} A promise that resolves with the modified provider
   *     configuration.
   */
  public updateInboundSamlConfig(
    providerId: string, options: SAMLUpdateAuthProviderRequest): Promise<SAMLConfigServerResponse> {
    if (!SAMLConfig.isProviderId(providerId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID));
    }
    // Construct backend request.
    let request: SAMLConfigServerRequest;
    try {
      request = SAMLConfig.buildServerRequest(options, true) || {};
    } catch (e) {
      return Promise.reject(e);
    }
    const updateMask = utils.generateUpdateMask(request);
    return this.invokeRequestHandler(this.getProjectConfigUrlBuilder(), UPDATE_INBOUND_SAML_CONFIG, request,
      { providerId, updateMask: updateMask.join(',') })
      .then((response: any) => {
        if (!SAMLConfig.getProviderIdFromResourceName(response.name)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INTERNAL_ERROR,
            'INTERNAL ASSERT FAILED: Unable to update SAML provider configuration');
        }
        return response as SAMLConfigServerResponse;
      });
  }

  /**
   * Invokes the request handler based on the API settings object passed.
   *
   * @param {AuthResourceUrlBuilder} urlBuilder The URL builder for Auth endpoints.
   * @param {ApiSettings} apiSettings The API endpoint settings to apply to request and response.
   * @param {object} requestData The request data.
   * @param {object=} additionalResourceParams Additional resource related params if needed.
   * @return {Promise<object>} A promise that resolves with the response.
   */
  protected invokeRequestHandler(
    urlBuilder: AuthResourceUrlBuilder, apiSettings: ApiSettings,
    requestData: object, additionalResourceParams?: object): Promise<object> {
    return urlBuilder.getUrl(apiSettings.getEndpoint(), additionalResourceParams)
      .then((url) => {
        // Validate request.
        const requestValidator = apiSettings.getRequestValidator();
        requestValidator(requestData);
        // Process request.
        const req: HttpRequestConfig = {
          method: apiSettings.getHttpMethod(),
          url,
          headers: FIREBASE_AUTH_HEADER,
          data: requestData,
          timeout: FIREBASE_AUTH_TIMEOUT,
        };
        return this.httpClient.send(req);
      })
      .then((response) => {
        // Validate response.
        const responseValidator = apiSettings.getResponseValidator();
        responseValidator(response.data);
        // Return entire response.
        return response.data;
      })
      .catch((err) => {
        if (err instanceof HttpError) {
          const error = err.response.data;
          const errorCode = AbstractAuthRequestHandler.getErrorCode(error);
          if (!errorCode) {
            throw new FirebaseAuthError(
              AuthClientErrorCode.INTERNAL_ERROR,
              'Error returned from server: ' + error + '. Additionally, an ' +
              'internal error occurred while attempting to extract the ' +
              'errorcode from the error.',
            );
          }
          throw FirebaseAuthError.fromServerError(errorCode, /* message */ undefined, error);
        }
        throw err;
      });
  }

  /**
   * @return {AuthResourceUrlBuilder} A new Auth user management resource URL builder instance.
   */
  protected abstract newAuthUrlBuilder(): AuthResourceUrlBuilder;

  /**
   * @return {AuthResourceUrlBuilder} A new project config resource URL builder instance.
   */
  protected abstract newProjectConfigUrlBuilder(): AuthResourceUrlBuilder;

  /**
   * @return {AuthResourceUrlBuilder} The current Auth user management resource URL builder.
   */
  private getAuthUrlBuilder(): AuthResourceUrlBuilder {
    if (!this.authUrlBuilder) {
      this.authUrlBuilder = this.newAuthUrlBuilder();
    }
    return this.authUrlBuilder;
  }

  /**
   * @return {AuthResourceUrlBuilder} The current project config resource URL builder.
   */
  private getProjectConfigUrlBuilder(): AuthResourceUrlBuilder {
    if (!this.projectConfigUrlBuilder) {
      this.projectConfigUrlBuilder = this.newProjectConfigUrlBuilder();
    }
    return this.projectConfigUrlBuilder;
  }
}


/** Instantiates the getTenant endpoint settings. */
const GET_TENANT = new ApiSettings('/tenants/{tenantId}', 'GET')
// Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain at least the tenant name.
    if (!validator.isNonEmptyString(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to get tenant',
      );
    }
  });

/** Instantiates the deleteTenant endpoint settings. */
const DELETE_TENANT = new ApiSettings('/tenants/{tenantId}', 'DELETE');

/** Instantiates the updateTenant endpoint settings. */
const UPDATE_TENANT = new ApiSettings('/tenants/{tenantId}?updateMask={updateMask}', 'PATCH')
  // Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain at least the tenant name.
    if (!validator.isNonEmptyString(response.name) ||
          !Tenant.getTenantIdFromResourceName(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to update tenant',
      );
    }
  });

/** Instantiates the listTenants endpoint settings. */
const LIST_TENANTS = new ApiSettings('/tenants', 'GET')
  // Set request validator.
  .setRequestValidator((request: any) => {
    // Validate next page token.
    if (typeof request.pageToken !== 'undefined' &&
        !validator.isNonEmptyString(request.pageToken)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_PAGE_TOKEN);
    }
    // Validate max results.
    if (!validator.isNumber(request.pageSize) ||
        request.pageSize <= 0 ||
        request.pageSize > MAX_LIST_TENANT_PAGE_SIZE) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'Required "maxResults" must be a positive non-zero number that does not exceed ' +
        `the allowed ${MAX_LIST_TENANT_PAGE_SIZE}.`,
      );
    }
  });

/** Instantiates the createTenant endpoint settings. */
const CREATE_TENANT = new ApiSettings('/tenants', 'POST')
// Set response validator.
  .setResponseValidator((response: any) => {
    // Response should always contain at least the tenant name.
    if (!validator.isNonEmptyString(response.name) ||
          !Tenant.getTenantIdFromResourceName(response.name)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new tenant',
      );
    }
  });


/**
 * Utility for sending requests to Auth server that are Auth instance related. This includes user and
 * tenant management related APIs. This extends the BaseFirebaseAuthRequestHandler class and defines
 * additional tenant management related APIs.
 */
export class AuthRequestHandler extends AbstractAuthRequestHandler {

  protected readonly tenantMgmtResourceBuilder: AuthResourceUrlBuilder;

  /**
   * The FirebaseAuthRequestHandler constructor used to initialize an instance using a FirebaseApp.
   *
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor.
   */
  constructor(app: FirebaseApp) {
    super(app);
    this.tenantMgmtResourceBuilder =  new AuthResourceUrlBuilder(app, 'v2');
  }

  /**
   * @return {AuthResourceUrlBuilder} A new Auth user management resource URL builder instance.
   */
  protected newAuthUrlBuilder(): AuthResourceUrlBuilder {
    return new AuthResourceUrlBuilder(this.app, 'v1');
  }

  /**
   * @return {AuthResourceUrlBuilder} A new project config resource URL builder instance.
   */
  protected newProjectConfigUrlBuilder(): AuthResourceUrlBuilder {
    return new AuthResourceUrlBuilder(this.app, 'v2');
  }

  /**
   * Looks up a tenant by tenant ID.
   *
   * @param {string} tenantId The tenant identifier of the tenant to lookup.
   * @return {Promise<TenantServerResponse>} A promise that resolves with the tenant information.
   */
  public getTenant(tenantId: string): Promise<TenantServerResponse> {
    if (!validator.isNonEmptyString(tenantId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_TENANT_ID));
    }
    return this.invokeRequestHandler(this.tenantMgmtResourceBuilder, GET_TENANT, {}, { tenantId })
      .then((response: any) => {
        return response as TenantServerResponse;
      });
  }

  /**
   * Exports the tenants (single batch only) with a size of maxResults and starting from
   * the offset as specified by pageToken.
   *
   * @param {number=} maxResults The page size, 1000 if undefined. This is also the maximum
   *     allowed limit.
   * @param {string=} pageToken The next page token. If not specified, returns tenants starting
   *     without any offset. Tenants are returned in the order they were created from oldest to
   *     newest, relative to the page token offset.
   * @return {Promise<object>} A promise that resolves with the current batch of downloaded
   *     tenants and the next page token if available. For the last page, an empty list of tenants
   *     and no page token are returned.
   */
  public listTenants(
    maxResults: number = MAX_LIST_TENANT_PAGE_SIZE,
    pageToken?: string): Promise<{tenants: TenantServerResponse[]; nextPageToken?: string}> {
    const request = {
      pageSize: maxResults,
      pageToken,
    };
    // Remove next page token if not provided.
    if (typeof request.pageToken === 'undefined') {
      delete request.pageToken;
    }
    return this.invokeRequestHandler(this.tenantMgmtResourceBuilder, LIST_TENANTS, request)
      .then((response: any) => {
        if (!response.tenants) {
          response.tenants = [];
          delete response.nextPageToken;
        }
        return response as {tenants: TenantServerResponse[]; nextPageToken?: string};
      });
  }

  /**
   * Deletes a tenant identified by a tenantId.
   *
   * @param {string} tenantId The identifier of the tenant to delete.
   * @return {Promise<void>} A promise that resolves when the tenant is deleted.
   */
  public deleteTenant(tenantId: string): Promise<void> {
    if (!validator.isNonEmptyString(tenantId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_TENANT_ID));
    }
    return this.invokeRequestHandler(this.tenantMgmtResourceBuilder, DELETE_TENANT, {}, { tenantId })
      .then(() => {
        // Return nothing.
      });
  }

  /**
   * Creates a new tenant with the properties provided.
   *
   * @param {TenantOptions} tenantOptions The properties to set on the new tenant to be created.
   * @return {Promise<TenantServerResponse>} A promise that resolves with the newly created tenant object.
   */
  public createTenant(tenantOptions: CreateTenantRequest): Promise<TenantServerResponse> {
    try {
      // Construct backend request.
      const request = Tenant.buildServerRequest(tenantOptions, true);
      return this.invokeRequestHandler(this.tenantMgmtResourceBuilder, CREATE_TENANT, request)
        .then((response: any) => {
          return response as TenantServerResponse;
        });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Updates an existing tenant with the properties provided.
   *
   * @param {string} tenantId The tenant identifier of the tenant to update.
   * @param {TenantOptions} tenantOptions The properties to update on the existing tenant.
   * @return {Promise<TenantServerResponse>} A promise that resolves with the modified tenant object.
   */
  public updateTenant(tenantId: string, tenantOptions: UpdateTenantRequest): Promise<TenantServerResponse> {
    if (!validator.isNonEmptyString(tenantId)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_TENANT_ID));
    }
    try {
      // Construct backend request.
      const request = Tenant.buildServerRequest(tenantOptions, false);
      // Do not traverse deep into testPhoneNumbers. The entire content should be replaced
      // and not just specific phone numbers.
      const updateMask = utils.generateUpdateMask(request, ['testPhoneNumbers']);
      return this.invokeRequestHandler(this.tenantMgmtResourceBuilder, UPDATE_TENANT, request,
        { tenantId, updateMask: updateMask.join(',') })
        .then((response: any) => {
          return response as TenantServerResponse;
        });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

/**
 * Utility for sending requests to Auth server that are tenant Auth instance related. This includes user
 * management related APIs for specified tenants.
 * This extends the BaseFirebaseAuthRequestHandler class.
 */
export class TenantAwareAuthRequestHandler extends AbstractAuthRequestHandler {
  /**
   * The FirebaseTenantRequestHandler constructor used to initialize an instance using a
   * FirebaseApp and a tenant ID.
   *
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @param {string} tenantId The request handler's tenant ID.
   * @constructor
   */
  constructor(app: FirebaseApp, private readonly tenantId: string) {
    super(app);
  }

  /**
   * @return {AuthResourceUrlBuilder} A new Auth user management resource URL builder instance.
   */
  protected newAuthUrlBuilder(): AuthResourceUrlBuilder {
    return new TenantAwareAuthResourceUrlBuilder(this.app, 'v1', this.tenantId);
  }

  /**
   * @return {AuthResourceUrlBuilder} A new project config resource URL builder instance.
   */
  protected newProjectConfigUrlBuilder(): AuthResourceUrlBuilder {
    return new TenantAwareAuthResourceUrlBuilder(this.app, 'v2', this.tenantId);
  }

  /**
   * Imports the list of users provided to Firebase Auth. This is useful when
   * migrating from an external authentication system without having to use the Firebase CLI SDK.
   * At most, 1000 users are allowed to be imported one at a time.
   * When importing a list of password users, UserImportOptions are required to be specified.
   *
   * Overrides the superclass methods by adding an additional check to match tenant IDs of
   * imported user records if present.
   *
   * @param {UserImportRecord[]} users The list of user records to import to Firebase Auth.
   * @param {UserImportOptions=} options The user import options, required when the users provided
   *     include password credentials.
   * @return {Promise<UserImportResult>} A promise that resolves when the operation completes
   *     with the result of the import. This includes the number of successful imports, the number
   *     of failed uploads and their corresponding errors.
   */
  public uploadAccount(
    users: UserImportRecord[], options?: UserImportOptions): Promise<UserImportResult> {
    // Add additional check to match tenant ID of imported user records.
    users.forEach((user: UserImportRecord, index: number) => {
      if (validator.isNonEmptyString(user.tenantId) &&
          user.tenantId !== this.tenantId) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.MISMATCHING_TENANT_ID,
          `UserRecord of index "${index}" has mismatching tenant ID "${user.tenantId}"`);
      }
    });
    return super.uploadAccount(users, options);
  }
}

function emulatorHost(): string | undefined {
  return process.env.FIREBASE_AUTH_EMULATOR_HOST
}

/**
 * When true the SDK should communicate with the Auth Emulator for all API
 * calls and also produce unsigned tokens.
 *
 * This alone does <b>NOT<b> short-circuit ID Token verification.
 * For security reasons that must be explicitly disabled through
 * setJwtVerificationEnabled(false);
 */
export function useEmulator(): boolean {
  return !!emulatorHost();
}

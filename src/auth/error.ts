/*!
 * Copyright 2017 Google LLC
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

import { PrefixedFirebaseError, toHttpResponse, ErrorInfo } from '../utils/error';
import { RequestResponseError } from '../utils/api-request';
import { deepCopy } from '../utils/deep-copy';

/**
* Auth client error codes.
*/
export type AuthErrorCode =
  | 'auth-blocking-token-expired'
  | 'billing-not-enabled'
  | 'claims-too-large'
  | 'configuration-exists'
  | 'configuration-not-found'
  | 'id-token-expired'
  | 'argument-error'
  | 'invalid-config'
  | 'email-already-exists'
  | 'email-not-found'
  | 'reserved-claim'
  | 'invalid-id-token'
  | 'id-token-revoked'
  | 'internal-error'
  | 'invalid-claims'
  | 'invalid-continue-uri'
  | 'invalid-creation-time'
  | 'invalid-credential'
  | 'invalid-disabled-field'
  | 'invalid-display-name'
  | 'invalid-dynamic-link-domain'
  | 'invalid-hosting-link-domain'
  | 'invalid-email-verified'
  | 'invalid-email'
  | 'invalid-new-email'
  | 'invalid-enrolled-factors'
  | 'invalid-enrollment-time'
  | 'invalid-hash-algorithm'
  | 'invalid-hash-block-size'
  | 'invalid-hash-derived-key-length'
  | 'invalid-hash-key'
  | 'invalid-hash-memory-cost'
  | 'invalid-hash-parallelization'
  | 'invalid-hash-rounds'
  | 'invalid-hash-salt-separator'
  | 'invalid-last-sign-in-time'
  | 'invalid-name'
  | 'invalid-oauth-client-id'
  | 'invalid-page-token'
  | 'invalid-password'
  | 'invalid-password-hash'
  | 'invalid-password-salt'
  | 'invalid-phone-number'
  | 'invalid-photo-url'
  | 'invalid-project-id'
  | 'invalid-provider-data'
  | 'invalid-provider-id'
  | 'invalid-provider-uid'
  | 'invalid-oauth-responsetype'
  | 'invalid-session-cookie-duration'
  | 'invalid-tenant-id'
  | 'invalid-tenant-type'
  | 'invalid-testing-phone-number'
  | 'invalid-uid'
  | 'invalid-user-import'
  | 'invalid-tokens-valid-after-time'
  | 'mismatching-tenant-id'
  | 'missing-android-package-name'
  | 'missing-config'
  | 'missing-continue-uri'
  | 'missing-display-name'
  | 'missing-email'
  | 'missing-ios-bundle-id'
  | 'missing-issuer'
  | 'missing-hash-algorithm'
  | 'missing-oauth-client-id'
  | 'missing-oauth-client-secret'
  | 'missing-provider-id'
  | 'missing-saml-relying-party-config'
  | 'test-phone-number-limit-exceeded'
  | 'maximum-user-count-exceeded'
  | 'missing-uid'
  | 'operation-not-allowed'
  | 'phone-number-already-exists'
  | 'project-not-found'
  | 'insufficient-permission'
  | 'quota-exceeded'
  | 'second-factor-limit-exceeded'
  | 'second-factor-uid-already-exists'
  | 'session-cookie-expired'
  | 'session-cookie-revoked'
  | 'tenant-not-found'
  | 'uid-already-exists'
  | 'unauthorized-continue-uri'
  | 'unsupported-first-factor'
  | 'unsupported-second-factor'
  | 'unsupported-tenant-operation'
  | 'unverified-email'
  | 'user-not-found'
  | 'not-found'
  | 'user-disabled'
  | 'user-not-disabled'
  | 'invalid-recaptcha-action'
  | 'invalid-recaptcha-enforcement-state'
  | 'racaptcha-not-enabled';

/**
* Auth client error codes and their default messages.
*/
const authClientErrorMessages: Record<AuthErrorCode, string> = {
  'auth-blocking-token-expired': 'The provided Firebase Auth Blocking token is expired.',
  'billing-not-enabled': 'Feature requires billing to be enabled.',
  'claims-too-large': 'Developer claims maximum payload size exceeded.',
  'configuration-exists': 'A configuration already exists with the provided identifier.',
  'configuration-not-found': 'There is no configuration corresponding to the provided identifier.',
  'id-token-expired': 'The provided Firebase ID token is expired.',
  'argument-error': 'Invalid argument provided.',
  'invalid-config': 'The provided configuration is invalid.',
  'email-already-exists': 'The email address is already in use by another account.',
  'email-not-found': 'There is no user record corresponding to the provided email.',
  'reserved-claim': 'The specified developer claim is reserved and cannot be specified.',
  'invalid-id-token': 'The provided ID token is not a valid Firebase ID token.',
  'id-token-revoked': 'The Firebase ID token has been revoked.',
  'internal-error': 'An internal error has occurred.',
  'invalid-claims': 'The provided custom claim attributes are invalid.',
  'invalid-continue-uri': 'The continue URL must be a valid URL string.',
  'invalid-creation-time': 'The creation time must be a valid UTC date string.',
  'invalid-credential': 'Invalid credential object provided.',
  'invalid-disabled-field': 'The disabled field must be a boolean.',
  'invalid-display-name': 'The displayName field must be a valid string.',
  'invalid-dynamic-link-domain': 'The provided dynamic link domain is not configured or authorized ' +
    'for the current project.',
  'invalid-hosting-link-domain': 'The provided hosting link domain is not configured in Firebase ' +
    'Hosting or is not owned by the current project.',
  'invalid-email-verified': 'The emailVerified field must be a boolean.',
  'invalid-email': 'The email address is improperly formatted.',
  'invalid-new-email': 'The new email address is improperly formatted.',
  'invalid-enrolled-factors': 'The enrolled factors must be a valid array of MultiFactorInfo objects.',
  'invalid-enrollment-time': 'The second factor enrollment time must be a valid UTC date string.',
  'invalid-hash-algorithm': 'The hash algorithm must match one of the strings in the list of ' +
    'supported algorithms.',
  'invalid-hash-block-size': 'The hash block size must be a valid number.',
  'invalid-hash-derived-key-length': 'The hash derived key length must be a valid number.',
  'invalid-hash-key': 'The hash key must a valid byte buffer.',
  'invalid-hash-memory-cost': 'The hash memory cost must be a valid number.',
  'invalid-hash-parallelization': 'The hash parallelization must be a valid number.',
  'invalid-hash-rounds': 'The hash rounds must be a valid number.',
  'invalid-hash-salt-separator': 'The hashing algorithm salt separator field must be a valid byte buffer.',
  'invalid-last-sign-in-time': 'The last sign-in time must be a valid UTC date string.',
  'invalid-name': 'The resource name provided is invalid.',
  'invalid-oauth-client-id': 'The provided OAuth client ID is invalid.',
  'invalid-page-token': 'The page token must be a valid non-empty string.',
  'invalid-password': 'The password must be a string with at least 6 characters.',
  'invalid-password-hash': 'The password hash must be a valid byte buffer.',
  'invalid-password-salt': 'The password salt must be a valid byte buffer.',
  'invalid-phone-number': 'The phone number must be a non-empty E.164 standard compliant identifier string.',
  'invalid-photo-url': 'The photoURL field must be a valid URL.',
  'invalid-project-id': 'Invalid parent project. Either parent project doesn\'t exist or didn\'t enable multi-tenancy.',
  'invalid-provider-data': 'The providerData must be a valid array of UserInfo objects.',
  'invalid-provider-id': 'The providerId must be a valid supported provider identifier string.',
  'invalid-provider-uid': 'The providerUid must be a valid provider uid string.',
  'invalid-oauth-responsetype': 'Only exactly one OAuth responseType should be set to true.',
  'invalid-session-cookie-duration': 'The session cookie duration must be a valid number in milliseconds ' +
    'between 5 minutes and 2 weeks.',
  'invalid-tenant-id': 'The tenant ID must be a valid non-empty string.',
  'invalid-tenant-type': 'Tenant type must be either "full_service" or "lightweight".',
  'invalid-testing-phone-number': 'Invalid testing phone number or invalid test code provided.',
  'invalid-uid': 'The uid must be a non-empty string with at most 128 characters.',
  'invalid-user-import': 'The user record to import is invalid.',
  'invalid-tokens-valid-after-time': 'The tokensValidAfterTime must be a valid UTC number in seconds.',
  'mismatching-tenant-id': 'User tenant ID does not match with the current TenantAwareAuth tenant ID.',
  'missing-android-package-name': 'An Android Package Name must be provided if the Android App is required ' +
    'to be installed.',
  'missing-config': 'The provided configuration is missing required attributes.',
  'missing-continue-uri': 'A valid continue URL must be provided in the request.',
  'missing-display-name': 'The resource being created or edited is missing a valid display name.',
  'missing-email': 'The email is required for the specified action. For example, a multi-factor user requires ' +
    'a verified email.',
  'missing-ios-bundle-id': 'The request is missing an iOS Bundle ID.',
  'missing-issuer': 'The OAuth/OIDC configuration issuer must not be empty.',
  'missing-hash-algorithm': 'Importing users with password hashes requires that the hashing algorithm and its ' +
    'parameters be provided.',
  'missing-oauth-client-id': 'The OAuth/OIDC configuration client ID must not be empty.',
  'missing-oauth-client-secret': 'The OAuth configuration client secret is required to enable OIDC code flow.',
  'missing-provider-id': 'A valid provider ID must be provided in the request.',
  'missing-saml-relying-party-config': 'The SAML configuration provided is missing a relying party configuration.',
  'test-phone-number-limit-exceeded': 'The maximum allowed number of test phone number / code pairs has been exceeded.',
  'maximum-user-count-exceeded': 'The maximum allowed number of users to import has been exceeded.',
  'missing-uid': 'A uid identifier is required for the current operation.',
  'operation-not-allowed': 'The given sign-in provider is disabled for this Firebase project. ' +
    'Enable it in the Firebase console, under the sign-in method tab of the Auth section.',
  'phone-number-already-exists': 'The user with the provided phone number already exists.',
  'project-not-found': 'No Firebase project was found for the provided credential.',
  'insufficient-permission': 'Credential implementation provided to initializeApp() via the ' +
    '"credential" property has insufficient permission to access the requested resource. See ' +
    'https://firebase.google.com/docs/admin/setup for details on how to authenticate this SDK ' +
    'with appropriate permissions.',
  'quota-exceeded': 'The project quota for the specified operation has been exceeded.',
  'second-factor-limit-exceeded': 'The maximum number of allowed second factors on a user has been exceeded.',
  'second-factor-uid-already-exists': 'The specified second factor "uid" already exists.',
  'session-cookie-expired': 'The Firebase session cookie is expired.',
  'session-cookie-revoked': 'The Firebase session cookie has been revoked.',
  'tenant-not-found': 'There is no tenant corresponding to the provided identifier.',
  'uid-already-exists': 'The user with the provided uid already exists.',
  'unauthorized-continue-uri': 'The domain of the continue URL is not whitelisted. Whitelist ' +
    'the domain in the Firebase console.',
  'unsupported-first-factor': 'A multi-factor user requires a supported first factor.',
  'unsupported-second-factor': 'The request specified an unsupported type of second factor.',
  'unsupported-tenant-operation': 'This operation is not supported in a multi-tenant context.',
  'unverified-email': 'A verified email is required for the specified action. For example, a multi-factor ' +
    'user requires a verified email.',
  'user-not-found': 'There is no user record corresponding to the provided identifier.',
  'not-found': 'The requested resource was not found.',
  'user-disabled': 'The user record is disabled.',
  'user-not-disabled': 'The user must be disabled in order to bulk delete it (or you must pass force=true).',
  'invalid-recaptcha-action': 'reCAPTCHA action must be "BLOCK".',
  'invalid-recaptcha-enforcement-state': 'reCAPTCHA enforcement state must be either "OFF", "AUDIT" or "ENFORCE".',
  'racaptcha-not-enabled': 'reCAPTCHA enterprise is not enabled.',
};

/** @const {ServerToClientCode} Auth server to client enum error codes. */
const AUTH_SERVER_TO_CLIENT_CODE: Record<string, string> = {
  BILLING_NOT_ENABLED: 'BILLING_NOT_ENABLED',
  CLAIMS_TOO_LARGE: 'CLAIMS_TOO_LARGE',
  CONFIGURATION_EXISTS: 'CONFIGURATION_EXISTS',
  CONFIGURATION_NOT_FOUND: 'CONFIGURATION_NOT_FOUND',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  INVALID_CLAIMS: 'INVALID_CLAIMS',
  INVALID_CONFIG: 'INVALID_CONFIG',
  INVALID_CONTINUE_URI: 'INVALID_CONTINUE_URI',
  INVALID_CREATION_TIME: 'INVALID_CREATION_TIME',
  INVALID_DYNAMIC_LINK_DOMAIN: 'INVALID_DYNAMIC_LINK_DOMAIN',
  INVALID_EMAIL_VERIFIED: 'INVALID_EMAIL_VERIFIED',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_ENROLLED_FACTORS: 'INVALID_ENROLLED_FACTORS',
  INVALID_ENROLLMENT_TIME: 'INVALID_ENROLLMENT_TIME',
  INVALID_HASH_ALGORITHM: 'INVALID_HASH_ALGORITHM',
  INVALID_HASH_BLOCK_SIZE: 'INVALID_HASH_BLOCK_SIZE',
  INVALID_HASH_DERIVED_KEY_LENGTH: 'INVALID_HASH_DERIVED_KEY_LENGTH',
  INVALID_HASH_KEY: 'INVALID_HASH_KEY',
  INVALID_HASH_MEMORY_COST: 'INVALID_HASH_MEMORY_COST',
  INVALID_HASH_PARALLELIZATION: 'INVALID_HASH_PARALLELIZATION',
  INVALID_HASH_ROUNDS: 'INVALID_HASH_ROUNDS',
  INVALID_HASH_SALT_SEPARATOR: 'INVALID_HASH_SALT_SEPARATOR',
  INVALID_LAST_SIGN_IN_TIME: 'INVALID_LAST_SIGN_IN_TIME',
  INVALID_MFA_REQUIRED_KEY: 'INVALID_ARGUMENT',
  INVALID_OAUTH_CLIENT_ID: 'INVALID_OAUTH_CLIENT_ID',
  INVALID_PAGE_TOKEN: 'INVALID_PAGE_TOKEN',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_PASSWORD_HASH: 'INVALID_PASSWORD_HASH',
  INVALID_PASSWORD_SALT: 'INVALID_PASSWORD_SALT',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  INVALID_PHOTO_URL: 'INVALID_PHOTO_URL',
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  INVALID_PROVIDER_DATA: 'INVALID_PROVIDER_DATA',
  INVALID_PROVIDER_ID: 'INVALID_PROVIDER_ID',
  INVALID_PROVIDER_UID: 'INVALID_PROVIDER_UID',
  INVALID_RECAPTCHA_ACTION: 'INVALID_RECAPTCHA_ACTION',
  INVALID_RECAPTCHA_ENFORCEMENT_STATE: 'INVALID_RECAPTCHA_ENFORCEMENT_STATE',
  INVALID_SESSION_COOKIE_DURATION: 'INVALID_SESSION_COOKIE_DURATION',
  INVALID_TENANT_ID: 'INVALID_TENANT_ID',
  INVALID_TENANT_TYPE: 'INVALID_TENANT_TYPE',
  INVALID_TESTING_PHONE_NUMBER: 'INVALID_TESTING_PHONE_NUMBER',
  MISSING_ANDROID_PACKAGE_NAME: 'MISSING_ANDROID_PACKAGE_NAME',
  MISSING_CONTINUE_URI: 'MISSING_CONTINUE_URI',
  MISSING_HASH_ALGORITHM: 'MISSING_HASH_ALGORITHM',
  MISSING_IOS_BUNDLE_ID: 'MISSING_IOS_BUNDLE_ID',
  MISSING_MFA_REQUIRED_KEY: 'INVALID_ARGUMENT',
  MISSING_UID: 'MISSING_UID',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  RECAPTCHA_NOT_ENABLED: 'RECAPTCHA_NOT_ENABLED',
  SECOND_FACTOR_LIMIT_EXCEEDED: 'SECOND_FACTOR_LIMIT_EXCEEDED',
  SECOND_FACTOR_UID_ALREADY_EXISTS: 'SECOND_FACTOR_UID_ALREADY_EXISTS',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  UNAUTHORIZED_DOMAIN: 'UNAUTHORIZED_DOMAIN',
  UNSUPPORTED_FIRST_FACTOR: 'UNSUPPORTED_FIRST_FACTOR',
  UNSUPPORTED_SECOND_FACTOR: 'UNSUPPORTED_SECOND_FACTOR',
  UNSUPPORTED_TENANT_OPERATION: 'UNSUPPORTED_TENANT_OPERATION',
  UNVERIFIED_EMAIL: 'UNVERIFIED_EMAIL',
  USER_NOT_DISABLED: 'USER_NOT_DISABLED',
  DUPLICATE_EMAIL: 'EMAIL_ALREADY_EXISTS',
  DUPLICATE_LOCAL_ID: 'UID_ALREADY_EXISTS',
  EMAIL_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  INVALID_TENANT_TYPE_CONVERSION: 'INVALID_ARGUMENT',
  MISSING_EMAIL: 'INVALID_EMAIL',
  MISSING_LOCAL_ID: 'MISSING_UID',
  MISSING_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_LOGIN_DISABLED: 'OPERATION_NOT_ALLOWED',
  PHONE_NUMBER_EXISTS: 'PHONE_NUMBER_ALREADY_EXISTS',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WEAK_PASSWORD: 'INVALID_PASSWORD',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_ID_TOKEN: 'INVALID_ID_TOKEN',
};

/**
 * Internal Auth client error code mapping used to construct ErrorInfo.
 */
export const authClientErrorCode = {
  AUTH_BLOCKING_TOKEN_EXPIRED: createAuthErrorInfo('auth-blocking-token-expired'),
  BILLING_NOT_ENABLED: createAuthErrorInfo('billing-not-enabled'),
  CLAIMS_TOO_LARGE: createAuthErrorInfo('claims-too-large'),
  CONFIGURATION_EXISTS: createAuthErrorInfo('configuration-exists'),
  CONFIGURATION_NOT_FOUND: createAuthErrorInfo('configuration-not-found'),
  ID_TOKEN_EXPIRED: createAuthErrorInfo('id-token-expired'),
  INVALID_ARGUMENT: createAuthErrorInfo('argument-error'),
  INVALID_CONFIG: createAuthErrorInfo('invalid-config'),
  EMAIL_ALREADY_EXISTS: createAuthErrorInfo('email-already-exists'),
  EMAIL_NOT_FOUND: createAuthErrorInfo('email-not-found'),
  FORBIDDEN_CLAIM: createAuthErrorInfo('reserved-claim'),
  INVALID_ID_TOKEN: createAuthErrorInfo('invalid-id-token'),
  ID_TOKEN_REVOKED: createAuthErrorInfo('id-token-revoked'),
  INTERNAL_ERROR: createAuthErrorInfo('internal-error'),
  INVALID_CLAIMS: createAuthErrorInfo('invalid-claims'),
  INVALID_CONTINUE_URI: createAuthErrorInfo('invalid-continue-uri'),
  INVALID_CREATION_TIME: createAuthErrorInfo('invalid-creation-time'),
  INVALID_CREDENTIAL: createAuthErrorInfo('invalid-credential'),
  INVALID_DISABLED_FIELD: createAuthErrorInfo('invalid-disabled-field'),
  INVALID_DISPLAY_NAME: createAuthErrorInfo('invalid-display-name'),
  INVALID_DYNAMIC_LINK_DOMAIN: createAuthErrorInfo('invalid-dynamic-link-domain'),
  INVALID_HOSTING_LINK_DOMAIN: createAuthErrorInfo('invalid-hosting-link-domain'),
  INVALID_EMAIL_VERIFIED: createAuthErrorInfo('invalid-email-verified'),
  INVALID_EMAIL: createAuthErrorInfo('invalid-email'),
  INVALID_NEW_EMAIL: createAuthErrorInfo('invalid-new-email'),
  INVALID_ENROLLED_FACTORS: createAuthErrorInfo('invalid-enrolled-factors'),
  INVALID_ENROLLMENT_TIME: createAuthErrorInfo('invalid-enrollment-time'),
  INVALID_HASH_ALGORITHM: createAuthErrorInfo('invalid-hash-algorithm'),
  INVALID_HASH_BLOCK_SIZE: createAuthErrorInfo('invalid-hash-block-size'),
  INVALID_HASH_DERIVED_KEY_LENGTH: createAuthErrorInfo('invalid-hash-derived-key-length'),
  INVALID_HASH_KEY: createAuthErrorInfo('invalid-hash-key'),
  INVALID_HASH_MEMORY_COST: createAuthErrorInfo('invalid-hash-memory-cost'),
  INVALID_HASH_PARALLELIZATION: createAuthErrorInfo('invalid-hash-parallelization'),
  INVALID_HASH_ROUNDS: createAuthErrorInfo('invalid-hash-rounds'),
  INVALID_HASH_SALT_SEPARATOR: createAuthErrorInfo('invalid-hash-salt-separator'),
  INVALID_LAST_SIGN_IN_TIME: createAuthErrorInfo('invalid-last-sign-in-time'),
  INVALID_NAME: createAuthErrorInfo('invalid-name'),
  INVALID_OAUTH_CLIENT_ID: createAuthErrorInfo('invalid-oauth-client-id'),
  INVALID_PAGE_TOKEN: createAuthErrorInfo('invalid-page-token'),
  INVALID_PASSWORD: createAuthErrorInfo('invalid-password'),
  INVALID_PASSWORD_HASH: createAuthErrorInfo('invalid-password-hash'),
  INVALID_PASSWORD_SALT: createAuthErrorInfo('invalid-password-salt'),
  INVALID_PHONE_NUMBER: createAuthErrorInfo('invalid-phone-number'),
  INVALID_PHOTO_URL: createAuthErrorInfo('invalid-photo-url'),
  INVALID_PROJECT_ID: createAuthErrorInfo('invalid-project-id'),
  INVALID_PROVIDER_DATA: createAuthErrorInfo('invalid-provider-data'),
  INVALID_PROVIDER_ID: createAuthErrorInfo('invalid-provider-id'),
  INVALID_PROVIDER_UID: createAuthErrorInfo('invalid-provider-uid'),
  INVALID_OAUTH_RESPONSETYPE: createAuthErrorInfo('invalid-oauth-responsetype'),
  INVALID_SESSION_COOKIE_DURATION: createAuthErrorInfo('invalid-session-cookie-duration'),
  INVALID_TENANT_ID: createAuthErrorInfo('invalid-tenant-id'),
  INVALID_TENANT_TYPE: createAuthErrorInfo('invalid-tenant-type'),
  INVALID_TESTING_PHONE_NUMBER: createAuthErrorInfo('invalid-testing-phone-number'),
  INVALID_UID: createAuthErrorInfo('invalid-uid'),
  INVALID_USER_IMPORT: createAuthErrorInfo('invalid-user-import'),
  INVALID_TOKENS_VALID_AFTER_TIME: createAuthErrorInfo('invalid-tokens-valid-after-time'),
  MISMATCHING_TENANT_ID: createAuthErrorInfo('mismatching-tenant-id'),
  MISSING_ANDROID_PACKAGE_NAME: createAuthErrorInfo('missing-android-package-name'),
  MISSING_CONFIG: createAuthErrorInfo('missing-config'),
  MISSING_CONTINUE_URI: createAuthErrorInfo('missing-continue-uri'),
  MISSING_DISPLAY_NAME: createAuthErrorInfo('missing-display-name'),
  MISSING_EMAIL: createAuthErrorInfo('missing-email'),
  MISSING_IOS_BUNDLE_ID: createAuthErrorInfo('missing-ios-bundle-id'),
  MISSING_ISSUER: createAuthErrorInfo('missing-issuer'),
  MISSING_HASH_ALGORITHM: createAuthErrorInfo('missing-hash-algorithm'),
  MISSING_OAUTH_CLIENT_ID: createAuthErrorInfo('missing-oauth-client-id'),
  MISSING_OAUTH_CLIENT_SECRET: createAuthErrorInfo('missing-oauth-client-secret'),
  MISSING_PROVIDER_ID: createAuthErrorInfo('missing-provider-id'),
  MISSING_SAML_RELYING_PARTY_CONFIG: createAuthErrorInfo('missing-saml-relying-party-config'),
  MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED: createAuthErrorInfo('test-phone-number-limit-exceeded'),
  MAXIMUM_USER_COUNT_EXCEEDED: createAuthErrorInfo('maximum-user-count-exceeded'),
  MISSING_UID: createAuthErrorInfo('missing-uid'),
  OPERATION_NOT_ALLOWED: createAuthErrorInfo('operation-not-allowed'),
  PHONE_NUMBER_ALREADY_EXISTS: createAuthErrorInfo('phone-number-already-exists'),
  PROJECT_NOT_FOUND: createAuthErrorInfo('project-not-found'),
  INSUFFICIENT_PERMISSION: createAuthErrorInfo('insufficient-permission'),
  QUOTA_EXCEEDED: createAuthErrorInfo('quota-exceeded'),
  SECOND_FACTOR_LIMIT_EXCEEDED: createAuthErrorInfo('second-factor-limit-exceeded'),
  SECOND_FACTOR_UID_ALREADY_EXISTS: createAuthErrorInfo('second-factor-uid-already-exists'),
  SESSION_COOKIE_EXPIRED: createAuthErrorInfo('session-cookie-expired'),
  SESSION_COOKIE_REVOKED: createAuthErrorInfo('session-cookie-revoked'),
  TENANT_NOT_FOUND: createAuthErrorInfo('tenant-not-found'),
  UID_ALREADY_EXISTS: createAuthErrorInfo('uid-already-exists'),
  UNAUTHORIZED_DOMAIN: createAuthErrorInfo('unauthorized-continue-uri'),
  UNSUPPORTED_FIRST_FACTOR: createAuthErrorInfo('unsupported-first-factor'),
  UNSUPPORTED_SECOND_FACTOR: createAuthErrorInfo('unsupported-second-factor'),
  UNSUPPORTED_TENANT_OPERATION: createAuthErrorInfo('unsupported-tenant-operation'),
  UNVERIFIED_EMAIL: createAuthErrorInfo('unverified-email'),
  USER_NOT_FOUND: createAuthErrorInfo('user-not-found'),
  NOT_FOUND: createAuthErrorInfo('not-found'),
  USER_DISABLED: createAuthErrorInfo('user-disabled'),
  USER_NOT_DISABLED: createAuthErrorInfo('user-not-disabled'),
  INVALID_RECAPTCHA_ACTION: createAuthErrorInfo('invalid-recaptcha-action'),
  INVALID_RECAPTCHA_ENFORCEMENT_STATE: createAuthErrorInfo('invalid-recaptcha-enforcement-state'),
  RECAPTCHA_NOT_ENABLED: createAuthErrorInfo('racaptcha-not-enabled'),
};

function createAuthErrorInfo(code: AuthErrorCode): ErrorInfo {
  return {
    code,
    message: authClientErrorMessages[code] || 'An unknown error occurred.',
  };
}

/**
 * Firebase Auth error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseAuthError extends PrefixedFirebaseError {
  /**
   * Creates the developer-facing error corresponding to the backend error code.
   *
   * @param serverErrorCode - The server error code.
   * @param [message] The error message. The default message is used
   *     if not provided.
   * @param [serverError] The error's raw server response.
   * @returns The corresponding developer-facing error.
   * @internal
   */
  public static fromServerError(
    serverErrorCode: string,
    message?: string,
    serverError?: RequestResponseError,
  ): FirebaseAuthError {
    // serverErrorCode could contain additional details:
    // ERROR_CODE : Detailed message which can also contain colons
    const colonSeparator = (serverErrorCode || '').indexOf(':');
    let customMessage = null;
    if (colonSeparator !== -1) {
      customMessage = serverErrorCode.substring(colonSeparator + 1).trim();
      serverErrorCode = serverErrorCode.substring(0, colonSeparator).trim();
    }
    // If not found, default to internal error.
    const clientCodeKey = AUTH_SERVER_TO_CLIENT_CODE[serverErrorCode] || 'INTERNAL_ERROR';
    const error: ErrorInfo = deepCopy((authClientErrorCode as any)[clientCodeKey]);
    // Server detailed message should have highest priority.
    error.message = customMessage || message || error.message;
    error.cause = serverError;
    error.httpResponse = serverError?.response ? toHttpResponse(serverError.response) : undefined;
    return new FirebaseAuthError(error);
  }

  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('auth', info.code, message || info.message, info.httpResponse, info.cause);

  }
}

/*!
 * Copyright 2026 Google LLC
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

import { FirebaseError, toHttpResponse, ErrorInfo } from '../utils/error';
import { RequestResponseError } from '../utils/api-request';
import { deepCopy } from '../utils/deep-copy';

/**
 * The constant mapping for valid Auth client error codes.
 */
export const AuthErrorCode = {
  AUTH_BLOCKING_TOKEN_EXPIRED: 'auth-blocking-token-expired',
  BILLING_NOT_ENABLED: 'billing-not-enabled',
  CLAIMS_TOO_LARGE: 'claims-too-large',
  CONFIGURATION_EXISTS: 'configuration-exists',
  CONFIGURATION_NOT_FOUND: 'configuration-not-found',
  ID_TOKEN_EXPIRED: 'id-token-expired',
  INVALID_ARGUMENT: 'argument-error',
  INVALID_CONFIG: 'invalid-config',
  EMAIL_ALREADY_EXISTS: 'email-already-exists',
  EMAIL_NOT_FOUND: 'email-not-found',
  FORBIDDEN_CLAIM: 'reserved-claim',
  INVALID_ID_TOKEN: 'invalid-id-token',
  ID_TOKEN_REVOKED: 'id-token-revoked',
  INTERNAL_ERROR: 'internal-error',
  INVALID_CLAIMS: 'invalid-claims',
  INVALID_CONTINUE_URI: 'invalid-continue-uri',
  INVALID_CREATION_TIME: 'invalid-creation-time',
  INVALID_CREDENTIAL: 'invalid-credential',
  INVALID_DISABLED_FIELD: 'invalid-disabled-field',
  INVALID_DISPLAY_NAME: 'invalid-display-name',
  INVALID_DYNAMIC_LINK_DOMAIN: 'invalid-dynamic-link-domain',
  INVALID_HOSTING_LINK_DOMAIN: 'invalid-hosting-link-domain',
  INVALID_EMAIL_VERIFIED: 'invalid-email-verified',
  INVALID_EMAIL: 'invalid-email',
  INVALID_NEW_EMAIL: 'invalid-new-email',
  INVALID_ENROLLED_FACTORS: 'invalid-enrolled-factors',
  INVALID_ENROLLMENT_TIME: 'invalid-enrollment-time',
  INVALID_HASH_ALGORITHM: 'invalid-hash-algorithm',
  INVALID_HASH_BLOCK_SIZE: 'invalid-hash-block-size',
  INVALID_HASH_DERIVED_KEY_LENGTH: 'invalid-hash-derived-key-length',
  INVALID_HASH_KEY: 'invalid-hash-key',
  INVALID_HASH_MEMORY_COST: 'invalid-hash-memory-cost',
  INVALID_HASH_PARALLELIZATION: 'invalid-hash-parallelization',
  INVALID_HASH_ROUNDS: 'invalid-hash-rounds',
  INVALID_HASH_SALT_SEPARATOR: 'invalid-hash-salt-separator',
  INVALID_LAST_SIGN_IN_TIME: 'invalid-last-sign-in-time',
  INVALID_NAME: 'invalid-name',
  INVALID_OAUTH_CLIENT_ID: 'invalid-oauth-client-id',
  INVALID_PAGE_TOKEN: 'invalid-page-token',
  INVALID_PASSWORD: 'invalid-password',
  INVALID_PASSWORD_HASH: 'invalid-password-hash',
  INVALID_PASSWORD_SALT: 'invalid-password-salt',
  INVALID_PHONE_NUMBER: 'invalid-phone-number',
  INVALID_PHOTO_URL: 'invalid-photo-url',
  INVALID_PROJECT_ID: 'invalid-project-id',
  INVALID_PROVIDER_DATA: 'invalid-provider-data',
  INVALID_PROVIDER_ID: 'invalid-provider-id',
  INVALID_PROVIDER_UID: 'invalid-provider-uid',
  INVALID_OAUTH_RESPONSETYPE: 'invalid-oauth-responsetype',
  INVALID_SESSION_COOKIE_DURATION: 'invalid-session-cookie-duration',
  INVALID_TENANT_ID: 'invalid-tenant-id',
  INVALID_TENANT_TYPE: 'invalid-tenant-type',
  INVALID_TESTING_PHONE_NUMBER: 'invalid-testing-phone-number',
  INVALID_UID: 'invalid-uid',
  INVALID_USER_IMPORT: 'invalid-user-import',
  INVALID_TOKENS_VALID_AFTER_TIME: 'invalid-tokens-valid-after-time',
  MISMATCHING_TENANT_ID: 'mismatching-tenant-id',
  MISSING_ANDROID_PACKAGE_NAME: 'missing-android-package-name',
  MISSING_CONFIG: 'missing-config',
  MISSING_CONTINUE_URI: 'missing-continue-uri',
  MISSING_DISPLAY_NAME: 'missing-display-name',
  MISSING_EMAIL: 'missing-email',
  MISSING_IOS_BUNDLE_ID: 'missing-ios-bundle-id',
  MISSING_ISSUER: 'missing-issuer',
  MISSING_HASH_ALGORITHM: 'missing-hash-algorithm',
  MISSING_OAUTH_CLIENT_ID: 'missing-oauth-client-id',
  MISSING_OAUTH_CLIENT_SECRET: 'missing-oauth-client-secret',
  MISSING_PROVIDER_ID: 'missing-provider-id',
  MISSING_SAML_RELYING_PARTY_CONFIG: 'missing-saml-relying-party-config',
  MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED: 'test-phone-number-limit-exceeded',
  MAXIMUM_USER_COUNT_EXCEEDED: 'maximum-user-count-exceeded',
  MISSING_UID: 'missing-uid',
  OPERATION_NOT_ALLOWED: 'operation-not-allowed',
  PHONE_NUMBER_ALREADY_EXISTS: 'phone-number-already-exists',
  PROJECT_NOT_FOUND: 'project-not-found',
  INSUFFICIENT_PERMISSION: 'insufficient-permission',
  QUOTA_EXCEEDED: 'quota-exceeded',
  SECOND_FACTOR_LIMIT_EXCEEDED: 'second-factor-limit-exceeded',
  SECOND_FACTOR_UID_ALREADY_EXISTS: 'second-factor-uid-already-exists',
  SESSION_COOKIE_EXPIRED: 'session-cookie-expired',
  SESSION_COOKIE_REVOKED: 'session-cookie-revoked',
  TENANT_NOT_FOUND: 'tenant-not-found',
  UID_ALREADY_EXISTS: 'uid-already-exists',
  UNAUTHORIZED_DOMAIN: 'unauthorized-continue-uri',
  UNSUPPORTED_FIRST_FACTOR: 'unsupported-first-factor',
  UNSUPPORTED_SECOND_FACTOR: 'unsupported-second-factor',
  UNSUPPORTED_TENANT_OPERATION: 'unsupported-tenant-operation',
  UNVERIFIED_EMAIL: 'unverified-email',
  USER_NOT_FOUND: 'user-not-found',
  NOT_FOUND: 'not-found',
  USER_DISABLED: 'user-disabled',
  USER_NOT_DISABLED: 'user-not-disabled',
  INVALID_RECAPTCHA_ACTION: 'invalid-recaptcha-action',
  INVALID_RECAPTCHA_ENFORCEMENT_STATE: 'invalid-recaptcha-enforcement-state',
  RECAPTCHA_NOT_ENABLED: 'recaptcha-not-enabled',
} as const;

/**
 * The type definition for valid Auth client error codes.
 */
export type AuthErrorCode = typeof AuthErrorCode[keyof typeof AuthErrorCode];

/**
 * Internal Auth client error code mapping used to construct ErrorInfo.
 */
export const authClientErrorCode: { readonly [K in keyof typeof AuthErrorCode]: ErrorInfo } = {
  AUTH_BLOCKING_TOKEN_EXPIRED: {
    code: AuthErrorCode.AUTH_BLOCKING_TOKEN_EXPIRED,
    message: 'The provided Firebase Auth Blocking token is expired.',
  },
  BILLING_NOT_ENABLED: {
    code: AuthErrorCode.BILLING_NOT_ENABLED,
    message: 'Feature requires billing to be enabled.',
  },
  CLAIMS_TOO_LARGE: {
    code: AuthErrorCode.CLAIMS_TOO_LARGE,
    message: 'Developer claims maximum payload size exceeded.',
  },
  CONFIGURATION_EXISTS: {
    code: AuthErrorCode.CONFIGURATION_EXISTS,
    message: 'A configuration already exists with the provided identifier.',
  },
  CONFIGURATION_NOT_FOUND: {
    code: AuthErrorCode.CONFIGURATION_NOT_FOUND,
    message: 'There is no configuration corresponding to the provided identifier.',
  },
  ID_TOKEN_EXPIRED: {
    code: AuthErrorCode.ID_TOKEN_EXPIRED,
    message: 'The provided Firebase ID token is expired.',
  },
  INVALID_ARGUMENT: {
    code: AuthErrorCode.INVALID_ARGUMENT,
    message: 'Invalid argument provided.',
  },
  INVALID_CONFIG: {
    code: AuthErrorCode.INVALID_CONFIG,
    message: 'The provided configuration is invalid.',
  },
  EMAIL_ALREADY_EXISTS: {
    code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
    message: 'The email address is already in use by another account.',
  },
  EMAIL_NOT_FOUND: {
    code: AuthErrorCode.EMAIL_NOT_FOUND,
    message: 'There is no user record corresponding to the provided email.',
  },
  FORBIDDEN_CLAIM: {
    code: AuthErrorCode.FORBIDDEN_CLAIM,
    message: 'The specified developer claim is reserved and cannot be specified.',
  },
  INVALID_ID_TOKEN: {
    code: AuthErrorCode.INVALID_ID_TOKEN,
    message: 'The provided ID token is not a valid Firebase ID token.',
  },
  ID_TOKEN_REVOKED: {
    code: AuthErrorCode.ID_TOKEN_REVOKED,
    message: 'The Firebase ID token has been revoked.',
  },
  INTERNAL_ERROR: {
    code: AuthErrorCode.INTERNAL_ERROR,
    message: 'An internal error has occurred.',
  },
  INVALID_CLAIMS: {
    code: AuthErrorCode.INVALID_CLAIMS,
    message: 'The provided custom claim attributes are invalid.',
  },
  INVALID_CONTINUE_URI: {
    code: AuthErrorCode.INVALID_CONTINUE_URI,
    message: 'The continue URL must be a valid URL string.',
  },
  INVALID_CREATION_TIME: {
    code: AuthErrorCode.INVALID_CREATION_TIME,
    message: 'The creation time must be a valid UTC date string.',
  },
  INVALID_CREDENTIAL: {
    code: AuthErrorCode.INVALID_CREDENTIAL,
    message: 'Invalid credential object provided.',
  },
  INVALID_DISABLED_FIELD: {
    code: AuthErrorCode.INVALID_DISABLED_FIELD,
    message: 'The disabled field must be a boolean.',
  },
  INVALID_DISPLAY_NAME: {
    code: AuthErrorCode.INVALID_DISPLAY_NAME,
    message: 'The displayName field must be a valid string.',
  },
  INVALID_DYNAMIC_LINK_DOMAIN: {
    code: AuthErrorCode.INVALID_DYNAMIC_LINK_DOMAIN,
    message: 'The provided dynamic link domain is not configured or authorized for the current project.',
  },
  INVALID_HOSTING_LINK_DOMAIN: {
    code: AuthErrorCode.INVALID_HOSTING_LINK_DOMAIN,
    message: 'The provided hosting link domain is not configured in Firebase Hosting or ' +
      'is not owned by the current project.',
  },
  INVALID_EMAIL_VERIFIED: {
    code: AuthErrorCode.INVALID_EMAIL_VERIFIED,
    message: 'The emailVerified field must be a boolean.',
  },
  INVALID_EMAIL: {
    code: AuthErrorCode.INVALID_EMAIL,
    message: 'The email address is improperly formatted.',
  },
  INVALID_NEW_EMAIL: {
    code: AuthErrorCode.INVALID_NEW_EMAIL,
    message: 'The new email address is improperly formatted.',
  },
  INVALID_ENROLLED_FACTORS: {
    code: AuthErrorCode.INVALID_ENROLLED_FACTORS,
    message: 'The enrolled factors must be a valid array of MultiFactorInfo objects.',
  },
  INVALID_ENROLLMENT_TIME: {
    code: AuthErrorCode.INVALID_ENROLLMENT_TIME,
    message: 'The second factor enrollment time must be a valid UTC date string.',
  },
  INVALID_HASH_ALGORITHM: {
    code: AuthErrorCode.INVALID_HASH_ALGORITHM,
    message: 'The hash algorithm must match one of the strings in the list of supported algorithms.',
  },
  INVALID_HASH_BLOCK_SIZE: {
    code: AuthErrorCode.INVALID_HASH_BLOCK_SIZE,
    message: 'The hash block size must be a valid number.',
  },
  INVALID_HASH_DERIVED_KEY_LENGTH: {
    code: AuthErrorCode.INVALID_HASH_DERIVED_KEY_LENGTH,
    message: 'The hash derived key length must be a valid number.',
  },
  INVALID_HASH_KEY: {
    code: AuthErrorCode.INVALID_HASH_KEY,
    message: 'The hash key must a valid byte buffer.',
  },
  INVALID_HASH_MEMORY_COST: {
    code: AuthErrorCode.INVALID_HASH_MEMORY_COST,
    message: 'The hash memory cost must be a valid number.',
  },
  INVALID_HASH_PARALLELIZATION: {
    code: AuthErrorCode.INVALID_HASH_PARALLELIZATION,
    message: 'The hash parallelization must be a valid number.',
  },
  INVALID_HASH_ROUNDS: {
    code: AuthErrorCode.INVALID_HASH_ROUNDS,
    message: 'The hash rounds must be a valid number.',
  },
  INVALID_HASH_SALT_SEPARATOR: {
    code: AuthErrorCode.INVALID_HASH_SALT_SEPARATOR,
    message: 'The hashing algorithm salt separator field must be a valid byte buffer.',
  },
  INVALID_LAST_SIGN_IN_TIME: {
    code: AuthErrorCode.INVALID_LAST_SIGN_IN_TIME,
    message: 'The last sign-in time must be a valid UTC date string.',
  },
  INVALID_NAME: {
    code: AuthErrorCode.INVALID_NAME,
    message: 'The resource name provided is invalid.',
  },
  INVALID_OAUTH_CLIENT_ID: {
    code: AuthErrorCode.INVALID_OAUTH_CLIENT_ID,
    message: 'The provided OAuth client ID is invalid.',
  },
  INVALID_PAGE_TOKEN: {
    code: AuthErrorCode.INVALID_PAGE_TOKEN,
    message: 'The page token must be a valid non-empty string.',
  },
  INVALID_PASSWORD: {
    code: AuthErrorCode.INVALID_PASSWORD,
    message: 'The password must be a string with at least 6 characters.',
  },
  INVALID_PASSWORD_HASH: {
    code: AuthErrorCode.INVALID_PASSWORD_HASH,
    message: 'The password hash must be a valid byte buffer.',
  },
  INVALID_PASSWORD_SALT: {
    code: AuthErrorCode.INVALID_PASSWORD_SALT,
    message: 'The password salt must be a valid byte buffer.',
  },
  INVALID_PHONE_NUMBER: {
    code: AuthErrorCode.INVALID_PHONE_NUMBER,
    message: 'The phone number must be a non-empty E.164 standard compliant identifier string.',
  },
  INVALID_PHOTO_URL: {
    code: AuthErrorCode.INVALID_PHOTO_URL,
    message: 'The photoURL field must be a valid URL.',
  },
  INVALID_PROJECT_ID: {
    code: AuthErrorCode.INVALID_PROJECT_ID,
    message: 'Invalid parent project. Either parent project doesn\'t exist or didn\'t enable multi-tenancy.',
  },
  INVALID_PROVIDER_DATA: {
    code: AuthErrorCode.INVALID_PROVIDER_DATA,
    message: 'The providerData must be a valid array of UserInfo objects.',
  },
  INVALID_PROVIDER_ID: {
    code: AuthErrorCode.INVALID_PROVIDER_ID,
    message: 'The providerId must be a valid supported provider identifier string.',
  },
  INVALID_PROVIDER_UID: {
    code: AuthErrorCode.INVALID_PROVIDER_UID,
    message: 'The providerUid must be a valid provider uid string.',
  },
  INVALID_OAUTH_RESPONSETYPE: {
    code: AuthErrorCode.INVALID_OAUTH_RESPONSETYPE,
    message: 'Only exactly one OAuth responseType should be set to true.',
  },
  INVALID_SESSION_COOKIE_DURATION: {
    code: AuthErrorCode.INVALID_SESSION_COOKIE_DURATION,
    message: 'The session cookie duration must be a valid number in milliseconds between 5 minutes and 2 weeks.',
  },
  INVALID_TENANT_ID: {
    code: AuthErrorCode.INVALID_TENANT_ID,
    message: 'The tenant ID must be a valid non-empty string.',
  },
  INVALID_TENANT_TYPE: {
    code: AuthErrorCode.INVALID_TENANT_TYPE,
    message: 'Tenant type must be either "full_service" or "lightweight".',
  },
  INVALID_TESTING_PHONE_NUMBER: {
    code: AuthErrorCode.INVALID_TESTING_PHONE_NUMBER,
    message: 'Invalid testing phone number or invalid test code provided.',
  },
  INVALID_UID: {
    code: AuthErrorCode.INVALID_UID,
    message: 'The uid must be a non-empty string with at most 128 characters.',
  },
  INVALID_USER_IMPORT: {
    code: AuthErrorCode.INVALID_USER_IMPORT,
    message: 'The user record to import is invalid.',
  },
  INVALID_TOKENS_VALID_AFTER_TIME: {
    code: AuthErrorCode.INVALID_TOKENS_VALID_AFTER_TIME,
    message: 'The tokensValidAfterTime must be a valid UTC number in seconds.',
  },
  MISMATCHING_TENANT_ID: {
    code: AuthErrorCode.MISMATCHING_TENANT_ID,
    message: 'User tenant ID does not match with the current TenantAwareAuth tenant ID.',
  },
  MISSING_ANDROID_PACKAGE_NAME: {
    code: AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME,
    message: 'An Android Package Name must be provided if the Android App is required to be installed.',
  },
  MISSING_CONFIG: {
    code: AuthErrorCode.MISSING_CONFIG,
    message: 'The provided configuration is missing required attributes.',
  },
  MISSING_CONTINUE_URI: {
    code: AuthErrorCode.MISSING_CONTINUE_URI,
    message: 'A valid continue URL must be provided in the request.',
  },
  MISSING_DISPLAY_NAME: {
    code: AuthErrorCode.MISSING_DISPLAY_NAME,
    message: 'The resource being created or edited is missing a valid display name.',
  },
  MISSING_EMAIL: {
    code: AuthErrorCode.MISSING_EMAIL,
    message: 'The email is required for the specified action. For example, a multi-factor ' +
      'user requires a verified email.',
  },
  MISSING_IOS_BUNDLE_ID: {
    code: AuthErrorCode.MISSING_IOS_BUNDLE_ID,
    message: 'The request is missing an iOS Bundle ID.',
  },
  MISSING_ISSUER: {
    code: AuthErrorCode.MISSING_ISSUER,
    message: 'The OAuth/OIDC configuration issuer must not be empty.',
  },
  MISSING_HASH_ALGORITHM: {
    code: AuthErrorCode.MISSING_HASH_ALGORITHM,
    message: 'Importing users with password hashes requires that the hashing algorithm and its parameters be provided.',
  },
  MISSING_OAUTH_CLIENT_ID: {
    code: AuthErrorCode.MISSING_OAUTH_CLIENT_ID,
    message: 'The OAuth/OIDC configuration client ID must not be empty.',
  },
  MISSING_OAUTH_CLIENT_SECRET: {
    code: AuthErrorCode.MISSING_OAUTH_CLIENT_SECRET,
    message: 'The OAuth configuration client secret is required to enable OIDC code flow.',
  },
  MISSING_PROVIDER_ID: {
    code: AuthErrorCode.MISSING_PROVIDER_ID,
    message: 'A valid provider ID must be provided in the request.',
  },
  MISSING_SAML_RELYING_PARTY_CONFIG: {
    code: AuthErrorCode.MISSING_SAML_RELYING_PARTY_CONFIG,
    message: 'The SAML configuration provided is missing a relying party configuration.',
  },
  MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED: {
    code: AuthErrorCode.MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED,
    message: 'The maximum allowed number of test phone number / code pairs has been exceeded.',
  },
  MAXIMUM_USER_COUNT_EXCEEDED: {
    code: AuthErrorCode.MAXIMUM_USER_COUNT_EXCEEDED,
    message: 'The maximum allowed number of users to import has been exceeded.',
  },
  MISSING_UID: {
    code: AuthErrorCode.MISSING_UID,
    message: 'A uid identifier is required for the current operation.',
  },
  OPERATION_NOT_ALLOWED: {
    code: AuthErrorCode.OPERATION_NOT_ALLOWED,
    message: 'The given sign-in provider is disabled for this Firebase project. Enable it in the ' +
      'Firebase console, under the sign-in method tab of the Auth section.',
  },
  PHONE_NUMBER_ALREADY_EXISTS: {
    code: AuthErrorCode.PHONE_NUMBER_ALREADY_EXISTS,
    message: 'The user with the provided phone number already exists.',
  },
  PROJECT_NOT_FOUND: {
    code: AuthErrorCode.PROJECT_NOT_FOUND,
    message: 'No Firebase project was found for the provided credential.',
  },
  INSUFFICIENT_PERMISSION: {
    code: AuthErrorCode.INSUFFICIENT_PERMISSION,
    message: 'Credential implementation provided to initializeApp() via the "credential" property has insufficient permission to access the requested resource. See https://firebase.google.com/docs/admin/setup for details on how to authenticate this SDK with appropriate permissions.',
  },
  QUOTA_EXCEEDED: {
    code: AuthErrorCode.QUOTA_EXCEEDED,
    message: 'The project quota for the specified operation has been exceeded.',
  },
  SECOND_FACTOR_LIMIT_EXCEEDED: {
    code: AuthErrorCode.SECOND_FACTOR_LIMIT_EXCEEDED,
    message: 'The maximum number of allowed second factors on a user has been exceeded.',
  },
  SECOND_FACTOR_UID_ALREADY_EXISTS: {
    code: AuthErrorCode.SECOND_FACTOR_UID_ALREADY_EXISTS,
    message: 'The specified second factor "uid" already exists.',
  },
  SESSION_COOKIE_EXPIRED: {
    code: AuthErrorCode.SESSION_COOKIE_EXPIRED,
    message: 'The Firebase session cookie is expired.',
  },
  SESSION_COOKIE_REVOKED: {
    code: AuthErrorCode.SESSION_COOKIE_REVOKED,
    message: 'The Firebase session cookie has been revoked.',
  },
  TENANT_NOT_FOUND: {
    code: AuthErrorCode.TENANT_NOT_FOUND,
    message: 'There is no tenant corresponding to the provided identifier.',
  },
  UID_ALREADY_EXISTS: {
    code: AuthErrorCode.UID_ALREADY_EXISTS,
    message: 'The user with the provided uid already exists.',
  },
  UNAUTHORIZED_DOMAIN: {
    code: AuthErrorCode.UNAUTHORIZED_DOMAIN,
    message: 'The domain of the continue URL is not whitelisted. Whitelist the domain in the Firebase console.',
  },
  UNSUPPORTED_FIRST_FACTOR: {
    code: AuthErrorCode.UNSUPPORTED_FIRST_FACTOR,
    message: 'A multi-factor user requires a supported first factor.',
  },
  UNSUPPORTED_SECOND_FACTOR: {
    code: AuthErrorCode.UNSUPPORTED_SECOND_FACTOR,
    message: 'The request specified an unsupported type of second factor.',
  },
  UNSUPPORTED_TENANT_OPERATION: {
    code: AuthErrorCode.UNSUPPORTED_TENANT_OPERATION,
    message: 'This operation is not supported in a multi-tenant context.',
  },
  UNVERIFIED_EMAIL: {
    code: AuthErrorCode.UNVERIFIED_EMAIL,
    message: 'A verified email is required for the specified action. For example, a ' +
      'multi-factor user requires a verified email.',
  },
  USER_NOT_FOUND: {
    code: AuthErrorCode.USER_NOT_FOUND,
    message: 'There is no user record corresponding to the provided identifier.',
  },
  NOT_FOUND: {
    code: AuthErrorCode.NOT_FOUND,
    message: 'The requested resource was not found.',
  },
  USER_DISABLED: {
    code: AuthErrorCode.USER_DISABLED,
    message: 'The user record is disabled.',
  },
  USER_NOT_DISABLED: {
    code: AuthErrorCode.USER_NOT_DISABLED,
    message: 'The user must be disabled in order to bulk delete it (or you must pass force=true).',
  },
  INVALID_RECAPTCHA_ACTION: {
    code: AuthErrorCode.INVALID_RECAPTCHA_ACTION,
    message: 'reCAPTCHA action must be "BLOCK".',
  },
  INVALID_RECAPTCHA_ENFORCEMENT_STATE: {
    code: AuthErrorCode.INVALID_RECAPTCHA_ENFORCEMENT_STATE,
    message: 'reCAPTCHA enforcement state must be either "OFF", "AUDIT" or "ENFORCE".',
  },
  RECAPTCHA_NOT_ENABLED: {
    code: AuthErrorCode.RECAPTCHA_NOT_ENABLED,
    message: 'reCAPTCHA enterprise is not enabled.',
  },
};

/** @const {Record<string, keyof typeof AuthErrorCode>} Auth server to client enum error codes. */
const AUTH_SERVER_TO_CLIENT_CODE: Record<string, keyof typeof AuthErrorCode> = {
  // Feature being configured or used requires a billing account.
  BILLING_NOT_ENABLED: 'BILLING_NOT_ENABLED',
  // Claims payload is too large.
  CLAIMS_TOO_LARGE: 'CLAIMS_TOO_LARGE',
  // Configuration being added already exists.
  CONFIGURATION_EXISTS: 'CONFIGURATION_EXISTS',
  // Configuration not found.
  CONFIGURATION_NOT_FOUND: 'CONFIGURATION_NOT_FOUND',
  // Provided credential has insufficient permissions.
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  // Provided configuration has invalid fields.
  INVALID_CONFIG: 'INVALID_CONFIG',
  // Provided configuration identifier is invalid.
  INVALID_CONFIG_ID: 'INVALID_PROVIDER_ID',
  // ActionCodeSettings missing continue URL.
  INVALID_CONTINUE_URI: 'INVALID_CONTINUE_URI',
  // Dynamic link domain in provided ActionCodeSettings is not authorized.
  INVALID_DYNAMIC_LINK_DOMAIN: 'INVALID_DYNAMIC_LINK_DOMAIN',
  // Hosting link domain in provided ActionCodeSettings is not owned by the current project.
  INVALID_HOSTING_LINK_DOMAIN: 'INVALID_HOSTING_LINK_DOMAIN',
  // uploadAccount provides an email that already exists.
  DUPLICATE_EMAIL: 'EMAIL_ALREADY_EXISTS',
  // uploadAccount provides a localId that already exists.
  DUPLICATE_LOCAL_ID: 'UID_ALREADY_EXISTS',
  // Request specified a multi-factor enrollment ID that already exists.
  DUPLICATE_MFA_ENROLLMENT_ID: 'SECOND_FACTOR_UID_ALREADY_EXISTS',
  // setAccountInfo email already exists.
  EMAIL_EXISTS: 'EMAIL_ALREADY_EXISTS',
  // /accounts:sendOobCode for password reset when user is not found.
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  // Reserved claim name.
  FORBIDDEN_CLAIM: 'FORBIDDEN_CLAIM',
  // Invalid claims provided.
  INVALID_CLAIMS: 'INVALID_CLAIMS',
  // Invalid session cookie duration.
  INVALID_DURATION: 'INVALID_SESSION_COOKIE_DURATION',
  // Invalid email provided.
  INVALID_EMAIL: 'INVALID_EMAIL',
  // Invalid new email provided.
  INVALID_NEW_EMAIL: 'INVALID_NEW_EMAIL',
  // Invalid tenant display name. This can be thrown on CreateTenant and UpdateTenant.
  INVALID_DISPLAY_NAME: 'INVALID_DISPLAY_NAME',
  // Invalid ID token provided.
  INVALID_ID_TOKEN: 'INVALID_ID_TOKEN',
  // Invalid tenant/parent resource name.
  INVALID_NAME: 'INVALID_NAME',
  // OIDC configuration has an invalid OAuth client ID.
  INVALID_OAUTH_CLIENT_ID: 'INVALID_OAUTH_CLIENT_ID',
  // Invalid page token.
  INVALID_PAGE_SELECTION: 'INVALID_PAGE_TOKEN',
  // Invalid phone number.
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  // Invalid agent project. Either agent project doesn't exist or didn't enable multi-tenancy.
  INVALID_PROJECT_ID: 'INVALID_PROJECT_ID',
  // Invalid provider ID.
  INVALID_PROVIDER_ID: 'INVALID_PROVIDER_ID',
  // Invalid service account.
  INVALID_SERVICE_ACCOUNT: 'INVALID_CREDENTIAL',
  // Invalid testing phone number.
  INVALID_TESTING_PHONE_NUMBER: 'INVALID_TESTING_PHONE_NUMBER',
  // Invalid tenant type.
  INVALID_TENANT_TYPE: 'INVALID_TENANT_TYPE',
  // Missing Android package name.
  MISSING_ANDROID_PACKAGE_NAME: 'MISSING_ANDROID_PACKAGE_NAME',
  // Missing configuration.
  MISSING_CONFIG: 'MISSING_CONFIG',
  // Missing configuration identifier.
  MISSING_CONFIG_ID: 'MISSING_PROVIDER_ID',
  // Missing tenant display name: This can be thrown on CreateTenant and UpdateTenant.
  MISSING_DISPLAY_NAME: 'MISSING_DISPLAY_NAME',
  // Email is required for the specified action. For example a multi-factor user requires
  // a verified email.
  MISSING_EMAIL: 'MISSING_EMAIL',
  // Missing iOS bundle ID.
  MISSING_IOS_BUNDLE_ID: 'MISSING_IOS_BUNDLE_ID',
  // Missing OIDC issuer.
  MISSING_ISSUER: 'MISSING_ISSUER',
  // No localId provided (deleteAccount missing localId).
  MISSING_LOCAL_ID: 'MISSING_UID',
  // OIDC configuration is missing an OAuth client ID.
  MISSING_OAUTH_CLIENT_ID: 'MISSING_OAUTH_CLIENT_ID',
  // Missing provider ID.
  MISSING_PROVIDER_ID: 'MISSING_PROVIDER_ID',
  // Missing SAML RP config.
  MISSING_SAML_RELYING_PARTY_CONFIG: 'MISSING_SAML_RELYING_PARTY_CONFIG',
  // Empty user list in uploadAccount.
  MISSING_USER_ACCOUNT: 'MISSING_UID',
  // Password auth disabled in console.
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  // Provided credential has insufficient permissions.
  PERMISSION_DENIED: 'INSUFFICIENT_PERMISSION',
  // Phone number already exists.
  PHONE_NUMBER_EXISTS: 'PHONE_NUMBER_ALREADY_EXISTS',
  // Project not found.
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  // In multi-tenancy context: project creation quota exceeded.
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  // Currently only 5 second factors can be set on the same user.
  SECOND_FACTOR_LIMIT_EXCEEDED: 'SECOND_FACTOR_LIMIT_EXCEEDED',
  // Tenant not found.
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  // Tenant ID mismatch.
  TENANT_ID_MISMATCH: 'MISMATCHING_TENANT_ID',
  // Token expired error.
  TOKEN_EXPIRED: 'ID_TOKEN_EXPIRED',
  // Continue URL provided in ActionCodeSettings has a domain that is not whitelisted.
  UNAUTHORIZED_DOMAIN: 'UNAUTHORIZED_DOMAIN',
  // A multi-factor user requires a supported first factor.
  UNSUPPORTED_FIRST_FACTOR: 'UNSUPPORTED_FIRST_FACTOR',
  // The request specified an unsupported type of second factor.
  UNSUPPORTED_SECOND_FACTOR: 'UNSUPPORTED_SECOND_FACTOR',
  // Operation is not supported in a multi-tenant context.
  UNSUPPORTED_TENANT_OPERATION: 'UNSUPPORTED_TENANT_OPERATION',
  // A verified email is required for the specified action. For example a multi-factor user
  // requires a verified email.
  UNVERIFIED_EMAIL: 'UNVERIFIED_EMAIL',
  // User on which action is to be performed is not found.
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // User record is disabled.
  USER_DISABLED: 'USER_DISABLED',
  // Password provided is too weak.
  WEAK_PASSWORD: 'INVALID_PASSWORD',
  // Unrecognized reCAPTCHA action.
  INVALID_RECAPTCHA_ACTION: 'INVALID_RECAPTCHA_ACTION',
  // Unrecognized reCAPTCHA enforcement state.
  INVALID_RECAPTCHA_ENFORCEMENT_STATE: 'INVALID_RECAPTCHA_ENFORCEMENT_STATE',
  // reCAPTCHA is not enabled for account defender.
  RECAPTCHA_NOT_ENABLED: 'RECAPTCHA_NOT_ENABLED'
};

/**
 * Firebase Auth error code structure. This extends FirebaseError.
 */
export class FirebaseAuthError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'auth';

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
    super({
      code: `auth/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

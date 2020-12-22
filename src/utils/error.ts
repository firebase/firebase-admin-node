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

import { FirebaseError as FireabseErrorInterface } from '../firebase-namespace-api';
import { deepCopy } from '../utils/deep-copy';

/**
 * Defines error info type. This includes a code and message string.
 */
export interface ErrorInfo {
  code: string;
  message: string;
}

/**
 * Defines a type that stores all server to client codes (string enum).
 */
interface ServerToClientCode {
  [code: string]: string;
}

/**
 * Firebase error code structure. This extends Error.
 *
 * @param {ErrorInfo} errorInfo The error information (code and message).
 * @constructor
 */
export class FirebaseError extends Error implements FireabseErrorInterface {
  constructor(private errorInfo: ErrorInfo) {
    super(errorInfo.message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseError.prototype;
  }

  /** @return {string} The error code. */
  public get code(): string {
    return this.errorInfo.code;
  }

  /** @return {string} The error message. */
  public get message(): string {
    return this.errorInfo.message;
  }

  /** @return {object} The object representation of the error. */
  public toJSON(): object {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * A FirebaseError with a prefix in front of the error code.
 *
 * @param {string} codePrefix The prefix to apply to the error code.
 * @param {string} code The error code.
 * @param {string} message The error message.
 * @constructor
 */
export class PrefixedFirebaseError extends FirebaseError {
  constructor(private codePrefix: string, code: string, message: string) {
    super({
      code: `${codePrefix}/${code}`,
      message,
    });

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = PrefixedFirebaseError.prototype;
  }

  /**
   * Allows the error type to be checked without needing to know implementation details
   * of the code prefixing.
   *
   * @param {string} code The non-prefixed error code to test against.
   * @return {boolean} True if the code matches, false otherwise.
   */
  public hasCode(code: string): boolean {
    return `${this.codePrefix}/${code}` === this.code;
  }
}

/**
 * Firebase App error code structure. This extends PrefixedFirebaseError.
 *
 * @param {string} code The error code.
 * @param {string} message The error message.
 * @constructor
 */
export class FirebaseAppError extends PrefixedFirebaseError {
  constructor(code: string, message: string) {
    super('app', code, message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseAppError.prototype;
  }
}

/**
 * Firebase Auth error code structure. This extends PrefixedFirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default
 *     message if provided.
 * @constructor
 */
export class FirebaseAuthError extends PrefixedFirebaseError {
  /**
   * Creates the developer-facing error corresponding to the backend error code.
   *
   * @param {string} serverErrorCode The server error code.
   * @param {string} [message] The error message. The default message is used
   *     if not provided.
   * @param {object} [rawServerResponse] The error's raw server response.
   * @return {FirebaseAuthError} The corresponding developer-facing error.
   */
  public static fromServerError(
    serverErrorCode: string,
    message?: string,
    rawServerResponse?: object,
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
    const error: ErrorInfo = deepCopy((AuthClientErrorCode as any)[clientCodeKey]);
    // Server detailed message should have highest priority.
    error.message = customMessage || message || error.message;

    if (clientCodeKey === 'INTERNAL_ERROR' && typeof rawServerResponse !== 'undefined') {
      try {
        error.message += ` Raw server response: "${ JSON.stringify(rawServerResponse) }"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    return new FirebaseAuthError(error);
  }

  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('auth', info.code, message || info.message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseAuthError.prototype;
  }
}

/**
 * Firebase Database error code structure. This extends FirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default
 *     message if provided.
 * @constructor
 */
export class FirebaseDatabaseError extends FirebaseError {
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({ code: 'database/' + info.code, message: message || info.message });
  }
}

/**
 * Firebase Firestore error code structure. This extends FirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default
 *     message if provided.
 * @constructor
 */
export class FirebaseFirestoreError extends FirebaseError {
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({ code: 'firestore/' + info.code, message: message || info.message });
  }
}

/**
 * Firebase instance ID error code structure. This extends FirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default
 *     message if provided.
 * @constructor
 */
export class FirebaseInstanceIdError extends FirebaseError {
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({ code: 'instance-id/' + info.code, message: message || info.message });
  }
}


/**
 * Firebase Messaging error code structure. This extends PrefixedFirebaseError.
 *
 * @param {ErrorInfo} info The error code info.
 * @param {string} [message] The error message. This will override the default message if provided.
 * @constructor
 */
export class FirebaseMessagingError extends PrefixedFirebaseError {
  /**
   * Creates the developer-facing error corresponding to the backend error code.
   *
   * @param {string} serverErrorCode The server error code.
   * @param {string} [message] The error message. The default message is used
   *     if not provided.
   * @param {object} [rawServerResponse] The error's raw server response.
   * @return {FirebaseMessagingError} The corresponding developer-facing error.
   */
  public static fromServerError(
    serverErrorCode: string | null,
    message?: string | null,
    rawServerResponse?: object,
  ): FirebaseMessagingError {
    // If not found, default to unknown error.
    let clientCodeKey = 'UNKNOWN_ERROR';
    if (serverErrorCode && serverErrorCode in MESSAGING_SERVER_TO_CLIENT_CODE) {
      clientCodeKey = MESSAGING_SERVER_TO_CLIENT_CODE[serverErrorCode];
    }
    const error: ErrorInfo = deepCopy((MessagingClientErrorCode as any)[clientCodeKey]);
    error.message = message || error.message;

    if (clientCodeKey === 'UNKNOWN_ERROR' && typeof rawServerResponse !== 'undefined') {
      try {
        error.message += ` Raw server response: "${ JSON.stringify(rawServerResponse) }"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    return new FirebaseMessagingError(error);
  }

  public static fromTopicManagementServerError(
    serverErrorCode: string,
    message?: string,
    rawServerResponse?: object,
  ): FirebaseMessagingError {
    // If not found, default to unknown error.
    const clientCodeKey = TOPIC_MGT_SERVER_TO_CLIENT_CODE[serverErrorCode] || 'UNKNOWN_ERROR';
    const error: ErrorInfo = deepCopy((MessagingClientErrorCode as any)[clientCodeKey]);
    error.message = message || error.message;

    if (clientCodeKey === 'UNKNOWN_ERROR' && typeof rawServerResponse !== 'undefined') {
      try {
        error.message += ` Raw server response: "${ JSON.stringify(rawServerResponse) }"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    return new FirebaseMessagingError(error);
  }

  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('messaging', info.code, message || info.message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseMessagingError.prototype;
  }
}

/**
 * Firebase project management error code structure. This extends PrefixedFirebaseError.
 *
 * @param {ProjectManagementErrorCode} code The error code.
 * @param {string} message The error message.
 * @constructor
 */
export class FirebaseProjectManagementError extends PrefixedFirebaseError {
  constructor(code: ProjectManagementErrorCode, message: string) {
    super('project-management', code, message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseProjectManagementError.prototype;
  }
}

/**
 * App client error codes and their default messages.
 */
export class AppErrorCodes {
  public static APP_DELETED = 'app-deleted';
  public static DUPLICATE_APP = 'duplicate-app';
  public static INVALID_ARGUMENT = 'invalid-argument';
  public static INTERNAL_ERROR = 'internal-error';
  public static INVALID_APP_NAME = 'invalid-app-name';
  public static INVALID_APP_OPTIONS = 'invalid-app-options';
  public static INVALID_CREDENTIAL = 'invalid-credential';
  public static NETWORK_ERROR = 'network-error';
  public static NETWORK_TIMEOUT = 'network-timeout';
  public static NO_APP = 'no-app';
  public static UNABLE_TO_PARSE_RESPONSE = 'unable-to-parse-response';
}

/**
 * Auth client error codes and their default messages.
 */
export class AuthClientErrorCode {
  public static BILLING_NOT_ENABLED = {
    code: 'billing-not-enabled',
    message: 'Feature requires billing to be enabled.',
  };
  public static CLAIMS_TOO_LARGE = {
    code: 'claims-too-large',
    message: 'Developer claims maximum payload size exceeded.',
  };
  public static CONFIGURATION_EXISTS = {
    code: 'configuration-exists',
    message: 'A configuration already exists with the provided identifier.',
  };
  public static CONFIGURATION_NOT_FOUND = {
    code: 'configuration-not-found',
    message: 'There is no configuration corresponding to the provided identifier.',
  };
  public static ID_TOKEN_EXPIRED = {
    code: 'id-token-expired',
    message: 'The provided Firebase ID token is expired.',
  };
  public static INVALID_ARGUMENT = {
    code: 'argument-error',
    message: 'Invalid argument provided.',
  };
  public static INVALID_CONFIG = {
    code: 'invalid-config',
    message: 'The provided configuration is invalid.',
  };
  public static EMAIL_ALREADY_EXISTS = {
    code: 'email-already-exists',
    message: 'The email address is already in use by another account.',
  };
  public static FORBIDDEN_CLAIM = {
    code: 'reserved-claim',
    message: 'The specified developer claim is reserved and cannot be specified.',
  };
  public static INVALID_ID_TOKEN = {
    code: 'invalid-id-token',
    message: 'The provided ID token is not a valid Firebase ID token.',
  };
  public static ID_TOKEN_REVOKED = {
    code: 'id-token-revoked',
    message: 'The Firebase ID token has been revoked.',
  };
  public static INTERNAL_ERROR = {
    code: 'internal-error',
    message: 'An internal error has occurred.',
  };
  public static INVALID_CLAIMS = {
    code: 'invalid-claims',
    message: 'The provided custom claim attributes are invalid.',
  };
  public static INVALID_CONTINUE_URI = {
    code: 'invalid-continue-uri',
    message: 'The continue URL must be a valid URL string.',
  };
  public static INVALID_CREATION_TIME = {
    code: 'invalid-creation-time',
    message: 'The creation time must be a valid UTC date string.',
  };
  public static INVALID_CREDENTIAL = {
    code: 'invalid-credential',
    message: 'Invalid credential object provided.',
  };
  public static INVALID_DISABLED_FIELD = {
    code: 'invalid-disabled-field',
    message: 'The disabled field must be a boolean.',
  };
  public static INVALID_DISPLAY_NAME = {
    code: 'invalid-display-name',
    message: 'The displayName field must be a valid string.',
  };
  public static INVALID_DYNAMIC_LINK_DOMAIN = {
    code: 'invalid-dynamic-link-domain',
    message: 'The provided dynamic link domain is not configured or authorized ' +
             'for the current project.',
  };
  public static INVALID_EMAIL_VERIFIED = {
    code: 'invalid-email-verified',
    message: 'The emailVerified field must be a boolean.',
  };
  public static INVALID_EMAIL = {
    code: 'invalid-email',
    message: 'The email address is improperly formatted.',
  };
  public static INVALID_ENROLLED_FACTORS = {
    code: 'invalid-enrolled-factors',
    message: 'The enrolled factors must be a valid array of MultiFactorInfo objects.',
  };
  public static INVALID_ENROLLMENT_TIME = {
    code: 'invalid-enrollment-time',
    message: 'The second factor enrollment time must be a valid UTC date string.',
  };
  public static INVALID_HASH_ALGORITHM = {
    code: 'invalid-hash-algorithm',
    message: 'The hash algorithm must match one of the strings in the list of ' +
             'supported algorithms.',
  };
  public static INVALID_HASH_BLOCK_SIZE = {
    code: 'invalid-hash-block-size',
    message: 'The hash block size must be a valid number.',
  };
  public static INVALID_HASH_DERIVED_KEY_LENGTH = {
    code: 'invalid-hash-derived-key-length',
    message: 'The hash derived key length must be a valid number.',
  };
  public static INVALID_HASH_KEY = {
    code: 'invalid-hash-key',
    message: 'The hash key must a valid byte buffer.',
  };
  public static INVALID_HASH_MEMORY_COST = {
    code: 'invalid-hash-memory-cost',
    message: 'The hash memory cost must be a valid number.',
  };
  public static INVALID_HASH_PARALLELIZATION = {
    code: 'invalid-hash-parallelization',
    message: 'The hash parallelization must be a valid number.',
  };
  public static INVALID_HASH_ROUNDS = {
    code: 'invalid-hash-rounds',
    message: 'The hash rounds must be a valid number.',
  };
  public static INVALID_HASH_SALT_SEPARATOR = {
    code: 'invalid-hash-salt-separator',
    message: 'The hashing algorithm salt separator field must be a valid byte buffer.',
  };
  public static INVALID_LAST_SIGN_IN_TIME = {
    code: 'invalid-last-sign-in-time',
    message: 'The last sign-in time must be a valid UTC date string.',
  };
  public static INVALID_NAME = {
    code: 'invalid-name',
    message: 'The resource name provided is invalid.',
  };
  public static INVALID_OAUTH_CLIENT_ID = {
    code: 'invalid-oauth-client-id',
    message: 'The provided OAuth client ID is invalid.',
  };
  public static INVALID_PAGE_TOKEN = {
    code: 'invalid-page-token',
    message: 'The page token must be a valid non-empty string.',
  };
  public static INVALID_PASSWORD = {
    code: 'invalid-password',
    message: 'The password must be a string with at least 6 characters.',
  };
  public static INVALID_PASSWORD_HASH = {
    code: 'invalid-password-hash',
    message: 'The password hash must be a valid byte buffer.',
  };
  public static INVALID_PASSWORD_SALT = {
    code: 'invalid-password-salt',
    message: 'The password salt must be a valid byte buffer.',
  };
  public static INVALID_PHONE_NUMBER = {
    code: 'invalid-phone-number',
    message: 'The phone number must be a non-empty E.164 standard compliant identifier ' +
      'string.',
  };
  public static INVALID_PHOTO_URL = {
    code: 'invalid-photo-url',
    message: 'The photoURL field must be a valid URL.',
  };
  public static INVALID_PROJECT_ID = {
    code: 'invalid-project-id',
    message: 'Invalid parent project. Either parent project doesn\'t exist or didn\'t enable multi-tenancy.',
  };
  public static INVALID_PROVIDER_DATA = {
    code: 'invalid-provider-data',
    message: 'The providerData must be a valid array of UserInfo objects.',
  };
  public static INVALID_PROVIDER_ID = {
    code: 'invalid-provider-id',
    message: 'The providerId must be a valid supported provider identifier string.',
  };
  public static INVALID_PROVIDER_UID = {
    code: 'invalid-provider-uid',
    message: 'The providerUid must be a valid provider uid string.',
  };
  public static INVALID_SESSION_COOKIE_DURATION = {
    code: 'invalid-session-cookie-duration',
    message: 'The session cookie duration must be a valid number in milliseconds ' +
      'between 5 minutes and 2 weeks.',
  };
  public static INVALID_TENANT_ID = {
    code: 'invalid-tenant-id',
    message: 'The tenant ID must be a valid non-empty string.',
  };
  public static INVALID_TENANT_TYPE = {
    code: 'invalid-tenant-type',
    message: 'Tenant type must be either "full_service" or "lightweight".',
  };
  public static INVALID_TESTING_PHONE_NUMBER = {
    code: 'invalid-testing-phone-number',
    message: 'Invalid testing phone number or invalid test code provided.',
  };
  public static INVALID_UID = {
    code: 'invalid-uid',
    message: 'The uid must be a non-empty string with at most 128 characters.',
  };
  public static INVALID_USER_IMPORT = {
    code: 'invalid-user-import',
    message: 'The user record to import is invalid.',
  };
  public static INVALID_TOKENS_VALID_AFTER_TIME = {
    code: 'invalid-tokens-valid-after-time',
    message: 'The tokensValidAfterTime must be a valid UTC number in seconds.',
  };
  public static MISMATCHING_TENANT_ID = {
    code: 'mismatching-tenant-id',
    message: 'User tenant ID does not match with the current TenantAwareAuth tenant ID.',
  };
  public static MISSING_ANDROID_PACKAGE_NAME = {
    code: 'missing-android-pkg-name',
    message: 'An Android Package Name must be provided if the Android App is ' +
             'required to be installed.',
  };
  public static MISSING_CONFIG = {
    code: 'missing-config',
    message: 'The provided configuration is missing required attributes.',
  };
  public static MISSING_CONTINUE_URI = {
    code: 'missing-continue-uri',
    message: 'A valid continue URL must be provided in the request.',
  };
  public static MISSING_DISPLAY_NAME = {
    code: 'missing-display-name',
    message: 'The resource being created or edited is missing a valid display name.',
  };
  public static MISSING_EMAIL = {
    code: 'missing-email',
    message: 'The email is required for the specified action. For example, a multi-factor user ' +
             'requires a verified email.',
  };
  public static MISSING_IOS_BUNDLE_ID = {
    code: 'missing-ios-bundle-id',
    message: 'The request is missing an iOS Bundle ID.',
  };
  public static MISSING_ISSUER = {
    code: 'missing-issuer',
    message: 'The OAuth/OIDC configuration issuer must not be empty.',
  };
  public static MISSING_HASH_ALGORITHM = {
    code: 'missing-hash-algorithm',
    message: 'Importing users with password hashes requires that the hashing ' +
             'algorithm and its parameters be provided.',
  };
  public static MISSING_OAUTH_CLIENT_ID = {
    code: 'missing-oauth-client-id',
    message: 'The OAuth/OIDC configuration client ID must not be empty.',
  };
  public static MISSING_PROVIDER_ID = {
    code: 'missing-provider-id',
    message: 'A valid provider ID must be provided in the request.',
  };
  public static MISSING_SAML_RELYING_PARTY_CONFIG = {
    code: 'missing-saml-relying-party-config',
    message: 'The SAML configuration provided is missing a relying party configuration.',
  };
  public static MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED = {
    code: 'test-phone-number-limit-exceeded',
    message: 'The maximum allowed number of test phone number / code pairs has been exceeded.',
  };
  public static MAXIMUM_USER_COUNT_EXCEEDED = {
    code: 'maximum-user-count-exceeded',
    message: 'The maximum allowed number of users to import has been exceeded.',
  };
  public static MISSING_UID = {
    code: 'missing-uid',
    message: 'A uid identifier is required for the current operation.',
  };
  public static OPERATION_NOT_ALLOWED = {
    code: 'operation-not-allowed',
    message: 'The given sign-in provider is disabled for this Firebase project. ' +
        'Enable it in the Firebase console, under the sign-in method tab of the ' +
        'Auth section.',
  };
  public static PHONE_NUMBER_ALREADY_EXISTS = {
    code: 'phone-number-already-exists',
    message: 'The user with the provided phone number already exists.',
  };
  public static PROJECT_NOT_FOUND = {
    code: 'project-not-found',
    message: 'No Firebase project was found for the provided credential.',
  };
  public static INSUFFICIENT_PERMISSION = {
    code: 'insufficient-permission',
    message: 'Credential implementation provided to initializeApp() via the "credential" property ' +
      'has insufficient permission to access the requested resource. See ' +
      'https://firebase.google.com/docs/admin/setup for details on how to authenticate this SDK ' +
      'with appropriate permissions.',
  };
  public static QUOTA_EXCEEDED = {
    code: 'quota-exceeded',
    message: 'The project quota for the specified operation has been exceeded.',
  };
  public static SECOND_FACTOR_LIMIT_EXCEEDED = {
    code: 'second-factor-limit-exceeded',
    message: 'The maximum number of allowed second factors on a user has been exceeded.',
  };
  public static SECOND_FACTOR_UID_ALREADY_EXISTS = {
    code: 'second-factor-uid-already-exists',
    message: 'The specified second factor "uid" already exists.',
  };
  public static SESSION_COOKIE_EXPIRED = {
    code: 'session-cookie-expired',
    message: 'The Firebase session cookie is expired.',
  };
  public static SESSION_COOKIE_REVOKED = {
    code: 'session-cookie-revoked',
    message: 'The Firebase session cookie has been revoked.',
  };
  public static TENANT_NOT_FOUND = {
    code: 'tenant-not-found',
    message: 'There is no tenant corresponding to the provided identifier.',
  };
  public static UID_ALREADY_EXISTS = {
    code: 'uid-already-exists',
    message: 'The user with the provided uid already exists.',
  };
  public static UNAUTHORIZED_DOMAIN = {
    code: 'unauthorized-continue-uri',
    message: 'The domain of the continue URL is not whitelisted. Whitelist the domain in the ' +
             'Firebase console.',
  };
  public static UNSUPPORTED_FIRST_FACTOR = {
    code: 'unsupported-first-factor',
    message: 'A multi-factor user requires a supported first factor.',
  };
  public static UNSUPPORTED_SECOND_FACTOR = {
    code: 'unsupported-second-factor',
    message: 'The request specified an unsupported type of second factor.',
  };
  public static UNSUPPORTED_TENANT_OPERATION = {
    code: 'unsupported-tenant-operation',
    message: 'This operation is not supported in a multi-tenant context.',
  };
  public static UNVERIFIED_EMAIL = {
    code: 'unverified-email',
    message: 'A verified email is required for the specified action. For example, a multi-factor user ' +
             'requires a verified email.',
  };
  public static USER_NOT_FOUND = {
    code: 'user-not-found',
    message: 'There is no user record corresponding to the provided identifier.',
  };
  public static NOT_FOUND = {
    code: 'not-found',
    message: 'The requested resource was not found.',
  };
  public static USER_NOT_DISABLED = {
    code: 'user-not-disabled',
    message: 'The user must be disabled in order to bulk delete it (or you must pass force=true).',
  };
}

/**
 * Messaging client error codes and their default messages.
 */
export class MessagingClientErrorCode {
  public static INVALID_ARGUMENT = {
    code: 'invalid-argument',
    message: 'Invalid argument provided.',
  };
  public static INVALID_RECIPIENT = {
    code: 'invalid-recipient',
    message: 'Invalid message recipient provided.',
  };
  public static INVALID_PAYLOAD = {
    code: 'invalid-payload',
    message: 'Invalid message payload provided.',
  };
  public static INVALID_DATA_PAYLOAD_KEY = {
    code: 'invalid-data-payload-key',
    message: 'The data message payload contains an invalid key. See the reference documentation ' +
      'for the DataMessagePayload type for restricted keys.',
  };
  public static PAYLOAD_SIZE_LIMIT_EXCEEDED = {
    code: 'payload-size-limit-exceeded',
    message: 'The provided message payload exceeds the FCM size limits. See the error documentation ' +
      'for more details.',
  };
  public static INVALID_OPTIONS = {
    code: 'invalid-options',
    message: 'Invalid message options provided.',
  };
  public static INVALID_REGISTRATION_TOKEN = {
    code: 'invalid-registration-token',
    message: 'Invalid registration token provided. Make sure it matches the registration token ' +
      'the client app receives from registering with FCM.',
  };
  public static REGISTRATION_TOKEN_NOT_REGISTERED = {
    code: 'registration-token-not-registered',
    message: 'The provided registration token is not registered. A previously valid registration ' +
      'token can be unregistered for a variety of reasons. See the error documentation for more ' +
      'details. Remove this registration token and stop using it to send messages.',
  };
  public static MISMATCHED_CREDENTIAL = {
    code: 'mismatched-credential',
    message: 'The credential used to authenticate this SDK does not have permission to send ' +
      'messages to the device corresponding to the provided registration token. Make sure the ' +
      'credential and registration token both belong to the same Firebase project.',
  };
  public static INVALID_PACKAGE_NAME = {
    code: 'invalid-package-name',
    message: 'The message was addressed to a registration token whose package name does not match ' +
      'the provided "restrictedPackageName" option.',
  };
  public static DEVICE_MESSAGE_RATE_EXCEEDED = {
    code: 'device-message-rate-exceeded',
    message: 'The rate of messages to a particular device is too high. Reduce the number of ' +
      'messages sent to this device and do not immediately retry sending to this device.',
  };
  public static TOPICS_MESSAGE_RATE_EXCEEDED = {
    code: 'topics-message-rate-exceeded',
    message: 'The rate of messages to subscribers to a particular topic is too high. Reduce the ' +
      'number of messages sent for this topic, and do not immediately retry sending to this topic.',
  };
  public static MESSAGE_RATE_EXCEEDED = {
    code: 'message-rate-exceeded',
    message: 'Sending limit exceeded for the message target.',
  };
  public static THIRD_PARTY_AUTH_ERROR = {
    code: 'third-party-auth-error',
    message: 'A message targeted to an iOS device could not be sent because the required APNs ' +
      'SSL certificate was not uploaded or has expired. Check the validity of your development ' +
      'and production certificates.',
  };
  public static TOO_MANY_TOPICS = {
    code: 'too-many-topics',
    message: 'The maximum number of topics the provided registration token can be subscribed to ' +
      'has been exceeded.',
  };
  public static AUTHENTICATION_ERROR = {
    code: 'authentication-error',
    message: 'An error occurred when trying to authenticate to the FCM servers. Make sure the ' +
      'credential used to authenticate this SDK has the proper permissions. See ' +
      'https://firebase.google.com/docs/admin/setup for setup instructions.',
  };
  public static SERVER_UNAVAILABLE = {
    code: 'server-unavailable',
    message: 'The FCM server could not process the request in time. See the error documentation ' +
      'for more details.',
  };
  public static INTERNAL_ERROR = {
    code: 'internal-error',
    message: 'An internal error has occurred. Please retry the request.',
  };
  public static UNKNOWN_ERROR = {
    code: 'unknown-error',
    message: 'An unknown server error was returned.',
  };
}

export class InstanceIdClientErrorCode {
  public static INVALID_ARGUMENT = {
    code: 'invalid-argument',
    message: 'Invalid argument provided.',
  };
  public static INVALID_PROJECT_ID = {
    code: 'invalid-project-id',
    message: 'Invalid project ID provided.',
  };
  public static INVALID_INSTANCE_ID = {
    code: 'invalid-instance-id',
    message: 'Invalid instance ID provided.',
  };
  public static API_ERROR = {
    code: 'api-error',
    message: 'Instance ID API call failed.',
  };
}

export type ProjectManagementErrorCode =
    'already-exists'
    | 'authentication-error'
    | 'internal-error'
    | 'invalid-argument'
    | 'invalid-project-id'
    | 'invalid-server-response'
    | 'not-found'
    | 'service-unavailable'
    | 'unknown-error';

/** @const {ServerToClientCode} Auth server to client enum error codes. */
const AUTH_SERVER_TO_CLIENT_CODE: ServerToClientCode = {
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
  // uploadAccount provides an email that already exists.
  DUPLICATE_EMAIL: 'EMAIL_ALREADY_EXISTS',
  // uploadAccount provides a localId that already exists.
  DUPLICATE_LOCAL_ID: 'UID_ALREADY_EXISTS',
  // Request specified a multi-factor enrollment ID that already exists.
  DUPLICATE_MFA_ENROLLMENT_ID: 'SECOND_FACTOR_UID_ALREADY_EXISTS',
  // setAccountInfo email already exists.
  EMAIL_EXISTS: 'EMAIL_ALREADY_EXISTS',
  // Reserved claim name.
  FORBIDDEN_CLAIM: 'FORBIDDEN_CLAIM',
  // Invalid claims provided.
  INVALID_CLAIMS: 'INVALID_CLAIMS',
  // Invalid session cookie duration.
  INVALID_DURATION: 'INVALID_SESSION_COOKIE_DURATION',
  // Invalid email provided.
  INVALID_EMAIL: 'INVALID_EMAIL',
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
  INVALID_SERVICE_ACCOUNT: 'INVALID_SERVICE_ACCOUNT',
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
  // Password provided is too weak.
  WEAK_PASSWORD: 'INVALID_PASSWORD',
};

/** @const {ServerToClientCode} Messaging server to client enum error codes. */
const MESSAGING_SERVER_TO_CLIENT_CODE: ServerToClientCode = {
  /* GENERIC ERRORS */
  // Generic invalid message parameter provided.
  InvalidParameters: 'INVALID_ARGUMENT',
  // Mismatched sender ID.
  MismatchSenderId: 'MISMATCHED_CREDENTIAL',
  // FCM server unavailable.
  Unavailable: 'SERVER_UNAVAILABLE',
  // FCM server internal error.
  InternalServerError: 'INTERNAL_ERROR',

  /* SEND ERRORS */
  // Invalid registration token format.
  InvalidRegistration: 'INVALID_REGISTRATION_TOKEN',
  // Registration token is not registered.
  NotRegistered: 'REGISTRATION_TOKEN_NOT_REGISTERED',
  // Registration token does not match restricted package name.
  InvalidPackageName: 'INVALID_PACKAGE_NAME',
  // Message payload size limit exceeded.
  MessageTooBig: 'PAYLOAD_SIZE_LIMIT_EXCEEDED',
  // Invalid key in the data message payload.
  InvalidDataKey: 'INVALID_DATA_PAYLOAD_KEY',
  // Invalid time to live option.
  InvalidTtl: 'INVALID_OPTIONS',
  // Device message rate exceeded.
  DeviceMessageRateExceeded: 'DEVICE_MESSAGE_RATE_EXCEEDED',
  // Topics message rate exceeded.
  TopicsMessageRateExceeded: 'TOPICS_MESSAGE_RATE_EXCEEDED',
  // Invalid APNs credentials.
  InvalidApnsCredential: 'THIRD_PARTY_AUTH_ERROR',

  /* FCM v1 canonical error codes */
  NOT_FOUND: 'REGISTRATION_TOKEN_NOT_REGISTERED',
  PERMISSION_DENIED: 'MISMATCHED_CREDENTIAL',
  RESOURCE_EXHAUSTED: 'MESSAGE_RATE_EXCEEDED',
  UNAUTHENTICATED: 'THIRD_PARTY_AUTH_ERROR',

  /* FCM v1 new error codes */
  APNS_AUTH_ERROR: 'THIRD_PARTY_AUTH_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  QUOTA_EXCEEDED: 'MESSAGE_RATE_EXCEEDED',
  SENDER_ID_MISMATCH: 'MISMATCHED_CREDENTIAL',
  THIRD_PARTY_AUTH_ERROR: 'THIRD_PARTY_AUTH_ERROR',
  UNAVAILABLE: 'SERVER_UNAVAILABLE',
  UNREGISTERED: 'REGISTRATION_TOKEN_NOT_REGISTERED',
  UNSPECIFIED_ERROR: 'UNKNOWN_ERROR',
};

/** @const {ServerToClientCode} Topic management (IID) server to client enum error codes. */
const TOPIC_MGT_SERVER_TO_CLIENT_CODE: ServerToClientCode = {
  /* TOPIC SUBSCRIPTION MANAGEMENT ERRORS */
  NOT_FOUND: 'REGISTRATION_TOKEN_NOT_REGISTERED',
  INVALID_ARGUMENT: 'INVALID_REGISTRATION_TOKEN',
  TOO_MANY_TOPICS: 'TOO_MANY_TOPICS',
  RESOURCE_EXHAUSTED: 'TOO_MANY_TOPICS',
  PERMISSION_DENIED: 'AUTHENTICATION_ERROR',
  DEADLINE_EXCEEDED: 'SERVER_UNAVAILABLE',
  INTERNAL: 'INTERNAL_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

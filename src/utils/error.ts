/*!
 * @license
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

import { BatchResponse } from '../messaging/messaging-api';
import { deepCopy } from '../utils/deep-copy';
import { RequestResponseError, RequestResponse } from './api-request';

/**
 * Represents the raw HTTP response object.
 */
export interface HttpResponse {
  /** The HTTP status code of the response. */
  status: number;
  /** The HTTP headers of the response. */
  headers: { [key: string]: any; };
  /** The response data payload. */
  data?: string | object;
}

/**
 * Maps a RequestResponse to a clean HttpResponse, preserving raw text if not JSON.
 *
 * @param resp - The RequestResponse to map.
 * @returns A clean HttpResponse object.
 * @internal
 */
export function toHttpResponse(resp: RequestResponse): HttpResponse {
  return {
    status: resp.status,
    headers: resp.headers,
    data: resp.isJson() ? resp.data : resp.text,
  };
}

/**
 * Defines error info type. This includes a code and message string.
 */
export interface ErrorInfo {
  /** The string error code. */
  code: string;
  /** The error message. */
  message: string;
  /** The HTTP response associated with this error, if any. */
  httpResponse?: HttpResponse;
  /** The original wrapped error that triggered this error, if any. */
  cause?: Error;
}

/**
 * Defines a type that stores all server to client codes (string enum).
 */
interface ServerToClientCode {
  [code: string]: string;
}

/**
 * `FirebaseError` is a subclass of the standard JavaScript `Error` object. In
 * addition to a message string and stack trace, it contains a string code.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface FirebaseError {
  /**
   * Error codes are strings using the following format: `"service/string-code"`.
   * Some examples include `"auth/invalid-uid"` and
   * `"messaging/invalid-recipient"`.
   *
   * While the message for a given error can change, the code will remain the same
   * between backward-compatible versions of the Firebase SDK.
   */
  code: string;

  /**
   * An explanatory message for the error that just occurred.
   *
   * This message is designed to be helpful to you, the developer. Because
   * it generally does not convey meaningful information to end users,
   * this message should not be displayed in your application.
   */
  message: string;

  /**
   * A string value containing the execution backtrace when the error originally
   * occurred.
   *
   * This information can be useful for troubleshooting the cause of the error with
   * {@link https://firebase.google.com/support | Firebase Support}.
   */
  stack?: string;

  /**
   * The HTTP response associated with this error, if any.
   */
  httpResponse?: HttpResponse;

  /**
   * The original wrapped error that triggered this error, if any.
   */
  cause?: Error;

  /**
   * Returns a JSON-serializable object representation of this error.
   *
   * @returns A JSON-serializable representation of this object.
   */
  toJSON(): object;
}

/**
 * Firebase error code structure. This extends Error.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class FirebaseError extends Error implements FirebaseError {
  /**
   * @param errorInfo - The error information (code and message).
   */
  constructor(errorInfo: ErrorInfo) {
    super(errorInfo.message);
    this.code = errorInfo.code;
    if (errorInfo.cause !== undefined) {
      this.cause = errorInfo.cause;
    }
    if (errorInfo.httpResponse !== undefined) {
      this.httpResponse = errorInfo.httpResponse;
    }

  }

  /** @returns The object representation of the error. */
  public toJSON(): object {
    const json: any = {
      code: this.code,
      message: this.message,
    };
    if (this.httpResponse) {
      json.httpResponse = {
        status: this.httpResponse.status,
        headers: this.httpResponse.headers,
        data: this.httpResponse.data,
      };
    }
    if (this.cause) {
      json.cause = {
        name: this.cause.name || 'Error',
        message: this.cause.message || String(this.cause),
        stack: this.cause.stack
      };
    }
    return json;
  }
}

/**
 * A FirebaseError with a prefix in front of the error code.
 */
export class PrefixedFirebaseError extends FirebaseError {
  /**
   * @param codePrefix - The prefix to apply to the error code.
   * @param code - The error code.
   * @param message - The error message.
   * @internal
   */
  constructor(private codePrefix: string, code: string, message: string, httpResponse?: HttpResponse, cause?: Error) {
    const errorInfo: ErrorInfo = {
      code: `${codePrefix}/${code}`,
      message,
    };
    if (httpResponse !== undefined) {
      errorInfo.httpResponse = httpResponse;
    }
    if (cause !== undefined) {
      errorInfo.cause = cause;
    }
    super(errorInfo);

  }

  /**
   * Allows the error type to be checked without needing to know implementation details
   * of the code prefixing.
   *
   * @param code - The non-prefixed error code to test against.
   * @returns True if the code matches, false otherwise.
   */
  public hasCode(code: string): boolean {
    return `${this.codePrefix}/${code}` === this.code;
  }
}

/**
 * Firebase App error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseAppError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('app', info.code, message || info.message, info.httpResponse, info.cause);

  }
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
    const error: ErrorInfo = deepCopy((AuthClientErrorCode as any)[clientCodeKey]);
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

/**
 * Firebase Database error code structure. This extends FirebaseError.
 */
export class FirebaseDatabaseError extends FirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: 'database/' + info.code,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause
    });
  }
}

/**
 * Firebase Firestore error code structure. This extends FirebaseError.
 */
export class FirebaseFirestoreError extends FirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: 'firestore/' + info.code,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause
    });
  }
}

/**
 * Firebase instance ID error code structure. This extends FirebaseError.
 */
export class FirebaseInstanceIdError extends FirebaseError {
  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: 'instance-id/' + info.code,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause
    });
  }
}

/**
 * Firebase Installations service error code structure. This extends `FirebaseError`.
 */
export class FirebaseInstallationsError extends FirebaseError {
  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: 'installations/' + info.code,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause
    });
  }
}


/**
 * Firebase Messaging error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseMessagingError extends PrefixedFirebaseError {
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
    serverErrorCode: string | null,
    message?: string | null,
    serverError?: RequestResponseError,
  ): FirebaseMessagingError {
    // If not found, default to unknown error.
    let clientCodeKey = 'UNKNOWN_ERROR';
    if (serverErrorCode && serverErrorCode in MESSAGING_SERVER_TO_CLIENT_CODE) {
      clientCodeKey = MESSAGING_SERVER_TO_CLIENT_CODE[serverErrorCode];
    }
    const error: ErrorInfo = deepCopy((MessagingClientErrorCode as any)[clientCodeKey]);
    error.message = message || error.message;

    const rawData = serverError?.response?.data;
    if (clientCodeKey === 'UNKNOWN_ERROR' && typeof rawData !== 'undefined') {
      try {
        error.message += ` Raw server response: "${typeof rawData === 'string' ? rawData : JSON.stringify(rawData)}"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    error.cause = serverError;
    error.httpResponse = serverError?.response ? toHttpResponse(serverError.response) : undefined;
    return new FirebaseMessagingError(error);
  }

  /**
   * @internal
   */
  public static fromTopicManagementServerError(
    serverErrorCode: string,
    message?: string,
    serverError?: RequestResponseError,
  ): FirebaseMessagingError {
    // If not found, default to unknown error.
    const clientCodeKey = TOPIC_MGT_SERVER_TO_CLIENT_CODE[serverErrorCode] || 'UNKNOWN_ERROR';
    const error: ErrorInfo = deepCopy((MessagingClientErrorCode as any)[clientCodeKey]);
    error.message = message || error.message;

    const rawData = serverError?.response?.data;
    if (clientCodeKey === 'UNKNOWN_ERROR' && typeof rawData !== 'undefined') {
      try {
        error.message += ` Raw server response: "${typeof rawData === 'string' ? rawData : JSON.stringify(rawData)}"`;
      } catch (e) {
        // Ignore JSON parsing error.
      }
    }

    error.cause = serverError;
    error.httpResponse = serverError?.response ? toHttpResponse(serverError.response) : undefined;
    return new FirebaseMessagingError(error);
  }

  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('messaging', info.code, message || info.message, info.httpResponse, info.cause);

  }
}

export class FirebaseMessagingSessionError extends FirebaseMessagingError {
  public pendingBatchResponse?: Promise<BatchResponse>;
  /**
     * 
     * @param info - The error code info.
     * @param message - The error message. This will override the default message if provided.
     * @param pendingBatchResponse - BatchResponse for pending messages when session error occured.
     */
  constructor(info: ErrorInfo, message?: string, pendingBatchResponse?: Promise<BatchResponse>) {
    // Override default message if custom message provided.
    super(info, message || info.message);
    this.pendingBatchResponse = pendingBatchResponse;

  }

  /** @returns The object representation of the error. */
  public toJSON(): object {
    return {
      code: this.code,
      message: this.message,
      pendingBatchResponse: this.pendingBatchResponse,
    };
  }
}

/**
 * Firebase project management error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseProjectManagementError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('project-management', info.code, message || info.message, info.httpResponse, info.cause);

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
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthClientErrorCode = {
  AUTH_BLOCKING_TOKEN_EXPIRED: {
    code: 'auth-blocking-token-expired',
    message: 'The provided Firebase Auth Blocking token is expired.',
  },
  BILLING_NOT_ENABLED: {
    code: 'billing-not-enabled',
    message: 'Feature requires billing to be enabled.',
  },
  CLAIMS_TOO_LARGE: {
    code: 'claims-too-large',
    message: 'Developer claims maximum payload size exceeded.',
  },
  CONFIGURATION_EXISTS: {
    code: 'configuration-exists',
    message: 'A configuration already exists with the provided identifier.',
  },
  CONFIGURATION_NOT_FOUND: {
    code: 'configuration-not-found',
    message: 'There is no configuration corresponding to the provided identifier.',
  },
  ID_TOKEN_EXPIRED: {
    code: 'id-token-expired',
    message: 'The provided Firebase ID token is expired.',
  },
  INVALID_ARGUMENT: {
    code: 'argument-error',
    message: 'Invalid argument provided.',
  },
  INVALID_CONFIG: {
    code: 'invalid-config',
    message: 'The provided configuration is invalid.',
  },
  EMAIL_ALREADY_EXISTS: {
    code: 'email-already-exists',
    message: 'The email address is already in use by another account.',
  },
  EMAIL_NOT_FOUND: {
    code: 'email-not-found',
    message: 'There is no user record corresponding to the provided email.',
  },
  FORBIDDEN_CLAIM: {
    code: 'reserved-claim',
    message: 'The specified developer claim is reserved and cannot be specified.',
  },
  INVALID_ID_TOKEN: {
    code: 'invalid-id-token',
    message: 'The provided ID token is not a valid Firebase ID token.',
  },
  ID_TOKEN_REVOKED: {
    code: 'id-token-revoked',
    message: 'The Firebase ID token has been revoked.',
  },
  INTERNAL_ERROR: {
    code: 'internal-error',
    message: 'An internal error has occurred.',
  },
  INVALID_CLAIMS: {
    code: 'invalid-claims',
    message: 'The provided custom claim attributes are invalid.',
  },
  INVALID_CONTINUE_URI: {
    code: 'invalid-continue-uri',
    message: 'The continue URL must be a valid URL string.',
  },
  INVALID_CREATION_TIME: {
    code: 'invalid-creation-time',
    message: 'The creation time must be a valid UTC date string.',
  },
  INVALID_CREDENTIAL: {
    code: 'invalid-credential',
    message: 'Invalid credential object provided.',
  },
  INVALID_DISABLED_FIELD: {
    code: 'invalid-disabled-field',
    message: 'The disabled field must be a boolean.',
  },
  INVALID_DISPLAY_NAME: {
    code: 'invalid-display-name',
    message: 'The displayName field must be a valid string.',
  },
  INVALID_DYNAMIC_LINK_DOMAIN: {
    code: 'invalid-dynamic-link-domain',
    message: 'The provided dynamic link domain is not configured or authorized ' +
      'for the current project.',
  },
  INVALID_HOSTING_LINK_DOMAIN: {
    code: 'invalid-hosting-link-domain',
    message: 'The provided hosting link domain is not configured in Firebase ' +
      'Hosting or is not owned by the current project.',
  },
  INVALID_EMAIL_VERIFIED: {
    code: 'invalid-email-verified',
    message: 'The emailVerified field must be a boolean.',
  },
  INVALID_EMAIL: {
    code: 'invalid-email',
    message: 'The email address is improperly formatted.',
  },
  INVALID_NEW_EMAIL: {
    code: 'invalid-new-email',
    message: 'The new email address is improperly formatted.',
  },
  INVALID_ENROLLED_FACTORS: {
    code: 'invalid-enrolled-factors',
    message: 'The enrolled factors must be a valid array of MultiFactorInfo objects.',
  },
  INVALID_ENROLLMENT_TIME: {
    code: 'invalid-enrollment-time',
    message: 'The second factor enrollment time must be a valid UTC date string.',
  },
  INVALID_HASH_ALGORITHM: {
    code: 'invalid-hash-algorithm',
    message: 'The hash algorithm must match one of the strings in the list of ' +
      'supported algorithms.',
  },
  INVALID_HASH_BLOCK_SIZE: {
    code: 'invalid-hash-block-size',
    message: 'The hash block size must be a valid number.',
  },
  INVALID_HASH_DERIVED_KEY_LENGTH: {
    code: 'invalid-hash-derived-key-length',
    message: 'The hash derived key length must be a valid number.',
  },
  INVALID_HASH_KEY: {
    code: 'invalid-hash-key',
    message: 'The hash key must a valid byte buffer.',
  },
  INVALID_HASH_MEMORY_COST: {
    code: 'invalid-hash-memory-cost',
    message: 'The hash memory cost must be a valid number.',
  },
  INVALID_HASH_PARALLELIZATION: {
    code: 'invalid-hash-parallelization',
    message: 'The hash parallelization must be a valid number.',
  },
  INVALID_HASH_ROUNDS: {
    code: 'invalid-hash-rounds',
    message: 'The hash rounds must be a valid number.',
  },
  INVALID_HASH_SALT_SEPARATOR: {
    code: 'invalid-hash-salt-separator',
    message: 'The hashing algorithm salt separator field must be a valid byte buffer.',
  },
  INVALID_LAST_SIGN_IN_TIME: {
    code: 'invalid-last-sign-in-time',
    message: 'The last sign-in time must be a valid UTC date string.',
  },
  INVALID_NAME: {
    code: 'invalid-name',
    message: 'The resource name provided is invalid.',
  },
  INVALID_OAUTH_CLIENT_ID: {
    code: 'invalid-oauth-client-id',
    message: 'The provided OAuth client ID is invalid.',
  },
  INVALID_PAGE_TOKEN: {
    code: 'invalid-page-token',
    message: 'The page token must be a valid non-empty string.',
  },
  INVALID_PASSWORD: {
    code: 'invalid-password',
    message: 'The password must be a string with at least 6 characters.',
  },
  INVALID_PASSWORD_HASH: {
    code: 'invalid-password-hash',
    message: 'The password hash must be a valid byte buffer.',
  },
  INVALID_PASSWORD_SALT: {
    code: 'invalid-password-salt',
    message: 'The password salt must be a valid byte buffer.',
  },
  INVALID_PHONE_NUMBER: {
    code: 'invalid-phone-number',
    message: 'The phone number must be a non-empty E.164 standard compliant identifier ' +
      'string.',
  },
  INVALID_PHOTO_URL: {
    code: 'invalid-photo-url',
    message: 'The photoURL field must be a valid URL.',
  },
  INVALID_PROJECT_ID: {
    code: 'invalid-project-id',
    message: 'Invalid parent project. Either parent project doesn\'t exist or didn\'t enable multi-tenancy.',
  },
  INVALID_PROVIDER_DATA: {
    code: 'invalid-provider-data',
    message: 'The providerData must be a valid array of UserInfo objects.',
  },
  INVALID_PROVIDER_ID: {
    code: 'invalid-provider-id',
    message: 'The providerId must be a valid supported provider identifier string.',
  },
  INVALID_PROVIDER_UID: {
    code: 'invalid-provider-uid',
    message: 'The providerUid must be a valid provider uid string.',
  },
  INVALID_OAUTH_RESPONSETYPE: {
    code: 'invalid-oauth-responsetype',
    message: 'Only exactly one OAuth responseType should be set to true.',
  },
  INVALID_SESSION_COOKIE_DURATION: {
    code: 'invalid-session-cookie-duration',
    message: 'The session cookie duration must be a valid number in milliseconds ' +
      'between 5 minutes and 2 weeks.',
  },
  INVALID_TENANT_ID: {
    code: 'invalid-tenant-id',
    message: 'The tenant ID must be a valid non-empty string.',
  },
  INVALID_TENANT_TYPE: {
    code: 'invalid-tenant-type',
    message: 'Tenant type must be either "full_service" or "lightweight".',
  },
  INVALID_TESTING_PHONE_NUMBER: {
    code: 'invalid-testing-phone-number',
    message: 'Invalid testing phone number or invalid test code provided.',
  },
  INVALID_UID: {
    code: 'invalid-uid',
    message: 'The uid must be a non-empty string with at most 128 characters.',
  },
  INVALID_USER_IMPORT: {
    code: 'invalid-user-import',
    message: 'The user record to import is invalid.',
  },
  INVALID_TOKENS_VALID_AFTER_TIME: {
    code: 'invalid-tokens-valid-after-time',
    message: 'The tokensValidAfterTime must be a valid UTC number in seconds.',
  },
  MISMATCHING_TENANT_ID: {
    code: 'mismatching-tenant-id',
    message: 'User tenant ID does not match with the current TenantAwareAuth tenant ID.',
  },
  MISSING_ANDROID_PACKAGE_NAME: {
    code: 'missing-android-pkg-name',
    message: 'An Android Package Name must be provided if the Android App is ' +
      'required to be installed.',
  },
  MISSING_CONFIG: {
    code: 'missing-config',
    message: 'The provided configuration is missing required attributes.',
  },
  MISSING_CONTINUE_URI: {
    code: 'missing-continue-uri',
    message: 'A valid continue URL must be provided in the request.',
  },
  MISSING_DISPLAY_NAME: {
    code: 'missing-display-name',
    message: 'The resource being created or edited is missing a valid display name.',
  },
  MISSING_EMAIL: {
    code: 'missing-email',
    message: 'The email is required for the specified action. For example, a multi-factor user ' +
      'requires a verified email.',
  },
  MISSING_IOS_BUNDLE_ID: {
    code: 'missing-ios-bundle-id',
    message: 'The request is missing an iOS Bundle ID.',
  },
  MISSING_ISSUER: {
    code: 'missing-issuer',
    message: 'The OAuth/OIDC configuration issuer must not be empty.',
  },
  MISSING_HASH_ALGORITHM: {
    code: 'missing-hash-algorithm',
    message: 'Importing users with password hashes requires that the hashing ' +
      'algorithm and its parameters be provided.',
  },
  MISSING_OAUTH_CLIENT_ID: {
    code: 'missing-oauth-client-id',
    message: 'The OAuth/OIDC configuration client ID must not be empty.',
  },
  MISSING_OAUTH_CLIENT_SECRET: {
    code: 'missing-oauth-client-secret',
    message: 'The OAuth configuration client secret is required to enable OIDC code flow.',
  },
  MISSING_PROVIDER_ID: {
    code: 'missing-provider-id',
    message: 'A valid provider ID must be provided in the request.',
  },
  MISSING_SAML_RELYING_PARTY_CONFIG: {
    code: 'missing-saml-relying-party-config',
    message: 'The SAML configuration provided is missing a relying party configuration.',
  },
  MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED: {
    code: 'test-phone-number-limit-exceeded',
    message: 'The maximum allowed number of test phone number / code pairs has been exceeded.',
  },
  MAXIMUM_USER_COUNT_EXCEEDED: {
    code: 'maximum-user-count-exceeded',
    message: 'The maximum allowed number of users to import has been exceeded.',
  },
  MISSING_UID: {
    code: 'missing-uid',
    message: 'A uid identifier is required for the current operation.',
  },
  OPERATION_NOT_ALLOWED: {
    code: 'operation-not-allowed',
    message: 'The given sign-in provider is disabled for this Firebase project. ' +
      'Enable it in the Firebase console, under the sign-in method tab of the ' +
      'Auth section.',
  },
  PHONE_NUMBER_ALREADY_EXISTS: {
    code: 'phone-number-already-exists',
    message: 'The user with the provided phone number already exists.',
  },
  PROJECT_NOT_FOUND: {
    code: 'project-not-found',
    message: 'No Firebase project was found for the provided credential.',
  },
  INSUFFICIENT_PERMISSION: {
    code: 'insufficient-permission',
    message: 'Credential implementation provided to initializeApp() via the "credential" property ' +
      'has insufficient permission to access the requested resource. See ' +
      'https://firebase.google.com/docs/admin/setup for details on how to authenticate this SDK ' +
      'with appropriate permissions.',
  },
  QUOTA_EXCEEDED: {
    code: 'quota-exceeded',
    message: 'The project quota for the specified operation has been exceeded.',
  },
  SECOND_FACTOR_LIMIT_EXCEEDED: {
    code: 'second-factor-limit-exceeded',
    message: 'The maximum number of allowed second factors on a user has been exceeded.',
  },
  SECOND_FACTOR_UID_ALREADY_EXISTS: {
    code: 'second-factor-uid-already-exists',
    message: 'The specified second factor "uid" already exists.',
  },
  SESSION_COOKIE_EXPIRED: {
    code: 'session-cookie-expired',
    message: 'The Firebase session cookie is expired.',
  },
  SESSION_COOKIE_REVOKED: {
    code: 'session-cookie-revoked',
    message: 'The Firebase session cookie has been revoked.',
  },
  TENANT_NOT_FOUND: {
    code: 'tenant-not-found',
    message: 'There is no tenant corresponding to the provided identifier.',
  },
  UID_ALREADY_EXISTS: {
    code: 'uid-already-exists',
    message: 'The user with the provided uid already exists.',
  },
  UNAUTHORIZED_DOMAIN: {
    code: 'unauthorized-continue-uri',
    message: 'The domain of the continue URL is not whitelisted. Whitelist the domain in the ' +
      'Firebase console.',
  },
  UNSUPPORTED_FIRST_FACTOR: {
    code: 'unsupported-first-factor',
    message: 'A multi-factor user requires a supported first factor.',
  },
  UNSUPPORTED_SECOND_FACTOR: {
    code: 'unsupported-second-factor',
    message: 'The request specified an unsupported type of second factor.',
  },
  UNSUPPORTED_TENANT_OPERATION: {
    code: 'unsupported-tenant-operation',
    message: 'This operation is not supported in a multi-tenant context.',
  },
  UNVERIFIED_EMAIL: {
    code: 'unverified-email',
    message: 'A verified email is required for the specified action. For example, a multi-factor user ' +
      'requires a verified email.',
  },
  USER_NOT_FOUND: {
    code: 'user-not-found',
    message: 'There is no user record corresponding to the provided identifier.',
  },
  NOT_FOUND: {
    code: 'not-found',
    message: 'The requested resource was not found.',
  },
  USER_DISABLED: {
    code: 'user-disabled',
    message: 'The user record is disabled.',
  },
  USER_NOT_DISABLED: {
    code: 'user-not-disabled',
    message: 'The user must be disabled in order to bulk delete it (or you must pass force=true).',
  },
  INVALID_RECAPTCHA_ACTION: {
    code: 'invalid-recaptcha-action',
    message: 'reCAPTCHA action must be "BLOCK".'
  },
  INVALID_RECAPTCHA_ENFORCEMENT_STATE: {
    code: 'invalid-recaptcha-enforcement-state',
    message: 'reCAPTCHA enforcement state must be either "OFF", "AUDIT" or "ENFORCE".'
  },
  RECAPTCHA_NOT_ENABLED: {
    code: 'racaptcha-not-enabled',
    message: 'reCAPTCHA enterprise is not enabled.'
  }
} satisfies Record<string, ErrorInfo>;

/**
 * Messaging client error codes and their default messages.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MessagingClientErrorCode = {
  INVALID_ARGUMENT: {
    code: 'invalid-argument',
    message: 'Invalid argument provided.',
  },
  INVALID_RECIPIENT: {
    code: 'invalid-recipient',
    message: 'Invalid message recipient provided.',
  },
  INVALID_PAYLOAD: {
    code: 'invalid-payload',
    message: 'Invalid message payload provided.',
  },
  INVALID_DATA_PAYLOAD_KEY: {
    code: 'invalid-data-payload-key',
    message: 'The data message payload contains an invalid key. See the reference documentation ' +
      'for the DataMessagePayload type for restricted keys.',
  },
  PAYLOAD_SIZE_LIMIT_EXCEEDED: {
    code: 'payload-size-limit-exceeded',
    message: 'The provided message payload exceeds the FCM size limits. See the error documentation ' +
      'for more details.',
  },
  INVALID_OPTIONS: {
    code: 'invalid-options',
    message: 'Invalid message options provided.',
  },
  INVALID_REGISTRATION_TOKEN: {
    code: 'invalid-registration-token',
    message: 'Invalid registration token provided. Make sure it matches the registration token ' +
      'the client app receives from registering with FCM.',
  },
  REGISTRATION_TOKEN_NOT_REGISTERED: {
    code: 'registration-token-not-registered',
    message: 'The provided registration token is not registered. A previously valid registration ' +
      'token can be unregistered for a variety of reasons. See the error documentation for more ' +
      'details. Remove this registration token and stop using it to send messages.',
  },
  MISMATCHED_CREDENTIAL: {
    code: 'mismatched-credential',
    message: 'The credential used to authenticate this SDK does not have permission to send ' +
      'messages to the device corresponding to the provided registration token. Make sure the ' +
      'credential and registration token both belong to the same Firebase project.',
  },
  INVALID_PACKAGE_NAME: {
    code: 'invalid-package-name',
    message: 'The message was addressed to a registration token whose package name does not match ' +
      'the provided "restrictedPackageName" option.',
  },
  DEVICE_MESSAGE_RATE_EXCEEDED: {
    code: 'device-message-rate-exceeded',
    message: 'The rate of messages to a particular device is too high. Reduce the number of ' +
      'messages sent to this device and do not immediately retry sending to this device.',
  },
  TOPICS_MESSAGE_RATE_EXCEEDED: {
    code: 'topics-message-rate-exceeded',
    message: 'The rate of messages to subscribers to a particular topic is too high. Reduce the ' +
      'number of messages sent for this topic, and do not immediately retry sending to this topic.',
  },
  MESSAGE_RATE_EXCEEDED: {
    code: 'message-rate-exceeded',
    message: 'Sending limit exceeded for the message target.',
  },
  THIRD_PARTY_AUTH_ERROR: {
    code: 'third-party-auth-error',
    message: 'A message targeted to an iOS device could not be sent because the required APNs ' +
      'SSL certificate was not uploaded or has expired. Check the validity of your development ' +
      'and production certificates.',
  },
  TOO_MANY_TOPICS: {
    code: 'too-many-topics',
    message: 'The maximum number of topics the provided registration token can be subscribed to ' +
      'has been exceeded.',
  },
  AUTHENTICATION_ERROR: {
    code: 'authentication-error',
    message: 'An error occurred when trying to authenticate to the FCM servers. Make sure the ' +
      'credential used to authenticate this SDK has the proper permissions. See ' +
      'https://firebase.google.com/docs/admin/setup for setup instructions.',
  },
  SERVER_UNAVAILABLE: {
    code: 'server-unavailable',
    message: 'The FCM server could not process the request in time. See the error documentation ' +
      'for more details.',
  },
  INTERNAL_ERROR: {
    code: 'internal-error',
    message: 'An internal error has occurred. Please retry the request.',
  },
  UNKNOWN_ERROR: {
    code: 'unknown-error',
    message: 'An unknown server error was returned.',
  },
} satisfies Record<string, ErrorInfo>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const InstallationsClientErrorCode = {
  INVALID_ARGUMENT: {
    code: 'invalid-argument',
    message: 'Invalid argument provided.',
  },
  INVALID_PROJECT_ID: {
    code: 'invalid-project-id',
    message: 'Invalid project ID provided.',
  },
  INVALID_INSTALLATION_ID: {
    code: 'invalid-installation-id',
    message: 'Invalid installation ID provided.',
  },
  API_ERROR: {
    code: 'api-error',
    message: 'Installation ID API call failed.',
  },
} satisfies Record<string, ErrorInfo>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const InstanceIdClientErrorCode = {
  ...InstallationsClientErrorCode,
  INVALID_INSTANCE_ID: {
    code: 'invalid-instance-id',
    message: 'Invalid instance ID provided.',
  },
} satisfies Record<string, ErrorInfo>;

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

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

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

import { ErrorInfo, FirebaseError, toHttpResponse } from '../utils/error';
import { RequestResponseError } from '../utils/api-request';
import { deepCopy } from '../utils/deep-copy';

/**
 * The constant mapping for valid Messaging client error codes.
 */
export const MessagingErrorCode = {
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_RECIPIENT: 'invalid-recipient',
  INVALID_PAYLOAD: 'invalid-payload',
  INVALID_DATA_PAYLOAD_KEY: 'invalid-data-payload-key',
  PAYLOAD_SIZE_LIMIT_EXCEEDED: 'payload-size-limit-exceeded',
  INVALID_OPTIONS: 'invalid-options',
  INVALID_REGISTRATION_TOKEN: 'invalid-registration-token',
  REGISTRATION_TOKEN_NOT_REGISTERED: 'registration-token-not-registered',
  MISMATCHED_CREDENTIAL: 'mismatched-credential',
  INVALID_PACKAGE_NAME: 'invalid-package-name',
  DEVICE_MESSAGE_RATE_EXCEEDED: 'device-message-rate-exceeded',
  TOPICS_MESSAGE_RATE_EXCEEDED: 'topics-message-rate-exceeded',
  TOPICS_SUBSCRIPTION_RATE_EXCEEDED: 'topics-subscription-rate-exceeded',
  MESSAGE_RATE_EXCEEDED: 'message-rate-exceeded',
  THIRD_PARTY_AUTH_ERROR: 'third-party-auth-error',
  TOO_MANY_TOPICS: 'too-many-topics',
  AUTHENTICATION_ERROR: 'authentication-error',
  SERVER_UNAVAILABLE: 'server-unavailable',
  INTERNAL_ERROR: 'internal-error',
  UNKNOWN_ERROR: 'unknown-error',
} as const;

/**
 * The type definition for valid Messaging client error codes.
 */
export type MessagingErrorCode = typeof MessagingErrorCode[keyof typeof MessagingErrorCode];

/**
 * Internal Messaging client error code mapping used to construct ErrorInfo.
 */
export const messagingClientErrorCode: { readonly [K in keyof typeof MessagingErrorCode]: ErrorInfo } = {
  INVALID_ARGUMENT: {
    code: MessagingErrorCode.INVALID_ARGUMENT,
    message: 'Invalid argument provided.',
  },
  INVALID_RECIPIENT: {
    code: MessagingErrorCode.INVALID_RECIPIENT,
    message: 'Invalid message recipient provided.',
  },
  INVALID_PAYLOAD: {
    code: MessagingErrorCode.INVALID_PAYLOAD,
    message: 'Invalid message payload provided.',
  },
  INVALID_DATA_PAYLOAD_KEY: {
    code: MessagingErrorCode.INVALID_DATA_PAYLOAD_KEY,
    message: 'The data message payload contains an invalid key. See the reference ' +
      'documentation for the DataMessagePayload type for restricted keys.',
  },
  PAYLOAD_SIZE_LIMIT_EXCEEDED: {
    code: MessagingErrorCode.PAYLOAD_SIZE_LIMIT_EXCEEDED,
    message: 'The provided message payload exceeds the FCM size limits. See the ' +
      'error documentation for more details.',
  },
  INVALID_OPTIONS: {
    code: MessagingErrorCode.INVALID_OPTIONS,
    message: 'Invalid message options provided.',
  },
  INVALID_REGISTRATION_TOKEN: {
    code: MessagingErrorCode.INVALID_REGISTRATION_TOKEN,
    message: 'Invalid registration token provided. Make sure it matches the ' +
      'registration token the client app receives from registering with FCM.',
  },
  REGISTRATION_TOKEN_NOT_REGISTERED: {
    code: MessagingErrorCode.REGISTRATION_TOKEN_NOT_REGISTERED,
    message: 'The provided registration token is not registered. A ' +
      'previously valid registration token can be unregistered for a variety of reasons. See the ' +
      'error documentation for more details. Remove this registration token and stop using it to ' +
      'send messages.',
  },
  MISMATCHED_CREDENTIAL: {
    code: MessagingErrorCode.MISMATCHED_CREDENTIAL,
    message: 'The credential used to authenticate this SDK does not have permission ' +
      'to send messages to the device corresponding to the provided registration token. Make sure the ' +
      'credential and registration token both belong to the same Firebase project.',
  },
  INVALID_PACKAGE_NAME: {
    code: MessagingErrorCode.INVALID_PACKAGE_NAME,
    message: 'The message was addressed to a registration token whose package name does ' +
      'not match the provided "restrictedPackageName" option.',
  },
  DEVICE_MESSAGE_RATE_EXCEEDED: {
    code: MessagingErrorCode.DEVICE_MESSAGE_RATE_EXCEEDED,
    message: 'The rate of messages to a particular device is too high. Reduce ' +
      'the number of messages sent to this device and do not immediately retry sending to this device.',
  },
  TOPICS_MESSAGE_RATE_EXCEEDED: {
    code: MessagingErrorCode.TOPICS_MESSAGE_RATE_EXCEEDED,
    message: 'The rate of messages to subscribers to a particular topic is too ' +
      'high. Reduce the number of messages sent for this topic, and do not immediately retry sending ' +
      'to this topic.',
  },
  TOPICS_SUBSCRIPTION_RATE_EXCEEDED: {
    code: MessagingErrorCode.TOPICS_SUBSCRIPTION_RATE_EXCEEDED,
    message: 'The rate of subscription requests to a particular topic is too ' +
      'high. Reduce the number of requests sent for this topic, and do not immediately retry subscribing ' +
      'to this topic.',
  },
  MESSAGE_RATE_EXCEEDED: {
    code: MessagingErrorCode.MESSAGE_RATE_EXCEEDED,
    message: 'Sending limit exceeded for the message target.',
  },
  THIRD_PARTY_AUTH_ERROR: {
    code: MessagingErrorCode.THIRD_PARTY_AUTH_ERROR,
    message: 'A message targeted to an iOS device could not be sent because the ' +
      'required APNs SSL certificate was not uploaded or has expired. Check the validity of your ' +
      'development and production certificates.',
  },
  TOO_MANY_TOPICS: {
    code: MessagingErrorCode.TOO_MANY_TOPICS,
    message: 'The maximum number of topics the provided registration token can be ' +
      'subscribed to has been exceeded.',
  },
  AUTHENTICATION_ERROR: {
    code: MessagingErrorCode.AUTHENTICATION_ERROR,
    message: 'An error occurred when trying to authenticate to the FCM servers. Make ' +
      'sure the credential used to authenticate this SDK has the proper permissions. See ' +
      'https://firebase.google.com/docs/admin/setup for setup instructions.',
  },
  SERVER_UNAVAILABLE: {
    code: MessagingErrorCode.SERVER_UNAVAILABLE,
    message: 'The FCM server could not process the request in time. See the error ' +
      'documentation for more details.',
  },
  INTERNAL_ERROR: {
    code: MessagingErrorCode.INTERNAL_ERROR,
    message: 'An internal error has occurred. Please retry the request.',
  },
  UNKNOWN_ERROR: {
    code: MessagingErrorCode.UNKNOWN_ERROR,
    message: 'An unknown server error was returned.',
  },
};

/** @const {Record<string, keyof typeof MessagingErrorCode>} Messaging server to client enum error codes. */
const MESSAGING_SERVER_TO_CLIENT_CODE: Record<string, keyof typeof MessagingErrorCode> = {
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

/** 
 * @const {Record<string, keyof typeof MessagingErrorCode>} Topic management (IID) 
 * server to client enum error codes. 
 */
const TOPIC_MGT_SERVER_TO_CLIENT_CODE: Record<string, keyof typeof MessagingErrorCode> = {
  /* TOPIC SUBSCRIPTION MANAGEMENT ERRORS */
  NOT_FOUND: 'REGISTRATION_TOKEN_NOT_REGISTERED',
  INVALID_ARGUMENT: 'INVALID_REGISTRATION_TOKEN',
  TOO_MANY_TOPICS: 'TOO_MANY_TOPICS',
  RESOURCE_EXHAUSTED: 'TOPICS_SUBSCRIPTION_RATE_EXCEEDED',
  PERMISSION_DENIED: 'AUTHENTICATION_ERROR',
  DEADLINE_EXCEEDED: 'SERVER_UNAVAILABLE',
  INTERNAL: 'INTERNAL_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * Firebase Messaging error code structure. This extends `FirebaseError`.
 */
export class FirebaseMessagingError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'messaging';

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
    const error: ErrorInfo = deepCopy((messagingClientErrorCode as any)[clientCodeKey]);
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
    const error: ErrorInfo = deepCopy((messagingClientErrorCode as any)[clientCodeKey]);
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
    super({
      code: `messaging/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

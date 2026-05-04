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

import { ErrorInfo, PrefixedFirebaseError, toHttpResponse } from '../utils/error';
import { RequestResponseError } from '../utils/api-request';
import { deepCopy } from '../utils/deep-copy';
import { BatchResponse } from './messaging-api';

/**
 * Messaging client error codes.
 */
export type MessagingErrorCode =
  | 'invalid-argument'
  | 'invalid-recipient'
  | 'invalid-payload'
  | 'invalid-data-payload-key'
  | 'payload-size-limit-exceeded'
  | 'invalid-options'
  | 'invalid-registration-token'
  | 'registration-token-not-registered'
  | 'mismatched-credential'
  | 'invalid-package-name'
  | 'device-message-rate-exceeded'
  | 'topics-message-rate-exceeded'
  | 'message-rate-exceeded'
  | 'third-party-auth-error'
  | 'too-many-topics'
  | 'authentication-error'
  | 'server-unavailable'
  | 'internal-error'
  | 'unknown-error';

/**
 * Messaging client error codes and their default messages.
 */
const messagingClientErrorMessages: Record<MessagingErrorCode, string> = {
  'invalid-argument': 'Invalid argument provided.',
  'invalid-recipient': 'Invalid message recipient provided.',
  'invalid-payload': 'Invalid message payload provided.',
  'invalid-data-payload-key': 'The data message payload contains an invalid key. See the reference ' +
    'documentation for the DataMessagePayload type for restricted keys.',
  'payload-size-limit-exceeded': 'The provided message payload exceeds the FCM size limits. See the ' +
    'error documentation for more details.',
  'invalid-options': 'Invalid message options provided.',
  'invalid-registration-token': 'Invalid registration token provided. Make sure it matches the ' +
    'registration token the client app receives from registering with FCM.',
  'registration-token-not-registered': 'The provided registration token is not registered. A ' +
    'previously valid registration token can be unregistered for a variety of reasons. See the ' +
    'error documentation for more details. Remove this registration token and stop using it to ' +
    'send messages.',
  'mismatched-credential': 'The credential used to authenticate this SDK does not have permission ' +
    'to send messages to the device corresponding to the provided registration token. Make sure the ' +
    'credential and registration token both belong to the same Firebase project.',
  'invalid-package-name': 'The message was addressed to a registration token whose package name does ' +
    'not match the provided "restrictedPackageName" option.',
  'device-message-rate-exceeded': 'The rate of messages to a particular device is too high. Reduce ' +
    'the number of messages sent to this device and do not immediately retry sending to this device.',
  'topics-message-rate-exceeded': 'The rate of messages to subscribers to a particular topic is too ' +
    'high. Reduce the number of messages sent for this topic, and do not immediately retry sending ' +
    'to this topic.',
  'message-rate-exceeded': 'Sending limit exceeded for the message target.',
  'third-party-auth-error': 'A message targeted to an iOS device could not be sent because the ' +
    'required APNs SSL certificate was not uploaded or has expired. Check the validity of your ' +
    'development and production certificates.',
  'too-many-topics': 'The maximum number of topics the provided registration token can be ' +
    'subscribed to has been exceeded.',
  'authentication-error': 'An error occurred when trying to authenticate to the FCM servers. Make ' +
    'sure the credential used to authenticate this SDK has the proper permissions. See ' +
    'https://firebase.google.com/docs/admin/setup for setup instructions.',
  'server-unavailable': 'The FCM server could not process the request in time. See the error ' +
    'documentation for more details.',
  'internal-error': 'An internal error has occurred. Please retry the request.',
  'unknown-error': 'An unknown server error was returned.',
};

function createMessagingErrorInfo(code: MessagingErrorCode): ErrorInfo {
  return {
    code,
    message: messagingClientErrorMessages[code] || 'An unknown error occurred.',
  };
}

/**
 * Internal Messaging client error code mapping used to construct ErrorInfo.
 */
export const messagingClientErrorCode = {
  INVALID_ARGUMENT: createMessagingErrorInfo('invalid-argument'),
  INVALID_RECIPIENT: createMessagingErrorInfo('invalid-recipient'),
  INVALID_PAYLOAD: createMessagingErrorInfo('invalid-payload'),
  INVALID_DATA_PAYLOAD_KEY: createMessagingErrorInfo('invalid-data-payload-key'),
  PAYLOAD_SIZE_LIMIT_EXCEEDED: createMessagingErrorInfo('payload-size-limit-exceeded'),
  INVALID_OPTIONS: createMessagingErrorInfo('invalid-options'),
  INVALID_REGISTRATION_TOKEN: createMessagingErrorInfo('invalid-registration-token'),
  REGISTRATION_TOKEN_NOT_REGISTERED: createMessagingErrorInfo('registration-token-not-registered'),
  MISMATCHED_CREDENTIAL: createMessagingErrorInfo('mismatched-credential'),
  INVALID_PACKAGE_NAME: createMessagingErrorInfo('invalid-package-name'),
  DEVICE_MESSAGE_RATE_EXCEEDED: createMessagingErrorInfo('device-message-rate-exceeded'),
  TOPICS_MESSAGE_RATE_EXCEEDED: createMessagingErrorInfo('topics-message-rate-exceeded'),
  MESSAGE_RATE_EXCEEDED: createMessagingErrorInfo('message-rate-exceeded'),
  THIRD_PARTY_AUTH_ERROR: createMessagingErrorInfo('third-party-auth-error'),
  TOO_MANY_TOPICS: createMessagingErrorInfo('too-many-topics'),
  AUTHENTICATION_ERROR: createMessagingErrorInfo('authentication-error'),
  SERVER_UNAVAILABLE: createMessagingErrorInfo('server-unavailable'),
  INTERNAL_ERROR: createMessagingErrorInfo('internal-error'),
  UNKNOWN_ERROR: createMessagingErrorInfo('unknown-error'),
};

/** @const {Record<string, string>} Messaging server to client enum error codes. */
const MESSAGING_SERVER_TO_CLIENT_CODE: Record<string, string> = {
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

/** @const {Record<string, string>} Topic management (IID) server to client enum error codes. */
const TOPIC_MGT_SERVER_TO_CLIENT_CODE: Record<string, string> = {
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

/**
 * Firebase Messaging error code structure. This extends `PrefixedFirebaseError`.
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

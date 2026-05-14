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

import { App } from '../app';
import { deepCopy } from '../utils/deep-copy';
import { 
  ErrorInfo, MessagingClientErrorCode, FirebaseMessagingError, FirebaseMessagingSessionError
} from '../utils/error';
import * as utils from '../utils';
import * as validator from '../utils/validator';
import { validateMessage } from './messaging-internal';
import { getErrorCode, createFirebaseError } from './messaging-errors-internal';
import { FirebaseMessagingRequestHandler } from './messaging-api-request-internal';

import {
  BatchResponse,
  Message,
  MessagingTopicManagementResponse,
  MulticastMessage,

  // Legacy API types
  SendResponse,
} from './messaging-api';
import { Http2SessionHandler, RequestResponseError } from '../utils/api-request';

// FCM endpoints
const FCM_SEND_HOST = 'fcm.googleapis.com';

// Maximum messages that can be included in a batch request.
const FCM_MAX_BATCH_SIZE = 500;


/**
 * Messaging service bound to the provided app.
 */
export class Messaging {

  private urlPath: string;
  private readonly appInternal: App;
  private readonly messagingRequestHandler: FirebaseMessagingRequestHandler;
  private useLegacyTransport = false;

  /**
   * @internal
   */
  constructor(app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.messaging() must be a valid Firebase app instance.',
      );
    }

    this.appInternal = app;
    this.messagingRequestHandler = new FirebaseMessagingRequestHandler(app);
  }

  /**
   * The {@link firebase-admin.app#App} associated with the current `Messaging` service
   * instance.
   *
   * @example
   * ```javascript
   * var app = messaging.app;
   * ```
   */
  get app(): App {
    return this.appInternal;
  }

  /**
   * Enables the use of legacy HTTP/1.1 transport for `sendEach()` and `sendEachForMulticast()`.
   * 
   * @example
   * ```javascript
   * const messaging = getMessaging(app);
   * messaging.enableLegacyTransport();
   * messaging.sendEach(messages);
   * ```
   * 
   * @deprecated This will be removed when the HTTP/2 transport implementation reaches the same
   * stability as the legacy HTTP/1.1 implementation.
   */
  public enableLegacyHttpTransport(): void {
    this.useLegacyTransport = true;
  }

  /**
   * Sends the given message via FCM.
   *
   * @param message - The message payload.
   * @param dryRun - Whether to send the message in the dry-run
   *   (validation only) mode.
   * @returns A promise fulfilled with a unique message ID
   *   string after the message has been successfully handed off to the FCM
   *   service for delivery.
   */
  public send(message: Message, dryRun?: boolean): Promise<string> {
    const copy: Message = deepCopy(message);
    validateMessage(copy);
    if (typeof dryRun !== 'undefined' && !validator.isBoolean(dryRun)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'dryRun must be a boolean');
    }
    return this.getUrlPath()
      .then((urlPath) => {
        const request: { message: Message; validate_only?: boolean } = { message: copy };
        if (dryRun) {
          request.validate_only = true;
        }
        return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, urlPath, request);
      })
      .then((response) => {
        return (response as any).name;
      });
  }

  /**
  * Sends each message in the given array via Firebase Cloud Messaging.
  *
  * This method makes a single RPC call for each message
  * in the given array.
  *
  * The responses list obtained from the return value corresponds to the order of `messages`.
  * An error from this method or a `BatchResponse` with all failures indicates a total failure,
  * meaning that none of the messages in the list could be sent. Partial failures or no
  * failures are only indicated by a `BatchResponse` return value.
  *
  * @param messages - A non-empty array
  *   containing up to 500 messages.
  * @param dryRun - Whether to send the messages in the dry-run
  *   (validation only) mode.
  * @returns A Promise fulfilled with an object representing the result of the
  *   send operation.
  */
  public sendEach(messages: Message[], dryRun?: boolean): Promise<BatchResponse> {
    if (validator.isArray(messages) && messages.constructor !== Array) {
      // In more recent JS specs, an array-like object might have a constructor that is not of
      // Array type. Our deepCopy() method doesn't handle them properly. Convert such objects to
      // a regular array here before calling deepCopy(). See issue #566 for details.
      messages = Array.from(messages);
    }

    const copy: Message[] = deepCopy(messages);
    if (!validator.isNonEmptyArray(copy)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'messages must be a non-empty array');
    }
    if (copy.length > FCM_MAX_BATCH_SIZE) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT,
        `messages list must not contain more than ${FCM_MAX_BATCH_SIZE} items`);
    }
    if (typeof dryRun !== 'undefined' && !validator.isBoolean(dryRun)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'dryRun must be a boolean');
    }

    const http2SessionHandler = this.useLegacyTransport ? undefined : new Http2SessionHandler(`https://${FCM_SEND_HOST}`);

    return this.getUrlPath()
      .then((urlPath) => {
        if (http2SessionHandler) {
          let sendResponsePromise: Promise<PromiseSettledResult<SendResponse>[]>;
          return new Promise((resolve: (result: PromiseSettledResult<SendResponse>[]) => void, reject) => {
            // Start session listeners
            http2SessionHandler.invoke().catch((error) => {
              const pendingBatchResponse = 
                sendResponsePromise ? sendResponsePromise.then(this.parseSendResponses) : undefined;
              reject(new FirebaseMessagingSessionError(error, undefined, pendingBatchResponse));
            });

            // Start making requests
            const requests: Promise<SendResponse>[] = copy.map(async (message) => {
              validateMessage(message);
              const request: { message: Message; validate_only?: boolean; } = { message };
              if (dryRun) {
                request.validate_only = true;
              }
              return this.messagingRequestHandler.invokeHttp2RequestHandlerForSendResponse(
                FCM_SEND_HOST, urlPath, request, http2SessionHandler);
            });

            // Resolve once all requests have completed
            sendResponsePromise = Promise.allSettled(requests);
            sendResponsePromise.then(resolve);
          });
        } else {
          const requests: Promise<SendResponse>[] = copy.map(async (message) => {
            validateMessage(message);
            const request: { message: Message; validate_only?: boolean; } = { message };
            if (dryRun) {
              request.validate_only = true;
            }
            return this.messagingRequestHandler.invokeHttpRequestHandlerForSendResponse(
              FCM_SEND_HOST, urlPath, request);
          });
          return Promise.allSettled(requests);
        }
      })
      .then(this.parseSendResponses)
      .finally(() => {
        http2SessionHandler?.close();
      });
  }

  private parseSendResponses(results: PromiseSettledResult<SendResponse>[]): BatchResponse {
    const responses: SendResponse[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      } else { // rejected
        responses.push({ success: false, error: result.reason });
      }
    });
    const successCount: number = responses.filter((resp) => resp.success).length;
    return {
      responses,
      successCount,
      failureCount: responses.length - successCount,
    };
  }

  /**
   * Sends the given multicast message to all the FCM registration tokens
   * specified in it.
   *
   * This method uses the {@link Messaging.sendEach} API under the hood to send the given
   * message to all the target recipients. The responses list obtained from the
   * return value corresponds to the order of tokens in the `MulticastMessage`.
   * An error from this method or a `BatchResponse` with all failures indicates a total
   * failure, meaning that the messages in the list could be sent. Partial failures or
   * failures are only indicated by a `BatchResponse` return value.
   *
   * @param message - A multicast message
   *   containing up to 500 tokens.
   * @param dryRun - Whether to send the message in the dry-run
   *   (validation only) mode.
   * @returns A Promise fulfilled with an object representing the result of the
   *   send operation.
   */
  public sendEachForMulticast(message: MulticastMessage, dryRun?: boolean): Promise<BatchResponse> {
    const copy: MulticastMessage = deepCopy(message);
    if (!validator.isNonNullObject(copy)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'MulticastMessage must be a non-null object');
    }
    if (!validator.isNonEmptyArray(copy.tokens)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'tokens must be a non-empty array');
    }
    if (copy.tokens.length > FCM_MAX_BATCH_SIZE) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT,
        `tokens list must not contain more than ${FCM_MAX_BATCH_SIZE} items`);
    }

    const messages: Message[] = copy.tokens.map((token) => {
      return {
        token,
        android: copy.android,
        apns: copy.apns,
        data: copy.data,
        notification: copy.notification,
        webpush: copy.webpush,
        fcmOptions: copy.fcmOptions,
      };
    });
    return this.sendEach(messages, dryRun);
  }

  /**
   * Subscribes a device to an FCM topic.
   *
   * See {@link https://firebase.google.com/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the |
   * Subscribe to a topic}
   * for code samples and detailed documentation. Optionally, you can provide an
   * array of tokens to subscribe multiple devices.
   *
   * @param registrationTokens - A token or array of registration tokens
   *   for the devices to subscribe to the topic.
   * @param topic - The topic to which to subscribe.
   *
   * @returns A promise fulfilled with the server's response after the device has been
   *   subscribed to the topic.
   */
  public subscribeToTopic(
    registrationTokenOrTokens: string | string[],
    topic: string,
  ): Promise<MessagingTopicManagementResponse> {
    return this.sendTopicManagementRequest(
      registrationTokenOrTokens,
      topic,
      'subscribeToTopic',
      '',
    );
  }

  /**
   * Unsubscribes a device from an FCM topic.
   *
   * See {@link https://firebase.google.com/docs/cloud-messaging/admin/manage-topic-subscriptions#unsubscribe_from_a_topic |
   * Unsubscribe from a topic}
   * for code samples and detailed documentation.  Optionally, you can provide an
   * array of tokens to unsubscribe multiple devices.
   *
   * @param registrationTokens - A device registration token or an array of
   *   device registration tokens to unsubscribe from the topic.
   * @param topic - The topic from which to unsubscribe.
   *
   * @returns A promise fulfilled with the server's response after the device has been
   *   unsubscribed from the topic.
   */
  public unsubscribeFromTopic(
    registrationTokenOrTokens: string | string[],
    topic: string,
  ): Promise<MessagingTopicManagementResponse> {
    return this.sendTopicManagementRequest(
      registrationTokenOrTokens,
      topic,
      'unsubscribeFromTopic',
      '',
    );
  }

  private getUrlPath(): Promise<string> {
    if (this.urlPath) {
      return Promise.resolve(this.urlPath);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          // Assert for an explicit project ID (either via AppOptions or the cert itself).
          throw new FirebaseMessagingError(
            MessagingClientErrorCode.INVALID_ARGUMENT,
            'Failed to determine project ID for Messaging. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.',
          );
        }

        this.urlPath = `/v1/projects/${projectId}/messages:send`;
        return this.urlPath;
      });
  }

  /**
   * Helper method which sends and handles topic subscription management requests.
   *
   * @param registrationTokenOrTokens - The registration token or an array of
   *     registration tokens to unsubscribe from the topic.
   * @param topic - The topic to which to subscribe.
   * @param methodName - The name of the original method called.
   * @param path - The endpoint path to use for the request.
   *
   * @returns A Promise fulfilled with the parsed server
   *   response.
   */
  private sendTopicManagementRequest(
    registrationTokenOrTokens: string | string[],
    topic: string,
    methodName: string,
    _path: string,
  ): Promise<MessagingTopicManagementResponse> {
    this.validateRegistrationTokensType(registrationTokenOrTokens, methodName);
    this.validateTopicType(topic, methodName);

    // Prepend the topic with /topics/ if necessary.
    topic = this.normalizeTopic(topic);

    return Promise.resolve()
      .then(() => {
        // Validate the contents of the input arguments. Because we are now in a promise, any thrown
        // error will cause this method to return a rejected promise.
        this.validateRegistrationTokens(registrationTokenOrTokens, methodName);
        this.validateTopic(topic, methodName);

        // Ensure the registration token(s) input argument is an array.
        let registrationTokensArray: string[] = registrationTokenOrTokens as string[];
        if (validator.isString(registrationTokenOrTokens)) {
          registrationTokensArray = [registrationTokenOrTokens as string];
        }

        return utils.findProjectId(this.app).then((projectId) => {
          if (!validator.isNonEmptyString(projectId)) {
            throw new FirebaseMessagingError(
              MessagingClientErrorCode.INVALID_ARGUMENT,
              'Failed to determine project ID for Messaging. Initialize the '
              + 'SDK with service account credentials or set project ID as an app option. '
              + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.',
            );
          }

          const topicName = topic.replace(/^\/topics\//, '');
          const isSubscribe = methodName === 'subscribeToTopic';
          const httpMethod = isSubscribe ? 'POST' : 'DELETE';

          const http2SessionHandler = new Http2SessionHandler('https://fcm.googleapis.com');

          let settledPromise: Promise<PromiseSettledResult<any>[]>;
          return new Promise<MessagingTopicManagementResponse>((resolve, reject) => {
            http2SessionHandler.invoke().catch((error) => {
              reject(new FirebaseMessagingSessionError(error, undefined, undefined));
            });

            const requests = registrationTokensArray.map(async (registrationId) => {
              let requestPath = `/v1/projects/${projectId}/registrations/${registrationId}/topicSubscriptions`;
              if (isSubscribe) {
                requestPath += `?topic_name=${topicName}`;
              } else {
                requestPath += `/${topicName}?allow_missing=true`;
              }
              return this.messagingRequestHandler.invokeHttp2RequestHandler(
                'fcm.googleapis.com',
                requestPath,
                httpMethod,
                isSubscribe ? {} : undefined,
                http2SessionHandler
              );
            });

            settledPromise = Promise.allSettled(requests);
            settledPromise.then((results) => {
              if (results.length > 0 && results.every((r) => r.status === 'rejected')) {
                const firstReason = (results[0] as PromiseRejectedResult).reason;
                if (firstReason instanceof RequestResponseError) {
                  reject(createFirebaseError(firstReason));
                } else {
                  reject(firstReason);
                }
                return;
              }

              const response: MessagingTopicManagementResponse = {
                successCount: 0,
                failureCount: 0,
                errors: [],
              };

              results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                  response.successCount += 1;
                } else {
                  response.failureCount += 1;
                  const err = result.reason;
                  const errorCode = err.response?.isJson() ? getErrorCode(err.response.data) : null;
                  const errorMessage = err.response?.isJson() ? err.response.data?.error?.message : err.message;
                  const newError = FirebaseMessagingError.fromTopicManagementServerError(
                    errorCode || 'UNKNOWN',
                    errorMessage,
                    err.response?.isJson() ? err.response.data : undefined
                  );
                  response.errors.push({
                    index,
                    error: newError,
                  });
                }
              });

              resolve(response);
            });
          }).finally(() => {
            http2SessionHandler.close();
          });
        });
      });
  }

  /**
   * Validates the type of the provided registration token(s). If invalid, an error will be thrown.
   *
   * @param registrationTokenOrTokens - The registration token(s) to validate.
   * @param method - The method name to use in error messages.
   * @param errorInfo - The error info to use if the registration tokens are invalid.
   */
  private validateRegistrationTokensType(
    registrationTokenOrTokens: string | string[],
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ): void {
    if (!validator.isNonEmptyArray(registrationTokenOrTokens) &&
      !validator.isNonEmptyString(registrationTokenOrTokens)) {
      throw new FirebaseMessagingError(
        errorInfo,
        `Registration token(s) provided to ${methodName}() must be a non-empty string or a ` +
        'non-empty array.',
      );
    }
  }

  /**
   * Validates the provided registration tokens. If invalid, an error will be thrown.
   *
   * @param registrationTokenOrTokens - The registration token or an array of
   *     registration tokens to validate.
   * @param method - The method name to use in error messages.
   * @param errorInfo - The error info to use if the registration tokens are invalid.
   */
  private validateRegistrationTokens(
    registrationTokenOrTokens: string | string[],
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ): void {
    if (validator.isArray(registrationTokenOrTokens)) {
      // Validate the array contains no more than 1,000 registration tokens.
      if (registrationTokenOrTokens.length > 1000) {
        throw new FirebaseMessagingError(
          errorInfo,
          `Too many registration tokens provided in a single request to ${methodName}(). Batch ` +
          'your requests to contain no more than 1,000 registration tokens per request.',
        );
      }

      // Validate the array contains registration tokens which are non-empty strings.
      (registrationTokenOrTokens as string[]).forEach((registrationToken, index) => {
        if (!validator.isNonEmptyString(registrationToken)) {
          throw new FirebaseMessagingError(
            errorInfo,
            `Registration token provided to ${methodName}() at index ${index} must be a ` +
            'non-empty string.',
          );
        }
      });
    }
  }

  /**
   * Validates the type of the provided topic. If invalid, an error will be thrown.
   *
   * @param topic - The topic to validate.
   * @param method - The method name to use in error messages.
   * @param errorInfo - The error info to use if the topic is invalid.
   */
  private validateTopicType(
    topic: string | string[],
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ): void {
    if (!validator.isNonEmptyString(topic)) {
      throw new FirebaseMessagingError(
        errorInfo,
        `Topic provided to ${methodName}() must be a string which matches the format ` +
        '"/topics/[a-zA-Z0-9-_.~%]+".',
      );
    }
  }

  /**
   * Validates the provided topic. If invalid, an error will be thrown.
   *
   * @param topic - The topic to validate.
   * @param method - The method name to use in error messages.
   * @param errorInfo - The error info to use if the topic is invalid.
   */
  private validateTopic(
    topic: string,
    methodName: string,
    errorInfo: ErrorInfo = MessagingClientErrorCode.INVALID_ARGUMENT,
  ): void {
    if (!validator.isTopic(topic)) {
      throw new FirebaseMessagingError(
        errorInfo,
        `Topic provided to ${methodName}() must be a string which matches the format ` +
        '"/topics/[a-zA-Z0-9-_.~%]+".',
      );
    }
  }

  /**
   * Normalizes the provided topic name by prepending it with '/topics/', if necessary.
   *
   * @param topic - The topic name to normalize.
   *
   * @returns The normalized topic name.
   */
  private normalizeTopic(topic: string): string {
    if (!/^\/topics\//.test(topic)) {
      topic = `/topics/${topic}`;
    }
    return topic;
  }
}

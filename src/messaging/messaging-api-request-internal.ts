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
import { FirebaseApp } from '../app/firebase-app';
import {
  HttpMethod, AuthorizedHttpClient, HttpRequestConfig, RequestResponseError, RequestResponse,
  AuthorizedHttp2Client, Http2SessionHandler, Http2RequestConfig,
} from '../utils/api-request';
import { createFirebaseError, getErrorCode } from './messaging-errors-internal';
import { getSdkVersion } from '../utils/index';
import { SendResponse } from './messaging-api';
import * as validator from '../utils/validator';
import { FirebaseMessagingError } from './error';

export interface TopicSubscriptionResponse {
  success: boolean;
  error?: FirebaseMessagingError;
}


// FCM backend constants
const FIREBASE_MESSAGING_TIMEOUT = 15000;
const FIREBASE_MESSAGING_HTTP_METHOD: HttpMethod = 'POST';
const FIREBASE_MESSAGING_HEADERS = {
  'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
  'access_token_auth': 'true',
};


/**
 * Class that provides a mechanism to send requests to the Firebase Cloud Messaging backend.
 */
export class FirebaseMessagingRequestHandler {
  private readonly httpClient: AuthorizedHttpClient;
  private readonly http2Client: AuthorizedHttp2Client;

  /**
   * @param app - The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: App) {
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
    this.http2Client = new AuthorizedHttp2Client(app as FirebaseApp);
  }

  /**
   * Invokes the request handler with the provided request data.
   *
   * @param host - The host to which to send the request.
   * @param path - The path to which to send the request.
   * @param requestData - The request data.
   * @returns A promise that resolves with the response.
   */
  public invokeRequestHandler(host: string, path: string, requestData: object): Promise<object> {
    const request: HttpRequestConfig = {
      method: FIREBASE_MESSAGING_HTTP_METHOD,
      url: `https://${host}${path}`,
      data: requestData,
      headers: FIREBASE_MESSAGING_HEADERS,
      timeout: FIREBASE_MESSAGING_TIMEOUT,
    };
    return this.httpClient.send(request).then((response) => {
      // Send non-JSON responses to the catch() below where they will be treated as errors.
      if (!response.isJson()) {
        throw new RequestResponseError(response);
      }

      // Check for backend errors in the response.
      const errorCode = getErrorCode(response.data);
      if (errorCode) {
        throw new RequestResponseError(response);
      }

      // Return entire response.
      return response.data;
    })
      .catch((err) => {
        if (err instanceof RequestResponseError) {
          throw createFirebaseError(err);
        }
        // Re-throw the error if it already has the proper format.
        throw err;
      });
  }

  /**
   * Invokes the HTTP/1.1 request handler with the provided request data.
   *
   * @param host - The host to which to send the request.
   * @param path - The path to which to send the request.
   * @param requestData - The request data.
   * @returns A promise that resolves with the {@link SendResponse}.
   */
  public invokeHttpRequestHandlerForSendResponse(
    host: string, path: string, requestData: object
  ): Promise<SendResponse> {
    const request: HttpRequestConfig = {
      method: FIREBASE_MESSAGING_HTTP_METHOD,
      url: `https://${host}${path}`,
      data: requestData,
      headers: FIREBASE_MESSAGING_HEADERS,
      timeout: FIREBASE_MESSAGING_TIMEOUT,
    };
    return this.httpClient.send(request).then((response) => {
      return this.buildSendResponse(response);
    })
      .catch((err) => {
        if (err instanceof RequestResponseError) {
          return this.buildSendResponseFromError(err);
        }
        // Re-throw the error if it already has the proper format.
        throw err;
      });
  }

  /**
   * Invokes the HTTP/2 request handler with the provided request data.
   *
   * @param host - The host to which to send the request.
   * @param path - The path to which to send the request.
   * @param requestData - The request data.
   * @returns A promise that resolves with the {@link SendResponse}.
   */
  public invokeHttp2RequestHandlerForSendResponse(
    host: string, path: string, requestData: object, http2SessionHandler: Http2SessionHandler
  ): Promise<SendResponse> {
    const request: Http2RequestConfig = {
      method: FIREBASE_MESSAGING_HTTP_METHOD,
      url: `https://${host}${path}`,
      data: requestData,
      headers: FIREBASE_MESSAGING_HEADERS,
      timeout: FIREBASE_MESSAGING_TIMEOUT,
      http2SessionHandler: http2SessionHandler
    };
    return this.http2Client.send(request).then((response) => {
      return this.buildSendResponse(response);
    })
      .catch((err) => {
        if (err instanceof RequestResponseError) {
          return this.buildSendResponseFromError(err);
        }
        // Re-throw the error if it already has the proper format.
        throw err;
      });
  }

  private buildSendResponse(response: RequestResponse): SendResponse {
    const result: SendResponse = {
      success: response.status === 200,
    };
    if (result.success) {
      result.messageId = response.data.name;
    } else {
      result.error = createFirebaseError(new RequestResponseError(response));
    }
    return result;
  }

  private buildSendResponseFromError(err: RequestResponseError): SendResponse {
    return {
      success: false,
      error: createFirebaseError(err)
    };
  }

  /**
   * Invokes the HTTP/1.1 request handler for a topic management operation.
   *
   * @param host - The host to which to send the request.
   * @param path - The path to which to send the request.
   * @param methodName - The name of the calling method (subscribeToTopic or unsubscribeFromTopic).
   * @param requestData - The request data (or undefined for DELETE).
   * @returns A promise that resolves with the {@link TopicSubscriptionResponse}.
   */
  public invokeHttpRequestHandlerForTopicSubscriptionResponse(
    host: string, path: string, methodName: string, requestData?: object
  ): Promise<TopicSubscriptionResponse> {
    const request: HttpRequestConfig = {
      method: methodName === 'subscribeToTopic' ? 'POST' : 'DELETE',
      url: `https://${host}${path}`,
      data: requestData,
      headers: FIREBASE_MESSAGING_HEADERS,
      timeout: FIREBASE_MESSAGING_TIMEOUT,
    };
    return this.httpClient.send(request).then((response) => {
      return this.buildTopicSubscriptionResponse(response, methodName);
    })
      .catch((err) => {
        if (err instanceof RequestResponseError) {
          return this.buildTopicSubscriptionResponseFromError(err, methodName);
        }
        // Re-throw the error if it already has the proper format.
        throw err;
      });
  }

  /**
   * Invokes the HTTP/2 request handler for a topic management operation.
   *
   * @param host - The host to which to send the request.
   * @param path - The path to which to send the request.
   * @param methodName - The name of the calling method (subscribeToTopic or unsubscribeFromTopic).
   * @param requestData - The request data (or undefined for DELETE).
   * @param http2SessionHandler - The HTTP/2 session handler.
   * @returns A promise that resolves with the {@link TopicSubscriptionResponse}.
   */
  public invokeHttp2RequestHandlerForTopicSubscriptionResponse(
    host: string, path: string, methodName: string, requestData: object | undefined, http2SessionHandler: Http2SessionHandler
  ): Promise<TopicSubscriptionResponse> {
    const request: Http2RequestConfig = {
      method: methodName === 'subscribeToTopic' ? 'POST' : 'DELETE',
      url: `https://${host}${path}`,
      data: requestData,
      headers: FIREBASE_MESSAGING_HEADERS,
      timeout: FIREBASE_MESSAGING_TIMEOUT,
      http2SessionHandler: http2SessionHandler
    };
    return this.http2Client.send(request).then((response) => {
      return this.buildTopicSubscriptionResponse(response, methodName);
    })
      .catch((err) => {
        if (err instanceof RequestResponseError) {
          return this.buildTopicSubscriptionResponseFromError(err, methodName);
        }
        // Re-throw the error if it already has the proper format.
        throw err;
      });
  }

  private buildTopicSubscriptionResponse(
    response: RequestResponse, methodName: string
  ): TopicSubscriptionResponse {
    if (response.status === 200) {
      return { success: true };
    }
    return this.buildTopicSubscriptionResponseFromError(new RequestResponseError(response), methodName);
  }

  private buildTopicSubscriptionResponseFromError(
    err: RequestResponseError, methodName: string
  ): TopicSubscriptionResponse {
    if (err.response.isJson()) {
      const json = err.response.data;
      const errorCode = getErrorCode(json);
      if (methodName === 'subscribeToTopic' && (errorCode === 'ALREADY_EXISTS' || err.response.status === 409)) {
        return { success: true };
      }
      const errorMessage = (validator.isNonNullObject(json) && 'error' in json && validator.isNonEmptyString((json as any).error.message))
        ? (json as any).error.message
        : undefined;
      return {
        success: false,
        error: FirebaseMessagingError.fromTopicManagementServerError(
          errorCode || 'UNKNOWN_ERROR',
          errorMessage,
          err,
        ),
      };
    }

    // Non-JSON response
    if (methodName === 'subscribeToTopic' && err.response.status === 409) {
      return { success: true };
    }

    let serverErrorCode = 'UNKNOWN_ERROR';
    switch (err.response.status) {
    case 400:
      serverErrorCode = 'INVALID_ARGUMENT';
      break;
    case 401:
    case 403:
      serverErrorCode = 'PERMISSION_DENIED';
      break;
    case 404:
      serverErrorCode = 'NOT_FOUND';
      break;
    case 429:
      serverErrorCode = 'RESOURCE_EXHAUSTED';
      break;
    case 500:
      serverErrorCode = 'INTERNAL';
      break;
    case 503:
      serverErrorCode = 'DEADLINE_EXCEEDED';
      break;
    default:
      serverErrorCode = 'UNKNOWN_ERROR';
    }

    return {
      success: false,
      error: FirebaseMessagingError.fromTopicManagementServerError(
        serverErrorCode,
        `Server responded with status ${err.response.status}.`,
        err,
      ),
    };
  }
}

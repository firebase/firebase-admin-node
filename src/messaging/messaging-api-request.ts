/*!
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

import {FirebaseApp} from '../firebase-app';
import {
  HttpMethod, AuthorizedHttpClient, HttpRequestConfig, HttpError,
} from '../utils/api-request';
import { createFirebaseError, getErrorCode } from './messaging-errors';
import { BatchRequestElement, MessagingBatchRequestClient, SendResponse } from './batch-request';

// FCM backend constants
const FIREBASE_MESSAGING_TIMEOUT = 10000;
const FIREBASE_MESSAGING_HTTP_METHOD: HttpMethod = 'POST';
const FIREBASE_MESSAGING_HEADERS = {
  'Sdk-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
  'access_token_auth': 'true',
};


/**
 * Class that provides a mechanism to send requests to the Firebase Cloud Messaging backend.
 */
export class FirebaseMessagingRequestHandler {
  private readonly httpClient: AuthorizedHttpClient;
  private readonly batchClient: MessagingBatchRequestClient;

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    this.httpClient = new AuthorizedHttpClient(app);
    this.batchClient = new MessagingBatchRequestClient(
      this.httpClient, FIREBASE_MESSAGING_HEADERS);
  }

  /**
   * Invokes the request handler with the provided request data.
   *
   * @param {string} host The host to which to send the request.
   * @param {string} path The path to which to send the request.
   * @param {object} requestData The request data.
   * @return {Promise<object>} A promise that resolves with the response.
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
        throw new HttpError(response);
      }

      // Check for backend errors in the response.
      const errorCode = getErrorCode(response.data);
      if (errorCode) {
        throw new HttpError(response);
      }

      // Return entire response.
      return response.data;
    })
    .catch((err) => {
      if (err instanceof HttpError) {
        throw createFirebaseError(err);
      }
      // Re-throw the error if it already has the proper format.
      throw err;
    });
  }

  public sendBatchRequest(requests: BatchRequestElement[]): Promise<SendResponse[]> {
    return this.batchClient.sendFcmBatchRequest(requests);
  }
}

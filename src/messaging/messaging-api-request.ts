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
import {HttpMethod, AuthorizedHttpClient, HttpRequestConfig, HttpError} from '../utils/api-request';
import {FirebaseMessagingError, MessagingClientErrorCode} from '../utils/error';

import * as validator from '../utils/validator';

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

  /**
   * @param {object} response The response to check for errors.
   * @return {string|null} The error code if present; null otherwise.
   */
  private static getErrorCode(response: any): string | null {
    if (validator.isNonNullObject(response) && 'error' in response) {
      if (validator.isString(response.error)) {
        return response.error;
      }
      if (validator.isArray(response.error.details)) {
        const fcmErrorType = 'type.googleapis.com/google.firebase.fcm.v1.FcmError';
        for (const element of response.error.details) {
          if (element['@type'] === fcmErrorType) {
            return element.errorCode;
          }
        }
      }
      if ('status' in response.error) {
        return response.error.status;
      } else {
        return response.error.message;
      }
    }

    return null;
  }

  /**
   * Extracts error message from the given response object.
   *
   * @param {object} response The response to check for errors.
   * @return {string|null} The error message if present; null otherwise.
   */
  private static getErrorMessage(response: any): string | null {
    if (validator.isNonNullObject(response) &&
        'error' in response &&
        validator.isNonEmptyString(response.error.message)) {
      return response.error.message;
    }
    return null;
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    this.httpClient = new AuthorizedHttpClient(app);
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
      const errorCode = FirebaseMessagingRequestHandler.getErrorCode(response.data);
      if (errorCode) {
        throw new HttpError(response);
      }

      // Return entire response.
      return response.data;
    })
    .catch((err) => {
      if (err instanceof HttpError) {
        this.handleHttpError(err);
      }
      // Re-throw the error if it already has the proper format.
      throw err;
    });
  }

  private handleHttpError(err: HttpError) {
    if (err.response.isJson()) {
      // For JSON responses, map the server response to a client-side error.
      const json = err.response.data;
      const errorCode = FirebaseMessagingRequestHandler.getErrorCode(json);
      const errorMessage = FirebaseMessagingRequestHandler.getErrorMessage(json);
      throw FirebaseMessagingError.fromServerError(errorCode, errorMessage, json);
    }

    // Non-JSON response
    let error: {code: string, message: string};
    switch (err.response.status) {
      case 400:
        error = MessagingClientErrorCode.INVALID_ARGUMENT;
        break;
      case 401:
      case 403:
        error = MessagingClientErrorCode.AUTHENTICATION_ERROR;
        break;
      case 500:
        error = MessagingClientErrorCode.INTERNAL_ERROR;
        break;
      case 503:
        error = MessagingClientErrorCode.SERVER_UNAVAILABLE;
        break;
      default:
        // Treat non-JSON responses with unexpected status codes as unknown errors.
        error = MessagingClientErrorCode.UNKNOWN_ERROR;
    }
    throw new FirebaseMessagingError({
      code: error.code,
      message: `${ error.message } Raw server response: "${ err.response.text }". Status code: ` +
        `${ err.response.status }.`,
    });
  }
}

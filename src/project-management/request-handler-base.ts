/*!
 * Copyright 2018 Google Inc.
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

import { FirebaseApp } from '../firebase-app';
import {
  AuthorizedHttpClient,
  HttpError,
  HttpMethod,
  HttpRequestConfig,
  ExponentialBackoffPoller,
} from '../utils/api-request';
import {
  FirebaseProjectManagementError,
  ProjectManagementErrorCode,
} from '../utils/error';

export function assertServerResponse(
  condition: boolean,
  responseData: object | string,
  message: string,
): void {
  if (!condition) {
    const stringData =
      typeof responseData === 'string'
        ? responseData
        : JSON.stringify(responseData, null, 2);
    throw new FirebaseProjectManagementError(
      'invalid-server-response',
      `${message} Response data: ${stringData}`,
    );
  }
}

/**
 * Abstract class that classes related to project management backend endpoints.
 *
 * @private
 * @abstract
 */
export abstract class RequestHandlerBase {
  protected static TIMEOUT_MILLIS = 10000;
  protected static HEADERS = {
    'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
  };

  protected abstract readonly baseUrl: string;
  protected readonly baseBetaUrl?: string | undefined;
  protected readonly httpClient: AuthorizedHttpClient;

  protected static wrapAndRethrowHttpError(
    errStatusCode: number,
    errText: string,
  ) {
    let errorCode: ProjectManagementErrorCode;
    let errorMessage: string;

    switch (errStatusCode) {
      case 400:
        errorCode = 'invalid-argument';
        errorMessage = 'Invalid argument provided.';
        break;
      case 401:
      case 403:
        errorCode = 'authentication-error';
        errorMessage =
          'An error occurred when trying to authenticate. Make sure the credential ' +
          'used to authenticate this SDK has the proper permissions. See ' +
          'https://firebase.google.com/docs/admin/setup for setup instructions.';
        break;
      case 404:
        errorCode = 'not-found';
        errorMessage = 'The specified entity could not be found.';
        break;
      case 409:
        errorCode = 'already-exists';
        errorMessage = 'The specified entity already exists.';
        break;
      case 500:
        errorCode = 'internal-error';
        errorMessage =
          'An internal error has occurred. Please retry the request.';
        break;
      case 503:
        errorCode = 'service-unavailable';
        errorMessage =
          'The server could not process the request in time. See the error ' +
          'documentation for more details.';
        break;
      default:
        errorCode = 'unknown-error';
        errorMessage = 'An unknown server error was returned.';
    }

    throw new FirebaseProjectManagementError(
      errorCode,
      `${errorMessage} Status code: ${errStatusCode}. Raw server response: "${errText}".`,
    );
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    this.httpClient = new AuthorizedHttpClient(app);
  }

  protected pollRemoteOperationWithExponentialBackoff(
    operationResourceName: string,
  ): Promise<object> {
    const poller = new ExponentialBackoffPoller();

    return poller.poll(() => {
      return this.invokeRequestHandler(
        'GET',
        operationResourceName,
        /* requestData */ null,
      ).then((responseData: any) => {
        if (responseData.error) {
          const errStatusCode: number = responseData.error.code || 500;
          const errText: string =
            responseData.error.message || JSON.stringify(responseData.error);
          RequestHandlerBase.wrapAndRethrowHttpError(errStatusCode, errText);
        }

        if (!responseData.done) {
          // Continue polling.
          return null;
        }

        // Polling complete. Resolve with operation response JSON.
        return responseData.response;
      });
    });
  }

  /**
   * Invokes the request handler with the provided request data.
   */
  protected invokeRequestHandler<T = object>(
    method: HttpMethod,
    path: string,
    requestData: object | string | null = null,
    { useBetaUrl = false, isJSONData = true }: InvokeRequestHandlerOptions = {},
  ): Promise<T> {
    const baseUrlToUse = useBetaUrl ? this.baseUrl : this.baseBetaUrl;
    const request: HttpRequestConfig = {
      method,
      url: baseUrlToUse + path,
      headers: RequestHandlerBase.HEADERS,
      data: requestData,
      timeout: RequestHandlerBase.TIMEOUT_MILLIS,
    };

    return this.httpClient
      .send(request)
      .then((response) => {
        if (isJSONData) {
          if (!response.isJson()) {
            // Send non-JSON responses to the catch() below, where they will be treated as errors.
            throw new HttpError(response);
          }
          return response.data;
        } else {
          // Send error responses to the catch() below.
          if (response.status >= 400) {
            throw new HttpError(response);
          }
          return response.text;
        }
      })
      .catch((err) => {
        if (err instanceof HttpError) {
          RequestHandlerBase.wrapAndRethrowHttpError(
            err.response.status,
            err.response.text,
          );
        }
        throw err;
      });
  }
}

export interface InvokeRequestHandlerOptions {
  useBetaUrl?: boolean;
  isJSONData?: boolean;
}

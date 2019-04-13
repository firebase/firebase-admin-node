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
} from '../utils/api-request';
import {
  FirebaseProjectManagementError,
  ProjectManagementErrorCode,
} from '../utils/error';
import * as validator from '../utils/validator';

/** Database REST API security rules path. */
const DATABASE_RULES_PATH = '/.settings/rules.json';
/** Database REST API request header. */
const DATABASE_REST_HEADERS = {
  'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
};
/** Database REST API request timeout duration in milliseconds. */
const DATABASE_REST_TIMEOUT_MILLIS = 10000;
/** Database URL field in the Firebase App options */
const DATABASE_URL_OPTION = 'databaseURL';

/**
 * Class that provides mechanism to send requests to the Firebase project management backend
 * endpoints.
 *
 * @private
 */
export class DatabaseRequestHandler {
  private readonly baseUrl: string;
  private readonly httpClient: AuthorizedHttpClient;

  private static wrapAndRethrowHttpError(
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
      case 423:
        errorCode = 'service-unavailable';
        errorMessage = 'The database has been locked.';
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
    this.baseUrl = app.options[DATABASE_URL_OPTION];
  }

  public getDatabaseRules(): Promise<string> {
    this.assertDatabaseURL();
    return this.invokeRequestHandler('GET', DATABASE_RULES_PATH);
  }

  /**
   * @param {string} rules The Database Security Rules to deploy.
   */
  public setDatabaseRules(rules: string): Promise<void> {
    this.assertDatabaseURL();

    if (!validator.isNonEmptyString(rules)) {
      throw new FirebaseProjectManagementError(
        'invalid-argument',
        'Database rules must be a non-empty string.',
      );
    }

    return this.invokeRequestHandler('PUT', DATABASE_RULES_PATH, rules).then(
      () => undefined,
    );
  }

  private assertDatabaseURL() {
    if (!validator.isNonEmptyString(this.baseUrl)) {
      throw new FirebaseProjectManagementError(
        'invalid-argument',
        "Can't determine Firebase Database URL.",
      );
    }
  }

  /**
   * Invokes the request handler with the provided request data.
   */
  private invokeRequestHandler(
    method: HttpMethod,
    path: string,
    requestData?: string | object,
  ): Promise<string> {
    const request: HttpRequestConfig = {
      method,
      url: `${this.baseUrl}${path}`,
      headers: DATABASE_REST_HEADERS,
      data: requestData,
      timeout: DATABASE_REST_TIMEOUT_MILLIS,
    };

    return this.httpClient
      .send(request)
      .then((response) => {
        // Send error responses to the catch() below.
        if (response.status >= 400) {
          throw new HttpError(response);
        }
        return response.text;
      })
      .catch((err) => {
        if (err instanceof HttpError) {
          DatabaseRequestHandler.wrapAndRethrowHttpError(
            err.response.status,
            err.response.text,
          );
        }
        throw err;
      });
  }
}

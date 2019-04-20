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
import { FirebaseProjectManagementError } from '../utils/error';
import * as validator from '../utils/validator';
import {
  RequestHandlerBase,
  InvokeRequestHandlerOptions,
} from './request-handler-base';
import { HttpMethod } from '../utils/api-request';

/** Database REST API security rules path. */
const DATABASE_RULES_PATH = '/.settings/rules.json';
/** Database URL field in the Firebase App options */
const DATABASE_URL_OPTION = 'databaseURL';

/**
 * Class that provides a mechanism to send requests to the Firebase Rules backend
 * endpoints.
 *
 * @private
 */
export class DatabaseRequestHandler extends RequestHandlerBase {
  protected readonly baseUrl: string;

  protected static wrapAndRethrowHttpError(
    errStatusCode: number,
    errText: string,
  ) {
    if (errStatusCode === 423) {
      const errorCode = 'failed-precondition';
      const errorMessage = 'The database has been manually locked by an owner.';
      throw new FirebaseProjectManagementError(
        errorCode,
        `${errorMessage} Status code: ${errStatusCode}. Raw server response: "${errText}".`,
      );
    } else {
      return super.wrapAndRethrowHttpError(errStatusCode, errText);
    }
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    super(app);
    this.baseUrl = app.options[DATABASE_URL_OPTION];
  }

  public getRules(): Promise<string> {
    this.assertDatabaseURL();
    return this.invokeRequestHandler<string>('GET', DATABASE_RULES_PATH, null, {
      isJSONData: false,
    }).then((response) => {
      if (!validator.isNonEmptyString(response)) {
        throw new FirebaseProjectManagementError(
          'invalid-server-response',
          "getRules()'s response must be a non-empty string.",
        );
      }

      return response;
    });
  }

  /**
   * @param {string} rules The Database Security Rules to deploy.
   */
  public setRules(rules: string): Promise<void> {
    this.assertDatabaseURL();

    if (!validator.isNonEmptyString(rules)) {
      throw new FirebaseProjectManagementError(
        'invalid-argument',
        'Database rules must be a non-empty string.',
      );
    }

    return this.invokeRequestHandler<string>(
      'PUT',
      DATABASE_RULES_PATH,
      rules,
      { isJSONData: false },
    ).then(() => undefined);
  }

  protected invokeRequestHandler<T = object>(
    method: HttpMethod,
    path: string,
    requestData: object | string | null = null,
    options?: InvokeRequestHandlerOptions,
  ): Promise<T> {
    return super.invokeRequestHandler(
      method,
      path,
      requestData,
      options,
      DatabaseRequestHandler.wrapAndRethrowHttpError,
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
}

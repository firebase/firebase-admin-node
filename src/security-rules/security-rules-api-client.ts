/*!
 * Copyright 2019 Google Inc.
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

import { HttpRequestConfig, HttpClient, HttpError } from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import { FirebaseSecurityRulesError, SecurityRulesErrorCode } from './security-rules-utils';
import * as validator from '../utils/validator';

const RULES_API_URL = 'https://firebaserules.googleapis.com/v1';

/**
 * Class that facilitates sending requests to the Firebase security rules backend API.
 *
 * @private
 */
export class SecurityRulesApiClient {

  private readonly url: string;

  constructor(private readonly httpClient: HttpClient, projectId: string) {
    if (!validator.isNonNullObject(httpClient)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument', 'HttpClient must be a non-null object.');
    }

    if (!validator.isNonEmptyString(projectId)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument',
        'Failed to determine project ID. Initialize the SDK with service account credentials, or '
          + 'set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT '
          + 'environment variable.');
    }

    this.url = `${RULES_API_URL}/projects/${projectId}`;
  }

  /**
   * Gets the specified resource from the rules API. Resource names must be the short names without project
   * ID prefix (e.g. `rulesets/ruleset-name`).
   *
   * @param {string} name Full qualified name of the resource to get.
   * @returns {Promise<T>} A promise that fulfills with the resource.
   */
  public getResource<T>(name: string): Promise<T> {
    const request: HttpRequestConfig = {
      method: 'GET',
      url: `${this.url}/${name}`,
    };
    return this.sendRequest<T>(request);
  }

  public createResource<T>(name: string, body: object): Promise<T> {
    const request: HttpRequestConfig = {
      method: 'POST',
      url: `${this.url}/${name}`,
      data: body,
    };
    return this.sendRequest<T>(request);
  }

  public deleteResource(name: string): Promise<void> {
    const request: HttpRequestConfig = {
      method: 'DELETE',
      url: `${this.url}/${name}`,
    };
    return this.sendRequest(request);
  }

  private sendRequest<T>(request: HttpRequestConfig): Promise<T> {
    return this.httpClient.send(request)
      .then((resp) => {
        return resp.data as T;
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private toFirebaseError(err: HttpError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseSecurityRulesError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    const code = ERROR_CODE_MAPPING[error.status] || 'unknown-error';
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseSecurityRulesError(code, message);
  }
}

interface ErrorResponse {
  error?: Error;
}

interface Error {
  code?: number;
  message?: string;
  status?: string;
}

const ERROR_CODE_MAPPING: {[key: string]: SecurityRulesErrorCode} = {
  NOT_FOUND: 'not-found',
  UNAUTHENTICATED: 'authentication-error',
  UNKNOWN: 'unknown-error',
};

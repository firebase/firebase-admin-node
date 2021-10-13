/*!
 * @license
 * Copyright 2021 Google Inc.
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
  HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient, HttpResponse
} from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { AppCheckToken } from './app-check-api'

// App Check backend constants
const FIREBASE_APP_CHECK_V1_API_URL_FORMAT = 'https://firebaseappcheck.googleapis.com/v1beta/projects/{projectId}/apps/{appId}:exchangeCustomToken';

const FIREBASE_APP_CHECK_CONFIG_HEADERS = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`
};

/**
 * Class that facilitates sending requests to the Firebase App Check backend API.
 *
 * @internal
 */
export class AppCheckApiClient {
  private readonly httpClient: HttpClient;
  private projectId?: string;

  constructor(private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseAppCheckError(
        'invalid-argument',
        'First argument passed to admin.appCheck() must be a valid Firebase app instance.');
    }
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
  }

  /**
   * Exchange a signed custom token to App Check token
   *
   * @param customToken - The custom token to be exchanged.
   * @param appId - The mobile App ID.
   * @returns A promise that fulfills with a `AppCheckToken`.
   */
  public exchangeToken(customToken: string, appId: string): Promise<AppCheckToken> {
    if (!validator.isNonEmptyString(appId)) {
      throw new FirebaseAppCheckError(
        'invalid-argument',
        '`appId` must be a non-empty string.');
    }
    if (!validator.isNonEmptyString(customToken)) {
      throw new FirebaseAppCheckError(
        'invalid-argument',
        '`customToken` must be a non-empty string.');
    }
    return this.getUrl(appId)
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'POST',
          url,
          headers: FIREBASE_APP_CHECK_CONFIG_HEADERS,
          data: { customToken }
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        return this.toAppCheckToken(resp);
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private getUrl(appId: string): Promise<string> {
    return this.getProjectId()
      .then((projectId) => {
        const urlParams = {
          projectId,
          appId,
        };
        const baseUrl = utils.formatString(FIREBASE_APP_CHECK_V1_API_URL_FORMAT, urlParams);
        return utils.formatString(baseUrl);
      });
  }

  private getProjectId(): Promise<string> {
    if (this.projectId) {
      return Promise.resolve(this.projectId);
    }
    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseAppCheckError(
            'unknown-error',
            'Failed to determine project ID. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively, set the GOOGLE_CLOUD_PROJECT environment variable.');
        }
        this.projectId = projectId;
        return projectId;
      });
  }

  private toFirebaseError(err: HttpError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseAppCheckError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    let code: AppCheckErrorCode = 'unknown-error';
    if (error.status && error.status in APP_CHECK_ERROR_CODE_MAPPING) {
      code = APP_CHECK_ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseAppCheckError(code, message);
  }

  /**
   * Creates an AppCheckToken from the API response.
   *
   * @param resp - API response object.
   * @returns An AppCheckToken instance.
   */
  private toAppCheckToken(resp: HttpResponse): AppCheckToken {
    const token = resp.data.attestationToken;
    // `ttl` is a string with the suffix "s" preceded by the number of seconds,
    // with nanoseconds expressed as fractional seconds.
    const ttlMillis = this.stringToMilliseconds(resp.data.ttl);
    return {
      token,
      ttlMillis
    }
  }

  /**
   * Converts a duration string with the suffix `s` to milliseconds.
   *
   * @param duration - The duration as a string with the suffix "s" preceded by the
   * number of seconds, with fractional seconds. For example, 3 seconds with 0 nanoseconds
   * is expressed as "3s", while 3 seconds and 1 nanosecond is expressed as "3.000000001s",
   * and 3 seconds and 1 microsecond is expressed as "3.000001s".
   *
   * @returns The duration in milliseconds.
   */
  private stringToMilliseconds(duration: string): number {
    if (!validator.isNonEmptyString(duration) || !duration.endsWith('s')) {
      throw new FirebaseAppCheckError(
        'invalid-argument', '`ttl` must be a valid duration string with the suffix `s`.');
    }
    const seconds = duration.slice(0, -1);
    return Math.floor(Number(seconds) * 1000);
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

export const APP_CHECK_ERROR_CODE_MAPPING: { [key: string]: AppCheckErrorCode } = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
};

export type AppCheckErrorCode =
  'aborted'
  | 'invalid-argument'
  | 'invalid-credential'
  | 'internal-error'
  | 'permission-denied'
  | 'unauthenticated'
  | 'not-found'
  | 'app-check-token-expired'
  | 'unknown-error';

/**
 * Firebase App Check error code structure. This extends PrefixedFirebaseError.
 *
 * @param code - The error code.
 * @param message - The error message.
 * @constructor
 */
export class FirebaseAppCheckError extends PrefixedFirebaseError {
  constructor(code: AppCheckErrorCode, message: string) {
    super('app-check', code, message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseAppCheckError.prototype;
  }
}

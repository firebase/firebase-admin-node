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
  AuthorizedHttpClient, HttpError, HttpMethod, HttpRequestConfig, ExponentialBackoffPoller,
} from '../utils/api-request';
import { FirebaseProjectManagementError, ProjectManagementErrorCode } from '../utils/error';
import * as validator from '../utils/validator';
import { ShaCertificate } from './android-app';
import { getSdkVersion } from '../utils/index';

/** Project management backend host and port. */
const PROJECT_MANAGEMENT_HOST_AND_PORT = 'firebase.googleapis.com:443';
/** Project management backend path. */
const PROJECT_MANAGEMENT_PATH = '/v1/';
/** Project management beta backend path. */
const PROJECT_MANAGEMENT_BETA_PATH = '/v1beta1/';
/** Project management request header. */
const PROJECT_MANAGEMENT_HEADERS = {
  'X-Client-Version': `Node/Admin/${getSdkVersion()}`,
};
/** Project management request timeout duration in milliseconds. */
const PROJECT_MANAGEMENT_TIMEOUT_MILLIS = 10000;

const LIST_APPS_MAX_PAGE_SIZE = 100;

const CERT_TYPE_API_MAP = {
  sha1: 'SHA_1',
  sha256: 'SHA_256',
};

export function assertServerResponse(
  condition: boolean, responseData: object, message: string): void {
  if (!condition) {
    throw new FirebaseProjectManagementError(
      'invalid-server-response',
      `${message} Response data: ${JSON.stringify(responseData, null, 2)}`);
  }
}

/**
 * Class that provides mechanism to send requests to the Firebase project management backend
 * endpoints.
 *
 * @private
 */
export class ProjectManagementRequestHandler {
  private readonly baseUrl: string =
      `https://${PROJECT_MANAGEMENT_HOST_AND_PORT}${PROJECT_MANAGEMENT_PATH}`;
  private readonly baseBetaUrl: string =
      `https://${PROJECT_MANAGEMENT_HOST_AND_PORT}${PROJECT_MANAGEMENT_BETA_PATH}`;
  private readonly httpClient: AuthorizedHttpClient;

  private static wrapAndRethrowHttpError(errStatusCode: number, errText?: string): void {
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
      errorMessage = 'An error occurred when trying to authenticate. Make sure the credential '
            + 'used to authenticate this SDK has the proper permissions. See '
            + 'https://firebase.google.com/docs/admin/setup for setup instructions.';
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
      errorMessage = 'An internal error has occurred. Please retry the request.';
      break;
    case 503:
      errorCode = 'service-unavailable';
      errorMessage = 'The server could not process the request in time. See the error '
            + 'documentation for more details.';
      break;
    default:
      errorCode = 'unknown-error';
      errorMessage = 'An unknown server error was returned.';
    }

    if (!errText) {
      errText = '<missing>';
    }
    throw new FirebaseProjectManagementError(
      errorCode,
      `${ errorMessage } Status code: ${ errStatusCode }. Raw server response: "${ errText }".`);
  }

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    this.httpClient = new AuthorizedHttpClient(app);
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project whose Android
   *     apps you want to list.
   */
  public listAndroidApps(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      `${parentResourceName}/androidApps?page_size=${LIST_APPS_MAX_PAGE_SIZE}`,
      /* requestData */ null,
      'v1beta1');
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project whose iOS apps
   *     you want to list.
   */
  public listIosApps(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      `${parentResourceName}/iosApps?page_size=${LIST_APPS_MAX_PAGE_SIZE}`,
      /* requestData */ null,
      'v1beta1');
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project whose iOS apps
   *     you want to list.
   */
  public listAppMetadata(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      `${parentResourceName}:searchApps?page_size=${LIST_APPS_MAX_PAGE_SIZE}`,
      /* requestData */ null,
      'v1beta1');
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project that you want
   *     to create the Android app within.
   */
  public createAndroidApp(
    parentResourceName: string, packageName: string, displayName?: string): Promise<object> {
    const requestData: any = {
      packageName,
    };
    if (validator.isNonEmptyString(displayName)) {
      requestData.displayName = displayName;
    }
    return this
      .invokeRequestHandler('POST', `${parentResourceName}/androidApps`, requestData, 'v1beta1')
      .then((responseData: any) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          'createAndroidApp\'s responseData must be a non-null object.');
        assertServerResponse(
          validator.isNonEmptyString(responseData.name),
          responseData,
          'createAndroidApp\'s responseData.name must be a non-empty string.');
        return this.pollRemoteOperationWithExponentialBackoff(responseData.name);
      });
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project that you want
   *     to create the iOS app within.
   */
  public createIosApp(
    parentResourceName: string, bundleId: string, displayName?: string): Promise<object> {
    const requestData: any = {
      bundleId,
    };
    if (validator.isNonEmptyString(displayName)) {
      requestData.displayName = displayName;
    }
    return this
      .invokeRequestHandler('POST', `${parentResourceName}/iosApps`, requestData, 'v1beta1')
      .then((responseData: any) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          'createIosApp\'s responseData must be a non-null object.');
        assertServerResponse(
          validator.isNonEmptyString(responseData.name),
          responseData,
          'createIosApp\'s responseData.name must be a non-empty string.');
        return this.pollRemoteOperationWithExponentialBackoff(responseData.name);
      });
  }

  /**
   * @param {string} resourceName Fully-qualified resource name of the entity whose display name you
   *     want to set.
   */
  public setDisplayName(resourceName: string, newDisplayName: string): Promise<void> {
    const requestData = {
      displayName: newDisplayName,
    };
    return this
      .invokeRequestHandler(
        'PATCH', `${resourceName}?update_mask=display_name`, requestData, 'v1beta1')
      .then(() => undefined);
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the Android app whose SHA
   *     certificates you want to get.
   */
  public getAndroidShaCertificates(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET', `${parentResourceName}/sha`, /* requestData */ null, 'v1beta1');
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the Android app that you
   *     want to add the given SHA certificate to.
   */
  public addAndroidShaCertificate(
    parentResourceName: string, certificate: ShaCertificate): Promise<void> {
    const requestData = {
      shaHash: certificate.shaHash,
      certType: CERT_TYPE_API_MAP[certificate.certType],
    };
    return this
      .invokeRequestHandler('POST', `${parentResourceName}/sha`, requestData, 'v1beta1')
      .then(() => undefined);
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the app whose config you
   *     want to get.
   */
  public getConfig(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET', `${parentResourceName}/config`, /* requestData */ null, 'v1beta1');
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the entity that you want to
   *     get.
   */
  public getResource(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler('GET', parentResourceName, /* requestData */ null, 'v1beta1');
  }

  /**
   * @param {string} resourceName Fully-qualified resource name of the entity that you want to
   *     delete.
   */
  public deleteResource(resourceName: string): Promise<void> {
    return this
      .invokeRequestHandler('DELETE', resourceName, /* requestData */ null, 'v1beta1')
      .then(() => undefined);
  }

  private pollRemoteOperationWithExponentialBackoff(
    operationResourceName: string): Promise<object> {
    const poller = new ExponentialBackoffPoller<object>();

    return poller.poll(() => {
      return this.invokeRequestHandler('GET', operationResourceName, /* requestData */ null)
        .then((responseData: any) => {
          if (responseData.error) {
            const errStatusCode: number = responseData.error.code || 500;
            const errText: string =
                  responseData.error.message || JSON.stringify(responseData.error);
            ProjectManagementRequestHandler.wrapAndRethrowHttpError(errStatusCode, errText);
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
  private invokeRequestHandler(
    method: HttpMethod,
    path: string,
    requestData: object | null,
    apiVersion: ('v1' | 'v1beta1') = 'v1'): Promise<object> {
    const baseUrlToUse = (apiVersion === 'v1') ? this.baseUrl : this.baseBetaUrl;
    const request: HttpRequestConfig = {
      method,
      url: `${baseUrlToUse}${path}`,
      headers: PROJECT_MANAGEMENT_HEADERS,
      data: requestData,
      timeout: PROJECT_MANAGEMENT_TIMEOUT_MILLIS,
    };

    return this.httpClient.send(request)
      .then((response) => {
        // Send non-JSON responses to the catch() below, where they will be treated as errors.
        if (!response.isJson()) {
          throw new HttpError(response);
        }

        return response.data;
      })
      .catch((err) => {
        if (err instanceof HttpError) {
          ProjectManagementRequestHandler.wrapAndRethrowHttpError(
            err.response.status, err.response.text);
        }
        throw err;
      });
  }
}

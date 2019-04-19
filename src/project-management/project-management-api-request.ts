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

import * as validator from '../utils/validator';
import { ShaCertificate } from './android-app';
import { RequestHandlerBase } from './request-handler-base';

/** Project management backend host and port. */
const PROJECT_MANAGEMENT_HOST_AND_PORT = 'firebase.googleapis.com:443';
/** Project management backend path. */
const PROJECT_MANAGEMENT_PATH = '/v1/';
/** Project management beta backend path. */
const PROJECT_MANAGEMENT_BETA_PATH = '/v1beta1/';

const LIST_APPS_MAX_PAGE_SIZE = 100;

const CERT_TYPE_API_MAP = {
  sha1: 'SHA_1',
  sha256: 'SHA_256',
};

/**
 * Class that provides a mechanism to send requests to the Firebase Project Management backend
 * endpoints.
 *
 * @private
 */
export class ProjectManagementRequestHandler extends RequestHandlerBase {
  protected readonly baseUrl: string =
      `https://${PROJECT_MANAGEMENT_HOST_AND_PORT}${PROJECT_MANAGEMENT_PATH}`;
  protected readonly baseBetaUrl: string =
      `https://${PROJECT_MANAGEMENT_HOST_AND_PORT}${PROJECT_MANAGEMENT_BETA_PATH}`;

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project whose Android
   *     apps you want to list.
   */
  public listAndroidApps(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
        'GET',
        `${parentResourceName}/androidApps?page_size=${LIST_APPS_MAX_PAGE_SIZE}`,
        /* requestData */ null,
        { useBetaUrl: true });
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
        { useBetaUrl: true });
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
        .invokeRequestHandler('POST', `${parentResourceName}/androidApps`, requestData, { useBetaUrl: true })
        .then((responseData: any) => {
          RequestHandlerBase.assertServerResponse(
              validator.isNonNullObject(responseData),
              responseData,
              `createAndroidApp's responseData must be a non-null object.`);
          RequestHandlerBase.assertServerResponse(
              validator.isNonEmptyString(responseData.name),
              responseData,
              `createAndroidApp's responseData.name must be a non-empty string.`);
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
        .invokeRequestHandler('POST', `${parentResourceName}/iosApps`, requestData, { useBetaUrl: true })
        .then((responseData: any) => {
          RequestHandlerBase.assertServerResponse(
              validator.isNonNullObject(responseData),
              responseData,
              `createIosApp's responseData must be a non-null object.`);
          RequestHandlerBase.assertServerResponse(
              validator.isNonEmptyString(responseData.name),
              responseData,
              `createIosApp's responseData.name must be a non-empty string.`);
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
            'PATCH', `${resourceName}?update_mask=display_name`, requestData, { useBetaUrl: true })
        .then(() => null);
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the Android app whose SHA
   *     certificates you want to get.
   */
  public getAndroidShaCertificates(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
        'GET', `${parentResourceName}/sha`, /* requestData */ null, { useBetaUrl: true });
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
        .invokeRequestHandler('POST', `${parentResourceName}/sha`, requestData, { useBetaUrl: true })
        .then(() => null);
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the app whose config you
   *     want to get.
   */
  public getConfig(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
        'GET', `${parentResourceName}/config`, /* requestData */ null, { useBetaUrl: true });
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the entity that you want to
   *     get.
   */
  public getResource(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler('GET', parentResourceName, /* requestData */ null, { useBetaUrl: true });
  }

  /**
   * @param {string} resourceName Fully-qualified resource name of the entity that you want to
   *     delete.
   */
  public deleteResource(resourceName: string): Promise<void> {
    return this
        .invokeRequestHandler('DELETE', resourceName, /* requestData */ null, { useBetaUrl: true })
        .then(() => null);
  }
}

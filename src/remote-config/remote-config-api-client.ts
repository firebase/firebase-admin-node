/*!
 * Copyright 2020 Google Inc.
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

import { HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient } from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import { FirebaseRemoteConfigError, RemoteConfigErrorCode } from './remote-config-utils';
import { FirebaseApp } from '../firebase-app';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';

// Remote Config backend constants
const FIREBASE_REMOTE_CONFIG_V1_API = 'https://firebaseremoteconfig.googleapis.com/v1';
const FIREBASE_REMOTE_CONFIG_GET_HEADERS = {
  'X-Firebase-Client': 'fire-admin-node/<XXX_SDK_VERSION_XXX>',
  // There is a known issue in which the ETag is not properly returned in cases where the request
  // does not specify a compression type. Currently, it is required to include the header
  // `Accept-Encoding: gzip` or equivalent in all requests.
  // https://firebase.google.com/docs/remote-config/use-config-rest#etag_usage_and_forced_updates
  'Accept-Encoding': 'gzip',
};
/*const FIREBASE_REMOTE_CONFIG_PUT_HEADERS = {
  'X-Firebase-Client': 'fire-admin-node/<XXX_SDK_VERSION_XXX>',
  // There is a known issue in which the ETag is not properly returned in cases where the request
  // does not specify a compression type. Currently, it is required to include the header
  // `Accept-Encoding: gzip` or equivalent in all requests.
  // https://firebase.google.com/docs/remote-config/use-config-rest#etag_usage_and_forced_updates
  'Accept-Encoding': 'gzip',
  //'If-Match': '',
};*/

export enum RemoteConfigConditionDisplayColor {
  BLUE = "Blue",
  BROWN = "Brown",
  CYAN = "Cyan",
  DEEP_ORANGE = "Red Orange",
  GREEN = "Green",
  INDIGO = "Indigo",
  LIME = "Lime",
  ORANGE = "Orange",
  PINK = "Pink",
  PURPLE = "Purple",
  TEAL = "Teal",
}

/** Interface representing a Remote Config parameter `value` in value options. */
export interface ExplicitParameterValue {
  readonly value: string;
}

/** Interface representing a Remote Config parameter `useInAppDefault` in value options. */
export interface InAppDefaultValue {
  readonly useInAppDefault: boolean;
}

export type RemoteConfigParameterValue = ExplicitParameterValue | InAppDefaultValue;

/** Interface representing a Remote Config parameter. */
export interface RemoteConfigParameter {
  readonly defaultValue?: RemoteConfigParameterValue;
  readonly conditionalValues?: { [key: string]: RemoteConfigParameterValue };
  readonly description?: string;
}

interface RemoteConfigCondition {
  name: string;
  expression: string;
  tagColor?: RemoteConfigConditionDisplayColor;
}

export interface RemoteConfigTemplateContent {
  readonly conditions?: RemoteConfigCondition[];
  readonly parameters?: { [key: string]: RemoteConfigParameter };
  readonly etag: string;
}

/**
 * Class that facilitates sending requests to the Firebase Remote Config backend API.
 *
 * @private
 */
export class RemoteConfigApiClient {

  private readonly httpClient: HttpClient;
  private projectIdPrefix?: string;

  constructor(private readonly app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'First argument passed to admin.remoteConfig() must be a valid Firebase app instance.');
    }

    this.httpClient = new AuthorizedHttpClient(app);
  }

  public getTemplate(): Promise<RemoteConfigTemplateContent> {
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/remoteConfig`,
          headers: FIREBASE_REMOTE_CONFIG_GET_HEADERS
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        if (!Object.prototype.hasOwnProperty.call(resp.headers, 'etag')) {
          throw new FirebaseRemoteConfigError(
            'invalid-argument',
            'ETag header is not present in the server response.');
        }
        return {
          conditions: resp.data.conditions,
          parameters: resp.data.parameters,
          etag: resp.headers['etag'],
        };
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public validateTemplate(template: RemoteConfigTemplateContent): Promise<RemoteConfigTemplateContent> {
    return this.getUrl()
      .then((url) => {
        //const headers = { ...FIREBASE_REMOTE_CONFIG_GET_HEADERS, 'If-Match': template.etag };
        //headers['If-Match'] = template.etag;
        const request: HttpRequestConfig = {
          method: 'PUT',
          url: `${url}/remoteConfig?validate_only=true`,
          headers: { ...FIREBASE_REMOTE_CONFIG_GET_HEADERS, 'If-Match': template.etag },
          data: {
            conditions: template.conditions,
            parameters: template.parameters,
          }
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        if (!Object.prototype.hasOwnProperty.call(resp.headers, 'etag')) {
          throw new FirebaseRemoteConfigError(
            'invalid-argument',
            'ETag header is not present in the server response.');
        }
        return {
          conditions: resp.data.conditions,
          parameters: resp.data.parameters,
          // validating a template returns an etag with the suffix -0 means that your update 
          // was successfully validated. We set the etag back to the original etag of the template
          // to allow future operations.
          etag: template.etag,
        };
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private getUrl(): Promise<string> {
    return this.getProjectIdPrefix()
      .then((projectIdPrefix) => {
        return `${FIREBASE_REMOTE_CONFIG_V1_API}/${projectIdPrefix}`;
      });
  }

  private getProjectIdPrefix(): Promise<string> {
    if (this.projectIdPrefix) {
      return Promise.resolve(this.projectIdPrefix);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseRemoteConfigError(
            'unknown-error',
            'Failed to determine project ID. Initialize the SDK with service account credentials, or '
            + 'set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT '
            + 'environment variable.');
        }

        this.projectIdPrefix = `projects/${projectId}`;
        return this.projectIdPrefix;
      });
  }

  private toFirebaseError(err: HttpError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseRemoteConfigError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    let code: RemoteConfigErrorCode = 'unknown-error';
    if (error.status && error.status in ERROR_CODE_MAPPING) {
      code = ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseRemoteConfigError(code, message);
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

const ERROR_CODE_MAPPING: { [key: string]: RemoteConfigErrorCode } = {
  ABORTED: 'aborted',
  ALREADY_EXISTS: `already-exists`,
  INVALID_ARGUMENT: 'invalid-argument',
  FAILED_PRECONDITION: 'failed-precondition',
  NOT_FOUND: 'not-found',
  OUT_OF_RANGE: 'out-of-range',
  PERMISSION_DENIED: 'permission-denied',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  UNAUTHENTICATED: 'unauthenticated',
  UNKNOWN: 'unknown-error',
};

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

import { HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient, HttpResponse } from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import { FirebaseRemoteConfigError, RemoteConfigErrorCode } from './remote-config-utils';
import { FirebaseApp } from '../firebase-app';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';

// Remote Config backend constants
const FIREBASE_REMOTE_CONFIG_V1_API = 'https://firebaseremoteconfig.googleapis.com/v1';
const FIREBASE_REMOTE_CONFIG_HEADERS = {
  'X-Firebase-Client': 'fire-admin-node/<XXX_SDK_VERSION_XXX>',
  // There is a known issue in which the ETag is not properly returned in cases where the request
  // does not specify a compression type. Currently, it is required to include the header
  // `Accept-Encoding: gzip` or equivalent in all requests.
  // https://firebase.google.com/docs/remote-config/use-config-rest#etag_usage_and_forced_updates
  'Accept-Encoding': 'gzip',
};

export enum TagColor {
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
  value: string;
}

/** Interface representing a Remote Config parameter `useInAppDefault` in value options. */
export interface InAppDefaultValue {
  useInAppDefault: boolean;
}

export type RemoteConfigParameterValue = ExplicitParameterValue | InAppDefaultValue;

/** Interface representing a Remote Config parameter. */
export interface RemoteConfigParameter {
  defaultValue?: RemoteConfigParameterValue;
  conditionalValues?: { [key: string]: RemoteConfigParameterValue };
  description?: string;
}

/** Interface representing a Remote Config parameter group. */
export interface RemoteConfigParameterGroup {
  description?: string;
  parameters: { [key: string]: RemoteConfigParameter };
}

/** Interface representing a Remote Config condition. */
export interface RemoteConfigCondition {
  name: string;
  expression: string;
  tagColor?: TagColor;
}

/** Interface representing a Remote Config template. */
export interface RemoteConfigTemplate {
  conditions: RemoteConfigCondition[];
  parameters: { [key: string]: RemoteConfigParameter };
  parameterGroups: { [key: string]: RemoteConfigParameterGroup };
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

  public getTemplate(): Promise<RemoteConfigTemplate> {
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/remoteConfig`,
          headers: FIREBASE_REMOTE_CONFIG_HEADERS
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        if (!validator.isNonEmptyString(resp.headers['etag'])) {
          throw new FirebaseRemoteConfigError(
            'invalid-argument',
            'ETag header is not present in the server response.');
        }
        return {
          conditions: resp.data.conditions,
          parameters: resp.data.parameters,
          parameterGroups: resp.data.parameterGroups,
          etag: resp.headers['etag'],
        };
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public validateTemplate(template: RemoteConfigTemplate): Promise<RemoteConfigTemplate> {
    this.validateRemoteConfigTemplate(template);
    return this.sendPutRequest(template, template.etag, true)
      .then((resp) => {
        if (!validator.isNonEmptyString(resp.headers['etag'])) {
          throw new FirebaseRemoteConfigError(
            'invalid-argument',
            'ETag header is not present in the server response.');
        }
        return {
          conditions: resp.data.conditions,
          parameters: resp.data.parameters,
          parameterGroups: resp.data.parameterGroups,
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

  public publishTemplate(template: RemoteConfigTemplate, options?: { force: boolean }): Promise<RemoteConfigTemplate> {
    this.validateRemoteConfigTemplate(template);
    let ifMatch: string = template.etag;
    if (options && options.force == true) {
      // setting `If-Match: *` forces the Remote Config template to be updated
      // and circumvent the ETag, and the protection from that it provides.
      ifMatch = '*';
    }
    return this.sendPutRequest(template, ifMatch)
      .then((resp) => {
        if (!validator.isNonEmptyString(resp.headers['etag'])) {
          throw new FirebaseRemoteConfigError(
            'invalid-argument',
            'ETag header is not present in the server response.');
        }
        return {
          conditions: resp.data.conditions,
          parameters: resp.data.parameters,
          parameterGroups: resp.data.parameterGroups,
          etag: resp.headers['etag'],
        };
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private sendPutRequest(template: RemoteConfigTemplate, etag: string, validateOnly?: boolean): Promise<HttpResponse> {
    let path = 'remoteConfig';
    if (validateOnly) {
      path += '?validate_only=true';
    }
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'PUT',
          url: `${url}/${path}`,
          headers: { ...FIREBASE_REMOTE_CONFIG_HEADERS, 'If-Match': etag },
          data: {
            conditions: template.conditions,
            parameters: template.parameters,
            parameterGroups: template.parameterGroups,
          }
        };
        return this.httpClient.send(request);
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

  /**
   * Checks if the given RemoteConfigTemplate object is valid.
   * The object must have valid parameters, parameter groups, conditions, and an etag.
   *
   * @param {RemoteConfigTemplate} template A RemoteConfigTemplate object to be validated.
   */
  private validateRemoteConfigTemplate(template: RemoteConfigTemplate): void {
    if (!validator.isNonNullObject(template)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Invalid Remote Config template: ${JSON.stringify(template)}`);
    }
    if (!validator.isNonEmptyString(template.etag)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'ETag must be a non-empty string.');
    }
    if (!validator.isNonNullObject(template.parameters)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'Remote Config parameters must be a non-null object');
    }
    if (!validator.isNonNullObject(template.parameterGroups)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'Remote Config parameter groups must be a non-null object');
    }
    if (!validator.isArray(template.conditions)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'Remote Config conditions must be an array');
    }
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

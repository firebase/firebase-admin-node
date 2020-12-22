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

import { remoteConfig } from './index';
import { HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient, HttpResponse } from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import { FirebaseApp } from '../firebase-app';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { deepCopy } from '../utils/deep-copy';

import RemoteConfigTemplate = remoteConfig.RemoteConfigTemplate;
import ListVersionsOptions = remoteConfig.ListVersionsOptions;
import ListVersionsResult = remoteConfig.ListVersionsResult;

// Remote Config backend constants
const FIREBASE_REMOTE_CONFIG_V1_API = 'https://firebaseremoteconfig.googleapis.com/v1';
const FIREBASE_REMOTE_CONFIG_HEADERS = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`,
  // There is a known issue in which the ETag is not properly returned in cases where the request
  // does not specify a compression type. Currently, it is required to include the header
  // `Accept-Encoding: gzip` or equivalent in all requests.
  // https://firebase.google.com/docs/remote-config/use-config-rest#etag_usage_and_forced_updates
  'Accept-Encoding': 'gzip',
};


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
        return this.toRemoteConfigTemplate(resp);
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public getTemplateAtVersion(versionNumber: number | string): Promise<RemoteConfigTemplate> {
    const data = { versionNumber: this.validateVersionNumber(versionNumber) };
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/remoteConfig`,
          headers: FIREBASE_REMOTE_CONFIG_HEADERS,
          data
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        return this.toRemoteConfigTemplate(resp);
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public validateTemplate(template: RemoteConfigTemplate): Promise<RemoteConfigTemplate> {
    template = this.validateInputRemoteConfigTemplate(template);
    return this.sendPutRequest(template, template.etag, true)
      .then((resp) => {
        // validating a template returns an etag with the suffix -0 means that your update
        // was successfully validated. We set the etag back to the original etag of the template
        // to allow future operations.
        this.validateEtag(resp.headers['etag']);
        return this.toRemoteConfigTemplate(resp, template.etag);
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public publishTemplate(template: RemoteConfigTemplate, options?: { force: boolean }): Promise<RemoteConfigTemplate> {
    template = this.validateInputRemoteConfigTemplate(template);
    let ifMatch: string = template.etag;
    if (options && options.force == true) {
      // setting `If-Match: *` forces the Remote Config template to be updated
      // and circumvent the ETag, and the protection from that it provides.
      ifMatch = '*';
    }
    return this.sendPutRequest(template, ifMatch)
      .then((resp) => {
        return this.toRemoteConfigTemplate(resp);
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public rollback(versionNumber: number | string): Promise<RemoteConfigTemplate> {
    const data = { versionNumber: this.validateVersionNumber(versionNumber) };
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'POST',
          url: `${url}/remoteConfig:rollback`,
          headers: FIREBASE_REMOTE_CONFIG_HEADERS,
          data
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        return this.toRemoteConfigTemplate(resp);
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  public listVersions(options?: ListVersionsOptions): Promise<ListVersionsResult> {
    if (typeof options !== 'undefined') {
      options = this.validateListVersionsOptions(options);
    }
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/remoteConfig:listVersions`,
          headers: FIREBASE_REMOTE_CONFIG_HEADERS,
          data: options
        };
        return this.httpClient.send(request);
      })
      .then((resp) => {
        return resp.data;
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
            version: template.version,
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
   * Creates a RemoteConfigTemplate from the API response.
   * If provided, customEtag is used instead of the etag returned in the API response.
   *
   * @param {HttpResponse} resp API response object.
   * @param {string} customEtag A custom etag to replace the etag fom the API response (Optional).
   */
  private toRemoteConfigTemplate(resp: HttpResponse, customEtag?: string): RemoteConfigTemplate {
    const etag = (typeof customEtag == 'undefined') ? resp.headers['etag'] : customEtag;
    this.validateEtag(etag);
    return {
      conditions: resp.data.conditions,
      parameters: resp.data.parameters,
      parameterGroups: resp.data.parameterGroups,
      etag,
      version: resp.data.version,
    };
  }

  /**
   * Checks if the given RemoteConfigTemplate object is valid.
   * The object must have valid parameters, parameter groups, conditions, and an etag.
   * Removes output only properties from version metadata.
   *
   * @param {RemoteConfigTemplate} template A RemoteConfigTemplate object to be validated.
   *
   * @returns {RemoteConfigTemplate} The validated RemoteConfigTemplate object.
   */
  private validateInputRemoteConfigTemplate(template: RemoteConfigTemplate): RemoteConfigTemplate {
    const templateCopy = deepCopy(template);
    if (!validator.isNonNullObject(templateCopy)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Invalid Remote Config template: ${JSON.stringify(templateCopy)}`);
    }
    if (!validator.isNonEmptyString(templateCopy.etag)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'ETag must be a non-empty string.');
    }
    if (!validator.isNonNullObject(templateCopy.parameters)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'Remote Config parameters must be a non-null object');
    }
    if (!validator.isNonNullObject(templateCopy.parameterGroups)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'Remote Config parameter groups must be a non-null object');
    }
    if (!validator.isArray(templateCopy.conditions)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'Remote Config conditions must be an array');
    }
    if (typeof templateCopy.version !== 'undefined') {
      // exclude output only properties and keep the only input property: description
      templateCopy.version = { description: templateCopy.version.description };
    }
    return templateCopy;
  }

  /**
   * Checks if a given version number is valid.
   * A version number must be an integer or a string in int64 format.
   * If valid, returns the string representation of the provided version number.
   *
   * @param {string|number} versionNumber A version number to be validated.
   *
   * @returns {string} The validated version number as a string.
   */
  private validateVersionNumber(versionNumber: string | number, propertyName = 'versionNumber'): string {
    if (!validator.isNonEmptyString(versionNumber) &&
      !validator.isNumber(versionNumber)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `${propertyName} must be a non-empty string in int64 format or a number`);
    }
    if (!Number.isInteger(Number(versionNumber))) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `${propertyName} must be an integer or a string in int64 format`);
    }
    return versionNumber.toString();
  }

  private validateEtag(etag?: string): void {
    if (!validator.isNonEmptyString(etag)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'ETag header is not present in the server response.');
    }
  }

  /**
   * Checks if a given `ListVersionsOptions` object is valid. If successful, creates a copy of the
   * options object and convert `startTime` and `endTime` to RFC3339 UTC "Zulu" format, if present.
   *
   * @param {ListVersionsOptions} options An options object to be validated.
   *
   * @return {ListVersionsOptions} A copy of the provided options object with timestamps converted
   * to UTC Zulu format.
   */
  private validateListVersionsOptions(options: ListVersionsOptions): ListVersionsOptions {
    const optionsCopy = deepCopy(options);
    if (!validator.isNonNullObject(optionsCopy)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'ListVersionsOptions must be a non-null object.');
    }
    if (typeof optionsCopy.pageSize !== 'undefined') {
      if (!validator.isNumber(optionsCopy.pageSize)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument', 'pageSize must be a number.');
      }
      if (optionsCopy.pageSize < 1 || optionsCopy.pageSize > 300) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument', 'pageSize must be a number between 1 and 300 (inclusive).');
      }
    }
    if (typeof optionsCopy.pageToken !== 'undefined' && !validator.isNonEmptyString(optionsCopy.pageToken)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument', 'pageToken must be a string value.');
    }
    if (typeof optionsCopy.endVersionNumber !== 'undefined') {
      optionsCopy.endVersionNumber = this.validateVersionNumber(optionsCopy.endVersionNumber, 'endVersionNumber');
    }
    if (typeof optionsCopy.startTime !== 'undefined') {
      if (!(optionsCopy.startTime instanceof Date) && !validator.isUTCDateString(optionsCopy.startTime)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument', 'startTime must be a valid Date object or a UTC date string.');
      }
      // Convert startTime to RFC3339 UTC "Zulu" format.
      if (optionsCopy.startTime instanceof Date) {
        optionsCopy.startTime = optionsCopy.startTime.toISOString();
      } else {
        optionsCopy.startTime = new Date(optionsCopy.startTime).toISOString();
      }
    }
    if (typeof optionsCopy.endTime !== 'undefined') {
      if (!(optionsCopy.endTime instanceof Date) && !validator.isUTCDateString(optionsCopy.endTime)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument', 'endTime must be a valid Date object or a UTC date string.');
      }
      // Convert endTime to RFC3339 UTC "Zulu" format.
      if (optionsCopy.endTime instanceof Date) {
        optionsCopy.endTime = optionsCopy.endTime.toISOString();
      } else {
        optionsCopy.endTime = new Date(optionsCopy.endTime).toISOString();
      }
    }
    // Remove undefined fields from optionsCopy
    Object.keys(optionsCopy).forEach(key =>
      (typeof (optionsCopy as any)[key] === 'undefined') && delete (optionsCopy as any)[key]
    );
    return optionsCopy;
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
  ALREADY_EXISTS: 'already-exists',
  INVALID_ARGUMENT: 'invalid-argument',
  INTERNAL: 'internal-error',
  FAILED_PRECONDITION: 'failed-precondition',
  NOT_FOUND: 'not-found',
  OUT_OF_RANGE: 'out-of-range',
  PERMISSION_DENIED: 'permission-denied',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  UNAUTHENTICATED: 'unauthenticated',
  UNKNOWN: 'unknown-error',
};

export type RemoteConfigErrorCode =
  'aborted'
  | 'already-exists'
  | 'failed-precondition'
  | 'internal-error'
  | 'invalid-argument'
  | 'not-found'
  | 'out-of-range'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'unauthenticated'
  | 'unknown-error';

/**
 * Firebase Remote Config error code structure. This extends PrefixedFirebaseError.
 *
 * @param {RemoteConfigErrorCode} code The error code.
 * @param {string} message The error message.
 * @constructor
 */
export class FirebaseRemoteConfigError extends PrefixedFirebaseError {
  constructor(code: RemoteConfigErrorCode, message: string) {
    super('remote-config', code, message);
  }
}

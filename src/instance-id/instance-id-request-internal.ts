/*!
 * @license
 * Copyright 2017 Google Inc.
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
import { FirebaseInstanceIdError, InstanceIdClientErrorCode } from '../utils/error';
import {
  ApiSettings, AuthorizedHttpClient, HttpRequestConfig, HttpError,
} from '../utils/api-request';

import * as utils from '../utils/index';
import * as validator from '../utils/validator';

/** Firebase IID backend host. */
const FIREBASE_IID_HOST = 'console.firebase.google.com';
/** Firebase IID backend path. */
const FIREBASE_IID_PATH = '/v1/';
/** Firebase IID request timeout duration in milliseconds. */
const FIREBASE_IID_TIMEOUT = 10000;

/** HTTP error codes raised by the backend server. */
const ERROR_CODES: {[key: number]: string} = {
  400: 'Malformed instance ID argument.',
  401: 'Request not authorized.',
  403: 'Project does not match instance ID or the client does not have sufficient privileges.',
  404: 'Failed to find the instance ID.',
  409: 'Already deleted.',
  429: 'Request throttled out by the backend server.',
  500: 'Internal server error.',
  503: 'Backend servers are over capacity. Try again later.',
};

/**
 * Class that provides mechanism to send requests to the Firebase Instance ID backend endpoints.
 */
export class FirebaseInstanceIdRequestHandler {

  private readonly host: string = FIREBASE_IID_HOST;
  private readonly timeout: number = FIREBASE_IID_TIMEOUT;
  private readonly httpClient: AuthorizedHttpClient;
  private path: string;

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   *
   * @constructor
   */
  constructor(private readonly app: FirebaseApp) {
    this.httpClient = new AuthorizedHttpClient(app);
  }

  public deleteInstanceId(instanceId: string): Promise<void> {
    if (!validator.isNonEmptyString(instanceId)) {
      return Promise.reject(new FirebaseInstanceIdError(
        InstanceIdClientErrorCode.INVALID_INSTANCE_ID,
        'Instance ID must be a non-empty string.',
      ));
    }
    return this.invokeRequestHandler(new ApiSettings(instanceId, 'DELETE'));
  }

  /**
   * Invokes the request handler based on the API settings object passed.
   *
   * @param {ApiSettings} apiSettings The API endpoint settings to apply to request and response.
   * @return {Promise<void>} A promise that resolves when the request is complete.
   */
  private invokeRequestHandler(apiSettings: ApiSettings): Promise<void> {
    return this.getPathPrefix()
      .then((path) => {
        const req: HttpRequestConfig = {
          url: `https://${this.host}${path}${apiSettings.getEndpoint()}`,
          method: apiSettings.getHttpMethod(),
          timeout: this.timeout,
        };
        return this.httpClient.send(req);
      })
      .then(() => {
        // return nothing on success
      })
      .catch((err) => {
        if (err instanceof HttpError) {
          const response = err.response;
          const errorMessage: string = (response.isJson() && 'error' in response.data) ?
            response.data.error : response.text;
          const template: string = ERROR_CODES[response.status];
          const message: string = template ?
            `Instance ID "${apiSettings.getEndpoint()}": ${template}` : errorMessage;
          throw new FirebaseInstanceIdError(InstanceIdClientErrorCode.API_ERROR, message);
        }
        // In case of timeouts and other network errors, the HttpClient returns a
        // FirebaseError wrapped in the response. Simply throw it here.
        throw err;
      });
  }

  private getPathPrefix(): Promise<string> {
    if (this.path) {
      return Promise.resolve(this.path);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          // Assert for an explicit projct ID (either via AppOptions or the cert itself).
          throw new FirebaseInstanceIdError(
            InstanceIdClientErrorCode.INVALID_PROJECT_ID,
            'Failed to determine project ID for InstanceId. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.',
          );
        }

        this.path = FIREBASE_IID_PATH + `project/${projectId}/instanceId/`;
        return this.path;
      });
  }
}

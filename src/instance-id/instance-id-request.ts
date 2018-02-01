/*!
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

import {FirebaseApp} from '../firebase-app';
import {FirebaseError, FirebaseInstanceIdError, InstanceIdClientErrorCode} from '../utils/error';
import {
  HttpMethod, SignedApiRequestHandler, ApiSettings,
} from '../utils/api-request';

import * as validator from '../utils/validator';

/** Firebase IID backend host. */
const FIREBASE_IID_HOST = 'console.firebase.google.com';
/** Firebase IID backend port number. */
const FIREBASE_IID_PORT = 443;
/** Firebase IID backend path. */
const FIREBASE_IID_PATH = '/v1/';
/** Firebase IID request timeout duration in milliseconds. */
const FIREBASE_IID_TIMEOUT = 10000;

/** HTTP error codes raised by the backend server. */
const ERROR_CODES = {
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

  private host: string = FIREBASE_IID_HOST;
  private port: number = FIREBASE_IID_PORT;
  private timeout: number = FIREBASE_IID_TIMEOUT;
  private signedApiRequestHandler: SignedApiRequestHandler;
  private path: string;

  /**
   * @param {FirebaseApp} app The app used to fetch access tokens to sign API requests.
   * @param {string} projectId A Firebase project ID string.
   *
   * @constructor
   */
  constructor(app: FirebaseApp, projectId: string) {
    this.signedApiRequestHandler = new SignedApiRequestHandler(app);
    this.path = FIREBASE_IID_PATH + `project/${projectId}/instanceId/`;
  }

  public deleteInstanceId(instanceId: string): Promise<object> {
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
   * @return {Promise<object>} A promise that resolves with the response.
   */
  private invokeRequestHandler(apiSettings: ApiSettings): Promise<object> {
    const path: string = this.path + apiSettings.getEndpoint();
    const httpMethod: HttpMethod = apiSettings.getHttpMethod();
    return Promise.resolve()
      .then(() => {
        return this.signedApiRequestHandler.sendRequest(
            this.host, this.port, path, httpMethod, undefined, undefined, this.timeout);
      })
      .then((response) => {
        return response;
      })
      .catch((response) => {
        const error = (typeof response === 'object' && 'error' in response) ?
          response.error : response;
        if (error instanceof FirebaseError) {
          // In case of timeouts and other network errors, the API request handler returns a
          // FirebaseError wrapped in the response. Simply throw it here.
          throw error;
        }

        const template: string = ERROR_CODES[response.statusCode];
        const message: string = template ?
          `Instance ID "${apiSettings.getEndpoint()}": ${template}` : JSON.stringify(error);
        throw new FirebaseInstanceIdError(InstanceIdClientErrorCode.API_ERROR, message);
      });
  }
}

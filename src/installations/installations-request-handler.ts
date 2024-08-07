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

import { App } from '../app/index';
import { FirebaseApp } from '../app/firebase-app';
import { FirebaseInstallationsError, InstallationsClientErrorCode } from '../utils/error';
import {
  ApiSettings, AuthorizedHttpClient, HttpRequestConfig, RequestResponseError,
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
  400: 'Malformed installation ID argument.',
  401: 'Request not authorized.',
  403: 'Project does not match installation ID or the client does not have sufficient privileges.',
  404: 'Failed to find the installation ID.',
  409: 'Already deleted.',
  429: 'Request throttled out by the backend server.',
  500: 'Internal server error.',
  503: 'Backend servers are over capacity. Try again later.',
};

/**
 * Class that provides mechanism to send requests to the FIS backend endpoints.
 */
export class FirebaseInstallationsRequestHandler {

  private readonly host: string = FIREBASE_IID_HOST;
  private readonly timeout: number = FIREBASE_IID_TIMEOUT;
  private readonly httpClient: AuthorizedHttpClient;
  private path: string;

  /**
   * @param app - The app used to fetch access tokens to sign API requests.
   *
   * @constructor
   */
  constructor(private readonly app: App) {
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
  }

  public deleteInstallation(fid: string): Promise<void> {
    if (!validator.isNonEmptyString(fid)) {
      return Promise.reject(new FirebaseInstallationsError(
        InstallationsClientErrorCode.INVALID_INSTALLATION_ID,
        'Installation ID must be a non-empty string.',
      ));
    }
    return this.invokeRequestHandler(new ApiSettings(fid, 'DELETE'));
  }

  /**
   * Invokes the request handler based on the API settings object passed.
   *
   * @param apiSettings - The API endpoint settings to apply to request and response.
   * @returns A promise that resolves when the request is complete.
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
        if (err instanceof RequestResponseError) {
          const response = err.response;
          const errorMessage: string = (response.isJson() && 'error' in response.data) ?
            response.data.error : response.text;
          const template: string = ERROR_CODES[response.status];
          const message: string = template ?
            `Installation ID "${apiSettings.getEndpoint()}": ${template}` : errorMessage;
          throw new FirebaseInstallationsError(InstallationsClientErrorCode.API_ERROR, message);
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
          throw new FirebaseInstallationsError(
            InstallationsClientErrorCode.INVALID_PROJECT_ID,
            'Failed to determine project ID for Installations. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.',
          );
        }

        this.path = FIREBASE_IID_PATH + `project/${projectId}/instanceId/`;
        return this.path;
      });
  }
}

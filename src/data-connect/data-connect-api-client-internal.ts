/*!
 * @license
 * Copyright 2024 Google Inc.
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
  HttpRequestConfig, HttpClient, RequestResponseError, AuthorizedHttpClient
} from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { ExecuteGraphqlResponse, GraphqlOptions } from './data-connect-api';

// Data Connect backend constants
const DATA_CONNECT_HOST = 'https://firebasedataconnect.googleapis.com';
//const DATA_CONNECT_EMULATOR_HOST = 'http://127.0.0.1:9399';
const DATA_CONNECT_API_URL_FORMAT =
  '{host}/v1alpha/projects/{projectId}/locations/{locationId}/services/{serviceId}:{endpointId}';

const EXECUTE_GRAPH_QL_ENDPOINT = 'executeGraphql';
//const EXECUTE_GRAPH_QL_READ_ENDPOINT = 'executeGraphqlRead';

const DATA_CONNECT_CONFIG_HEADERS = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`
};

/**
 * Class that facilitates sending requests to the Firebase Data Connect backend API.
 *
 * @internal
 */
export class DataConnectApiClient {
  private readonly httpClient: HttpClient;
  private projectId?: string;

  constructor(private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseDataConnectError(
        'invalid-argument',
        'First argument passed to getDataConnect() must be a valid Firebase app instance.');
    }
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
  }

  public async executeGraphql<GraphqlResponse, Variables>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.getUrl(DATA_CONNECT_HOST, 'us-west2', 'my-service', EXECUTE_GRAPH_QL_ENDPOINT)
      .then(async (url) => {
        const request: HttpRequestConfig = {
          method: 'POST',
          url,
          headers: DATA_CONNECT_CONFIG_HEADERS,
          data: {
            query: 'query ListUsers @auth(level: PUBLIC) { users { uid, name, address } }',
          }
        };
        const resp = await this.httpClient.send(request);
        console.log(resp);
        return Promise.resolve({
          data: resp.data.data as GraphqlResponse,
        });
      })
      .then((resp) => {
        return resp;
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private getUrl(host: string, locationId: string, serviceId: string, endpointId: string): Promise<string> {
    return this.getProjectId()
      .then((projectId) => {
        const urlParams = {
          host,
          projectId,
          locationId,
          serviceId,
          endpointId
        };
        const baseUrl = utils.formatString(DATA_CONNECT_API_URL_FORMAT, urlParams);
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
          throw new FirebaseDataConnectError(
            'unknown-error',
            'Failed to determine project ID. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively, set the GOOGLE_CLOUD_PROJECT environment variable.');
        }
        this.projectId = projectId;
        return projectId;
      });
  }

  private toFirebaseError(err: RequestResponseError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseDataConnectError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    let code: DataConnectErrorCode = 'unknown-error';
    if (error.status && error.status in DATA_CONNECT_ERROR_CODE_MAPPING) {
      code = DATA_CONNECT_ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseDataConnectError(code, message);
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

export const DATA_CONNECT_ERROR_CODE_MAPPING: { [key: string]: DataConnectErrorCode } = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
};

export type DataConnectErrorCode =
  'aborted'
  | 'invalid-argument'
  | 'invalid-credential'
  | 'internal-error'
  | 'permission-denied'
  | 'unauthenticated'
  | 'not-found'
  | 'unknown-error';

/**
 * Firebase Data Connect error code structure. This extends PrefixedFirebaseError.
 *
 * @param code - The error code.
 * @param message - The error message.
 * @constructor
 */
export class FirebaseDataConnectError extends PrefixedFirebaseError {
  constructor(code: DataConnectErrorCode, message: string) {
    super('data-connect', code, message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = FirebaseDataConnectError.prototype;
  }
}

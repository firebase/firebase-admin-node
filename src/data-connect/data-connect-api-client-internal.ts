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
import { ConnectorConfig, ExecuteGraphqlResponse, GraphqlOptions } from './data-connect-api';

const API_VERSION = 'v1alpha';

/** The Firebase Data Connect backend base URL format. */
const FIREBASE_DATA_CONNECT_BASE_URL_FORMAT =
    'https://firebasedataconnect.googleapis.com/{version}/projects/{projectId}/locations/{locationId}/services/{serviceId}:{endpointId}';

/** Firebase Data Connect base URl format when using the Data Connect emultor. */
const FIREBASE_DATA_CONNECT_EMULATOR_BASE_URL_FORMAT =
  'http://{host}/{version}/projects/{projectId}/locations/{locationId}/services/{serviceId}:{endpointId}';

const EXECUTE_GRAPH_QL_ENDPOINT = 'executeGraphql';
const EXECUTE_GRAPH_QL_READ_ENDPOINT = 'executeGraphqlRead';

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

  constructor(private readonly connectorConfig: ConnectorConfig, private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseDataConnectError(
        DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        'First argument passed to getDataConnect() must be a valid Firebase app instance.');
    }
    this.httpClient = new DataConnectHttpClient(app as FirebaseApp);
  }

  /**
   * Execute arbitrary GraphQL, including both read and write queries
   * 
   * @param query - The GraphQL string to be executed.
   * @param options - GraphQL Options
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public async executeGraphql<GraphqlResponse, Variables>(
    query: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.executeGraphqlHelper(query, EXECUTE_GRAPH_QL_ENDPOINT, options);
  }

  /**
   * Execute arbitrary read-only GraphQL queries
   * 
   * @param query - The GraphQL (read-only) string to be executed.
   * @param options - GraphQL Options
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   * @throws FirebaseDataConnectError
   */
  public async executeGraphqlRead<GraphqlResponse, Variables>(
    query: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.executeGraphqlHelper(query, EXECUTE_GRAPH_QL_READ_ENDPOINT, options);
  }

  private async executeGraphqlHelper<GraphqlResponse, Variables>(
    query: string,
    endpoint: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    if (!validator.isNonEmptyString(query)) {
      throw new FirebaseDataConnectError(
        DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        '`query` must be a non-empty string.');
    }
    if (typeof options !== 'undefined') {
      if (!validator.isNonNullObject(options)) {
        throw new FirebaseDataConnectError(
          DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
          'GraphqlOptions must be a non-null object');
      }
    }
    const data = {
      query,
      ...(options?.variables && { variables: options?.variables }),
      ...(options?.operationName && { operationName: options?.operationName }),
    };
    return this.getUrl(API_VERSION, this.connectorConfig.location, this.connectorConfig.serviceId, endpoint)
      .then(async (url) => {
        const request: HttpRequestConfig = {
          method: 'POST',
          url,
          headers: DATA_CONNECT_CONFIG_HEADERS,
          data,
        };
        const resp = await this.httpClient.send(request);
        if (resp.data.errors && validator.isNonEmptyArray(resp.data.errors)) {
          const allMessages = resp.data.errors.map((error: { message: any; }) => error.message).join(' ');
          throw new FirebaseDataConnectError(
            DATA_CONNECT_ERROR_CODE_MAPPING.QUERY_ERROR, allMessages);
        }
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

  private async getUrl(version: string, locationId: string, serviceId: string, endpointId: string): Promise<string> {
    return this.getProjectId()
      .then((projectId) => {
        const urlParams = {
          version,
          projectId,
          locationId,
          serviceId,
          endpointId
        };
        let urlFormat: string;
        if (useEmulator()) {
          urlFormat = utils.formatString(FIREBASE_DATA_CONNECT_EMULATOR_BASE_URL_FORMAT, {
            host: emulatorHost()
          });
        } else {
          urlFormat = FIREBASE_DATA_CONNECT_BASE_URL_FORMAT;
        }
        return utils.formatString(urlFormat, urlParams);
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
            DATA_CONNECT_ERROR_CODE_MAPPING.UNKNOWN,
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
        DATA_CONNECT_ERROR_CODE_MAPPING.UNKNOWN,
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: ServerError = (response.data as ErrorResponse).error || {};
    let code: DataConnectErrorCode = DATA_CONNECT_ERROR_CODE_MAPPING.UNKNOWN;
    if (error.status && error.status in DATA_CONNECT_ERROR_CODE_MAPPING) {
      code = DATA_CONNECT_ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseDataConnectError(code, message);
  }
}

/**
 * Data Connect-specific HTTP client which uses the special "owner" token
 * when communicating with the Data Connect Emulator.
 */
class DataConnectHttpClient extends AuthorizedHttpClient {

  protected getToken(): Promise<string> {
    if (useEmulator()) {
      return Promise.resolve('owner');
    }

    return super.getToken();
  }

}

function emulatorHost(): string | undefined {
  return process.env.DATA_CONNECT_EMULATOR_HOST
}

/**
 * When true the SDK should communicate with the Data Connect Emulator for all API
 * calls and also produce unsigned tokens.
 */
export function useEmulator(): boolean {
  return !!emulatorHost();
}

interface ErrorResponse {
  error?: ServerError;
}

interface ServerError {
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
  QUERY_ERROR: 'query-error',
};

export type DataConnectErrorCode =
  'aborted'
  | 'invalid-argument'
  | 'invalid-credential'
  | 'internal-error'
  | 'permission-denied'
  | 'unauthenticated'
  | 'not-found'
  | 'unknown-error'
  | 'query-error';

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

/*!
 * @license
 * Copyright 2024 Google LLC
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
import { FirebaseError, toHttpResponse } from '../utils/error';
import {
  FirebaseDataConnectError,
  DataConnectErrorCode,
  DATA_CONNECT_ERROR_CODE_MAPPING,
  GRPC_STATUS_CODE_TO_STRING
} from './error';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { ConnectorConfig, ExecuteGraphqlResponse, GraphqlOptions, OperationOptions } from './data-connect-api';

const API_VERSION = 'v1';
const FIREBASE_DATA_CONNECT_PROD_URL = 'https://firebasedataconnect.googleapis.com';

/** The Firebase Data Connect backend service URL format. */
const FIREBASE_DATA_CONNECT_SERVICES_URL_FORMAT =
  FIREBASE_DATA_CONNECT_PROD_URL + 
  '/{version}' + 
  '/projects/{projectId}' + 
  '/locations/{locationId}' + 
  '/services/{serviceId}' + 
  ':{endpointId}';

/** The Firebase Data Connect backend connector URL format. */
const FIREBASE_DATA_CONNECT_CONNECTORS_URL_FORMAT =
  FIREBASE_DATA_CONNECT_PROD_URL + 
  '/{version}' + 
  '/projects/{projectId}' + 
  '/locations/{locationId}' + 
  '/services/{serviceId}' + 
  '/connectors/{connectorId}' + 
  ':{endpointId}';

/** Firebase Data Connect service URL format when using the Data Connect emulator. */
const FIREBASE_DATA_CONNECT_EMULATOR_SERVICES_URL_FORMAT =
  'http://{host}/{version}/projects/{projectId}/locations/{locationId}/services/{serviceId}:{endpointId}';

/** Firebase Data Connect connector URL format when using the Data Connect emulator. */
const FIREBASE_DATA_CONNECT_EMULATOR_CONNECTORS_URL_FORMAT =
  'http://{host}/{version}/projects/{projectId}/locations/{locationId}/services/{serviceId}/connectors/{connectorId}:{endpointId}';

const EXECUTE_GRAPH_QL_ENDPOINT = 'executeGraphql';
const EXECUTE_GRAPH_QL_READ_ENDPOINT = 'executeGraphqlRead';

const IMPERSONATE_QUERY_ENDPOINT = 'impersonateQuery';
const IMPERSONATE_MUTATION_ENDPOINT = 'impersonateMutation';


function getHeaders(isUsingGen: boolean): { [key: string]: string } {
  const headerValue = {
    'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`,
    'X-Goog-Api-Client': utils.getMetricsHeader(),
  };
  if (isUsingGen) {
    headerValue['X-Goog-Api-Client'] += ' admin-js/gen';
  }
  return headerValue;
}

/**
 * URL params for requests to an endpoint under services:
 * .../services/{serviceId}:endpoint
 */
interface ServicesUrlParams {
  version: string;
  projectId: string;
  locationId: string;
  serviceId: string;
  endpointId: string;
  host?: string; // Present only when using the emulator
}

/**
 * URL params for requests to an endpoint under connectors:
 * .../services/{serviceId}/connectors/{connectorId}:endpoint
 */
interface ConnectorsUrlParams extends ServicesUrlParams {
  connectorId: string;
}

/**
 * Class that facilitates sending requests to the Firebase Data Connect backend API.
 *
 * @internal
 */
export class DataConnectApiClient {
  private readonly httpClient: HttpClient;
  private projectId?: string;
  private isUsingGen = false;

  constructor(private readonly connectorConfig: ConnectorConfig, private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: 'First argument passed to getDataConnect() must be a valid Firebase app instance.'
      });
    }
    this.httpClient = new DataConnectHttpClient(app as FirebaseApp);
  }
  
  /**
   * Update whether the SDK is using a generated one or not.
   * @param isUsingGen
   */
  setIsUsingGen(isUsingGen: boolean): void {
    this.isUsingGen = isUsingGen;
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


  /**
   * A helper function to execute GraphQL queries.
   *
   * @param query - The arbitrary GraphQL query to execute.
   * @param endpoint - The endpoint to call.
   * @param options - The GraphQL options.
   * @returns A promise that fulfills with the GraphQL response, or throws an error.
   */
  private async executeGraphqlHelper<GraphqlResponse, Variables>(
    query: string,
    endpoint: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    if (!validator.isNonEmptyString(query)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`query` must be a non-empty string.'
      });
    }
    if (typeof options !== 'undefined') {
      if (!validator.isNonNullObject(options)) {
        throw new FirebaseDataConnectError({
          code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
          message: 'GraphqlOptions must be a non-null object'
        });
      }
    }
    const data = {
      query,
      ...(options?.variables && { variables: options?.variables }),
      ...(options?.operationName && { operationName: options?.operationName }),
      ...(options?.impersonate && { extensions: { impersonate: options?.impersonate } }),
    };
    const url = await this.getServicesUrl(
      API_VERSION, 
      this.connectorConfig.location, 
      this.connectorConfig.serviceId, 
      endpoint
    );
    try {
      const resp = await this.makeGqlRequest<GraphqlResponse>(url, data);
      return resp;
    } catch (err: any) {
      throw this.toFirebaseError(err);
    }
  }

  /**
   * Executes a GraphQL query with impersonation.
   *
   * @param options - The GraphQL options. Must include impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  public async executeQuery<GraphqlResponse, Variables>(
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.executeOperationHelper(IMPERSONATE_QUERY_ENDPOINT, name, variables, options);
  }

  /**
   * Executes a GraphQL mutation with impersonation.
   *
   * @param options - The GraphQL options. Must include impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  public async executeMutation<GraphqlResponse, Variables>(
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.executeOperationHelper(IMPERSONATE_MUTATION_ENDPOINT, name, variables, options);
  }

  /**
   * A helper function to execute operations by making requests to FDC's impersonate
   * operations endpoints.
   *
   * @param endpoint - The endpoint to call.
   * @param options - The GraphQL options, including impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  private async executeOperationHelper<GraphqlResponse, Variables>(
    endpoint: string,
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    if (
      typeof name === 'undefined' ||
      !validator.isNonEmptyString(name)
    ) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`name` must be a non-empty string.'
      });
    }

    if (this.connectorConfig.connector === undefined || this.connectorConfig.connector === '') {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: `The 'connectorConfig.connector' field used to instantiate your Data Connect
        instance must be a non-empty string (the connectorId) when calling executeQuery or executeMutation.`
      });
    }

    const data = {
      ...(variables && { variables: variables }),
      operationName: name,
      extensions: { impersonate: options?.impersonate },
    };
    const url = await this.getConnectorsUrl(
      API_VERSION,
      this.connectorConfig.location,
      this.connectorConfig.serviceId,
      this.connectorConfig.connector,
      endpoint,
    );
    try {
      const resp = await this.makeGqlRequest<GraphqlResponse>(url, data);
      return resp;
    } catch (err: any) {
      throw this.toFirebaseError(err);
    }
  }

  /**
   * Constructs the URL for a Data Connect request to a service endpoint.
   *
   * @param version - The API version.
   * @param locationId - The location of the Data Connect service.
   * @param serviceId - The ID of the Data Connect service.
   * @param endpointId - The endpoint to call.
   * @returns A promise which resolves to the formatted URL string.
   */
  private async getServicesUrl(
    version: string,
    locationId: string,
    serviceId: string,
    endpointId: string,
  ): Promise<string> {
    const projectId = await this.getProjectId();
    const params: ServicesUrlParams = {
      version,
      projectId,
      locationId,
      serviceId,
      endpointId,
    };
    let urlFormat = FIREBASE_DATA_CONNECT_SERVICES_URL_FORMAT;
    if (useEmulator()) {
      urlFormat = FIREBASE_DATA_CONNECT_EMULATOR_SERVICES_URL_FORMAT;
      params.host = emulatorHost();
    }
    return utils.formatString(urlFormat, params);
  }

  /**
   * Constructs the URL for a Data Connect request to a connector endpoint.
   *
   * @param version - The API version.
   * @param locationId - The location of the Data Connect service.
   * @param serviceId - The ID of the Data Connect service.
   * @param connectorId - The ID of the Connector.
   * @param endpointId - The endpoint to call.
   * @returns A promise which resolves to the formatted URL string.

   */
  private async getConnectorsUrl(
    version: string,
    locationId: string,
    serviceId: string,
    connectorId: string,
    endpointId: string,
  ): Promise<string> {
    const projectId = await this.getProjectId();
    const params: ConnectorsUrlParams = {
      version,
      projectId,
      locationId,
      serviceId,
      connectorId,
      endpointId,
    };
    let urlFormat = FIREBASE_DATA_CONNECT_CONNECTORS_URL_FORMAT;
    if (useEmulator()) {
      urlFormat = FIREBASE_DATA_CONNECT_EMULATOR_CONNECTORS_URL_FORMAT;
      params.host = emulatorHost();
    }
    return utils.formatString(urlFormat, params);
  }

  private getProjectId(): Promise<string> {
    if (this.projectId) {
      return Promise.resolve(this.projectId);
    }
    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseDataConnectError({
            code: DATA_CONNECT_ERROR_CODE_MAPPING.UNKNOWN,
            message: 'Failed to determine project ID. Initialize the '
              + 'SDK with service account credentials or set project ID as an app option. '
              + 'Alternatively, set the GOOGLE_CLOUD_PROJECT environment variable.'
          });
        }
        this.projectId = projectId;
        return projectId;
      });
  }

  /**
   * Makes a GraphQL request to the specified url.
   *
   * @param url - The URL to send the request to.
   * @param data - The GraphQL request payload.
   * @returns A promise that fulfills with the GraphQL response, or throws an error.
   */
  private async makeGqlRequest<GraphqlResponse>(url: string, data: object): 
  Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    const request: HttpRequestConfig = {
      method: 'POST',
      url,
      headers: getHeaders(this.isUsingGen),
      data,
    };
    const resp = await this.httpClient.send(request);
    if (resp.data.errors && validator.isNonEmptyArray(resp.data.errors)) {
      const allMessages = resp.data.errors.map((error: { message: any; }) => error.message).join(' ');
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.QUERY_ERROR,
        message: allMessages,
        httpResponse: toHttpResponse(resp),
      });
    }
    return Promise.resolve({
      data: resp.data.data as GraphqlResponse,
    });
  }

  private toFirebaseError(err: RequestResponseError): FirebaseError {
    if (err instanceof FirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.UNKNOWN,
        message: `Unexpected response with status: ${response.status} and body: ${response.text}`,
        httpResponse: toHttpResponse(response),
        cause: err
      });
    }

    const data = response.data as any;
    const error: ServerError = (validator.isNonNullObject(data) && validator.isNonNullObject(data.error))
      ? data.error
      : (validator.isNonNullObject(data) ? data : {});
        
    let status = error.status;
    if (!status && validator.isNumber(error.code)) {
      status = GRPC_STATUS_CODE_TO_STRING[error.code as number];
    }

    let code: DataConnectErrorCode = DATA_CONNECT_ERROR_CODE_MAPPING.UNKNOWN;
    if (status && status in DATA_CONNECT_ERROR_CODE_MAPPING) {
      code = DATA_CONNECT_ERROR_CODE_MAPPING[status];
    }
    const message = error.message || 'Unknown server error';
    return new FirebaseDataConnectError({
      code,
      message,
      httpResponse: toHttpResponse(response),
      cause: err,
    });
  }

  /**
   * Generates both capitalized and camel-cased variations of a table name.
   * Capitalization matches the schema types, and camel-case matches mutations.
   */
  private getTableNames(tableName: string): { capitalized: string; formatted: string } {
    if (!tableName || tableName.length === 0) {
      return { capitalized: tableName, formatted: tableName };
    }
    const capitalized = tableName.charAt(0).toUpperCase() + tableName.slice(1);
    const formatted = tableName.charAt(0).toLowerCase() + tableName.slice(1);
    return { capitalized, formatted };
  }

  /**
   * Extracts all defined property keys from an object as a space-separated string.
   * Used to build the `@allow(fields: ...)` mutation directive for single operations.
   */
  private getObjectKeys(data: Record<string, unknown> | object): string {
    return Object.keys(data)
      .filter(key => (data as Record<string, unknown>)[key] !== undefined)
      .join(' ');
  }

  /**
   * Extracts the union of all defined property keys across an array of objects
   * as a space-separated string. Used to build the `@allow(fields: ...)` mutation
   * directive for bulk operations.
   */
  private getArrayObjectsKeys(data: Array<unknown>): string {
    const allKeys = new Set<string>();
    for (const element of data) {
      if (validator.isNonNullObject(element)) {
        const record = element as Record<string, unknown>;
        Object.keys(record).forEach(key => {
          if (record[key] !== undefined) {
            allKeys.add(key);
          }
        });
      }
    }
    return Array.from(allKeys).join(' ');
  }

  private handleBulkImportErrors(err: FirebaseDataConnectError): never {
    if (err.code === `data-connect/${DATA_CONNECT_ERROR_CODE_MAPPING.QUERY_ERROR}`){
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.QUERY_ERROR,
        message: `${err.message}. Make sure that your table name passed in matches the type name in your `
          + 'GraphQL schema file.',
        cause: err,
      });
    }
    throw err;
  }

  /**
   * Insert a single row into the specified table.
   */
  public async insert<GraphQlResponse, Variables extends object>(
    tableName: string,
    data: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    if (!validator.isNonEmptyString(tableName)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`tableName` must be a non-empty string.'
      });
    }
    if (validator.isArray(data)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`data` must be an object, not an array, for single insert. For arrays, please use '
          + '`insertMany` function.'
      });
    }
    if (!validator.isNonNullObject(data)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`data` must be a non-null object.'
      });
    }

    try {
      const { capitalized, formatted } = this.getTableNames(tableName);
      const keys = this.getObjectKeys(data);
      const mutation = 
        `mutation($data: ${capitalized}_Data! @allow(fields: "${keys}")) {
          ${formatted}_insert(data: $data)
        }`;

      return this.executeGraphql<GraphQlResponse, { data: Variables }>(mutation, { variables: { data } })
        .catch(this.handleBulkImportErrors);
    } catch (e: any) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INTERNAL,
        message: `Failed to construct insert mutation: ${e.message}`,
        cause: e,
      });
    }
  }

  /**
   * Insert multiple rows into the specified table.
   */
  public async insertMany<GraphQlResponse, Variables extends Array<unknown>>(
    tableName: string,
    data: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    if (!validator.isNonEmptyString(tableName)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`tableName` must be a non-empty string.'
      });
    }
    if (!validator.isNonEmptyArray(data)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`data` must be a non-empty array for insertMany.',
      });
    }

    try {
      const { capitalized, formatted } = this.getTableNames(tableName);
      const keys = this.getArrayObjectsKeys(data);
      const mutation = 
        `mutation($data: [${capitalized}_Data!]! @allow(fields: "${keys}")) {
          ${formatted}_insertMany(data: $data)
        }`;

      return this.executeGraphql<GraphQlResponse, { data: Variables }>(mutation, { variables: { data } })
        .catch(this.handleBulkImportErrors);
    } catch (e: any) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INTERNAL,
        message: `Failed to construct insertMany mutation: ${e.message}`,
        cause: e,
      });
    }
  }

  /**
   * Insert a single row into the specified table, or update it if it already exists.
   */
  public async upsert<GraphQlResponse, Variables extends object>(
    tableName: string,
    data: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    if (!validator.isNonEmptyString(tableName)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`tableName` must be a non-empty string.'
      });
    }
    if (validator.isArray(data)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`data` must be an object, not an array, for single upsert. For arrays, please use '
          + '`upsertMany` function.'
      });
    }
    if (!validator.isNonNullObject(data)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`data` must be a non-null object.'
      });
    }

    try {
      const { capitalized, formatted } = this.getTableNames(tableName);
      const keys = this.getObjectKeys(data);
      const mutation = 
        `mutation($data: ${capitalized}_Data! @allow(fields: "${keys}")) {
          ${formatted}_upsert(data: $data)
        }`;

      return this.executeGraphql<GraphQlResponse, { data: Variables }>(mutation, { variables: { data } })
        .catch(this.handleBulkImportErrors);
    } catch (e: any) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INTERNAL,
        message: `Failed to construct upsert mutation: ${e.message}`,
        cause: e,
      });
    }
  }

  /**
   * Insert multiple rows into the specified table, or update them if they already exist.
   */
  public async upsertMany<GraphQlResponse, Variables extends Array<unknown>>(
    tableName: string,
    data: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    if (!validator.isNonEmptyString(tableName)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`tableName` must be a non-empty string.'
      });
    }
    if (!validator.isNonEmptyArray(data)) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: '`data` must be a non-empty array for upsertMany.'
      });
    }

    try {
      const { capitalized, formatted } = this.getTableNames(tableName);
      const keys = this.getArrayObjectsKeys(data);
      const mutation = 
        `mutation($data: [${capitalized}_Data!]! @allow(fields: "${keys}")) {
          ${formatted}_upsertMany(data: $data)
        }`;

      return this.executeGraphql<GraphQlResponse, { data: Variables }>(mutation, { variables: { data } })
        .catch(this.handleBulkImportErrors);
    } catch (e: any) {
      throw new FirebaseDataConnectError({
        code: DATA_CONNECT_ERROR_CODE_MAPPING.INTERNAL,
        message: `Failed to construct upsertMany mutation: ${e.message}`,
        cause: e,
      });
    }
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

interface ServerError {
  code?: number;
  message?: string;
  status?: string;
}

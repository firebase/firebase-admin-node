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
import { DataConnectApiClient } from './data-connect-api-client-internal';

import {
  ConnectorConfig,
  ExecuteGraphqlResponse,
  ExecuteOperationResponse,
  GraphqlOptions,
  OperationOptions,
} from './data-connect-api';

export class DataConnectService {

  private readonly appInternal: App;
  private dataConnectInstances: Map<string, DataConnect> = new Map();

  constructor(app: App) {
    this.appInternal = app;
  }

  getDataConnect(connectorConfig: ConnectorConfig): DataConnect {
    const id = `${connectorConfig.location}-${connectorConfig.serviceId}`;
    const dc = this.dataConnectInstances.get(id);
    if (typeof dc !== 'undefined') {
      return dc;
    }

    const newInstance = new DataConnect(connectorConfig, this.appInternal);
    this.dataConnectInstances.set(id, newInstance);
    return newInstance;
  }

  /**
   * Returns the app associated with this `DataConnectService` instance.
   *
   * @returns The app associated with this `DataConnectService` instance.
   */
  get app(): App {
    return this.appInternal;
  }
}

/**
 * The Firebase `DataConnect` service interface.
 */
export class DataConnect {

  private readonly client: DataConnectApiClient;

  /**
   * @param connectorConfig - The connector configuration.
   * @param app - The app for this `DataConnect` service.
   * @constructor
   * @internal
   */
  constructor(readonly connectorConfig: ConnectorConfig, readonly app: App) {
    this.client = new DataConnectApiClient(connectorConfig, app);
  }

  /**
   * @param isUsingGen
   * @internal
   */
  useGen(isUsingGen: boolean): void {
    this.client.setIsUsingGen(isUsingGen);
  }

  /**
   * Execute an arbitrary GraphQL query or mutation
   *
   * @param query - The GraphQL query or mutation.
   * @param options - Optional {@link GraphqlOptions} when executing a GraphQL query or mutation.
   *
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public executeGraphql<GraphqlResponse, Variables>(
    query: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.client.executeGraphql(query, options);
  }

  /**
   * Execute an arbitrary read-only GraphQL query
   *
   * @param query - The GraphQL read-only query.
   * @param options - Optional {@link GraphqlOptions} when executing a read-only GraphQL query.
   *
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public executeGraphqlRead<GraphqlResponse, Variables>(
    query: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.client.executeGraphqlRead(query, options);
  }

  /**
   * Insert a single row into the specified table.
   *
   * @param tableName - The name of the table to insert data into.
   * @param variables - The data object to insert. The keys should correspond to the column names.
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public insert<GraphQlResponse, Variables extends object>(
    tableName: string,
    variables: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    return this.client.insert(tableName, variables);
  }

  /**
   * Insert multiple rows into the specified table.
   *
   * @param tableName - The name of the table to insert data into.
   * @param variables - An array of data objects to insert. Each object's keys should correspond to the column names.
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public insertMany<GraphQlResponse, Variables extends Array<unknown>>(
    tableName: string,
    variables: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    return this.client.insertMany(tableName, variables);
  }

  /**
   * Insert a single row into the specified table, or update it if it already exists.
   *
   * @param tableName - The name of the table to upsert data into.
   * @param variables - The data object to upsert. The keys should correspond to the column names.
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public upsert<GraphQlResponse, Variables extends object>(
    tableName: string,
    variables: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    return this.client.upsert(tableName, variables);
  }

  /**
   * Insert multiple rows into the specified table, or update them if they already exist.
   *
   * @param tableName - The name of the table to upsert data into.
   * @param variables - An array of data objects to upsert. Each object's keys should correspond to the column names.
   * @returns A promise that fulfills with a `ExecuteGraphqlResponse`.
   */
  public upsertMany<GraphQlResponse, Variables extends Array<unknown>>(
    tableName: string,
    variables: Variables,
  ): Promise<ExecuteGraphqlResponse<GraphQlResponse>> {
    return this.client.upsertMany(tableName, variables);
  }

  /**
   * Executes a GraphQL query. The query must be defined in your Data Connect GraphQL files.
   * Optionally, you can provide auth impersonation details. If you don't
   * specify a value for this option, the query will run with admin privileges
   * and will ignore all auth directives.
   *
   * @param name - The name of the defined query to execute.
   * @param options - The GraphQL options, must include operationName and impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  public executeQuery<Data>(
    name: string,
    options?: OperationOptions
  ): Promise<ExecuteOperationResponse<Data>>;
  
  /**
   * Executes a GraphQL query. The query must be defined in your Data Connect GraphQL files.
   * Optionally, you can provide auth impersonation details. If you don't
   * specify a value for this option, the query will run with admin privileges
   * and will ignore all auth directives.
   *
   * @param name - The name of the defined query to execute.
   * @param variables - The variables for the query. May be optional if the query's variables are optional.
   * @param options - The GraphQL options, must include operationName and impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  public executeQuery<Data, Variables>(
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteOperationResponse<Data>>;
  
  public executeQuery<Data, Variables>(
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteOperationResponse<Data>> {
    return this.client.executeQuery<Data, Variables>(name, variables, options);
  }

  /**
   * Executes a GraphQL mutation. The mutation must be defined in your Data Connect GraphQL files.
   * Optionally, you can provide auth impersonation details. If you don't
   * specify a value for this option, the query will run with admin privileges
   * and will ignore all auth directives.
   * 
   * @param name - The name of the defined mutation to execute.
   * @param options - The GraphQL options, must include operationName and impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  public executeMutation<Data>(
    name: string,
    options?: OperationOptions
  ): Promise<ExecuteOperationResponse<Data>>;
  
  /**
   * Executes a GraphQL mutation. The mutation must be defined in your Data Connect GraphQL files.
   * Optionally, you can provide auth impersonation details. If you don't
   * specify a value for this option, the query will run with admin privileges
   * and will ignore all auth directives.
   * 
   * @param name - The name of the defined mutation to execute.
   * @param variables - The variables for the mutation. May be optional if the mutation's variables are optional.
   * @param options - The GraphQL options, must include operationName and impersonation details.
   * @returns A promise that fulfills with the GraphQL response.
   */
  public executeMutation<Data, Variables>(
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteOperationResponse<Data>>;

  public executeMutation<Data, Variables>(
    name: string,
    variables: Variables, 
    options?: OperationOptions
  ): Promise<ExecuteOperationResponse<Data>> {
    return this.client.executeMutation<Data, Variables>(name, variables, options);
  }
}

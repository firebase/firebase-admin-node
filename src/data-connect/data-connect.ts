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
import { 
  DATA_CONNECT_ERROR_CODE_MAPPING, 
  DataConnectApiClient, 
  FirebaseDataConnectError } from './data-connect-api-client-internal';

import {
  ConnectorConfig,
  ExecuteGraphqlResponse,
  GraphqlOptions,
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

  /** @internal */
  public executeQuery<Data, Variables>(options: GraphqlOptions<Variables>): Promise<ExecuteGraphqlResponse<Data>> {
    return this.client.executeQuery<Data, Variables>(options);
  }

  /** @internal */
  public executeMutation<Data, Variables>(options: GraphqlOptions<Variables>): Promise<ExecuteGraphqlResponse<Data>> {
    return this.client.executeMutation<Data, Variables>(options);
  }
  
  /**
   * Create a reference to a specific "instance" of a named query.
   * @param options - Required {@link GraphqlOptions} when executing a GraphQL query.
   * @returns an reference to the named query with the specified impersonation and variables. 
   */
  public queryRef<Data>(
    options: GraphqlOptions<undefined>
  ): QueryRef<Data, undefined>;
  
  /**
   * Create a reference to a specific "instance" of a named query.
   * @param options - Required {@link GraphqlOptions} when executing a GraphQL query.
   * @returns an reference to the named query with the specified impersonation and variables. 
   */
  public queryRef<Data, Variables>(
    options: GraphqlOptions<Variables>
  ): QueryRef<Data, Variables>;
  
  public queryRef<Data, Variables>(
    options: GraphqlOptions<Variables>
  ): QueryRef<Data, Variables> {
    if (!('connector' in this.connectorConfig)){
      throw new FirebaseDataConnectError(
        DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        `The 'connectorConfig.connector' field used to instantiate your Data Connect
        instance must be a non-empty string (the connectorId) when creating a queryRef.`);
    }
    return new QueryRef(this, options);
  }

  /**
   * Create a reference to a specific "instance" of a named mutation.
   * @param options - Required {@link GraphqlOptions} when executing a GraphQL mutation.
   * @returns an reference to the named mutation with the specified impersonation and variables. 
   */
  public mutationRef<Data>(
    options: GraphqlOptions<undefined>
  ): MutationRef<Data, undefined>

  /**
   * Create a reference to a specific "instance" of a named mutation.
   * @param options - Required {@link GraphqlOptions} when executing a GraphQL mutation.
   * @returns an reference to the named mutation with the specified impersonation and variables. 
   */
  public mutationRef<Data, Variables>(
    options: GraphqlOptions<Variables>
  ): MutationRef<Data, Variables>;

  /**
   * Create a reference to a specific "instance" of a named mutation.
   * @param options - Required {@link GraphqlOptions} when executing a GraphQL mutation.
   * @returns an reference to the named mutation with the specified impersonation and variables. 
   */
  public mutationRef<Data, Variables>(
    options: GraphqlOptions<Variables>
  ): MutationRef<Data, Variables> {
    if (!('connector' in this.connectorConfig)){
      throw new FirebaseDataConnectError(
        DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        `The 'connectorConfig.connector' field used to instantiate your Data Connect
        instance must be a non-empty string (the connectorId) when creating a mutationRef.`);
    }
    return new MutationRef(this, options);
  }
}

interface OperationResult<Data, Variables> {
  ref: OperationRef<Data, Variables>;
  data: Data;
  variables: Variables;
  dataConnect: DataConnect;
}

export interface QueryResult<Data, Variables> extends OperationResult<Data, Variables> {
  ref: QueryRef<Data, Variables>;
}

export interface MutationResult<Data, Variables> extends OperationResult<Data, Variables> {
  ref: MutationRef<Data, Variables>;
}

abstract class OperationRef<Data, Variables> {
  constructor(
    public readonly dataConnect: DataConnect,
    public readonly options: GraphqlOptions<Variables>,
  ) {
    if (typeof options.operationName === 'undefined') {
      throw new FirebaseDataConnectError(
        DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        `The 'options.operationName' field must be provided when creating a queryRef
        or mutationRef.`);
    }
    if (typeof options.impersonate === 'undefined') {
      throw new FirebaseDataConnectError(
        DATA_CONNECT_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        `The 'options.impersonate' field must be provided when creating a queryRef
        or mutationRef.`);
    }
  }
  abstract execute(): Promise<OperationResult<Data, Variables>>;
}

class QueryRef<Data, Variables> extends OperationRef<Data, Variables> {
  async execute(): Promise<QueryResult<Data, Variables>> {
    const { data } = await this.dataConnect.executeQuery<Data, Variables>(this.options);    
    return {
      ref: this,
      data: data,
      variables: this.options.variables as Variables,
      dataConnect: this.dataConnect
    }
  }
}

class MutationRef<Data, Variables> extends OperationRef<Data, Variables> {
  async execute(): Promise<MutationResult<Data, Variables>> {
    const { data } = await this.dataConnect.executeMutation<Data, Variables>(this.options)
    return {
      ref: this,
      data: data,
      variables: this.options.variables as Variables,
      dataConnect: this.dataConnect
    }
  }
}
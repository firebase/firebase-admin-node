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
import { DataConnectApiClient } from './data-connect-api-client-internal';
//import * as validator from '../utils/validator';

import {
  ExecuteGraphqlResponse,
  GraphqlOptions,
  //GraphqlReadOptions,
} from './data-connect-api';

/**
 * The Firebase `DataConnect` service interface.
 */
export class DataConnect {

  private readonly client: DataConnectApiClient;

  /**
 * @param app - The app for this `DataConnect` service.
 * @constructor
 * @internal
 */
  constructor(readonly app: App) {
    this.client = new DataConnectApiClient(app);
  }

  /**
 * Execute an arbitrary GraphQL query or mutation
 *
 * @param query - The GraphQL query or mutation.
 * @param options - Optional options object when creating a new App Check Token.
 *
 * @returns A promise that fulfills with a `Something`.
 */
  public executeGraphql<GraphqlResponse, Variables>(
    query: string,
    options?: GraphqlOptions<Variables>,
  ): Promise<ExecuteGraphqlResponse<GraphqlResponse>> {
    return this.client.executeGraphql(query, options);
  }
}

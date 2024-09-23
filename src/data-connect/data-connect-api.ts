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

/**
 * Interface representing a Data Connect connector configuration.
 */
export interface ConnectorConfig {
  /**
   * Location ID of the Data Connect service.
   */
  location: string;

  /**
   * Service ID of the Data Connect service.
   */
  serviceId: string;
}

/**
 * Interface representing GraphQL response.
 */
export interface ExecuteGraphqlResponse<GraphqlResponse> {
  /**
   * Data payload of the GraphQL response.
   */
  data: GraphqlResponse;
}

/**
 * Interface representing GraphQL options.
 */
export interface GraphqlOptions<Variables> {
  /**
   * Values for GraphQL variables provided in this query or mutation.
   */
  variables?: Variables;

  /**
   * The name of the GraphQL operation. Required only if `query` contains multiple operations.
   */
  operationName?: string;
}

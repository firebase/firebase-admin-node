/*!
 * Copyright 2020 Google Inc.
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
 * Firebase Remote Config.
 *
 * @packageDocumentation
 */

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { RemoteConfig } from './remote-config';
import { ServerConfig, FetchResponse } from './remote-config-api';

export {
  AndCondition,
  CustomSignalCondition,
  CustomSignalOperator,
  DefaultConfig,
  EvaluationContext,
  ExplicitParameterValue,
  FetchResponse,
  GetServerTemplateOptions,
  InAppDefaultValue,
  InitServerTemplateOptions,
  ListVersionsOptions,
  ListVersionsResult,
  MicroPercentRange,
  NamedCondition,
  OneOfCondition,
  OrCondition,
  ParameterValueType,
  PercentConditionOperator,
  PercentCondition,
  PredefinedSignals,
  RemoteConfigCondition,
  RemoteConfigParameter,
  RemoteConfigParameterGroup,
  RemoteConfigParameterValue,
  RemoteConfigTemplate,
  RemoteConfigUser,
  ServerConfig,
  ServerTemplate,
  ServerTemplateData,
  ServerTemplateDataType,
  TagColor,
  UserProvidedSignals,
  Value,
  ValueSource,
  Version,
} from './remote-config-api';
export { RemoteConfig } from './remote-config';

/**
 * Gets the {@link RemoteConfig} service for the default app or a given app.
 *
 * `getRemoteConfig()` can be called with no arguments to access the default
 * app's `RemoteConfig` service or as `getRemoteConfig(app)` to access the
 * `RemoteConfig` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the `RemoteConfig` service for the default app
 * const defaultRemoteConfig = getRemoteConfig();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `RemoteConfig` service for a given app
 * const otherRemoteConfig = getRemoteConfig(otherApp);
 * ```
 *
 * @param app - Optional app for which to return the `RemoteConfig` service.
 *   If not provided, the default `RemoteConfig` service is returned.
 *
 * @returns The default `RemoteConfig` service if no
 *   app is provided, or the `RemoteConfig` service associated with the provided
 *   app.
 */
export function getRemoteConfig(app?: App): RemoteConfig {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('remoteConfig', (app) => new RemoteConfig(app));
}

/**
   * Returns a JSON-serializable representation of the current config values, including an eTag
   * that can be utilized by the Remote Config web client SDK.
   * 
   * @returns JSON-serializable config object.
   */
export function buildFetchResponse(serverConfig: ServerConfig, etag?: string): FetchResponse {
  const config: {[key:string]: string} = {};
  for (const [param, value] of Object.entries(serverConfig.getAll())) {
    config[param] = value.asString();
  }
  // TODO - compute etag
  return  {
    status: 200,
    eTag: `etag-${Math.floor(Math.random() * 100000)}`,
    config,
  };
}
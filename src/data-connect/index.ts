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
 * Firebase Data Connect service.
 *
 * @packageDocumentation
 */

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { DataConnect, DataConnectService } from './data-connect';
import { ConnectorConfig } from './data-connect-api';

export {
  GraphqlOptions,
  ExecuteGraphqlResponse,
  ConnectorConfig,
} from './data-connect-api'
export {
  DataConnect,
} from './data-connect'

/**
 * Gets the {@link DataConnect} service for the default app
 * or a given app.
 *
 * `getDataConnect()` can be called with no arguments to access the default
 * app's `DataConnect` service or as `getDataConnect(app)` to access the
 * `DataConnect` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the `DataConnect` service for the default app
 * const defaultDataConnect = getDataConnect();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `DataConnect` service for a given app
 * const otherDataConnect = getDataConnect(otherApp);
 * ```
 * 
 * @param connectorConfig - Connector Config
 *
 * @param app - Optional app for which to return the `DataConnect` service.
 *   If not provided, the default `DataConnect` service is returned.
 *
 * @returns The default `DataConnect` service if no app is provided, or the `DataConnect`
 *   service associated with the provided app.
 */
export function getDataConnect(connectorConfig: ConnectorConfig, app?: App): DataConnect {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  const dataConnectService = firebaseApp.getOrInitService('dataConnect', (app) => new DataConnectService(app));
  return dataConnectService.getDataConnect(connectorConfig);
}

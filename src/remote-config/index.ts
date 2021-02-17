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

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { RemoteConfig } from './remote-config';

export {
  ExplicitParameterValue,
  InAppDefaultValue,
  ListVersionsOptions,
  ListVersionsResult,
  RemoteConfigCondition,
  RemoteConfigParameter,
  RemoteConfigParameterGroup,
  RemoteConfigParameterValue,
  RemoteConfigTemplate,
  RemoteConfigUser,
  TagColor,
  Version,
} from './remote-config-api';
export { RemoteConfig } from './remote-config';

/**
 * Gets the {@link remoteConfig.RemoteConfig `RemoteConfig`} service for the
 * default app or a given app.
 *
 * `getRemoteConfig()` can be called with no arguments to access the default
 * app's {@link remoteConfig.RemoteConfig `RemoteConfig`} service or as
 * `getRemoteConfig(app)` to access the
 * {@link remoteConfig.RemoteConfig `RemoteConfig`} service associated with a
 * specific app.
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
 * @param app Optional app for which to return the `RemoteConfig` service.
 *   If not provided, the default `RemoteConfig` service is returned.
 *
 * @return The default `RemoteConfig` service if no
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

import {
  ExplicitParameterValue as TExplicitParameterValue,
  InAppDefaultValue as TInAppDefaultValue,
  ListVersionsOptions as TListVersionsOptions,
  ListVersionsResult as TListVersionsResult,
  RemoteConfigCondition as TRemoteConfigCondition,
  RemoteConfigParameter as TRemoteConfigParameter,
  RemoteConfigParameterGroup as TRemoteConfigParameterGroup,
  RemoteConfigParameterValue as TRemoteConfigParameterValue,
  RemoteConfigTemplate as TRemoteConfigTemplate,
  RemoteConfigUser as TRemoteConfigUser,
  TagColor as TTagColor,
  Version as TVersion,
} from './remote-config-api';
import { RemoteConfig as TRemoteConfig } from './remote-config';

/**
 * Gets the {@link remoteConfig.RemoteConfig `RemoteConfig`} service for the
 * default app or a given app.
 *
 * `admin.remoteConfig()` can be called with no arguments to access the default
 * app's {@link remoteConfig.RemoteConfig `RemoteConfig`} service or as
 * `admin.remoteConfig(app)` to access the
 * {@link remoteConfig.RemoteConfig `RemoteConfig`} service associated with a
 * specific app.
 *
 * @example
 * ```javascript
 * // Get the `RemoteConfig` service for the default app
 * var defaultRemoteConfig = admin.remoteConfig();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `RemoteConfig` service for a given app
 * var otherRemoteConfig = admin.remoteConfig(otherApp);
 * ```
 *
 * @param app Optional app for which to return the `RemoteConfig` service.
 *   If not provided, the default `RemoteConfig` service is returned.
 *
 * @return The default `RemoteConfig` service if no
 *   app is provided, or the `RemoteConfig` service associated with the provided
 *   app.
 */
export declare function remoteConfig(app?: App): remoteConfig.RemoteConfig;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace remoteConfig {
  export type ExplicitParameterValue = TExplicitParameterValue;
  export type InAppDefaultValue = TInAppDefaultValue;
  export type ListVersionsOptions = TListVersionsOptions;
  export type ListVersionsResult = TListVersionsResult;
  export type RemoteConfig = TRemoteConfig;
  export type RemoteConfigCondition = TRemoteConfigCondition;
  export type RemoteConfigParameter = TRemoteConfigParameter;
  export type RemoteConfigParameterGroup = TRemoteConfigParameterGroup;
  export type RemoteConfigParameterValue = TRemoteConfigParameterValue;
  export type RemoteConfigTemplate = TRemoteConfigTemplate;
  export type RemoteConfigUser = TRemoteConfigUser;
  export type TagColor = TTagColor;
  export type Version = TVersion;
}

/*!
 * Copyright 2021 Google Inc.
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
 * Gets the {@link firebase-admin.remote-config#RemoteConfig} service for the
 * default app or a given app.
 *
 * `admin.remoteConfig()` can be called with no arguments to access the default
 * app's `RemoteConfig` service or as `admin.remoteConfig(app)` to access the
 * `RemoteConfig` service associated with a specific app.
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
 * @returns The default `RemoteConfig` service if no
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

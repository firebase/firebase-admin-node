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
  ParameterValueType as TParameterValueType,
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
 * @param app - Optional app for which to return the `RemoteConfig` service.
 *   If not provided, the default `RemoteConfig` service is returned.
 *
 * @returns The default `RemoteConfig` service if no
 *   app is provided, or the `RemoteConfig` service associated with the provided
 *   app.
 */
export declare function remoteConfig(app?: App): remoteConfig.RemoteConfig;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace remoteConfig {
  /**
   * Type alias to {@link firebase-admin.remote-config#ExplicitParameterValue}.
   */
  export type ExplicitParameterValue = TExplicitParameterValue;

  /**
   * Type alias to {@link firebase-admin.remote-config#InAppDefaultValue}.
   */
  export type InAppDefaultValue = TInAppDefaultValue;

  /**
   * Type alias to {@link firebase-admin.remote-config#ListVersionsOptions}.
   */
  export type ListVersionsOptions = TListVersionsOptions;

  /**
   * Type alias to {@link firebase-admin.remote-config#ListVersionsResult}.
   */
  export type ListVersionsResult = TListVersionsResult;

  /**
   * Type alias to {@link firebase-admin.remote-config#ParameterValueType}.
   */
  export type ParameterValueType = TParameterValueType;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfig}.
   */
  export type RemoteConfig = TRemoteConfig;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfigCondition}.
   */
  export type RemoteConfigCondition = TRemoteConfigCondition;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfigParameter}.
   */
  export type RemoteConfigParameter = TRemoteConfigParameter;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfigParameterGroup}.
   */
  export type RemoteConfigParameterGroup = TRemoteConfigParameterGroup;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfigParameterValue}.
   */
  export type RemoteConfigParameterValue = TRemoteConfigParameterValue;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfigTemplate}.
   */
  export type RemoteConfigTemplate = TRemoteConfigTemplate;

  /**
   * Type alias to {@link firebase-admin.remote-config#RemoteConfigUser}.
   */
  export type RemoteConfigUser = TRemoteConfigUser;

  /**
   * Type alias to {@link firebase-admin.remote-config#TagColor}.
   */
  export type TagColor = TTagColor;

  /**
   * Type alias to {@link firebase-admin.remote-config#Version}.
   */
  export type Version = TVersion;
}

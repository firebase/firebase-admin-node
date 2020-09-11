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

import { FirebaseApp } from '../firebase-app';
import * as remoteConfigApi from './remote-config';
import * as remoteConfigClientApi from './remote-config-api-client';
import * as firebaseAdmin from '../index';

export function remoteConfig(app?: FirebaseApp): remoteConfigApi.RemoteConfig {
  if (typeof(app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.remoteConfig();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.remoteConfig()` cannot be called like a function. Temporarily,
 * admin.remoteConfig is used as the namespace name because we cannot barrel 
 * re-export the contents from remote-config, and we want it to
 * match the namespacing in the re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.remoteConfig {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import ExplicitParameterValue = remoteConfigClientApi.ExplicitParameterValue;
  export import ListVersionsOptions = remoteConfigClientApi.ListVersionsOptions;
  export import ListVersionsResult = remoteConfigClientApi.ListVersionsResult;
  export import InAppDefaultValue = remoteConfigClientApi.InAppDefaultValue;
  export import RemoteConfigCondition = remoteConfigClientApi.RemoteConfigCondition;
  export import RemoteConfigParameter = remoteConfigClientApi.RemoteConfigParameter;
  export import RemoteConfigParameterGroup = remoteConfigClientApi.RemoteConfigParameterGroup;
  export import RemoteConfigParameterValue = remoteConfigClientApi.RemoteConfigParameterValue;
  export import RemoteConfigTemplate = remoteConfigClientApi.RemoteConfigTemplate;
  export import RemoteConfigUser = remoteConfigClientApi.RemoteConfigUser;
  export import TagColor = remoteConfigClientApi.TagColor;
  export import Version = remoteConfigClientApi.Version;

  // Allows for exposing classes as interfaces in typings
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export interface RemoteConfig extends remoteConfigApi.RemoteConfig {}
}

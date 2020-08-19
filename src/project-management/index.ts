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
import * as androidAppApi from './android-app';
import * as appMetadataApi from './app-metadata';
import * as iosAppApi from './ios-app';
import * as projectManagementApi from './project-management';
import * as firebaseAdmin from '../index';

export function projectManagement(app?: FirebaseApp): projectManagementApi.ProjectManagement {
  if (typeof(app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.projectManagement();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.projectManagement()` cannot be called like a function. Temporarily,
 * admin.projectManagement is used as the namespace name because we cannot barrel 
 * re-export the contents from instance-id, and we want it to
 * match the namespacing in the re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.projectManagement {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import AndroidAppMetadata = appMetadataApi.AndroidAppMetadata
  export import AppMetadata = appMetadataApi.AppMetadata
  export import AppPlatform = appMetadataApi.AppPlatform 
  export import IosAppMetadata = appMetadataApi.IosAppMetadata

  // Allows for exposing classes as interfaces in typings
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export interface AndroidApp extends androidAppApi.AndroidApp {}
  export interface IosApp extends iosAppApi.IosApp {}
  export interface ProjectManagement extends projectManagementApi.ProjectManagement {}
  export interface ShaCertificate extends androidAppApi.ShaCertificate {}
}

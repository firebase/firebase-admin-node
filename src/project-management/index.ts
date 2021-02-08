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
import { ProjectManagement } from './project-management';

export { AppMetadata, AppPlatform } from './app-metadata';
export { ProjectManagement } from './project-management';
export { AndroidApp, AndroidAppMetadata, ShaCertificate } from './android-app';
export { IosApp, IosAppMetadata } from './ios-app';

export function getProjectManagement(app?: App): ProjectManagement {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('projectManagement', (app) => new ProjectManagement(app));
}

/**
 * Gets the {@link projectManagement.ProjectManagement
 * `ProjectManagement`} service for the default app or a given app.
 *
 * `admin.projectManagement()` can be called with no arguments to access the
 * default app's {@link projectManagement.ProjectManagement
 * `ProjectManagement`} service, or as `admin.projectManagement(app)` to access
 * the {@link projectManagement.ProjectManagement `ProjectManagement`}
 * service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the ProjectManagement service for the default app
 * var defaultProjectManagement = admin.projectManagement();
 * ```
 *
 * @example
 * ```javascript
 * // Get the ProjectManagement service for a given app
 * var otherProjectManagement = admin.projectManagement(otherApp);
 * ```
 *
 * @param app Optional app whose `ProjectManagement` service
 *     to return. If not provided, the default `ProjectManagement` service will
 *     be returned. *
 * @return The default `ProjectManagement` service if no app is provided or the
 *   `ProjectManagement` service associated with the provided app.
 */
export declare function projectManagement(app?: App): projectManagement.ProjectManagement;

import {
  AppMetadata as TAppMetadata,
  AppPlatform as TAppPlatform,
} from './app-metadata';
import { ProjectManagement as TProjectManagement } from './project-management';
import {
  AndroidApp as TAndroidApp,
  AndroidAppMetadata as TAndroidAppMetadata,
  ShaCertificate as TShaCertificate,
} from './android-app';
import {
  IosApp as TIosApp,
  IosAppMetadata as TIosAppMetadata,
} from './ios-app';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace projectManagement {
  export type AppMetadata = TAppMetadata;
  export type AppPlatform = TAppPlatform;
  export type ProjectManagement = TProjectManagement;
  export type IosApp = TIosApp;
  export type IosAppMetadata = TIosAppMetadata;
  export type AndroidApp = TAndroidApp;
  export type AndroidAppMetadata = TAndroidAppMetadata;
  export type ShaCertificate = TShaCertificate;
}

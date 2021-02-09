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

import { auth } from './auth/index';
import { database } from './database/index';
import { firestore } from './firestore/index';
import { instanceId } from './instance-id/index';
import { machineLearning } from './machine-learning/index';
import { messaging } from './messaging/index';
import { projectManagement } from './project-management/index';
import { remoteConfig } from './remote-config/index';
import { securityRules } from './security-rules/index';
import { storage } from './storage/index';

import { App as AppCore, AppOptions } from './app/index';

export * from './app/index';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace app {
  /**
   * A Firebase app holds the initialization information for a collection of
   * services.
   *
   * Do not call this constructor directly. Instead, use
   * {@link
   *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
   *   `admin.initializeApp()`}
   * to create an app.
   */
  export interface App extends AppCore {
    auth(): auth.Auth;
    database(url?: string): database.Database;
    firestore(): firestore.Firestore;
    instanceId(): instanceId.InstanceId;
    machineLearning(): machineLearning.MachineLearning;
    messaging(): messaging.Messaging;
    projectManagement(): projectManagement.ProjectManagement;
    remoteConfig(): remoteConfig.RemoteConfig;
    securityRules(): securityRules.SecurityRules;
    storage(): storage.Storage;

    /**
     * Renders this local `FirebaseApp` unusable and frees the resources of
     * all associated services (though it does *not* clean up any backend
     * resources). When running the SDK locally, this method
     * must be called to ensure graceful termination of the process.
     *
     * @example
     * ```javascript
     * app.delete()
     *   .then(function() {
     *     console.log("App deleted successfully");
     *   })
     *   .catch(function(error) {
     *     console.log("Error deleting app:", error);
     *   });
     * ```
     */
    delete(): Promise<void>;
  }
}

// Declare other top-level members of the admin namespace below. Unfortunately, there's no
// compile-time mechanism to ensure that the FirebaseNamespace class actually provides these
// signatures. But this part of the API is quite small and stable. It should be easy enough to
// enforce conformance via disciplined coding and good integration tests.

export declare const SDK_VERSION: string;
export declare const apps: (app.App | null)[];

export declare function app(name?: string): app.App;
export declare function initializeApp(options?: AppOptions, name?: string): app.App;

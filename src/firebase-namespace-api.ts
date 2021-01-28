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

import { Agent } from 'http';
import { auth } from './auth/index';
import { credential } from './credential/index';
import { database } from './database/index';
import { firestore } from './firestore/index';
import { instanceId } from './instance-id/index';
import { machineLearning } from './machine-learning/index';
import { messaging } from './messaging/index';
import { projectManagement } from './project-management/index';
import { remoteConfig } from './remote-config/index';
import { securityRules } from './security-rules/index';
import { storage } from './storage/index';

/**
 * `FirebaseError` is a subclass of the standard JavaScript `Error` object. In
 * addition to a message string and stack trace, it contains a string code.
 */
export interface FirebaseError {

  /**
   * Error codes are strings using the following format: `"service/string-code"`.
   * Some examples include `"auth/invalid-uid"` and
   * `"messaging/invalid-recipient"`.
   *
   * While the message for a given error can change, the code will remain the same
   * between backward-compatible versions of the Firebase SDK.
   */
  code: string;

  /**
   * An explanatory message for the error that just occurred.
   *
   * This message is designed to be helpful to you, the developer. Because
   * it generally does not convey meaningful information to end users,
   * this message should not be displayed in your application.
   */
  message: string;

  /**
   * A string value containing the execution backtrace when the error originally
   * occurred.
   *
   * This information can be useful to you and can be sent to
   * {@link https://firebase.google.com/support/ Firebase Support} to help
   * explain the cause of an error.
   */
  stack?: string;

  /**
   * @return A JSON-serializable representation of this object.
   */
  toJSON(): object;
}

/**
 * Composite type which includes both a `FirebaseError` object and an index
 * which can be used to get the errored item.
 *
 * @example
 * ```javascript
 * var registrationTokens = [token1, token2, token3];
 * admin.messaging().subscribeToTopic(registrationTokens, 'topic-name')
 *   .then(function(response) {
 *     if (response.failureCount > 0) {
 *       console.log("Following devices unsucessfully subscribed to topic:");
 *       response.errors.forEach(function(error) {
 *         var invalidToken = registrationTokens[error.index];
 *         console.log(invalidToken, error.error);
 *       });
 *     } else {
 *       console.log("All devices successfully subscribed to topic:", response);
 *     }
 *   })
 *   .catch(function(error) {
 *     console.log("Error subscribing to topic:", error);
 *   });
 *```
 */
export interface FirebaseArrayIndexError {

  /**
   * The index of the errored item within the original array passed as part of the
   * called API method.
   */
  index: number;

  /**
   * The error object.
   */
  error: FirebaseError;
}

/**
 * Available options to pass to [`initializeApp()`](admin#.initializeApp).
 */
export interface AppOptions {

  /**
   * A {@link credential.Credential `Credential`} object used to
   * authenticate the Admin SDK.
   *
   * See [Initialize the SDK](/docs/admin/setup#initialize_the_sdk) for detailed
   * documentation and code samples.
   */
  credential?: credential.Credential;

  /**
   * The object to use as the [`auth`](/docs/reference/security/database/#auth)
   * variable in your Realtime Database Rules when the Admin SDK reads from or
   * writes to the Realtime Database. This allows you to downscope the Admin SDK
   * from its default full read and write privileges.
   *
   * You can pass `null` to act as an unauthenticated client.
   *
   * See
   * [Authenticate with limited privileges](/docs/database/admin/start#authenticate-with-limited-privileges)
   * for detailed documentation and code samples.
   */
  databaseAuthVariableOverride?: object | null;

  /**
   * The URL of the Realtime Database from which to read and write data.
   */
  databaseURL?: string;

  /**
   * The ID of the service account to be used for signing custom tokens. This
   * can be found in the `client_email` field of a service account JSON file.
   */
  serviceAccountId?: string;

  /**
   * The name of the Google Cloud Storage bucket used for storing application data.
   * Use only the bucket name without any prefixes or additions (do *not* prefix
   * the name with "gs://").
   */
  storageBucket?: string;

  /**
   * The ID of the Google Cloud project associated with the App.
   */
  projectId?: string;

  /**
   * An [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
   * to be used when making outgoing HTTP calls. This Agent instance is used
   * by all services that make REST calls (e.g. `auth`, `messaging`,
   * `projectManagement`).
   *
   * Realtime Database and Firestore use other means of communicating with
   * the backend servers, so they do not use this HTTP Agent. `Credential`
   * instances also do not use this HTTP Agent, but instead support
   * specifying an HTTP Agent in the corresponding factory methods.
   */
  httpAgent?: Agent;
}

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
  export interface App {

    /**
     * The (read-only) name for this app.
     *
     * The default app's name is `"[DEFAULT]"`.
     *
     * @example
     * ```javascript
     * // The default app's name is "[DEFAULT]"
     * admin.initializeApp(defaultAppConfig);
     * console.log(admin.app().name);  // "[DEFAULT]"
     * ```
     *
     * @example
     * ```javascript
     * // A named app's name is what you provide to initializeApp()
     * var otherApp = admin.initializeApp(otherAppConfig, "other");
     * console.log(otherApp.name);  // "other"
     * ```
     */
    name: string;

    /**
     * The (read-only) configuration options for this app. These are the original
     * parameters given in
     * {@link
     *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
     *   `admin.initializeApp()`}.
     *
     * @example
     * ```javascript
     * var app = admin.initializeApp(config);
     * console.log(app.options.credential === config.credential);  // true
     * console.log(app.options.databaseURL === config.databaseURL);  // true
     * ```
     */
    options: AppOptions;

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

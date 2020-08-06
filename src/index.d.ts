/*!
 * Copyright 2017 Google Inc.
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

import { Bucket } from '@google-cloud/storage';
import * as _firestore from '@google-cloud/firestore';
import { Agent } from 'http';

import * as _auth from './auth';
import * as _database from './database';
import * as _messaging from './messaging';
import * as _instanceId from './instance-id';
import * as _projectManagement from './project-management';
import * as _remoteConfig from './remote-config';
import * as _securityRules from './security-rules';

/* eslint-disable @typescript-eslint/ban-types */

/**
 * `admin` is a global namespace from which all Firebase Admin
 * services are accessed.
 */
declare namespace admin {

  /**
    * `FirebaseError` is a subclass of the standard JavaScript `Error` object. In
    * addition to a message string and stack trace, it contains a string code.
    */
  interface FirebaseError {

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
    stack: string;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;
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
  interface FirebaseArrayIndexError {

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

  interface ServiceAccount {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  }

  interface GoogleOAuthAccessToken {
    access_token: string;
    expires_in: number;
  }

  /**
   * Available options to pass to [`initializeApp()`](admin#.initializeApp).
   */
  interface AppOptions {

    /**
     * A {@link admin.credential.Credential `Credential`} object used to
     * authenticate the Admin SDK.
     *
     * See [Initialize the SDK](/docs/admin/setup#initialize_the_sdk) for detailed
     * documentation and code samples.
     */
    credential?: admin.credential.Credential;

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

  const SDK_VERSION: string;
  const apps: (admin.app.App | null)[];

  function app(name?: string): admin.app.App;

  /**
   * Gets the {@link admin.auth.Auth `Auth`} service for the default app or a
   * given app.
   *
   * `admin.auth()` can be called with no arguments to access the default app's
   * {@link admin.auth.Auth `Auth`} service or as `admin.auth(app)` to access the
   * {@link admin.auth.Auth `Auth`} service associated with a specific app.
   *
   * @example
   * ```javascript
   * // Get the Auth service for the default app
   * var defaultAuth = admin.auth();
   * ```
   *
   * @example
   * ```javascript
   * // Get the Auth service for a given app
   * var otherAuth = admin.auth(otherApp);
   * ```
   *
   */
  function auth(app?: admin.app.App): admin.auth.Auth;

  /**
   * Gets the {@link admin.database.Database `Database`} service for the default
   * app or a given app.
   *
   * `admin.database()` can be called with no arguments to access the default
   * app's {@link admin.database.Database `Database`} service or as
   * `admin.database(app)` to access the
   * {@link admin.database.Database `Database`} service associated with a specific
   * app.
   *
   * `admin.database` is also a namespace that can be used to access global
   * constants and methods associated with the `Database` service.
   *
   * @example
   * ```javascript
   * // Get the Database service for the default app
   * var defaultDatabase = admin.database();
   * ```
   *
   * @example
   * ```javascript
   * // Get the Database service for a specific app
   * var otherDatabase = admin.database(app);
   * ```
   *
   * @param App whose `Database` service to
   *   return. If not provided, the default `Database` service will be returned.
   *
   * @return The default `Database` service if no app
   *   is provided or the `Database` service associated with the provided app.
   */
  function database(app?: admin.app.App): admin.database.Database;

  /**
   * Gets the {@link admin.messaging.Messaging `Messaging`} service for the
   * default app or a given app.
   *
   * `admin.messaging()` can be called with no arguments to access the default
   * app's {@link admin.messaging.Messaging `Messaging`} service or as
   * `admin.messaging(app)` to access the
   * {@link admin.messaging.Messaging `Messaging`} service associated with a
   * specific app.
   *
   * @example
   * ```javascript
   * // Get the Messaging service for the default app
   * var defaultMessaging = admin.messaging();
   * ```
   *
   * @example
   * ```javascript
   * // Get the Messaging service for a given app
   * var otherMessaging = admin.messaging(otherApp);
   * ```
   *
   * @param app Optional app whose `Messaging` service to
   *   return. If not provided, the default `Messaging` service will be returned.
   *
   * @return The default `Messaging` service if no
   *   app is provided or the `Messaging` service associated with the provided
   *   app.
   */
  function messaging(app?: admin.app.App): admin.messaging.Messaging;

  /**
   * Gets the {@link admin.storage.Storage `Storage`} service for the
   * default app or a given app.
   *
   * `admin.storage()` can be called with no arguments to access the default
   * app's {@link admin.storage.Storage `Storage`} service or as
   * `admin.storage(app)` to access the
   * {@link admin.storage.Storage `Storage`} service associated with a
   * specific app.
   *
   * @example
   * ```javascript
   * // Get the Storage service for the default app
   * var defaultStorage = admin.storage();
   * ```
   *
   * @example
   * ```javascript
   * // Get the Storage service for a given app
   * var otherStorage = admin.storage(otherApp);
   * ```
   */
  function storage(app?: admin.app.App): admin.storage.Storage;

  /**
   *
   * @param app A Firebase App instance
   * @returns A [Firestore](https://cloud.google.com/nodejs/docs/reference/firestore/latest/Firestore)
   * instance as defined in the `@google-cloud/firestore` package.
   */
  function firestore(app?: admin.app.App): admin.firestore.Firestore;

  /**
   * Gets the {@link admin.instanceId.InstanceId `InstanceId`} service for the
   * default app or a given app.
   *
   * `admin.instanceId()` can be called with no arguments to access the default
   * app's {@link admin.instanceId.InstanceId `InstanceId`} service or as
   * `admin.instanceId(app)` to access the
   * {@link admin.instanceId.InstanceId `InstanceId`} service associated with a
   * specific app.
   *
   * @example
   * ```javascript
   * // Get the Instance ID service for the default app
   * var defaultInstanceId = admin.instanceId();
   * ```
   *
   * @example
   * ```javascript
   * // Get the Instance ID service for a given app
   * var otherInstanceId = admin.instanceId(otherApp);
   *```
   *
   * @param app Optional app whose `InstanceId` service to
   *   return. If not provided, the default `InstanceId` service will be
   *   returned.
   *
   * @return The default `InstanceId` service if
   *   no app is provided or the `InstanceId` service associated with the
   *   provided app.
   */
  function instanceId(app?: admin.app.App): admin.instanceId.InstanceId;

  /**
  * Gets the {@link admin.projectManagement.ProjectManagement
  * `ProjectManagement`} service for the default app or a given app.
  *
  * `admin.projectManagement()` can be called with no arguments to access the
  * default app's {@link admin.projectManagement.ProjectManagement
  * `ProjectManagement`} service, or as `admin.projectManagement(app)` to access
  * the {@link admin.projectManagement.ProjectManagement `ProjectManagement`}
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
  function projectManagement(app?: admin.app.App): admin.projectManagement.ProjectManagement;

  /**
   * Gets the {@link admin.remoteConfig.RemoteConfig `RemoteConfig`} service for the
   * default app or a given app.
   *
   * `admin.remoteConfig()` can be called with no arguments to access the default
   * app's {@link admin.remoteConfig.RemoteConfig `RemoteConfig`} service or as
   * `admin.remoteConfig(app)` to access the
   * {@link admin.remoteConfig.RemoteConfig `RemoteConfig`} service associated with a
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
  function remoteConfig(app?: admin.app.App): admin.remoteConfig.RemoteConfig;

  /**
  * Gets the {@link admin.securityRules.SecurityRules
  * `SecurityRules`} service for the default app or a given app.
  *
  * `admin.securityRules()` can be called with no arguments to access the
  * default app's {@link admin.securityRules.SecurityRules
  * `SecurityRules`} service, or as `admin.securityRules(app)` to access
  * the {@link admin.securityRules.SecurityRules `SecurityRules`}
  * service associated with a specific app.
  *
  * @example
  * ```javascript
  * // Get the SecurityRules service for the default app
  * var defaultSecurityRules = admin.securityRules();
  * ```
  *
  * @example
  * ```javascript
  * // Get the SecurityRules service for a given app
  * var otherSecurityRules = admin.securityRules(otherApp);
  * ```
  *
  * @param app Optional app to return the `SecurityRules` service
  *     for. If not provided, the default `SecurityRules` service
  *     is returned.
  * @return The default `SecurityRules` service if no app is provided, or the
  *   `SecurityRules` service associated with the provided app.
  */
  function securityRules(app?: admin.app.App): admin.securityRules.SecurityRules;

  /**
   * Gets the {@link admin.machineLearning.MachineLearning `MachineLearning`} service for the
   * default app or a given app.
   *
   * `admin.machineLearning()` can be called with no arguments to access the
   * default app's {@link admin.machineLearning.MachineLearning
    * `MachineLearning`} service or as `admin.machineLearning(app)` to access
    * the {@link admin.machineLearning.MachineLearning `MachineLearning`}
    * service associated with a specific app.
    *
    * @example
    * ```javascript
    * // Get the MachineLearning service for the default app
    * var defaultMachineLearning = admin.machineLearning();
    * ```
    *
    * @example
    * ```javascript
    * // Get the MachineLearning service for a given app
    * var otherMachineLearning = admin.machineLearning(otherApp);
    * ```
    *
    * @param app Optional app whose `MachineLearning` service to
    *   return. If not provided, the default `MachineLearning` service
    *   will be returned.
    *
    * @return The default `MachineLearning` service if no app is provided or the
    *   `MachineLearning` service associated with the provided app.
    */
  function machineLearning(app?: admin.app.App): admin.machineLearning.MachineLearning;

  function initializeApp(options?: admin.AppOptions, name?: string): admin.app.App;
}

declare namespace admin.app {
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
  interface App {

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
    options: admin.AppOptions;


    auth(): admin.auth.Auth;
    database(url?: string): admin.database.Database;
    firestore(): admin.firestore.Firestore;
    instanceId(): admin.instanceId.InstanceId;
    machineLearning(): admin.machineLearning.MachineLearning;
    messaging(): admin.messaging.Messaging;
    projectManagement(): admin.projectManagement.ProjectManagement;
    remoteConfig(): admin.remoteConfig.RemoteConfig;
    securityRules(): admin.securityRules.SecurityRules;
    storage(): admin.storage.Storage;

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

declare namespace admin.auth {
  export import UserMetadata = _auth.admin.auth.UserMetadata;
  export import UserInfo = _auth.admin.auth.UserInfo;
  export import UserRecord = _auth.admin.auth.UserRecord;
  export import UpdateRequest = _auth.admin.auth.UpdateRequest;
  export import CreateRequest = _auth.admin.auth.CreateRequest;
  export import DecodedIdToken = _auth.admin.auth.DecodedIdToken;
  export import ListUsersResult = _auth.admin.auth.ListUsersResult;
  export import HashAlgorithmType = _auth.admin.auth.HashAlgorithmType;
  export import UserImportOptions = _auth.admin.auth.UserImportOptions;
  export import UserImportResult = _auth.admin.auth.UserImportResult;
  export import UserImportRecord = _auth.admin.auth.UserImportRecord;
  export import SessionCookieOptions = _auth.admin.auth.SessionCookieOptions;
  export import ActionCodeSettings = _auth.admin.auth.ActionCodeSettings;
  export import Tenant = _auth.admin.auth.Tenant;
  export import UpdateTenantRequest = _auth.admin.auth.UpdateTenantRequest;
  export import CreateTenantRequest = _auth.admin.auth.CreateTenantRequest;
  export import ListTenantsResult = _auth.admin.auth.ListTenantsResult;
  export import AuthProviderConfigFilter = _auth.admin.auth.AuthProviderConfigFilter;
  export import AuthProviderConfig = _auth.admin.auth.AuthProviderConfig;
  export import SAMLAuthProviderConfig = _auth.admin.auth.SAMLAuthProviderConfig;
  export import OIDCAuthProviderConfig = _auth.admin.auth.OIDCAuthProviderConfig;
  export import SAMLUpdateAuthProviderRequest = _auth.admin.auth.SAMLUpdateAuthProviderRequest;
  export import OIDCUpdateAuthProviderRequest = _auth.admin.auth.OIDCUpdateAuthProviderRequest;
  export import ListProviderConfigResults = _auth.admin.auth.ListProviderConfigResults;
  export import UpdateAuthProviderRequest = _auth.admin.auth.UpdateAuthProviderRequest;
  export import BaseAuth = _auth.admin.auth.BaseAuth;
  export import TenantAwareAuth = _auth.admin.auth.TenantAwareAuth;
  export import Auth = _auth.admin.auth.Auth;
  export import TenantManager = _auth.admin.auth.TenantManager;
  export import MultiFactorInfo = _auth.admin.auth.MultiFactorInfo;
  export import PhoneMultiFactorInfo = _auth.admin.auth.PhoneMultiFactorInfo;
  export import CreateMultiFactorInfoRequest = _auth.admin.auth.CreateMultiFactorInfoRequest;
  export import CreatePhoneMultiFactorInfoRequest = _auth.admin.auth.CreatePhoneMultiFactorInfoRequest;
  export import UpdateMultiFactorInfoRequest = _auth.admin.auth.UpdateMultiFactorInfoRequest;
  export import UpdatePhoneMultiFactorInfoRequest = _auth.admin.auth.UpdatePhoneMultiFactorInfoRequest;
  export import MultiFactorCreateSettings = _auth.admin.auth.MultiFactorCreateSettings;
  export import MultiFactorUpdateSettings = _auth.admin.auth.MultiFactorUpdateSettings;
  export import DeleteUsersResult = _auth.admin.auth.DeleteUsersResult;
  export import GetUsersResult = _auth.admin.auth.GetUsersResult;
}

declare namespace admin.credential {

  /**
   * Interface that provides Google OAuth2 access tokens used to authenticate
   * with Firebase services.
   *
   * In most cases, you will not need to implement this yourself and can instead
   * use the default implementations provided by
   * {@link admin.credential `admin.credential`}.
   */
  interface Credential {

    /**
     * Returns a Google OAuth2 access token object used to authenticate with
     * Firebase services.
     *
     * This object contains the following properties:
     * * `access_token` (`string`): The actual Google OAuth2 access token.
     * * `expires_in` (`number`): The number of seconds from when the token was
     *   issued that it expires.
     *
     * @return A Google OAuth2 access token object.
     */
    getAccessToken(): Promise<admin.GoogleOAuthAccessToken>;
  }


  /**
   * Returns a credential created from the
   * {@link
    *    https://developers.google.com/identity/protocols/application-default-credentials
    *    Google Application Default Credentials}
    * that grants admin access to Firebase services. This credential can be used
    * in the call to
    * {@link
    *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
    *  `admin.initializeApp()`}.
    *
    * Google Application Default Credentials are available on any Google
    * infrastructure, such as Google App Engine and Google Compute Engine.
    *
    * See
    * {@link
    *   https://firebase.google.com/docs/admin/setup#initialize_the_sdk
    *   Initialize the SDK}
    * for more details.
    *
    * @example
    * ```javascript
    * admin.initializeApp({
    *   credential: admin.credential.applicationDefault(),
    *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
    * });
    * ```
    *
    * @param {!Object=} httpAgent Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
    *   to be used when retrieving access tokens from Google token servers.
    *
    * @return {!admin.credential.Credential} A credential authenticated via Google
    *   Application Default Credentials that can be used to initialize an app.
   */
  function applicationDefault(httpAgent?: Agent): admin.credential.Credential;

  /**
   * Returns a credential created from the provided service account that grants
   * admin access to Firebase services. This credential can be used in the call
   * to
   * {@link
    *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
    *   `admin.initializeApp()`}.
    *
    * See
    * {@link
    *   https://firebase.google.com/docs/admin/setup#initialize_the_sdk
    *   Initialize the SDK}
    * for more details.
    *
    * @example
    * ```javascript
    * // Providing a path to a service account key JSON file
    * var serviceAccount = require("path/to/serviceAccountKey.json");
    * admin.initializeApp({
    *   credential: admin.credential.cert(serviceAccount),
    *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
    * });
    * ```
    *
    * @example
    * ```javascript
    * // Providing a service account object inline
    * admin.initializeApp({
    *   credential: admin.credential.cert({
    *     projectId: "<PROJECT_ID>",
    *     clientEmail: "foo@<PROJECT_ID>.iam.gserviceaccount.com",
    *     privateKey: "-----BEGIN PRIVATE KEY-----<KEY>-----END PRIVATE KEY-----\n"
    *   }),
    *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
    * });
    * ```
    *
    * @param serviceAccountPathOrObject The path to a service
    *   account key JSON file or an object representing a service account key.
    * @param httpAgent Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
    *   to be used when retrieving access tokens from Google token servers.
    *
    * @return A credential authenticated via the
    *   provided service account that can be used to initialize an app.
   */
  function cert(serviceAccountPathOrObject: string | admin.ServiceAccount, httpAgent?: Agent): admin.credential.Credential;

  /**
   * Returns a credential created from the provided refresh token that grants
   * admin access to Firebase services. This credential can be used in the call
   * to
   * {@link
    *   https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp
    *   `admin.initializeApp()`}.
    *
    * See
    * {@link
    *   https://firebase.google.com/docs/admin/setup#initialize_the_sdk
    *   Initialize the SDK}
    * for more details.
    *
    * @example
    * ```javascript
    * // Providing a path to a refresh token JSON file
    * var refreshToken = require("path/to/refreshToken.json");
    * admin.initializeApp({
    *   credential: admin.credential.refreshToken(refreshToken),
    *   databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
    * });
    * ```
    *
    * @param refreshTokenPathOrObject The path to a Google
    *   OAuth2 refresh token JSON file or an object representing a Google OAuth2
    *   refresh token.
    * @param httpAgent Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent)
    *   to be used when retrieving access tokens from Google token servers.
    *
    * @return A credential authenticated via the
    *   provided service account that can be used to initialize an app.
   */
  function refreshToken(refreshTokenPathOrObject: string | object, httpAgent?: Agent): admin.credential.Credential;
}

declare namespace admin.database {
  export import Database = _database.admin.database.Database;
  export import DataSnapshot = _database.admin.database.DataSnapshot;
  export import OnDisconnect = _database.admin.database.OnDisconnect;
  export import EventType = _database.admin.database.EventType;
  export import Query = _database.admin.database.Query;
  export import Reference = _database.admin.database.Reference;
  export import ThenableReference = _database.admin.database.ThenableReference;
  export import enableLogging = _database.admin.database.enableLogging;
  export import ServerValue = _database.admin.database.ServerValue;
}

declare namespace admin.messaging {
  export import Message = _messaging.admin.messaging.Message;
  export import MulticastMessage = _messaging.admin.messaging.MulticastMessage;
  export import AndroidConfig = _messaging.admin.messaging.AndroidConfig;
  export import AndroidNotification = _messaging.admin.messaging.AndroidNotification;
  export import LightSettings = _messaging.admin.messaging.LightSettings;
  export import AndroidFcmOptions = _messaging.admin.messaging.AndroidFcmOptions;
  export import ApnsConfig = _messaging.admin.messaging.ApnsConfig;
  export import ApnsPayload = _messaging.admin.messaging.ApnsPayload;
  export import Aps = _messaging.admin.messaging.Aps;
  export import ApsAlert = _messaging.admin.messaging.ApsAlert;
  export import CriticalSound = _messaging.admin.messaging.CriticalSound;
  export import ApnsFcmOptions = _messaging.admin.messaging.ApnsFcmOptions;
  export import FcmOptions = _messaging.admin.messaging.FcmOptions;
  export import Notification = _messaging.admin.messaging.Notification;
  export import WebpushConfig = _messaging.admin.messaging.WebpushConfig;
  export import WebpushFcmOptions = _messaging.admin.messaging.WebpushFcmOptions;
  export import WebpushNotification = _messaging.admin.messaging.WebpushNotification;
  export import MessagingTopicManagementResponse = _messaging.admin.messaging.MessagingTopicManagementResponse;
  export import BatchResponse = _messaging.admin.messaging.BatchResponse;
  export import SendResponse = _messaging.admin.messaging.SendResponse;
  export import Messaging = _messaging.admin.messaging.Messaging;

  // Legacy API types.
  export import DataMessagePayload = _messaging.admin.messaging.DataMessagePayload;
  export import NotificationMessagePayload = _messaging.admin.messaging.NotificationMessagePayload;
  export import MessagingPayload = _messaging.admin.messaging.MessagingPayload;
  export import MessagingOptions = _messaging.admin.messaging.MessagingOptions;
  export import MessagingDevicesResponse = _messaging.admin.messaging.MessagingDevicesResponse;
  export import MessagingDeviceResult = _messaging.admin.messaging.MessagingDeviceResult;
  export import MessagingDeviceGroupResponse = _messaging.admin.messaging.MessagingDeviceGroupResponse;
  export import MessagingTopicResponse = _messaging.admin.messaging.MessagingTopicResponse;
  export import MessagingConditionResponse = _messaging.admin.messaging.MessagingConditionResponse;
}

declare namespace admin.storage {

  /**
   * The default `Storage` service if no
   * app is provided or the `Storage` service associated with the provided
   * app.
   */
  interface Storage {
    /**
     * Optional app whose `Storage` service to
     * return. If not provided, the default `Storage` service will be returned.
     */
    app: admin.app.App;
    /**
     * @returns A [Bucket](https://cloud.google.com/nodejs/docs/reference/storage/latest/Bucket)
     * instance as defined in the `@google-cloud/storage` package.
     */
    bucket(name?: string): Bucket;
  }
}

declare namespace admin.firestore {
  export import v1beta1 = _firestore.v1beta1;
  export import v1 = _firestore.v1;

  export import CollectionReference = _firestore.CollectionReference;
  export import DocumentData = _firestore.DocumentData;
  export import DocumentReference = _firestore.DocumentReference;
  export import DocumentSnapshot = _firestore.DocumentSnapshot;
  export import FieldPath = _firestore.FieldPath;
  export import FieldValue = _firestore.FieldValue;
  export import Firestore = _firestore.Firestore;
  export import GeoPoint = _firestore.GeoPoint;
  export import Query = _firestore.Query;
  export import QueryDocumentSnapshot = _firestore.QueryDocumentSnapshot;
  export import QuerySnapshot = _firestore.QuerySnapshot;
  export import Timestamp = _firestore.Timestamp;
  export import Transaction = _firestore.Transaction;
  export import WriteBatch = _firestore.WriteBatch;
  export import WriteResult = _firestore.WriteResult;

  export import setLogFunction = _firestore.setLogFunction;
}

declare namespace admin.instanceId {
  export import InstanceId = _instanceId.admin.instanceId.InstanceId;
}

declare namespace admin.projectManagement {
  export import ShaCertificate = _projectManagement.admin.projectManagement.ShaCertificate;
  export import AppMetadata = _projectManagement.admin.projectManagement.AppMetadata;
  export import AppPlatform = _projectManagement.admin.projectManagement.AppPlatform;
  export import AndroidAppMetadata = _projectManagement.admin.projectManagement.AndroidAppMetadata;
  export import IosAppMetadata = _projectManagement.admin.projectManagement.IosAppMetadata;
  export import AndroidApp = _projectManagement.admin.projectManagement.AndroidApp;
  export import IosApp = _projectManagement.admin.projectManagement.IosApp;
  export import ProjectManagement = _projectManagement.admin.projectManagement.ProjectManagement;
}

declare namespace admin.remoteConfig {
  export import TagColor = _remoteConfig.admin.remoteConfig.TagColor;
  export import RemoteConfigTemplate = _remoteConfig.admin.remoteConfig.RemoteConfigTemplate;
  export import RemoteConfigParameter = _remoteConfig.admin.remoteConfig.RemoteConfigParameter;
  export import RemoteConfigParameterGroup = _remoteConfig.admin.remoteConfig.RemoteConfigParameterGroup;
  export import RemoteConfigCondition = _remoteConfig.admin.remoteConfig.RemoteConfigCondition;
  export import ExplicitParameterValue = _remoteConfig.admin.remoteConfig.ExplicitParameterValue;
  export import InAppDefaultValue = _remoteConfig.admin.remoteConfig.InAppDefaultValue;
  export import RemoteConfigParameterValue = _remoteConfig.admin.remoteConfig.RemoteConfigParameterValue;
  export import Version = _remoteConfig.admin.remoteConfig.Version;
  export import ListVersionsResult = _remoteConfig.admin.remoteConfig.ListVersionsResult;
  export import RemoteConfigUser = _remoteConfig.admin.remoteConfig.RemoteConfigUser;
  export import RemoteConfig = _remoteConfig.admin.remoteConfig.RemoteConfig;
}

declare namespace admin.securityRules {
  export import RulesFile = _securityRules.admin.securityRules.RulesFile;
  export import RulesetMetadata = _securityRules.admin.securityRules.RulesetMetadata;
  export import Ruleset = _securityRules.admin.securityRules.Ruleset;
  export import RulesetMetadataList = _securityRules.admin.securityRules.RulesetMetadataList;
  export import SecurityRules = _securityRules.admin.securityRules.SecurityRules;
}

declare namespace admin.machineLearning {
  /**
   * Interface representing options for listing Models.
   */
  interface ListModelsOptions {
    /**
     * An expression that specifies how to filter the results.
     *
     * Examples:
     *
     * ```
     * display_name = your_model
     * display_name : experimental_*
     * tags: face_detector AND tags: experimental
     * state.published = true
     * ```
     *
     * See https://firebase.google.com/docs/ml-kit/manage-hosted-models#list_your_projects_models
     */
    filter?: string;

    /** The number of results to return in each page. */
    pageSize?: number;

    /** A token that specifies the result page to return. */
    pageToken?: string;
  }

  /** Response object for a listModels operation. */
  interface ListModelsResult {
    /** A list of models in your project. */
    readonly models: Model[];

    /**
     * A token you can use to retrieve the next page of results. If null, the
     * current page is the final page.
     */
    readonly pageToken?: string;
  }

  /**
   * A TensorFlow Lite Model output object
   */
  interface TFLiteModel {
    /** The size of the model. */
    readonly sizeBytes: number;

    /** The URI from which the model was originally provided to Firebase. */
    readonly gcsTfliteUri?: string;
  }

  /**
   * A Firebase ML Model input object
   */
  interface ModelOptions {
    /** A name for the model. This is the name you use from your app to load the model. */
    displayName?: string;

    /** Tags for easier model management. */
    tags?: string[];

    /**
     * An object containing the URI of the model in Cloud Storage.
     *
     * Example: `tfliteModel: { gcsTfliteUri: 'gs://your-bucket/your-model.tflite' }`
     */
    tfliteModel?: { gcsTfliteUri: string };
  }

  /**
   * A Firebase ML Model output object
   */
  interface Model {
    /** The ID of the model. */
    readonly modelId: string;

    /** The model's name. This is the name you use from your app to load the model. */
    readonly displayName: string;

    /** The model's tags. */
    readonly tags?: string[];

    /** The timestamp of the model's creation. */
    readonly createTime: string;

    /** The timestamp of the model's most recent update. */
    readonly updateTime: string;

    /** Error message when model validation fails. */
    readonly validationError?: string;

    /** True if the model is published. */
    readonly published: boolean;

    /**
     * The ETag identifier of the current version of the model. This value
     * changes whenever you update any of the model's properties.
     */
    readonly etag: string;

    /**
     * The hash of the model's `tflite` file. This value changes only when
     * you upload a new TensorFlow Lite model.
     */
    readonly modelHash?: string;

    /**
     * True if the model is locked by a server-side operation. You can't make
     * changes to a locked model. See {@link waitForUnlocked `waitForUnlocked()`}.
     */
    readonly locked: boolean;

    /**
     * Wait for the model to be unlocked.
     *
     * @param {number} maxTimeSeconds The maximum time in seconds to wait.
     *
     * @return {Promise<void>} A promise that resolves when the model is unlocked
     *   or the maximum wait time has passed.
     */
    waitForUnlocked(maxTimeSeconds?: number): Promise<void>;

    /** Metadata about the model's TensorFlow Lite model file. */
    readonly tfliteModel?: TFLiteModel;
  }

  /**
   * The Firebase `MachineLearning` service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.machineLearning()`](admin.machineLearning#machineLearning).
   */
  interface MachineLearning {
    /**
     *  The {@link admin.app.App} associated with the current `MachineLearning`
     *  service instance.
     */
    app: admin.app.App;

    /**
     * Creates a model in Firebase ML.
     *
     * @param {ModelOptions} model The model to create.
     *
     * @return {Promise<Model>} A Promise fulfilled with the created model.
     */
    createModel(model: ModelOptions): Promise<Model>;

    /**
     * Updates a model in Firebase ML.
     *
     * @param {string} modelId The ID of the model to update.
     * @param {ModelOptions} model The model fields to update.
     *
     * @return {Promise<Model>} A Promise fulfilled with the updated model.
     */
    updateModel(modelId: string, model: ModelOptions): Promise<Model>;

    /**
     * Publishes a model in Firebase ML.
     *
     * @param {string} modelId The ID of the model to publish.
     *
     * @return {Promise<Model>} A Promise fulfilled with the published model.
     */
    publishModel(modelId: string): Promise<Model>;

    /**
     * Unpublishes a model in Firebase ML.
     *
     * @param {string} modelId The ID of the model to unpublish.
     *
     * @return {Promise<Model>} A Promise fulfilled with the unpublished model.
     */
    unpublishModel(modelId: string): Promise<Model>;

    /**
     * Gets a model from Firebase ML.
     *
     * @param {string} modelId The ID of the model to get.
     *
     * @return {Promise<Model>} A Promise fulfilled with the model object.
     */
    getModel(modelId: string): Promise<Model>;

    /**
     * Lists models from Firebase ML.
     *
     * @param {ListModelsOptions} options The listing options.
     *
     * @return {Promise<ListModelsResult>} A promise that
     *     resolves with the current (filtered) list of models and the next page
     *     token. For the last page, an empty list of models and no page token
     *     are returned.
     */
    listModels(options?: ListModelsOptions): Promise<ListModelsResult>;

    /**
     * Deletes a model from Firebase ML.
     *
     * @param {string} modelId The ID of the model to delete.
     */
    deleteModel(modelId: string): Promise<void>;
  }
}

declare module 'firebase-admin' {
}

export = admin;

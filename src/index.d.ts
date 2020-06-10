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

import { Agent } from 'http';

import * as _auth from './auth';

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
    databaseAuthVariableOverride?: Object | null;

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
  //function instanceId(app?: admin.app.App): admin.instanceId.InstanceId;

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
  /*export import UserMetadata = _auth.admin.auth.UserMetadata;
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
  export import MultiFactorUpdateSettings = _auth.admin.auth.MultiFactorUpdateSettings;*/
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
  function refreshToken(refreshTokenPathOrObject: string | Object, httpAgent?: Agent): admin.credential.Credential;
}

declare module 'firebase-admin' {
}

export = admin;

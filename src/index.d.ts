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
    messaging(): admin.messaging.Messaging;
    projectManagement(): admin.projectManagement.ProjectManagement;
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

  /**
  * Interface representing a user's metadata.
  */
  interface UserMetadata {

    /**
     * The date the user last signed in, formatted as a UTC string.
     */
    lastSignInTime: string;

    /**
     * The date the user was created, formatted as a UTC string.
     *
     */
    creationTime: string;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;
  }

  /**
   * Interface representing a user's info from a third-party identity provider
   * such as Google or Facebook.
   */
  interface UserInfo {

    /**
     * The user identifier for the linked provider.
     */
    uid: string;

    /**
     * The display name for the linked provider.
     */
    displayName: string;

    /**
     * The email for the linked provider.
     */
    email: string;

    /**
     * The phone number for the linked provider.
     */
    phoneNumber: string;

    /**
     * The photo URL for the linked provider.
     */
    photoURL: string;

    /**
     * The linked provider ID (for example, "google.com" for the Google provider).
     */
    providerId: string;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;
  }

  /**
   * Interface representing a user.
   */
  interface UserRecord {

    /**
     * The user's `uid`.
     */
    uid: string;

    /**
     * The user's primary email, if set.
     */
    email?: string;

    /**
     * Whether or not the user's primary email is verified.
     */
    emailVerified: boolean;

    /**
     * The user's display name.
     */
    displayName?: string;

    /**
     * The user's primary phone number, if set.
     */
    phoneNumber?: string;

    /**
     * The user's photo URL.
     */
    photoURL?: string;

    /**
     * Whether or not the user is disabled: `true` for disabled; `false` for
     * enabled.
     */
    disabled: boolean;

    /**
     * Additional metadata about the user.
     */
    metadata: admin.auth.UserMetadata;

    /**
     * An array of providers (for example, Google, Facebook) linked to the user.
     */
    providerData: admin.auth.UserInfo[];

    /**
     * The user's hashed password (base64-encoded), only if Firebase Auth hashing
     * algorithm (SCRYPT) is used. If a different hashing algorithm had been used
     * when uploading this user, as is typical when migrating from another Auth
     * system, this will be an empty string. If no password is set, this is
     * null. This is only available when the user is obtained from
     * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listUsers `listUsers()`}.
     *
     */
    passwordHash?: string;

    /**
     * The user's password salt (base64-encoded), only if Firebase Auth hashing
     * algorithm (SCRYPT) is used. If a different hashing algorithm had been used to
     * upload this user, typical when migrating from another Auth system, this will
     * be an empty string. If no password is set, this is null. This is only
     * available when the user is obtained from
     * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listUsers `listUsers()`}.
     *
     */
    passwordSalt?: string;

    /**
     * The user's custom claims object if available, typically used to define
     * user roles and propagated to an authenticated user's ID token.
     * This is set via
     * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#setCustomUserClaims `setCustomUserClaims()`}
     */
    customClaims?: {
      [key: string]: any;
    };

    /**
     * The date the user's tokens are valid after, formatted as a UTC string.
     * This is updated every time the user's refresh token are revoked either
     * from the {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#revokeRefreshTokens `revokeRefreshTokens()`}
     * API or from the Firebase Auth backend on big account changes (password
     * resets, password or email updates, etc).
     */
    tokensValidAfterTime?: string;

    /**
     * The ID of the tenant the user belongs to, if available.
     */
    tenantId?: string | null;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;
  }

  /**
   * Interface representing the properties to update on the provided user.
   */
  interface UpdateRequest {

    /**
     * Whether or not the user is disabled: `true` for disabled;
     * `false` for enabled.
     */
    disabled?: boolean;

    /**
     * The user's display name.
     */
    displayName?: string | null;

    /**
     * The user's primary email.
     */
    email?: string;

    /**
     * Whether or not the user's primary email is verified.
     */
    emailVerified?: boolean;

    /**
     * The user's unhashed password.
     */
    password?: string;

    /**
     * The user's primary phone number.
     */
    phoneNumber?: string | null;

    /**
     * The user's photo URL.
     */
    photoURL?: string | null;
  }

  /**
   * Interface representing the properties to set on a new user record to be
   * created.
   */
  interface CreateRequest extends UpdateRequest {

    /**
     * The user's `uid`.
     */
    uid?: string;
  }

  /**
   * Interface representing a decoded Firebase ID token, returned from the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#verifyIdToken `verifyIdToken()`} method.
   *
   * Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs).
   * See the
   * [ID Token section of the OpenID Connect spec](http://openid.net/specs/openid-connect-core-1_0.html#IDToken)
   * for more information about the specific properties below.
   */
  interface DecodedIdToken {

    /**
     * The audience for which this token is intended.
     *
     * This value is a string equal to your Firebase project ID, the unique
     * identifier for your Firebase project, which can be found in [your project's
     * settings](https://console.firebase.google.com/project/_/settings/general/android:com.random.android).
     */
    aud: string;

    /**
     * Time, in seconds since the Unix epoch, when the end-user authentication
     * occurred.
     *
     * This value is not set when this particular ID token was created, but when the
     * user initially logged in to this session. In a single session, the Firebase
     * SDKs will refresh a user's ID tokens every hour. Each ID token will have a
     * different [`iat`](#iat) value, but the same `auth_time` value.
     */
    auth_time: number;

    /**
     * The ID token's expiration time, in seconds since the Unix epoch. That is, the
     * time at which this ID token expires and should no longer be considered valid.
     *
     * The Firebase SDKs transparently refresh ID tokens every hour, issuing a new
     * ID token with up to a one hour expiration.
     */
    exp: number;

    /**
     * Information about the sign in event, including which sign in provider was
     * used and provider-specific identity details.
     *
     * This data is provided by the Firebase Authentication service and is a
     * reserved claim in the ID token.
     */
    firebase: {

      /**
       * Provider-specific identity details corresponding
       * to the provider used to sign in the user.
       */
      identities: {
        [key: string]: any;
      };

      /**
       * The ID of the provider used to sign in the user.
       * One of `"anonymous"`, `"password"`, `"facebook.com"`, `"github.com"`,
       * `"google.com"`, `"twitter.com"`, or `"custom"`.
       */
      sign_in_provider: string;

      /**
       * The ID of the tenant the user belongs to, if available.
       */
      tenant?: string;
      [key: string]: any;
    };

    /**
     * The ID token's issued-at time, in seconds since the Unix epoch. That is, the
     * time at which this ID token was issued and should start to be considered
     * valid.
     *
     * The Firebase SDKs transparently refresh ID tokens every hour, issuing a new
     * ID token with a new issued-at time. If you want to get the time at which the
     * user session corresponding to the ID token initially occurred, see the
     * [`auth_time`](#auth_time) property.
     */
    iat: number;

    /**
     * The issuer identifier for the issuer of the response.
     *
     * This value is a URL with the format
     * `https://securetoken.google.com/<PROJECT_ID>`, where `<PROJECT_ID>` is the
     * same project ID specified in the [`aud`](#aud) property.
     */
    iss: string;

    /**
     * The `uid` corresponding to the user who the ID token belonged to.
     *
     * As a convenience, this value is copied over to the [`uid`](#uid) property.
     */
    sub: string;

    /**
     * The `uid` corresponding to the user who the ID token belonged to.
     *
     * This value is not actually in the JWT token claims itself. It is added as a
     * convenience, and is set as the value of the [`sub`](#sub) property.
     */
    uid: string;
    [key: string]: any;
  }

  /**
   * Interface representing the object returned from a
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listUsers `listUsers()`} operation. Contains the list
   * of users for the current batch and the next page token if available.
   */
  interface ListUsersResult {

    /**
     * The list of {@link admin.auth.UserRecord `UserRecord`} objects for the
     * current downloaded batch.
     */
    users: admin.auth.UserRecord[];

    /**
     * The next page token if available. This is needed for the next batch download.
     */
    pageToken?: string;
  }

  type HashAlgorithmType = 'SCRYPT' | 'STANDARD_SCRYPT' | 'HMAC_SHA512' |
    'HMAC_SHA256' | 'HMAC_SHA1' | 'HMAC_MD5' | 'MD5' | 'PBKDF_SHA1' | 'BCRYPT' |
    'PBKDF2_SHA256' | 'SHA512' | 'SHA256' | 'SHA1';

  /**
   * Interface representing the user import options needed for
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#importUsers `importUsers()`} method. This is used to
   * provide the password hashing algorithm information.
   */
  interface UserImportOptions {

    /**
     * The password hashing information.
     */
    hash: {

      /**
       * The password hashing algorithm identifier. The following algorithm
       * identifiers are supported:
       * `SCRYPT`, `STANDARD_SCRYPT`, `HMAC_SHA512`, `HMAC_SHA256`, `HMAC_SHA1`,
       * `HMAC_MD5`, `MD5`, `PBKDF_SHA1`, `BCRYPT`, `PBKDF2_SHA256`, `SHA512`,
       * `SHA256` and `SHA1`.
       */
      algorithm: HashAlgorithmType;

      /**
       * The signing key used in the hash algorithm in buffer bytes.
       * Required by hashing algorithms `SCRYPT`, `HMAC_SHA512`, `HMAC_SHA256`,
       * `HAMC_SHA1` and `HMAC_MD5`.
       */
      key?: Buffer;

      /**
       * The salt separator in buffer bytes which is appended to salt when
       * verifying a password. This is only used by the `SCRYPT` algorithm.
       */
      saltSeparator?: Buffer;

      /**
       * The number of rounds for hashing calculation.
       * Required for `SCRYPT`, `MD5`, `SHA512`, `SHA256`, `SHA1`, `PBKDF_SHA1` and
       * `PBKDF2_SHA256`.
       */
      rounds?: number;

      /**
       * The memory cost required for `SCRYPT` algorithm, or the CPU/memory cost.
       * Required for `STANDARD_SCRYPT` algorithm.
       */
      memoryCost?: number;

      /**
       * The parallelization of the hashing algorithm. Required for the
       * `STANDARD_SCRYPT` algorithm.
       */
      parallelization?: number;

      /**
       * The block size (normally 8) of the hashing algorithm. Required for the
       * `STANDARD_SCRYPT` algorithm.
       */
      blockSize?: number;
      /**
       * The derived key length of the hashing algorithm. Required for the
       * `STANDARD_SCRYPT` algorithm.
       */
      derivedKeyLength?: number;
    };
  }

  /**
   * Interface representing the response from the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#importUsers `importUsers()`} method for batch
   * importing users to Firebase Auth.
   */
  interface UserImportResult {

    /**
     * The number of user records that failed to import to Firebase Auth.
     */
    failureCount: number;

    /**
     * The number of user records that successfully imported to Firebase Auth.
     */
    successCount: number;

    /**
     * An array of errors corresponding to the provided users to import. The
     * length of this array is equal to [`failureCount`](#failureCount).
     */
    errors: admin.FirebaseArrayIndexError[];
  }

  /**
   * Interface representing a user to import to Firebase Auth via the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#importUsers `importUsers()`} method.
   */
  interface UserImportRecord {

    /**
     * The user's `uid`.
     */
    uid: string;

    /**
     * The user's primary email, if set.
     */
    email?: string;

    /**
     * Whether or not the user's primary email is verified.
     */
    emailVerified: boolean;

    /**
     * The user's display name.
     */
    displayName?: string;

    /**
     * The user's primary phone number, if set.
     */
    phoneNumber?: string;

    /**
     * The user's photo URL.
     */
    photoURL?: string;

    /**
     * Whether or not the user is disabled: `true` for disabled; `false` for
     * enabled.
     */
    disabled: boolean;

    /**
     * Additional metadata about the user.
     */
    metadata: admin.auth.UserMetadata;

    /**
     * An array of providers (for example, Google, Facebook) linked to the user.
     */
    providerData?: admin.auth.UserInfo[];

    /**
     * The user's custom claims object if available, typically used to define
     * user roles and propagated to an authenticated user's ID token.
     */
    customClaims?: Object;

    /**
     * The buffer of bytes representing the user's hashed password.
     * When a user is to be imported with a password hash,
     * {@link admin.auth.UserImportOptions `UserImportOptions`} are required to be
     * specified to identify the hashing algorithm used to generate this hash.
     */
    passwordHash?: Buffer;

    /**
     * The buffer of bytes representing the user's password salt.
     */
    passwordSalt?: Buffer;

    /**
     * The identifier of the tenant where user is to be imported to.
     * When not provided in an `admin.auth.Auth` context, the user is uploaded to
     * the default parent project.
     * When not provided in an `admin.auth.TenantAwareAuth` context, the user is uploaded
     * to the tenant corresponding to that `TenantAwareAuth` instance's tenant ID.
     */
    tenantId?: string | null;
  }

  /**
   * Interface representing the session cookie options needed for the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createSessionCookie `createSessionCookie()`} method.
   */
  interface SessionCookieOptions {

    /**
     * The session cookie custom expiration in milliseconds. The minimum allowed is
     * 5 minutes and the maxium allowed is 2 weeks.
     */
    expiresIn: number;
  }

  /**
   * This is the interface that defines the required continue/state URL with
   * optional Android and iOS bundle identifiers.
   */
  interface ActionCodeSettings {

    /**
     * Defines the link continue/state URL, which has different meanings in
     * different contexts:
     * <ul>
     * <li>When the link is handled in the web action widgets, this is the deep
     *     link in the `continueUrl` query parameter.</li>
     * <li>When the link is handled in the app directly, this is the `continueUrl`
     *     query parameter in the deep link of the Dynamic Link.</li>
     * </ul>
     */
    url: string;

    /**
     * Whether to open the link via a mobile app or a browser.
     * The default is false. When set to true, the action code link is sent
     * as a Universal Link or Android App Link and is opened by the app if
     * installed. In the false case, the code is sent to the web widget first
     * and then redirects to the app if installed.
     */
    handleCodeInApp?: boolean;

    /**
     * Defines the iOS bundle ID. This will try to open the link in an iOS app if it
     * is installed.
     */
    iOS?: {

      /**
       * Defines the required iOS bundle ID of the app where the link should be
       * handled if the application is already installed on the device.
       */
      bundleId: string;
    };

    /**
     * Defines the Android package name. This will try to open the link in an
     * android app if it is installed. If `installApp` is passed, it specifies
     * whether to install the Android app if the device supports it and the app is
     * not already installed. If this field is provided without a `packageName`, an
     * error is thrown explaining that the `packageName` must be provided in
     * conjunction with this field. If `minimumVersion` is specified, and an older
     * version of the app is installed, the user is taken to the Play Store to
     * upgrade the app.
     */
    android?: {

      /**
       * Defines the required Android package name of the app where the link should be
       * handled if the Android app is installed.
       */
      packageName: string;

      /**
       * Whether to install the Android app if the device supports it and the app is
       * not already installed.
       */
      installApp?: boolean;

      /**
       * The Android minimum version if available. If the installed app is an older
       * version, the user is taken to the GOogle Play Store to upgrade the app.
       */
      minimumVersion?: string;
    };

    /**
     * Defines the dynamic link domain to use for the current link if it is to be
     * opened using Firebase Dynamic Links, as multiple dynamic link domains can be
     * configured per project. This field provides the ability to explicitly choose
     * configured per project. This fields provides the ability explicitly choose
     * one. If none is provided, the oldest domain is used by default.
     */
    dynamicLinkDomain?: string;
  }

  /**
   * Interface representing a tenant configuration.
   *
   * Multi-tenancy support requires Google Cloud's Identity Platform
   * (GCIP). To learn more about GCIP, including pricing and features,
   * see the [GCIP documentation](https://cloud.google.com/identity-platform)
   *
   * Before multi-tenancy can be used on a Google Cloud Identity Platform project,
   * tenants must be allowed on that project via the Cloud Console UI.
   *
   * A tenant configuration provides information such as the display name, tenant
   * identifier and email authentication configuration.
   * For OIDC/SAML provider configuration management, `TenantAwareAuth` instances should
   * be used instead of a `Tenant` to retrieve the list of configured IdPs on a tenant.
   * When configuring these providers, note that tenants will inherit
   * whitelisted domains and authenticated redirect URIs of their parent project.
   *
   * All other settings of a tenant will also be inherited. These will need to be managed
   * from the Cloud Console UI.
   */
  interface Tenant {

    /**
     * The tenant identifier.
     */
    tenantId: string;

    /**
     * The tenant display name.
     */
    displayName?: string;

    /**
     * The email sign in provider configuration.
     */
    emailSignInConfig?: {

      /**
       * Whether email provider is enabled.
       */
      enabled: boolean;

      /**
       * Whether password is required for email sign-in. When not required,
       * email sign-in can be performed with password or via email link sign-in.
       */
      passwordRequired?: boolean;
    };

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;
  }

  /**
   * Interface representing the properties to update on the provided tenant.
   */
  interface UpdateTenantRequest {

    /**
     * The tenant display name.
     */
    displayName?: string;

    /**
     * The email sign in configuration.
     */
    emailSignInConfig?: {

      /**
       * Whether email provider is enabled.
       */
      enabled: boolean;

      /**
       * Whether password is required for email sign-in. When not required,
       * email sign-in can be performed with password or via email link sign-in.
       */
      passwordRequired?: boolean;
    };
  }

  /**
   * Interface representing the properties to set on a new tenant.
   */
  type CreateTenantRequest = UpdateTenantRequest

  /**
   * Interface representing the object returned from a
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listTenants `listTenants()`}
   * operation.
   * Contains the list of tenants for the current batch and the next page token if available.
   */
  interface ListTenantsResult {

    /**
     * The list of {@link admin.auth.Tenant `Tenant`} objects for the downloaded batch.
     */
    tenants: admin.auth.Tenant[];

    /**
     * The next page token if available. This is needed for the next batch download.
     */
    pageToken?: string;
  }

  /**
   * The filter interface used for listing provider configurations. This is used
   * when specifying how to list configured identity providers via
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listProviderConfigs `listProviderConfigs()`}.
   */
  interface AuthProviderConfigFilter {

    /**
     * The Auth provider configuration filter. This can be either `saml` or `oidc`.
     * The former is used to look up SAML providers only, while the latter is used
     * for OIDC providers.
     */
    type: 'saml' | 'oidc';

    /**
     * The maximum number of results to return per page. The default and maximum is
     * 100.
     */
    maxResults?: number;

    /**
     * The next page token. When not specified, the lookup starts from the beginning
     * of the list.
     */
    pageToken?: string;
  }

  /**
   * The base Auth provider configuration interface.
   */
  interface AuthProviderConfig {

    /**
     * The provider ID defined by the developer.
     * For a SAML provider, this is always prefixed by `saml.`.
     * For an OIDC provider, this is always prefixed by `oidc.`.
     */
    providerId: string;

    /**
     * The user-friendly display name to the current configuration. This name is
     * also used as the provider label in the Cloud Console.
     */
    displayName: string;

    /**
     * Whether the provider configuration is enabled or disabled. A user
     * cannot sign in using a disabled provider.
     */
    enabled: boolean;
  }

  /**
   * The
   * [SAML](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
   * Auth provider configuration interface. A SAML provider can be created via
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createProviderConfig `createProviderConfig()`}.
   */
  interface SAMLAuthProviderConfig extends admin.auth.AuthProviderConfig {

    /**
     * The SAML IdP entity identifier.
     */
    idpEntityId: string;

    /**
     * The SAML IdP SSO URL. This must be a valid URL.
     */
    ssoURL: string;

    /**
     * The list of SAML IdP X.509 certificates issued by CA for this provider.
     * Multiple certificates are accepted to prevent outages during
     * IdP key rotation (for example ADFS rotates every 10 days). When the Auth
     * server receives a SAML response, it will match the SAML response with the
     * certificate on record. Otherwise the response is rejected.
     * Developers are expected to manage the certificate updates as keys are
     * rotated.
     */
    x509Certificates: string[];

    /**
     * The SAML relying party (service provider) entity ID.
     * This is defined by the developer but needs to be provided to the SAML IdP.
     */
    rpEntityId: string;

    /**
     * This is fixed and must always be the same as the OAuth redirect URL
     * provisioned by Firebase Auth,
     * `https://project-id.firebaseapp.com/__/auth/handler` unless a custom
     * `authDomain` is used.
     * The callback URL should also be provided to the SAML IdP during
     * configuration.
     */
    callbackURL?: string;
  }

  /**
   * The [OIDC](https://openid.net/specs/openid-connect-core-1_0-final.html) Auth
   * provider configuration interface. An OIDC provider can be created via
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createProviderConfig `createProviderConfig()`}.
   */
  interface OIDCAuthProviderConfig extends admin.auth.AuthProviderConfig {

    /**
     * This is the required client ID used to confirm the audience of an OIDC
     * provider's
     * [ID token](https://openid.net/specs/openid-connect-core-1_0-final.html#IDToken).
     */
    clientId: string;

    /**
     * This is the required provider issuer used to match the provider issuer of
     * the ID token and to determine the corresponding OIDC discovery document, eg.
     * [`/.well-known/openid-configuration`](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig).
     * This is needed for the following:
     * <ul>
     * <li>To verify the provided issuer.</li>
     * <li>Determine the authentication/authorization endpoint during the OAuth
     *     `id_token` authentication flow.</li>
     * <li>To retrieve the public signing keys via `jwks_uri` to verify the OIDC
     *     provider's ID token's signature.</li>
     * <li>To determine the claims_supported to construct the user attributes to be
     *     returned in the additional user info response.</li>
     * </ul>
     * ID token validation will be performed as defined in the
     * [spec](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation).
     */
    issuer: string;
  }

  /**
   * The request interface for updating a SAML Auth provider. This is used
   * when updating a SAML provider's configuration via
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#updateProviderConfig `updateProviderConfig()`}.
   */
  interface SAMLUpdateAuthProviderRequest {

    /**
     * The SAML provider's updated display name. If not provided, the existing
     * configuration's value is not modified.
     */
    displayName?: string;

    /**
     * Whether the SAML provider is enabled or not. If not provided, the existing
     * configuration's setting is not modified.
     */
    enabled?: boolean;

    /**
     * The SAML provider's updated IdP entity ID. If not provided, the existing
     * configuration's value is not modified.
     */
    idpEntityId?: string;

    /**
     * The SAML provider's updated SSO URL. If not provided, the existing
     * configuration's value is not modified.
     */
    ssoURL?: string;

    /**
     * The SAML provider's updated list of X.509 certificated. If not provided, the
     * existing configuration list is not modified.
     */
    x509Certificates?: string[];

    /**
     * The SAML provider's updated RP entity ID. If not provided, the existing
     * configuration's value is not modified.
     */
    rpEntityId?: string;

    /**
     * The SAML provider's callback URL. If not provided, the existing
     * configuration's value is not modified.
     */
    callbackURL?: string;
  }

  /**
   * The request interface for updating an OIDC Auth provider. This is used
   * when updating an OIDC provider's configuration via
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#updateProviderConfig `updateProviderConfig()`}.
   */
  interface OIDCUpdateAuthProviderRequest {

    /**
     * The OIDC provider's updated display name. If not provided, the existing
     * configuration's value is not modified.
     */
    displayName?: string;

    /**
     * Whether the OIDC provider is enabled or not. If not provided, the existing
     * configuration's setting is not modified.
     */
    enabled?: boolean;

    /**
     * The OIDC provider's updated client ID. If not provided, the existing
     * configuration's value is not modified.
     */
    clientId?: string;

    /**
     * The OIDC provider's updated issuer. If not provided, the existing
     * configuration's value is not modified.
     */
    issuer?: string;
  }

  /**
   * The response interface for listing provider configs. This is only available
   * when listing all identity providers' configurations via
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listProviderConfigs `listProviderConfigs()`}.
   */
  interface ListProviderConfigResults {

    /**
     * The list of providers for the specified type in the current page.
     */
    providerConfigs: admin.auth.AuthProviderConfig[];

    /**
     * The next page token, if available.
     */
    pageToken?: string;
  }


  type UpdateAuthProviderRequest =
    admin.auth.SAMLUpdateAuthProviderRequest | admin.auth.OIDCUpdateAuthProviderRequest;

  interface BaseAuth {

    /**
     * Creates a new Firebase custom token (JWT) that can be sent back to a client
     * device to use to sign in with the client SDKs' `signInWithCustomToken()`
     * methods. (Tenant-aware instances will also embed the tenant ID in the
     * token.)
     *
     * See [Create Custom Tokens](/docs/auth/admin/create-custom-tokens) for code
     * samples and detailed documentation.
     *
     * @param uid The `uid` to use as the custom token's subject.
     * @param developerClaims Optional additional claims to include
     *   in the custom token's payload.
     *
     * @return A promise fulfilled with a custom token for the
     *   provided `uid` and payload.
     */
    createCustomToken(uid: string, developerClaims?: Object): Promise<string>;

    /**
     * Creates a new user.
     *
     * See [Create a user](/docs/auth/admin/manage-users#create_a_user) for code
     * samples and detailed documentation.
     *
     * @param properties The properties to set on the
     *   new user record to be created.
     *
     * @return A promise fulfilled with the user
     *   data corresponding to the newly created user.
     */
    createUser(properties: admin.auth.CreateRequest): Promise<admin.auth.UserRecord>;

    /**
     * Deletes an existing user.
     *
     * See [Delete a user](/docs/auth/admin/manage-users#delete_a_user) for code
     * samples and detailed documentation.
     *
     * @param uid The `uid` corresponding to the user to delete.
     *
     * @return An empty promise fulfilled once the user has been
     *   deleted.
     */
    deleteUser(uid: string): Promise<void>;

    /**
     * Gets the user data for the user corresponding to a given `uid`.
     *
     * See [Retrieve user data](/docs/auth/admin/manage-users#retrieve_user_data)
     * for code samples and detailed documentation.
     *
     * @param uid The `uid` corresponding to the user whose data to fetch.
     *
     * @return A promise fulfilled with the user
     *   data corresponding to the provided `uid`.
     */
    getUser(uid: string): Promise<admin.auth.UserRecord>;

    /**
     * Gets the user data for the user corresponding to a given email.
     *
     * See [Retrieve user data](/docs/auth/admin/manage-users#retrieve_user_data)
     * for code samples and detailed documentation.
     *
     * @param email The email corresponding to the user whose data to
     *   fetch.
     *
     * @return A promise fulfilled with the user
     *   data corresponding to the provided email.
     */
    getUserByEmail(email: string): Promise<admin.auth.UserRecord>;

    /**
     * Gets the user data for the user corresponding to a given phone number. The
     * phone number has to conform to the E.164 specification.
     *
     * See [Retrieve user data](/docs/auth/admin/manage-users#retrieve_user_data)
     * for code samples and detailed documentation.
     *
     * @param phoneNumber The phone number corresponding to the user whose
     *   data to fetch.
     *
     * @return A promise fulfilled with the user
     *   data corresponding to the provided phone number.
     */
    getUserByPhoneNumber(phoneNumber: string): Promise<admin.auth.UserRecord>;

    /**
     * Retrieves a list of users (single batch only) with a size of `maxResults`
     * starting from the offset as specified by `pageToken`. This is used to
     * retrieve all the users of a specified project in batches.
     *
     * See [List all users](/docs/auth/admin/manage-users#list_all_users)
     * for code samples and detailed documentation.
     *
     * @param maxResults The page size, 1000 if undefined. This is also
     *   the maximum allowed limit.
     * @param pageToken The next page token. If not specified, returns
     *   users starting without any offset.
     * @return A promise that resolves with
     *   the current batch of downloaded users and the next page token.
     */
    listUsers(maxResults?: number, pageToken?: string): Promise<admin.auth.ListUsersResult>;

    /**
     * Updates an existing user.
     *
     * See [Update a user](/docs/auth/admin/manage-users#update_a_user) for code
     * samples and detailed documentation.
     *
     * @param uid The `uid` corresponding to the user to delete.
     * @param properties The properties to update on
     *   the provided user.
     *
     * @return A promise fulfilled with the
     *   updated user data.
     */
    updateUser(uid: string, properties: admin.auth.UpdateRequest): Promise<admin.auth.UserRecord>;

    /**
     * Verifies a Firebase ID token (JWT). If the token is valid, the promise is
     * fulfilled with the token's decoded claims; otherwise, the promise is
     * rejected.
     * An optional flag can be passed to additionally check whether the ID token
     * was revoked.
     *
     * See [Verify ID Tokens](/docs/auth/admin/verify-id-tokens) for code samples
     * and detailed documentation.
     *
     * @param idToken The ID token to verify.
     * @param checkRevoked Whether to check if the ID token was revoked.
     *   This requires an extra request to the Firebase Auth backend to check
     *   the `tokensValidAfterTime` time for the corresponding user.
     *   When not specified, this additional check is not applied.
     *
     * @return A promise fulfilled with the
     *   token's decoded claims if the ID token is valid; otherwise, a rejected
     *   promise.
     */
    verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<admin.auth.DecodedIdToken>;

    /**
     * Sets additional developer claims on an existing user identified by the
     * provided `uid`, typically used to define user roles and levels of
     * access. These claims should propagate to all devices where the user is
     * already signed in (after token expiration or when token refresh is forced)
     * and the next time the user signs in. If a reserved OIDC claim name
     * is used (sub, iat, iss, etc), an error is thrown. They are set on the
     * authenticated user's ID token JWT.
     *
     * See
     * [Defining user roles and access levels](/docs/auth/admin/custom-claims)
     * for code samples and detailed documentation.
     *
     * @param uid The `uid` of the user to edit.
     * @param customUserClaims The developer claims to set. If null is
     *   passed, existing custom claims are deleted. Passing a custom claims payload
     *   larger than 1000 bytes will throw an error. Custom claims are added to the
     *   user's ID token which is transmitted on every authenticated request.
     *   For profile non-access related user attributes, use database or other
     *   separate storage systems.
     * @return A promise that resolves when the operation completes
     *   successfully.
     */
    setCustomUserClaims(uid: string, customUserClaims: Object | null): Promise<void>;

    /**
     * Revokes all refresh tokens for an existing user.
     *
     * This API will update the user's
     * {@link admin.auth.UserRecord#tokensValidAfterTime `tokensValidAfterTime`} to
     * the current UTC. It is important that the server on which this is called has
     * its clock set correctly and synchronized.
     *
     * While this will revoke all sessions for a specified user and disable any
     * new ID tokens for existing sessions from getting minted, existing ID tokens
     * may remain active until their natural expiration (one hour). To verify that
     * ID tokens are revoked, use
     * {@link admin.auth.Auth#verifyIdToken `verifyIdToken(idToken, true)`}
     * where `checkRevoked` is set to true.
     *
     * @param uid The `uid` corresponding to the user whose refresh tokens
     *   are to be revoked.
     *
     * @return An empty promise fulfilled once the user's refresh
     *   tokens have been revoked.
     */
    revokeRefreshTokens(uid: string): Promise<void>;

    /**
     * Imports the provided list of users into Firebase Auth.
     * A maximum of 1000 users are allowed to be imported one at a time.
     * When importing users with passwords,
     * {@link admin.auth.UserImportOptions `UserImportOptions`} are required to be
     * specified.
     * This operation is optimized for bulk imports and will ignore checks on `uid`,
     * `email` and other identifier uniqueness which could result in duplications.
     *
     * @param users The list of user records to import to Firebase Auth.
     * @param options The user import options, required when the users provided include
     *   password credentials.
     * @return A promise that resolves when
     *   the operation completes with the result of the import. This includes the
     *   number of successful imports, the number of failed imports and their
     *   corresponding errors.
    */
    importUsers(
      users: admin.auth.UserImportRecord[],
      options?: admin.auth.UserImportOptions,
    ): Promise<admin.auth.UserImportResult>;

    /**
     * Creates a new Firebase session cookie with the specified options. The created
     * JWT string can be set as a server-side session cookie with a custom cookie
     * policy, and be used for session management. The session cookie JWT will have
     * the same payload claims as the provided ID token.
     *
     * See [Manage Session Cookies](/docs/auth/admin/manage-cookies) for code
     * samples and detailed documentation.
     *
     * @param idToken The Firebase ID token to exchange for a session
     *   cookie.
     * @param sessionCookieOptions The session
     *   cookie options which includes custom session duration.
     *
     * @return A promise that resolves on success with the
     *   created session cookie.
     */
    createSessionCookie(
      idToken: string,
      sessionCookieOptions: admin.auth.SessionCookieOptions,
    ): Promise<string>;

    /**
     * Verifies a Firebase session cookie. Returns a Promise with the cookie claims.
     * Rejects the promise if the cookie could not be verified. If `checkRevoked` is
     * set to true, verifies if the session corresponding to the session cookie was
     * revoked. If the corresponding user's session was revoked, an
     * `auth/session-cookie-revoked` error is thrown. If not specified the check is
     * not performed.
     *
     * See [Verify Session Cookies](/docs/auth/admin/manage-cookies#verify_session_cookie_and_check_permissions)
     * for code samples and detailed documentation
     *
     * @param sessionCookie The session cookie to verify.
     * @param checkForRevocation  Whether to check if the session cookie was
     *   revoked. This requires an extra request to the Firebase Auth backend to
     *   check the `tokensValidAfterTime` time for the corresponding user.
     *   When not specified, this additional check is not performed.
     *
     * @return A promise fulfilled with the
     *   session cookie's decoded claims if the session cookie is valid; otherwise,
     *   a rejected promise.
     */
    verifySessionCookie(
      sessionCookie: string,
      checkForRevocation?: boolean,
    ): Promise<admin.auth.DecodedIdToken>;

    /**
     * Generates the out of band email action link to reset a user's password.
     * The link is generated for the user with the specified email address. The
     * optional  {@link admin.auth.ActionCodeSettings `ActionCodeSettings`} object
     * defines whether the link is to be handled by a mobile app or browser and the
     * additional state information to be passed in the deep link, etc.
     *
     * @example
     * ```javascript
     * var actionCodeSettings = {
     *   url: 'https://www.example.com/?email=user@example.com',
     *   iOS: {
     *     bundleId: 'com.example.ios'
     *   },
     *   android: {
     *     packageName: 'com.example.android',
     *     installApp: true,
     *     minimumVersion: '12'
     *   },
     *   handleCodeInApp: true,
     *   dynamicLinkDomain: 'custom.page.link'
     * };
     * admin.auth()
     *     .generatePasswordResetLink('user@example.com', actionCodeSettings)
     *     .then(function(link) {
     *       // The link was successfully generated.
     *     })
     *     .catch(function(error) {
     *       // Some error occurred, you can inspect the code: error.code
     *     });
     * ```
     *
     * @param email The email address of the user whose password is to be
     *   reset.
     * @param actionCodeSettings The action
     *     code settings. If specified, the state/continue URL is set as the
     *     "continueUrl" parameter in the password reset link. The default password
     *     reset landing page will use this to display a link to go back to the app
     *     if it is installed.
     *     If the actionCodeSettings is not specified, no URL is appended to the
     *     action URL.
     *     The state URL provided must belong to a domain that is whitelisted by the
     *     developer in the console. Otherwise an error is thrown.
     *     Mobile app redirects are only applicable if the developer configures
     *     and accepts the Firebase Dynamic Links terms of service.
     *     The Android package name and iOS bundle ID are respected only if they
     *     are configured in the same Firebase Auth project.
     * @return A promise that resolves with the generated link.
     */
    generatePasswordResetLink(
      email: string,
      actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string>;

    /**
     * Generates the out of band email action link to verify the user's ownership
     * of the specified email. The
     * {@link admin.auth.ActionCodeSettings `ActionCodeSettings`} object provided
     * as an argument to this method defines whether the link is to be handled by a
     * mobile app or browser along with additional state information to be passed in
     * the deep link, etc.
     *
     * @example
     * ```javascript
     * var actionCodeSettings = {
      *   url: 'https://www.example.com/cart?email=user@example.com&cartId=123',
      *   iOS: {
      *     bundleId: 'com.example.ios'
      *   },
      *   android: {
      *     packageName: 'com.example.android',
      *     installApp: true,
      *     minimumVersion: '12'
      *   },
      *   handleCodeInApp: true,
      *   dynamicLinkDomain: 'custom.page.link'
      * };
      * admin.auth()
      *     .generateEmailVerificationLink('user@example.com', actionCodeSettings)
      *     .then(function(link) {
      *       // The link was successfully generated.
      *     })
      *     .catch(function(error) {
      *       // Some error occurred, you can inspect the code: error.code
      *     });
      * ```
      *
      * @param email The email account to verify.
      * @param actionCodeSettings The action
      *     code settings. If specified, the state/continue URL is set as the
      *     "continueUrl" parameter in the email verification link. The default email
      *     verification landing page will use this to display a link to go back to
      *     the app if it is installed.
      *     If the actionCodeSettings is not specified, no URL is appended to the
      *     action URL.
      *     The state URL provided must belong to a domain that is whitelisted by the
      *     developer in the console. Otherwise an error is thrown.
      *     Mobile app redirects are only applicable if the developer configures
      *     and accepts the Firebase Dynamic Links terms of service.
      *     The Android package name and iOS bundle ID are respected only if they
      *     are configured in the same Firebase Auth project.
      * @return A promise that resolves with the generated link.
     */
    generateEmailVerificationLink(
      email: string,
      actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string>;

    /**
     * Generates the out of band email action link to sign in or sign up the owner
     * of the specified email. The
     * {@link admin.auth.ActionCodeSettings `ActionCodeSettings`} object provided
     * as an argument to this method defines whether the link is to be handled by a
     * mobile app or browser along with additional state information to be passed in
     * the deep link, etc.
     *
     * @example
     * ```javascript
     * var actionCodeSettings = {
      *   // The URL to redirect to for sign-in completion. This is also the deep
      *   // link for mobile redirects. The domain (www.example.com) for this URL
      *   // must be whitelisted in the Firebase Console.
      *   url: 'https://www.example.com/finishSignUp?cartId=1234',
      *   iOS: {
      *     bundleId: 'com.example.ios'
      *   },
      *   android: {
      *     packageName: 'com.example.android',
      *     installApp: true,
      *     minimumVersion: '12'
      *   },
      *   // This must be true.
      *   handleCodeInApp: true,
      *   dynamicLinkDomain: 'custom.page.link'
      * };
      * admin.auth()
      *     .generateSignInWithEmailLink('user@example.com', actionCodeSettings)
      *     .then(function(link) {
      *       // The link was successfully generated.
      *     })
      *     .catch(function(error) {
      *       // Some error occurred, you can inspect the code: error.code
      *     });
      * ```
      *
      * @param email The email account to sign in with.
      * @param actionCodeSettings The action
      *     code settings. These settings provide Firebase with instructions on how
      *     to construct the email link. This includes the sign in completion URL or
      *     the deep link for redirects and the mobile apps to use when the
      *     sign-in link is opened on an Android or iOS device.
      *     Mobile app redirects are only applicable if the developer configures
      *     and accepts the Firebase Dynamic Links terms of service.
      *     The Android package name and iOS bundle ID are respected only if they
      *     are configured in the same Firebase Auth project.
      * @return A promise that resolves with the generated link.
     */
    generateSignInWithEmailLink(
      email: string,
      actionCodeSettings: admin.auth.ActionCodeSettings,
    ): Promise<string>;

    /**
     * Returns the list of existing provider configurations matching the filter
     * provided. At most, 100 provider configs can be listed at a time.
     *
     * SAML and OIDC provider support requires Google Cloud's Identity Platform
     * (GCIP). To learn more about GCIP, including pricing and features,
     * see the [GCIP documentation](https://cloud.google.com/identity-platform).
     *
     * @param options The provider config filter to apply.
     * @return A promise that resolves with the list of provider configs meeting the
     *   filter requirements.
     */
    listProviderConfigs(
      options: admin.auth.AuthProviderConfigFilter
    ): Promise<admin.auth.ListProviderConfigResults>;

    /**
     * Looks up an Auth provider configuration by the provided ID.
     * Returns a promise that resolves with the provider configuration
     * corresponding to the provider ID specified. If the specified ID does not
     * exist, an `auth/configuration-not-found` error is thrown.
     *
     * SAML and OIDC provider support requires Google Cloud's Identity Platform
     * (GCIP). To learn more about GCIP, including pricing and features,
     * see the [GCIP documentation](https://cloud.google.com/identity-platform).
     *
     * @param providerId The provider ID corresponding to the provider
     *     config to return.
     * @return A promise that resolves
     *     with the configuration corresponding to the provided ID.
     */
    getProviderConfig(providerId: string): Promise<admin.auth.AuthProviderConfig>;

    /**
     * Deletes the provider configuration corresponding to the provider ID passed.
     * If the specified ID does not exist, an `auth/configuration-not-found` error
     * is thrown.
     *
     * SAML and OIDC provider support requires Google Cloud's Identity Platform
     * (GCIP). To learn more about GCIP, including pricing and features,
     * see the [GCIP documentation](https://cloud.google.com/identity-platform).
     *
     * @param providerId The provider ID corresponding to the provider
     *     config to delete.
     * @return A promise that resolves on completion.
     */
    deleteProviderConfig(providerId: string): Promise<void>;

    /**
     * Returns a promise that resolves with the updated `AuthProviderConfig`
     * corresponding to the provider ID specified.
     * If the specified ID does not exist, an `auth/configuration-not-found` error
     * is thrown.
     *
     * SAML and OIDC provider support requires Google Cloud's Identity Platform
     * (GCIP). To learn more about GCIP, including pricing and features,
     * see the [GCIP documentation](https://cloud.google.com/identity-platform).
     *
     * @param providerId The provider ID corresponding to the provider
     *     config to update.
     * @param updatedConfig The updated configuration.
     * @return A promise that resolves with the updated provider configuration.
     */
    updateProviderConfig(
      providerId: string, updatedConfig: admin.auth.UpdateAuthProviderRequest
    ): Promise<admin.auth.AuthProviderConfig>;

    /**
     * Returns a promise that resolves with the newly created `AuthProviderConfig`
     * when the new provider configuration is created.
     *
     * SAML and OIDC provider support requires Google Cloud's Identity Platform
     * (GCIP). To learn more about GCIP, including pricing and features,
     * see the [GCIP documentation](https://cloud.google.com/identity-platform).
     *
     * @param config The provider configuration to create.
     * @return A promise that resolves with the created provider configuration.
     */
    createProviderConfig(
      config: admin.auth.AuthProviderConfig
    ): Promise<admin.auth.AuthProviderConfig>;
  }

  /**
   * Tenant-aware `Auth` interface used for managing users, configuring SAML/OIDC providers,
   * generating email links for password reset, email verification, etc for specific tenants.
   *
   * Multi-tenancy support requires Google Cloud's Identity Platform
   * (GCIP). To learn more about GCIP, including pricing and features,
   * see the [GCIP documentation](https://cloud.google.com/identity-platform)
   *
   * Each tenant contains its own identity providers, settings and sets of users.
   * Using `TenantAwareAuth`, users for a specific tenant and corresponding OIDC/SAML
   * configurations can also be managed, ID tokens for users signed in to a specific tenant
   * can be verified, and email action links can also be generated for users belonging to the
   * tenant.
   *
   * `TenantAwareAuth` instances for a specific `tenantId` can be instantiated by calling
   * `auth.tenantManager().authForTenant(tenantId)`.
   */
  interface TenantAwareAuth extends BaseAuth {

    /**
     * The tenant identifier corresponding to this `TenantAwareAuth` instance.
     * All calls to the user management APIs, OIDC/SAML provider management APIs, email link
     * generation APIs, etc will only be applied within the scope of this tenant.
     */
    tenantId: string;
  }

  interface Auth extends admin.auth.BaseAuth {
    app: admin.app.App;

    /**
     * @return The tenant manager instance associated with the current project.
     */
    tenantManager(): admin.auth.TenantManager;
  }

  /**
   * Defines the tenant manager used to help manage tenant related operations.
   * This includes:
   * <ul>
   * <li>The ability to create, update, list, get and delete tenants for the underlying
   *     project.</li>
   * <li>Getting a `TenantAwareAuth` instance for running Auth related operations
   *     (user management, provider configuration management, token verification,
   *     email link generation, etc) in the context of a specified tenant.</li>
   * </ul>
   */
  interface TenantManager {
    /**
     * @param tenantId The tenant ID whose `TenantAwareAuth` instance is to be returned.
     *
     * @return The `TenantAwareAuth` instance corresponding to this tenant identifier.
     */
    authForTenant(tenantId: string): admin.auth.TenantAwareAuth;

    /**
     * Gets the tenant configuration for the tenant corresponding to a given `tenantId`.
     *
     * @param tenantId The tenant identifier corresponding to the tenant whose data to fetch.
     *
     * @return A promise fulfilled with the tenant configuration to the provided `tenantId`.
     */
    getTenant(tenantId: string): Promise<admin.auth.Tenant>;

    /**
     * Retrieves a list of tenants (single batch only) with a size of `maxResults`
     * starting from the offset as specified by `pageToken`. This is used to
     * retrieve all the tenants of a specified project in batches.
     *
     * @param maxResults The page size, 1000 if undefined. This is also
     *   the maximum allowed limit.
     * @param pageToken The next page token. If not specified, returns
     *   tenants starting without any offset.
     *
     * @return A promise that resolves with
     *   a batch of downloaded tenants and the next page token.
     */
    listTenants(maxResults?: number, pageToken?: string): Promise<admin.auth.ListTenantsResult>;

    /**
     * Deletes an existing tenant.
     *
     * @param tenantId The `tenantId` corresponding to the tenant to delete.
     *
     * @return An empty promise fulfilled once the tenant has been deleted.
     */
    deleteTenant(tenantId: string): Promise<void>;

    /**
     * Creates a new tenant.
     * When creating new tenants, tenants that use separate billing and quota will require their
     * own project and must be defined as `full_service`.
     *
     * @param tenantOptions The properties to set on the new tenant configuration to be created.
     *
     * @return A promise fulfilled with the tenant configuration corresponding to the newly
     *   created tenant.
     */
    createTenant(tenantOptions: admin.auth.CreateTenantRequest): Promise<admin.auth.Tenant>;

    /**
     * Updates an existing tenant configuration.
     *
     * @param tenantId The `tenantId` corresponding to the tenant to delete.
     * @param tenantOptions The properties to update on the provided tenant.
     *
     * @return A promise fulfilled with the update tenant data.
     */
    updateTenant(tenantId: string, tenantOptions: admin.auth.UpdateTenantRequest): Promise<admin.auth.Tenant>;
  }
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

declare namespace admin.database {

  /**
   * The Firebase Realtime Database service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.database()`](admin.database#database).
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/database/admin/start/
   *   Introduction to the Admin Database API}
   * for a full guide on how to use the Firebase Realtime Database service.
   */
  interface Database {
    app: admin.app.App;

    /**
     * Disconnects from the server (all Database operations will be completed
     * offline).
     *
     * The client automatically maintains a persistent connection to the Database
     * server, which will remain active indefinitely and reconnect when
     * disconnected. However, the `goOffline()` and `goOnline()` methods may be used
     * to control the client connection in cases where a persistent connection is
     * undesirable.
     *
     * While offline, the client will no longer receive data updates from the
     * Database. However, all Database operations performed locally will continue to
     * immediately fire events, allowing your application to continue behaving
     * normally. Additionally, each operation performed locally will automatically
     * be queued and retried upon reconnection to the Database server.
     *
     * To reconnect to the Database and begin receiving remote events, see
     * `goOnline()`.
     *
     * @example
     * ```javascript
     * admin.database().goOffline();
     * ```
     */
    goOffline(): void;

    /**
     * Reconnects to the server and synchronizes the offline Database state
     * with the server state.
     *
     * This method should be used after disabling the active connection with
     * `goOffline()`. Once reconnected, the client will transmit the proper data
     * and fire the appropriate events so that your client "catches up"
     * automatically.
     *
     * @example
     * ```javascript
     * admin.database().goOnline();
     * ```
     */
    goOnline(): void;

    /**
     * Returns a `Reference` representing the location in the Database
     * corresponding to the provided path. Also can be invoked with an existing
     * `Reference` as the argument. In that case returns a new `Reference`
     * pointing to the same location. If no path argument is
     * provided, returns a `Reference` that represents the root of the Database.
     *
     * @example
     * ```javascript
     * // Get a reference to the root of the Database
     * var rootRef = admin.database.ref();
     * ```
     *
     * @example
     * ```javascript
     * // Get a reference to the /users/ada node
     * var adaRef = admin.database().ref("users/ada");
     * // The above is shorthand for the following operations:
     * //var rootRef = admin.database().ref();
     * //var adaRef = rootRef.child("users/ada");
     * ```
     *
     * @example
     * ```javascript
     * var adaRef = admin.database().ref("users/ada");
     * // Get a new reference pointing to the same location.
     * var anotherAdaRef = admin.database().ref(adaRef);
     * ```
     *
     *
     * @param path Optional path representing
     *   the location the returned `Reference` will point. Alternatively, a
     *   `Reference` object to copy. If not provided, the returned `Reference` will
     *   point to the root of the Database.
     * @return If a path is provided, a `Reference`
     *   pointing to the provided path. Otherwise, a `Reference` pointing to the
     *   root of the Database.
     */
    ref(path?: string | admin.database.Reference): admin.database.Reference;

    /**
     * Returns a `Reference` representing the location in the Database
     * corresponding to the provided Firebase URL.
     *
     * An exception is thrown if the URL is not a valid Firebase Database URL or it
     * has a different domain than the current `Database` instance.
     *
     * Note that all query parameters (`orderBy`, `limitToLast`, etc.) are ignored
     * and are not applied to the returned `Reference`.
     *
     * @example
     * ```javascript
     * // Get a reference to the root of the Database
     * var rootRef = admin.database().ref("https://<DATABASE_NAME>.firebaseio.com");
     * ```
     *
     * @example
     * ```javascript
     * // Get a reference to the /users/ada node
     * var adaRef = admin.database().ref("https://<DATABASE_NAME>.firebaseio.com/users/ada");
     * ```
     *
     * @param url The Firebase URL at which the returned `Reference` will
     *   point.
     * @return  A `Reference` pointing to the provided Firebase URL.
     */
    refFromURL(url: string): admin.database.Reference;

    /**
     * Gets the currently applied security rules as a string. The return value consists of
     * the rules source including comments.
     *
     * @return A promise fulfilled with the rules as a raw string.
     */
    getRules(): Promise<string>;

    /**
     * Gets the currently applied security rules as a parsed JSON object. Any comments in
     * the original source are stripped away.
     *
     * @return A promise fulfilled with the parsed rules object.
     */
    getRulesJSON(): Promise<object>;

    /**
     * Sets the specified rules on the Firebase Realtime Database instance. If the rules source is
     * specified as a string or a Buffer, it may include comments.
     *
     * @param source Source of the rules to apply. Must not be `null` or empty.
     * @return Resolves when the rules are set on the Realtime Database.
     */
    setRules(source: string | Buffer | object): Promise<void>;
  }

  /**
   * A `DataSnapshot` contains data from a Database location.
   *
   * Any time you read data from the Database, you receive the data as a
   * `DataSnapshot`. A `DataSnapshot` is passed to the event callbacks you attach
   * with `on()` or `once()`. You can extract the contents of the snapshot as a
   * JavaScript object by calling the `val()` method. Alternatively, you can
   * traverse into the snapshot by calling `child()` to return child snapshots
   * (which you could then call `val()` on).
   *
   * A `DataSnapshot` is an efficiently generated, immutable copy of the data at
   * a Database location. It cannot be modified and will never change (to modify
   * data, you always call the `set()` method on a `Reference` directly).
   */
  interface DataSnapshot {
    key: string | null;
    ref: admin.database.Reference;

    /**
     * Gets another `DataSnapshot` for the location at the specified relative path.
     *
     * Passing a relative path to the `child()` method of a DataSnapshot returns
     * another `DataSnapshot` for the location at the specified relative path. The
     * relative path can either be a simple child name (for example, "ada") or a
     * deeper, slash-separated path (for example, "ada/name/first"). If the child
     * location has no data, an empty `DataSnapshot` (that is, a `DataSnapshot`
     * whose value is `null`) is returned.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Test for the existence of certain keys within a DataSnapshot
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var name = snapshot.child("name").val(); // {first:"Ada",last:"Lovelace"}
     *     var firstName = snapshot.child("name/first").val(); // "Ada"
     *     var lastName = snapshot.child("name").child("last").val(); // "Lovelace"
     *     var age = snapshot.child("age").val(); // null
     *   });
     * ```
     *
     * @param path A relative path to the location of child data.
     * @return `DataSnapshot` for the location at the specified relative path.
     */
    child(path: string): admin.database.DataSnapshot;

    /**
     * Returns true if this `DataSnapshot` contains any data. It is slightly more
     * efficient than using `snapshot.val() !== null`.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Test for the existence of certain keys within a DataSnapshot
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.exists();  // true
     *     var b = snapshot.child("name").exists(); // true
     *     var c = snapshot.child("name/first").exists(); // true
     *     var d = snapshot.child("name/middle").exists(); // false
     *   });
     * ```
     *
     * @return Whether this `DataSnapshot` contains any data.
     */
    exists(): boolean;

    /**
     * Exports the entire contents of the DataSnapshot as a JavaScript object.
     *
     * The `exportVal()` method is similar to `val()`, except priority information
     * is included (if available), making it suitable for backing up your data.
     *
     * @return The DataSnapshot's contents as a JavaScript value (Object,
     *   Array, string, number, boolean, or `null`).
     */
    exportVal(): any;

    /**
     * Enumerates the top-level children in the `DataSnapshot`.
     *
     * Because of the way JavaScript objects work, the ordering of data in the
     * JavaScript object returned by `val()` is not guaranteed to match the ordering
     * on the server nor the ordering of `child_added` events. That is where
     * `forEach()` comes in handy. It guarantees the children of a `DataSnapshot`
     * will be iterated in their query order.
     *
     * If no explicit `orderBy*()` method is used, results are returned
     * ordered by key (unless priorities are used, in which case, results are
     * returned by priority).
     *
     * @example
     * ```javascript
     *
     * // Assume we have the following data in the Database:
     * {
     *   "users": {
     *     "ada": {
     *       "first": "Ada",
     *       "last": "Lovelace"
     *     },
     *     "alan": {
     *       "first": "Alan",
     *       "last": "Turing"
     *     }
     *   }
     * }
     *
     * // Loop through users in order with the forEach() method. The callback
     * // provided to forEach() will be called synchronously with a DataSnapshot
     * // for each child:
     * var query = admin.database().ref("users").orderByKey();
     * query.once("value")
     *   .then(function(snapshot) {
     *     snapshot.forEach(function(childSnapshot) {
     *       // key will be "ada" the first time and "alan" the second time
     *       var key = childSnapshot.key;
     *       // childData will be the actual contents of the child
     *       var childData = childSnapshot.val();
     *   });
     * });
     * ```
     *
     * @example
     * ```javascript
     * // You can cancel the enumeration at any point by having your callback
     * // function return true. For example, the following code sample will only
     * // fire the callback function one time:
     * var query = admin.database().ref("users").orderByKey();
     * query.once("value")
     *   .then(function(snapshot) {
     *     snapshot.forEach(function(childSnapshot) {
     *       var key = childSnapshot.key; // "ada"
     *
     *       // Cancel enumeration
     *       return true;
     *   });
     * });
     * ```
     *
     * @param action A function
     *   that will be called for each child `DataSnapshot`. The callback can return
     *   true to cancel further enumeration.
     * @return True if enumeration was canceled due to your callback
     *   returning true.
     */
    forEach(action: (a: admin.database.DataSnapshot) => boolean | void): boolean;

    /**
     * Gets the priority value of the data in this `DataSnapshot`.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
      *  Sorting and filtering data}).
      *
      * @return The the priority value of the data in this `DataSnapshot`.
      */
    getPriority(): string | number | null;

    /**
     * Returns true if the specified child path has (non-null) data.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Determine which child keys in DataSnapshot have data.
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var hasName = snapshot.hasChild("name"); // true
     *     var hasAge = snapshot.hasChild("age"); // false
     *   });
     * ```
     *
     * @param path A relative path to the location of a potential child.
     * @return `true` if data exists at the specified child path; else
     *  `false`.
     */
    hasChild(path: string): boolean;

    /**
     * Returns whether or not the `DataSnapshot` has any non-`null` child
     * properties.
     *
     * You can use `hasChildren()` to determine if a `DataSnapshot` has any
     * children. If it does, you can enumerate them using `forEach()`. If it
     * doesn't, then either this snapshot contains a primitive value (which can be
     * retrieved with `val()`) or it is empty (in which case, `val()` will return
     * `null`).
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.hasChildren(); // true
     *     var b = snapshot.child("name").hasChildren(); // true
     *     var c = snapshot.child("name/first").hasChildren(); // false
     *   });
     * ```
     *
     * @return True if this snapshot has any children; else false.
     */
    hasChildren(): boolean;

    /**
     * Returns the number of child properties of this `DataSnapshot`.
     *
     * @example
     * ```javascript
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = admin.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.numChildren(); // 1 ("name")
     *     var b = snapshot.child("name").numChildren(); // 2 ("first", "last")
     *     var c = snapshot.child("name/first").numChildren(); // 0
     *   });
     * ```
     *
     * @return The number of child properties of this `DataSnapshot`.
     */
    numChildren(): number;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object | null;

    /**
     * Extracts a JavaScript value from a `DataSnapshot`.
     *
     * Depending on the data in a `DataSnapshot`, the `val()` method may return a
     * scalar type (string, number, or boolean), an array, or an object. It may also
     * return null, indicating that the `DataSnapshot` is empty (contains no data).
     *
     * @example
     * ```javascript
     * // Write and then read back a string from the Database.
     * ref.set("hello")
     *   .then(function() {
     *     return ref.once("value");
     *   })
     *   .then(function(snapshot) {
     *     var data = snapshot.val(); // data === "hello"
     *   });
     * ```
     *
     * @example
     * ```javascript
     * // Write and then read back a JavaScript object from the Database.
     * ref.set({ name: "Ada", age: 36 })
     *   .then(function() {
     *    return ref.once("value");
     *   })
     *   .then(function(snapshot) {
     *     var data = snapshot.val();
     *     // data is { "name": "Ada", "age": 36 }
     *     // data.name === "Ada"
     *     // data.age === 36
     *   });
     * ```
     *
     * @return The DataSnapshot's contents as a JavaScript value (Object,
     *   Array, string, number, boolean, or `null`).
     */
    val(): any;
  }

  /**
   * The `onDisconnect` class allows you to write or clear data when your client
   * disconnects from the Database server. These updates occur whether your
   * client disconnects cleanly or not, so you can rely on them to clean up data
   * even if a connection is dropped or a client crashes.
   *
   * The `onDisconnect` class is most commonly used to manage presence in
   * applications where it is useful to detect how many clients are connected and
   * when other clients disconnect. See
   * {@link
    *   https://firebase.google.com/docs/database/web/offline-capabilities
    *   Enabling Offline Capabilities in JavaScript} for more information.
    *
    * To avoid problems when a connection is dropped before the requests can be
    * transferred to the Database server, these functions should be called before
    * any data is written.
    *
    * Note that `onDisconnect` operations are only triggered once. If you want an
    * operation to occur each time a disconnect occurs, you'll need to re-establish
    * the `onDisconnect` operations each time you reconnect.
    */
  interface OnDisconnect {

    /**
     * Cancels all previously queued `onDisconnect()` set or update events for this
     * location and all children.
     *
     * If a write has been queued for this location via a `set()` or `update()` at a
     * parent location, the write at this location will be canceled, though all
     * other siblings will still be written.
     *
     * @example
     * ```javascript
     * var ref = admin.database().ref("onlineState");
     * ref.onDisconnect().set(false);
     * // ... sometime later
     * ref.onDisconnect().cancel();
     * ```
     *
     * @param onComplete An optional callback function that is
     *   called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return Resolves when synchronization to the server is complete.
     */
    cancel(onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Ensures the data at this location is deleted when the client is disconnected
     * (due to closing the browser, navigating to a new page, or network issues).
     *
     * @param onComplete An optional callback function that is
     *   called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return Resolves when synchronization to the server is complete.
     */
    remove(onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Ensures the data at this location is set to the specified value when the
     * client is disconnected (due to closing the browser, navigating to a new page,
     * or network issues).
     *
     * `set()` is especially useful for implementing "presence" systems, where a
     * value should be changed or cleared when a user disconnects so that they
     * appear "offline" to other users. See
     * {@link
      *   https://firebase.google.com/docs/database/web/offline-capabilities
      *   Enabling Offline Capabilities in JavaScript} for more information.
      *
      * Note that `onDisconnect` operations are only triggered once. If you want an
      * operation to occur each time a disconnect occurs, you'll need to re-establish
      * the `onDisconnect` operations each time.
      *
      * @example
      * ```javascript
      * var ref = admin.database().ref("users/ada/status");
      * ref.onDisconnect().set("I disconnected!");
      * ```
      *
      * @param value The value to be written to this location on
      *   disconnect (can be an object, array, string, number, boolean, or null).
      * @param onComplete An optional callback function that
      *   will be called when synchronization to the database server has completed.
      *   The callback will be passed a single parameter: null for success, or an
      *   `Error` object indicating a failure.
      * @return A promise that resolves when synchronization to the database is complete.
      */
    set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Ensures the data at this location is set to the specified value and priority
     * when the client is disconnected (due to closing the browser, navigating to a
     * new page, or network issues).
     *
     * @param value The value to be written to this location on
     *   disconnect (can be an object, array, string, number, boolean, or null).
     * @param priority
     * @param onComplete An optional callback function that is
     *   called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return A promise that resolves when synchronization to the database is complete.
     */
    setWithPriority(
      value: any,
      priority: number | string | null,
      onComplete?: (a: Error | null) => any
    ): Promise<void>;

    /**
     * Writes multiple values at this location when the client is disconnected (due
     * to closing the browser, navigating to a new page, or network issues).
     *
     * The `values` argument contains multiple property-value pairs that will be
     * written to the Database together. Each child property can either be a simple
     * property (for example, "name") or a relative path (for example, "name/first")
     * from the current location to the data to update.
     *
     * As opposed to the `set()` method, `update()` can be use to selectively update
     * only the referenced properties at the current location (instead of replacing
     * all the child properties at the current location).
     *
     * See {@link https://firebase.google.com/docs/reference/admin/node/admin.database.Reference#update}
     * for examples of using the connected version of `update`.
     *
     * @example
     * ```javascript
     * var ref = admin.database().ref("users/ada");
     * ref.update({
     *    onlineState: true,
     *    status: "I'm online."
     * });
     * ref.onDisconnect().update({
     *   onlineState: false,
     *   status: "I'm offline."
     * });
     * ```
     *
     * @param values Object containing multiple values.
     * @param onComplete An optional callback function that will
     *   be called when synchronization to the server has completed. The
     *   callback will be passed a single parameter: null for success, or an Error
     *   object indicating a failure.
     * @return Resolves when synchronization to the
     *   Database is complete.
     */
    update(values: Object, onComplete?: (a: Error | null) => any): Promise<void>;
  }

  type EventType = 'value' | 'child_added' | 'child_changed' | 'child_moved' | 'child_removed';

  /**
   * A `Query` sorts and filters the data at a Database location so only a subset
   * of the child data is included. This can be used to order a collection of
   * data by some attribute (for example, height of dinosaurs) as well as to
   * restrict a large list of items (for example, chat messages) down to a number
   * suitable for synchronizing to the client. Queries are created by chaining
   * together one or more of the filter methods defined here.
   *
   * Just as with a `Reference`, you can receive data from a `Query` by using the
   * `on()` method. You will only receive events and `DataSnapshot`s for the
   * subset of the data that matches your query.
   *
   * See
   * {@link
    *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
    *  Sorting and filtering data} for more information.
    */
  interface Query {
    ref: admin.database.Reference;

    /**
     * Creates a `Query` with the specified ending point.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows you to choose arbitrary
     * starting and ending points for your queries.
     *
     * The ending point is inclusive, so children with exactly the specified value
     * will be included in the query. The optional key argument can be used to
     * further limit the range of the query. If it is specified, then children that
     * have exactly the specified value must also have a key name less than or equal
     * to the specified key.
     *
     * You can read more about `endAt()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```javascript
     * // Find all dinosaurs whose names come before Pterodactyl lexicographically.
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByKey().endAt("pterodactyl").on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @param value The value to end at. The argument
     *   type depends on which `orderBy*()` function was used in this query.
     *   Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param key The child key to end at, among the children with the
     *   previously specified priority. This argument is only allowed if ordering by
     *   priority.
     * @return A new `Query` object.
     */
    endAt(value: number | string | boolean | null, key?: string): admin.database.Query;

    /**
     * Creates a `Query` that includes children that match the specified value.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows us to choose arbitrary
     * starting and ending points for our queries.
     *
     * The optional key argument can be used to further limit the range of the
     * query. If it is specified, then children that have exactly the specified
     * value must also have exactly the specified key as their key name. This can be
     * used to filter result sets with many matches for the same value.
     *
     * You can read more about `equalTo()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * // Find all dinosaurs whose height is exactly 25 meters.
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByChild("height").equalTo(25).on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     *
     * @param value The value to match for. The
     *   argument type depends on which `orderBy*()` function was used in this
     *   query. Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param key The child key to start at, among the children with the
     *   previously specified priority. This argument is only allowed if ordering by
     *   priority.
     * @return A new `Query` object.
     */
    equalTo(value: number | string | boolean | null, key?: string): admin.database.Query;

    /**
     * Returns whether or not the current and provided queries represent the same
     * location, have the same query parameters, and are from the same instance of
     * `admin.app.App`.
     *
     * Two `Reference` objects are equivalent if they represent the same location
     * and are from the same instance of `admin.app.App`.
     *
     * Two `Query` objects are equivalent if they represent the same location, have
     * the same query parameters, and are from the same instance of `admin.app.App`.
     * Equivalent queries share the same sort order, limits, and starting and
     * ending points.
     *
     * @example
     * ```javascript
     * var rootRef = admin.database().ref();
     * var usersRef = rootRef.child("users");
     *
     * usersRef.isEqual(rootRef);  // false
     * usersRef.isEqual(rootRef.child("users"));  // true
     * usersRef.parent.isEqual(rootRef);  // true
     * ```
     *
     * @example
     *  ```javascript
     * var rootRef = admin.database().ref();
     * var usersRef = rootRef.child("users");
     * var usersQuery = usersRef.limitToLast(10);
     *
     * usersQuery.isEqual(usersRef);  // false
     * usersQuery.isEqual(usersRef.limitToLast(10));  // true
     * usersQuery.isEqual(rootRef.limitToLast(10));  // false
     * usersQuery.isEqual(usersRef.orderByKey().limitToLast(10));  // false
     * ```
     *
     * @param other The query to compare against.
     * @return Whether or not the current and provided queries are
     *   equivalent.
     */
    isEqual(other: admin.database.Query | null): boolean;

    /**
     * Generates a new `Query` limited to the first specific number of children.
     *
     * The `limitToFirst()` method is used to set a maximum number of children to be
     * synced for a given callback. If we set a limit of 100, we will initially only
     * receive up to 100 `child_added` events. If we have fewer than 100 messages
     * stored in our Database, a `child_added` event will fire for each message.
     * However, if we have over 100 messages, we will only receive a `child_added`
     * event for the first 100 ordered messages. As items change, we will receive
     * `child_removed` events for each item that drops out of the active list so
     * that the total number stays at 100.
     *
     * You can read more about `limitToFirst()` in
     * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
      *  Filtering data}.
      *
      * @example
      * ```javascript
      * // Find the two shortest dinosaurs.
      * var ref = admin.database().ref("dinosaurs");
      * ref.orderByChild("height").limitToFirst(2).on("child_added", function(snapshot) {
      *   // This will be called exactly two times (unless there are less than two
      *   // dinosaurs in the Database).
      *
      *   // It will also get fired again if one of the first two dinosaurs is
      *   // removed from the data set, as a new dinosaur will now be the second
      *   // shortest.
      *   console.log(snapshot.key);
      * });
      * ```
      *
      * @param limit The maximum number of nodes to include in this query.
      * @return A `Query` object.
      */
    limitToFirst(limit: number): admin.database.Query;

    /**
     * Generates a new `Query` object limited to the last specific number of
     * children.
     *
     * The `limitToLast()` method is used to set a maximum number of children to be
     * synced for a given callback. If we set a limit of 100, we will initially only
     * receive up to 100 `child_added` events. If we have fewer than 100 messages
     * stored in our Database, a `child_added` event will fire for each message.
     * However, if we have over 100 messages, we will only receive a `child_added`
     * event for the last 100 ordered messages. As items change, we will receive
     * `child_removed` events for each item that drops out of the active list so
     * that the total number stays at 100.
     *
     * You can read more about `limitToLast()` in
     * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
      *  Filtering data}.
      *
      * @example
      * ```javascript
      * // Find the two heaviest dinosaurs.
      * var ref = admin.database().ref("dinosaurs");
      * ref.orderByChild("weight").limitToLast(2).on("child_added", function(snapshot) {
      *   // This callback will be triggered exactly two times, unless there are
      *   // fewer than two dinosaurs stored in the Database. It will also get fired
      *   // for every new, heavier dinosaur that gets added to the data set.
      *   console.log(snapshot.key);
      * });
      * ```
      *
      * @param limit The maximum number of nodes to include in this query.
      * @return A `Query` object.
      */
    limitToLast(limit: number): admin.database.Query;

    /**
     * Detaches a callback previously attached with `on()`.
     *
     * Detach a callback previously attached with `on()`. Note that if `on()` was
     * called multiple times with the same eventType and callback, the callback
     * will be called multiple times for each event, and `off()` must be called
     * multiple times to remove the callback. Calling `off()` on a parent listener
     * will not automatically remove listeners registered on child nodes, `off()`
     * must also be called on any child listeners to remove the callback.
     *
     * If a callback is not specified, all callbacks for the specified eventType
     * will be removed. Similarly, if no eventType or callback is specified, all
     * callbacks for the `Reference` will be removed.
     *
     * @example
     * ```javascript
     * var onValueChange = function(dataSnapshot) {  ... };
     * ref.on('value', onValueChange);
     * ref.child('meta-data').on('child_added', onChildAdded);
     * // Sometime later...
     * ref.off('value', onValueChange);
     *
     * // You must also call off() for any child listeners on ref
     * // to cancel those callbacks
     * ref.child('meta-data').off('child_added', onValueAdded);
     * ```
     *
     * @example
     * ```javascript
     * // Or you can save a line of code by using an inline function
     * // and on()'s return value.
     * var onValueChange = ref.on('value', function(dataSnapshot) { ... });
     * // Sometime later...
     * ref.off('value', onValueChange);
     * ```
     *
     * @param eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param callback The callback function that was passed to `on()`.
     * @param context The context that was passed to `on()`.
     */
    off(
      eventType?: admin.database.EventType,
      callback?: (a: admin.database.DataSnapshot, b?: string | null) => any,
      context?: Object | null
    ): void;

    /**
     * Listens for data changes at a particular location.
     *
     * This is the primary way to read data from a Database. Your callback
     * will be triggered for the initial data and again whenever the data changes.
     * Use `off( )` to stop receiving updates. See
     * {@link https://firebase.google.com/docs/database/web/retrieve-data
      *   Retrieve Data on the Web}
      * for more details.
      *
      * <h4>value event</h4>
      *
      * This event will trigger once with the initial data stored at this location,
      * and then trigger again each time the data changes. The `DataSnapshot` passed
      * to the callback will be for the location at which `on()` was called. It
      * won't trigger until the entire contents has been synchronized. If the
      * location has no data, it will be triggered with an empty `DataSnapshot`
      * (`val()` will return `null`).
      *
      * <h4>child_added event</h4>
      *
      * This event will be triggered once for each initial child at this location,
      * and it will be triggered again every time a new child is added. The
      * `DataSnapshot` passed into the callback will reflect the data for the
      * relevant child. For ordering purposes, it is passed a second argument which
      * is a string containing the key of the previous sibling child by sort order
      * (or `null` if it is the first child).
      *
      * <h4>child_removed event</h4>
      *
      * This event will be triggered once every time a child is removed. The
      * `DataSnapshot` passed into the callback will be the old data for the child
      * that was removed. A child will get removed when either:
      *
      * - a client explicitly calls `remove()` on that child or one of its ancestors
      * - a client calls `set(null)` on that child or one of its ancestors
      * - that child has all of its children removed
      * - there is a query in effect which now filters out the child (because it's
      *   sort order changed or the max limit was hit)
      *
      * <h4>child_changed event</h4>
      *
      * This event will be triggered when the data stored in a child (or any of its
      * descendants) changes. Note that a single `child_changed` event may represent
      * multiple changes to the child. The `DataSnapshot` passed to the callback will
      * contain the new child contents. For ordering purposes, the callback is also
      * passed a second argument which is a string containing the key of the previous
      * sibling child by sort order (or `null` if it is the first child).
      *
      * <h4>child_moved event</h4>
      *
      * This event will be triggered when a child's sort order changes such that its
      * position relative to its siblings changes. The `DataSnapshot` passed to the
      * callback will be for the data of the child that has moved. It is also passed
      * a second argument which is a string containing the key of the previous
      * sibling child by sort order (or `null` if it is the first child).
      *
      * @example
      * ```javascript
      * // Handle a new value.
      * ref.on('value', function(dataSnapshot) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle a new child.
      * ref.on('child_added', function(childSnapshot, prevChildKey) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle child removal.
      * ref.on('child_removed', function(oldChildSnapshot) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle child data changes.
      * ref.on('child_changed', function(childSnapshot, prevChildKey) {
      *   ...
      * });
      * ```
      *
      * @example
      * ```javascript
      * // Handle child ordering changes.
      * ref.on('child_moved', function(childSnapshot, prevChildKey) {
      *   ...
      * });
      * ```
      *
      * @param eventType One of the following strings: "value",
      *   "child_added", "child_changed", "child_removed", or "child_moved."
      * @param callback A callback that fires when the specified event occurs. The callback is
      *   passed a DataSnapshot. For ordering purposes, "child_added",
      *   "child_changed", and "child_moved" will also be passed a string containing
      *   the key of the previous child, by sort order (or `null` if it is the
      *   first child).
      * @param cancelCallbackOrContext An optional
      *   callback that will be notified if your event subscription is ever canceled
      *   because your client does not have permission to read this data (or it had
      *   permission but has now lost it). This callback will be passed an `Error`
      *   object indicating why the failure occurred.
      * @param context If provided, this object will be used as `this`
      *   when calling your callback(s).
      * @return The provided
      *   callback function is returned unmodified. This is just for convenience if
      *   you want to pass an inline function to `on()`,  but store the callback
      *   function for later passing to `off()`.
      */
    on(
      eventType: admin.database.EventType,
      callback: (a: admin.database.DataSnapshot | null, b?: string) => any,
      cancelCallbackOrContext?: Object | null,
      context?: Object | null
    ): (a: admin.database.DataSnapshot | null, b?: string) => any;

    /**
     * Listens for exactly one event of the specified event type, and then stops
     * listening.
     *
     * This is equivalent to calling `on()`, and then calling `off()` inside the
     * callback function. See `on()` for details on the event types.
     *
     * @example
     * ```javascript
     * // Basic usage of .once() to read the data located at ref.
     * ref.once('value')
     *   .then(function(dataSnapshot) {
     *     // handle read data.
     *   });
     * ```
     *
     * @param eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param successCallback A callback that fires when the specified event occurs. The callback is
     *   passed a `DataSnapshot`. For ordering purposes, "child_added",
     *   "child_changed", and "child_moved" will also be passed a string containing
     *   the key of the previous child by sort order (or `null` if it is the
     *   first child).
     * @param failureCallbackOrContext An optional
     *   callback that will be notified if your client does not have permission to
     *   read the data. This callback will be passed an `Error` object indicating
     *   why the failure occurred.
     * @param context If provided, this object will be used as `this`
     *   when calling your callback(s).
     * @return {!Promise<admin.database.DataSnapshot>}
     */
    once(
      eventType: admin.database.EventType,
      successCallback?: (a: admin.database.DataSnapshot, b?: string) => any,
      failureCallbackOrContext?: Object | null,
      context?: Object | null
    ): Promise<admin.database.DataSnapshot>;

    /**
     * Generates a new `Query` object ordered by the specified child key.
     *
     * Queries can only order by one key at a time. Calling `orderByChild()`
     * multiple times on the same query is an error.
     *
     * Firebase queries allow you to order your data by any child key on the fly.
     * However, if you know in advance what your indexes will be, you can define
     * them via the .indexOn rule in your Security Rules for better performance. See
     * the {@link https://firebase.google.com/docs/database/security/indexing-data
      * .indexOn} rule for more information.
      *
      * You can read more about `orderByChild()` in
      * {@link
      *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
      *  Sort data}.
      *
      * @example
      * ```javascript
      * var ref = admin.database().ref("dinosaurs");
      * ref.orderByChild("height").on("child_added", function(snapshot) {
      *   console.log(snapshot.key + " was " + snapshot.val().height + " m tall");
      * });
      * ```
      *
      * @param path
      * @return A new `Query` object.
      */
    orderByChild(path: string): admin.database.Query;

    /**
     * Generates a new `Query` object ordered by key.
     *
     * Sorts the results of a query by their (ascending) key values.
     *
     * You can read more about `orderByKey()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```javascript
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByKey().on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @return A new `Query` object.
     */
    orderByKey(): admin.database.Query;

    /**
     * Generates a new `Query` object ordered by priority.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data} for alternatives to priority.
     *
     * @return A new `Query` object.
     */
    orderByPriority(): admin.database.Query;

    /**
     * Generates a new `Query` object ordered by value.
     *
     * If the children of a query are all scalar values (string, number, or
     * boolean), you can order the results by their (ascending) values.
     *
     * You can read more about `orderByValue()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```javascript
     * var scoresRef = admin.database().ref("scores");
     * scoresRef.orderByValue().limitToLast(3).on("value", function(snapshot) {
     *   snapshot.forEach(function(data) {
     *     console.log("The " + data.key + " score is " + data.val());
     *   });
     * });
     * ```
     *
     * @return A new `Query` object.
     */
    orderByValue(): admin.database.Query;

    /**
     * Creates a `Query` with the specified starting point.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows you to choose arbitrary
     * starting and ending points for your queries.
     *
     * The starting point is inclusive, so children with exactly the specified value
     * will be included in the query. The optional key argument can be used to
     * further limit the range of the query. If it is specified, then children that
     * have exactly the specified value must also have a key name greater than or
     * equal to the specified key.
     *
     * You can read more about `startAt()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```javascript
     * // Find all dinosaurs that are at least three meters tall.
     * var ref = admin.database().ref("dinosaurs");
     * ref.orderByChild("height").startAt(3).on("child_added", function(snapshot) {
     *   console.log(snapshot.key)
     * });
     * ```
     *
     * @param value The value to start at. The argument
     *   type depends on which `orderBy*()` function was used in this query.
     *   Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param  key The child key to start at. This argument is allowed if
     *   ordering by child, value, or priority.
     * @return A new `Query` object.
     */
    startAt(value: number | string | boolean | null, key?: string): admin.database.Query;

    /**
     * @return A JSON-serializable representation of this object.
     */
    toJSON(): Object;

    /**
     * Gets the absolute URL for this location.
     *
     * The `toString()` method returns a URL that is ready to be put into a browser,
     * curl command, or a `admin.database().refFromURL()` call. Since all of those
     * expect the URL to be url-encoded, `toString()` returns an encoded URL.
     *
     * Append '.json' to the returned URL when typed into a browser to download
     * JSON-formatted data. If the location is secured (that is, not publicly
     * readable), you will get a permission-denied error.
     *
     * @example
     * ```javascript
     * // Calling toString() on a root Firebase reference returns the URL where its
     * // data is stored within the Database:
     * var rootRef = admin.database().ref();
     * var rootUrl = rootRef.toString();
     * // rootUrl === "https://sample-app.firebaseio.com/".
     *
     * // Calling toString() at a deeper Firebase reference returns the URL of that
     * // deep path within the Database:
     * var adaRef = rootRef.child('users/ada');
     * var adaURL = adaRef.toString();
     * // adaURL === "https://sample-app.firebaseio.com/users/ada".
     * ```
     *
     * @return The absolute URL for this location.
     * @override
     */
    toString(): string;
  }

  /**
   * A `Reference` represents a specific location in your Database and can be used
   * for reading or writing data to that Database location.
   *
   * You can reference the root or child location in your Database by calling
   * `admin.database().ref()` or `admin.database().ref("child/path")`.
   *
   * Writing is done with the `set()` method and reading can be done with the
   * `on()` method. See
   * {@link
   *   https://firebase.google.com/docs/database/web/read-and-write
   *   Read and Write Data on the Web}
   */
  interface Reference extends admin.database.Query {

    /**
     * The last part of the `Reference`'s path.
     *
     * For example, `"ada"` is the key for
     * `https://<DATABASE_NAME>.firebaseio.com/users/ada`.
     *
     * The key of a root `Reference` is `null`.
     *
     * @example
     * ```javascript
     * // The key of a root reference is null
     * var rootRef = admin.database().ref();
     * var key = rootRef.key;  // key === null
     * ```
     *
     * @example
     * ```javascript
     * // The key of any non-root reference is the last token in the path
     * var adaRef = admin.database().ref("users/ada");
     * var key = adaRef.key;  // key === "ada"
     * key = adaRef.child("name/last").key;  // key === "last"
     * ```
     */
    key: string | null;

    /**
     * The parent location of a `Reference`.
     *
     * The parent of a root `Reference` is `null`.
     *
     * @example
     * ```javascript
     * // The parent of a root reference is null
     * var rootRef = admin.database().ref();
     * parent = rootRef.parent;  // parent === null
     * ```
     *
     * @example
     * ```javascript
     * // The parent of any non-root reference is the parent location
     * var usersRef = admin.database().ref("users");
     * var adaRef = admin.database().ref("users/ada");
     * // usersRef and adaRef.parent represent the same location
     * ```
     */
    parent: admin.database.Reference | null;

    /**
     * The root `Reference` of the Database.
     *
     * @example
     * ```javascript
     * // The root of a root reference is itself
     * var rootRef = admin.database().ref();
     * // rootRef and rootRef.root represent the same location
     * ```
     *
     * @example
     * ```javascript
     * // The root of any non-root reference is the root location
     * var adaRef = admin.database().ref("users/ada");
     * // rootRef and adaRef.root represent the same location
     * ```
     */
    root: admin.database.Reference;
    path: string;

    /**
     * Gets a `Reference` for the location at the specified relative path.
     *
     * The relative path can either be a simple child name (for example, "ada") or
     * a deeper slash-separated path (for example, "ada/name/first").
     *
     * @example
     * ```javascript
     * var usersRef = admin.database().ref('users');
     * var adaRef = usersRef.child('ada');
     * var adaFirstNameRef = adaRef.child('name/first');
     * var path = adaFirstNameRef.toString();
     * // path is now 'https://sample-app.firebaseio.com/users/ada/name/first'
     * ```
     *
     * @param path A relative path from this location to the desired child
     *   location.
     * @return The specified child location.
     */
    child(path: string): admin.database.Reference;

    /**
     * Returns an `OnDisconnect` object - see
     * {@link
     *   https://firebase.google.com/docs/database/web/offline-capabilities
     *   Enabling Offline Capabilities in JavaScript} for more information on how
     * to use it.
     *
     * @return An `OnDisconnect` object .
     */
    onDisconnect(): admin.database.OnDisconnect;

    /**
     * Generates a new child location using a unique key and returns its
     * `Reference`.
     *
     * This is the most common pattern for adding data to a collection of items.
     *
     * If you provide a value to `push()`, the value will be written to the
     * generated location. If you don't pass a value, nothing will be written to the
     * Database and the child will remain empty (but you can use the `Reference`
     * elsewhere).
     *
     * The unique key generated by `push()` are ordered by the current time, so the
     * resulting list of items will be chronologically sorted. The keys are also
     * designed to be unguessable (they contain 72 random bits of entropy).
     *
     *
     * See
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#append_to_a_list_of_data
     *  Append to a list of data}
     * </br>See
     * {@link
     *  https://firebase.googleblog.com/2015/02/the-2120-ways-to-ensure-unique_68.html
     *  The 2^120 Ways to Ensure Unique Identifiers}
     *
     * @example
     * ```javascript
     * var messageListRef = admin.database().ref('message_list');
     * var newMessageRef = messageListRef.push();
     * newMessageRef.set({
     *   user_id: 'ada',
     *   text: 'The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves.'
     * });
     * // We've appended a new message to the message_list location.
     * var path = newMessageRef.toString();
     * // path will be something like
     * // 'https://sample-app.firebaseio.com/message_list/-IKo28nwJLH0Nc5XeFmj'
     * ```
     *
     * @param value Optional value to be written at the generated location.
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Combined `Promise` and
     *   `Reference`; resolves when write is complete, but can be used immediately
     *   as the `Reference` to the child location.
     */
    push(value?: any, onComplete?: (a: Error | null) => any): admin.database.ThenableReference;

    /**
     * Removes the data at this Database location.
     *
     * Any data at child locations will also be deleted.
     *
     * The effect of the remove will be visible immediately and the corresponding
     * event 'value' will be triggered. Synchronization of the remove to the
     * Firebase servers will also be started, and the returned Promise will resolve
     * when complete. If provided, the onComplete callback will be called
     * asynchronously after synchronization has finished.
     *
     * @example
     * ```javascript
     * var adaRef = admin.database().ref('users/ada');
     * adaRef.remove()
     *   .then(function() {
     *     console.log("Remove succeeded.")
     *   })
     *   .catch(function(error) {
     *     console.log("Remove failed: " + error.message)
     *   });
     * ```
     *
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Resolves when remove on server is complete.
     */
    remove(onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Writes data to this Database location.
     *
     * This will overwrite any data at this location and all child locations.
     *
     * The effect of the write will be visible immediately, and the corresponding
     * events ("value", "child_added", etc.) will be triggered. Synchronization of
     * the data to the Firebase servers will also be started, and the returned
     * Promise will resolve when complete. If provided, the `onComplete` callback
     * will be called asynchronously after synchronization has finished.
     *
     * Passing `null` for the new value is equivalent to calling `remove()`; namely,
     * all data at this location and all child locations will be deleted.
     *
     * `set()` will remove any priority stored at this location, so if priority is
     * meant to be preserved, you need to use `setWithPriority()` instead.
     *
     * Note that modifying data with `set()` will cancel any pending transactions
     * at that location, so extreme care should be taken if mixing `set()` and
     * `transaction()` to modify the same data.
     *
     * A single `set()` will generate a single "value" event at the location where
     * the `set()` was performed.
     *
     * @example
     * ```javascript
     * var adaNameRef = admin.database().ref('users/ada/name');
     * adaNameRef.child('first').set('Ada');
     * adaNameRef.child('last').set('Lovelace');
     * // We've written 'Ada' to the Database location storing Ada's first name,
     * // and 'Lovelace' to the location storing her last name.
     * ```
     *
     * @example
     * ```javascript
     * adaNameRef.set({ first: 'Ada', last: 'Lovelace' });
     * // Exact same effect as the previous example, except we've written
     * // Ada's first and last name simultaneously.
     * ```
     *
     * @example
     * ```javascript
     * adaNameRef.set({ first: 'Ada', last: 'Lovelace' })
     *   .then(function() {
     *     console.log('Synchronization succeeded');
     *   })
     *   .catch(function(error) {
     *     console.log('Synchronization failed');
     *   });
     * // Same as the previous example, except we will also log a message
     * // when the data has finished synchronizing.
     * ```
     *
     * @param value The value to be written (string, number, boolean, object,
     *   array, or null).
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Resolves when write to server is complete.
     */
    set(value: any, onComplete?: (a: Error | null) => any): Promise<void>;

    /**
     * Sets a priority for the data at this Database location.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     *
     * @param priority
     * @param onComplete
     * @return
     */
    setPriority(
      priority: string | number | null,
      onComplete: (a: Error | null) => any
    ): Promise<void>;

    /**
     * Writes data the Database location. Like `set()` but also specifies the
     * priority for that data.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     *
     * @param newVal
     * @param newPriority
     * @param  onComplete
     * @return
     */
    setWithPriority(
      newVal: any, newPriority: string | number | null,
      onComplete?: (a: Error | null) => any
    ): Promise<void>;

    /**
     * Atomically modifies the data at this location.
     *
     * Atomically modify the data at this location. Unlike a normal `set()`, which
     * just overwrites the data regardless of its previous value, `transaction()` is
     * used to modify the existing value to a new value, ensuring there are no
     * conflicts with other clients writing to the same location at the same time.
     *
     * To accomplish this, you pass `transaction()` an update function which is used
     * to transform the current value into a new value. If another client writes to
     * the location before your new value is successfully written, your update
     * function will be called again with the new current value, and the write will
     * be retried. This will happen repeatedly until your write succeeds without
     * conflict or you abort the transaction by not returning a value from your
     * update function.
     *
     * Note: Modifying data with `set()` will cancel any pending transactions at
     * that location, so extreme care should be taken if mixing `set()` and
     * `transaction()` to update the same data.
     *
     * Note: When using transactions with Security and Firebase Rules in place, be
     * aware that a client needs `.read` access in addition to `.write` access in
     * order to perform a transaction. This is because the client-side nature of
     * transactions requires the client to read the data in order to transactionally
     * update it.
     *
     * @example
     * ```javascript
     * // Increment Ada's rank by 1.
     * var adaRankRef = admin.database().ref('users/ada/rank');
     * adaRankRef.transaction(function(currentRank) {
     *   // If users/ada/rank has never been set, currentRank will be `null`.
     *   return currentRank + 1;
     * });
     * ```
     *
     * @example
     * ```javascript
     * // Try to create a user for ada, but only if the user id 'ada' isn't
     * // already taken
     * var adaRef = admin.database().ref('users/ada');
     * adaRef.transaction(function(currentData) {
     *   if (currentData === null) {
     *     return { name: { first: 'Ada', last: 'Lovelace' } };
     *   } else {
     *     console.log('User ada already exists.');
     *     return; // Abort the transaction.
     *   }
     * }, function(error, committed, snapshot) {
     *   if (error) {
     *     console.log('Transaction failed abnormally!', error);
     *   } else if (!committed) {
     *     console.log('We aborted the transaction (because ada already exists).');
     *   } else {
     *     console.log('User ada added!');
     *   }
     *   console.log("Ada's data: ", snapshot.val());
     * });
     * ```
     *
     * @param transactionUpdate A developer-supplied function which
     *   will be passed the current data stored at this location (as a JavaScript
     *   object). The function should return the new value it would like written (as
     *   a JavaScript object). If `undefined` is returned (i.e. you return with no
     *   arguments) the transaction will be aborted and the data at this location
     *   will not be modified.
     * @param onComplete A callback
     *   function that will be called when the transaction completes. The callback
     *   is passed three arguments: a possibly-null `Error`, a `boolean` indicating
     *   whether the transaction was committed, and a `DataSnapshot` indicating the
     *   final result. If the transaction failed abnormally, the first argument will
     *   be an `Error` object indicating the failure cause. If the transaction
     *   finished normally, but no data was committed because no data was returned
     *   from `transactionUpdate`, then second argument will be false. If the
     *   transaction completed and committed data to Firebase, the second argument
     *   will be true. Regardless, the third argument will be a `DataSnapshot`
     *   containing the resulting data in this location.
     * @param applyLocally By default, events are raised each time the
     *   transaction update function runs. So if it is run multiple times, you may
     *   see intermediate states. You can set this to false to suppress these
     *   intermediate states and instead wait until the transaction has completed
     *   before events are raised.
     * @return Returns a Promise that can optionally be used instead of the `onComplete`
     *   callback to handle success and failure.
     */
    transaction(
      transactionUpdate: (a: any) => any,
      onComplete?: (a: Error | null, b: boolean, c: admin.database.DataSnapshot | null) => any,
      applyLocally?: boolean
    ): Promise<{
      committed: boolean;
      snapshot: admin.database.DataSnapshot | null;
    }>;

    /**
     * Writes multiple values to the Database at once.
     *
     * The `values` argument contains multiple property-value pairs that will be
     * written to the Database together. Each child property can either be a simple
     * property (for example, "name") or a relative path (for example,
     * "name/first") from the current location to the data to update.
     *
     * As opposed to the `set()` method, `update()` can be use to selectively update
     * only the referenced properties at the current location (instead of replacing
     * all the child properties at the current location).
     *
     * The effect of the write will be visible immediately, and the corresponding
     * events ('value', 'child_added', etc.) will be triggered. Synchronization of
     * the data to the Firebase servers will also be started, and the returned
     * Promise will resolve when complete. If provided, the `onComplete` callback
     * will be called asynchronously after synchronization has finished.
     *
     * A single `update()` will generate a single "value" event at the location
     * where the `update()` was performed, regardless of how many children were
     * modified.
     *
     * Note that modifying data with `update()` will cancel any pending
     * transactions at that location, so extreme care should be taken if mixing
     * `update()` and `transaction()` to modify the same data.
     *
     * Passing `null` to `update()` will remove the data at this location.
     *
     * See
     * {@link
     *  https://firebase.googleblog.com/2015/09/introducing-multi-location-updates-and_86.html
     *  Introducing multi-location updates and more}.
     *
     * @example
     * ```javascript
     * var adaNameRef = admin.database().ref('users/ada/name');
     * // Modify the 'first' and 'last' properties, but leave other data at
     * // adaNameRef unchanged.
     * adaNameRef.update({ first: 'Ada', last: 'Lovelace' });
     * ```
     *
     * @param values Object containing multiple values.
     * @param onComplete Callback called when write to server is
     *   complete.
     * @return Resolves when update on server is complete.
     */
    update(values: Object, onComplete?: (a: Error | null) => any): Promise<void>;
  }

  /**
   * @extends {admin.database.Reference}
   */
  interface ThenableReference extends admin.database.Reference, Promise<admin.database.Reference> { }

  function enableLogging(logger?: boolean | ((message: string) => any), persistent?: boolean): any;
}

declare namespace admin.database.ServerValue {
  const TIMESTAMP: number;
}

type BaseMessage = {
  data?: { [key: string]: string };
  notification?: admin.messaging.Notification;
  android?: admin.messaging.AndroidConfig;
  webpush?: admin.messaging.WebpushConfig;
  apns?: admin.messaging.ApnsConfig;
  fcmOptions?: admin.messaging.FcmOptions;
};

interface TokenMessage extends BaseMessage {
  token: string;
}

interface TopicMessage extends BaseMessage {
  topic: string;
}

interface ConditionMessage extends BaseMessage {
  condition: string;
}

declare namespace admin.messaging {
  type Message = TokenMessage | TopicMessage | ConditionMessage;

  interface MulticastMessage extends BaseMessage {
    tokens: string[];
  }

  /**
   * Represents the Android-specific options that can be included in an
   * {@link admin.messaging.Message}.
   */
  interface AndroidConfig {

    /**
     * Collapse key for the message. Collapse key serves as an identifier for a
     * group of messages that can be collapsed, so that only the last message gets
     * sent when delivery can be resumed. A maximum of four different collapse keys
     * may be active at any given time.
     */
    collapseKey?: string;

    /**
     * Priority of the message. Must be either `normal` or `high`.
     */
    priority?: ('high' | 'normal');

    /**
     * Time-to-live duration of the message in milliseconds.
     */
    ttl?: number;

    /**
     * Package name of the application where the registration tokens must match
     * in order to receive the message.
     */
    restrictedPackageName?: string;

    /**
     * A collection of data fields to be included in the message. All values must
     * be strings. When provided, overrides any data fields set on the top-level
     * `admin.messaging.Message`.}
     */
    data?: { [key: string]: string };

    /**
     * Android notification to be included in the message.
     */
    notification?: AndroidNotification;

    /**
     * Options for features provided by the FCM SDK for Android.
     */
    fcmOptions?: AndroidFcmOptions;
  }

  /**
   * Represents the Android-specific notification options that can be included in
   * {@link admin.messaging.AndroidConfig}.
   */
  interface AndroidNotification {

    /**
     * Title of the Android notification. When provided, overrides the title set via
     * `admin.messaging.Notification`.
     */
    title?: string;

    /**
     * Body of the Android notification. When provided, overrides the body set via
     * `admin.messaging.Notification`.
     */
    body?: string;

    /**
     * Icon resource for the Android notification.
     */
    icon?: string;

    /**
     * Notification icon color in `#rrggbb` format.
     */
    color?: string;

    /**
     * File name of the sound to be played when the device receives the
     * notification.
     */
    sound?: string;

    /**
     * Notification tag. This is an identifier used to replace existing
     * notifications in the notification drawer. If not specified, each request
     * creates a new notification.
     */
    tag?: string;

    /**
     * URL of an image to be displayed in the notification.
     */
    imageUrl?: string;

    /**
     * Action associated with a user click on the notification. If specified, an
     * activity with a matching Intent Filter is launched when a user clicks on the
     * notification.
     */
    clickAction?: string;

    /**
     * Key of the body string in the app's string resource to use to localize the
     * body text.
     *
     */
    bodyLocKey?: string;

    /**
     * An array of resource keys that will be used in place of the format
     * specifiers in `bodyLocKey`.
     */
    bodyLocArgs?: string[];

    /**
     * Key of the title string in the app's string resource to use to localize the
     * title text.
     */
    titleLocKey?: string;

    /**
     * An array of resource keys that will be used in place of the format
     * specifiers in `titleLocKey`.
     */
    titleLocArgs?: string[];

    /**
     * The Android notification channel ID (new in Android O). The app must create
     * a channel with this channel ID before any notification with this channel ID
     * can be received. If you don't send this channel ID in the request, or if the
     * channel ID provided has not yet been created by the app, FCM uses the channel
     * ID specified in the app manifest.
     */
    channelId?: string;

    /**
     * Sets the "ticker" text, which is sent to accessibility services. Prior to
     * API level 21 (Lollipop), sets the text that is displayed in the status bar
     * when the notification first arrives.
     */
    ticker?: string;

    /**
     * When set to `false` or unset, the notification is automatically dismissed when
     * the user clicks it in the panel. When set to `true`, the notification persists
     * even when the user clicks it.
     */
    sticky?: boolean;

    /**
     * For notifications that inform users about events with an absolute time reference, sets
     * the time that the event in the notification occurred. Notifications
     * in the panel are sorted by this time.
     */
    eventTimestamp?: Date;

    /**
     * Sets whether or not this notification is relevant only to the current device.
     * Some notifications can be bridged to other devices for remote display, such as
     * a Wear OS watch. This hint can be set to recommend this notification not be bridged.
     * See [Wear OS guides](https://developer.android.com/training/wearables/notifications/bridger#existing-method-of-preventing-bridging)
     */
    localOnly?: boolean;

    /**
     * Sets the relative priority for this notification. Low-priority notifications
     * may be hidden from the user in certain situations. Note this priority differs
     * from `AndroidMessagePriority`. This priority is processed by the client after
     * the message has been delivered. Whereas `AndroidMessagePriority` is an FCM concept
     * that controls when the message is delivered.
     */
    priority?: ('min' | 'low' | 'default' | 'high' | 'max');

    /**
     * Sets the vibration pattern to use. Pass in an array of milliseconds to
     * turn the vibrator on or off. The first value indicates the duration to wait before
     * turning the vibrator on. The next value indicates the duration to keep the
     * vibrator on. Subsequent values alternate between duration to turn the vibrator
     * off and to turn the vibrator on. If `vibrate_timings` is set and `default_vibrate_timings`
     * is set to `true`, the default value is used instead of the user-specified `vibrate_timings`.
     */
    vibrateTimingsMillis?: number[];

    /**
     * If set to `true`, use the Android framework's default vibrate pattern for the
     * notification. Default values are specified in [`config.xml`](https://android.googlesource.com/platform/frameworks/base/+/master/core/res/res/values/config.xml).
     * If `default_vibrate_timings` is set to `true` and `vibrate_timings` is also set,
     * the default value is used instead of the user-specified `vibrate_timings`.
     */
    defaultVibrateTimings?: boolean;

    /**
     * If set to `true`, use the Android framework's default sound for the notification.
     * Default values are specified in [`config.xml`](https://android.googlesource.com/platform/frameworks/base/+/master/core/res/res/values/config.xml).
     */
    defaultSound?: boolean;

    /**
     * Settings to control the notification's LED blinking rate and color if LED is
     * available on the device. The total blinking time is controlled by the OS.
     */
    lightSettings?: LightSettings;

    /**
     * If set to `true`, use the Android framework's default LED light settings
     * for the notification. Default values are specified in [`config.xml`](https://android.googlesource.com/platform/frameworks/base/+/master/core/res/res/values/config.xml).
     * If `default_light_settings` is set to `true` and `light_settings` is also set,
     * the user-specified `light_settings` is used instead of the default value.
     */
    defaultLightSettings?: boolean;

    /**
     * Sets the visibility of the notification. Must be either `private`, `public`,
     * or `secret`. If unspecified, defaults to `private`.
     */
    visibility?: ('private' | 'public' | 'secret');

    /**
     * Sets the number of items this notification represents. May be displayed as a
     * badge count for Launchers that support badging. See [`NotificationBadge`(https://developer.android.com/training/notify-user/badges).
     * For example, this might be useful if you're using just one notification to
     * represent multiple new messages but you want the count here to represent
     * the number of total new messages. If zero or unspecified, systems
     * that support badging use the default, which is to increment a number
     * displayed on the long-press menu each time a new notification arrives.
     */
    notificationCount?: number;
  }

  /**
   * Represents settings to control notification LED that can be included in
   * {@link admin.messaging.AndroidNotification}.
   */
  interface LightSettings {
    /**
     * Required. Sets color of the LED in `#rrggbb` or `#rrggbbaa` format.
     */
    color: string;

    /**
     * Required. Along with `light_off_duration`, defines the blink rate of LED flashes.
     */
    lightOnDurationMillis: number;

    /**
     * Required. Along with `light_on_duration`, defines the blink rate of LED flashes.
     */
    lightOffDurationMillis: number;
  }

  /**
   * Represents options for features provided by the FCM SDK for Android.
   */
  interface AndroidFcmOptions {

    /**
     * The label associated with the message's analytics data.
     */
    analyticsLabel?: string;
  }

  /**
   * Represents the APNs-specific options that can be included in an
   * {@link admin.messaging.Message}. Refer to
   * [Apple documentation](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html)
   * for various headers and payload fields supported by APNs.
   */
  interface ApnsConfig {

    /**
     * A collection of APNs headers. Header values must be strings.
     */
    headers?: { [key: string]: string };

    /**
     * An APNs payload to be included in the message.
     */
    payload?: ApnsPayload;

    /**
     * Options for features provided by the FCM SDK for iOS.
     */
    fcmOptions?: ApnsFcmOptions;
  }
  /**
   * Represents the payload of an APNs message. Mainly consists of the `aps`
   * dictionary. But may also contain other arbitrary custom keys.
   */
  interface ApnsPayload {

    /**
     * The `aps` dictionary to be included in the message.
     */
    aps: Aps;
    [customData: string]: object;
  }
  /**
   * Represents the [aps dictionary](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html)
   * that is part of APNs messages.
   */
  interface Aps {

    /**
     * Alert to be included in the message. This may be a string or an object of
     * type `admin.messaging.ApsAlert`.
     */
    alert?: string | ApsAlert;

    /**
     * Badge to be displayed with the message. Set to 0 to remove the badge. When
     * not specified, the badge will remain unchanged.
     */
    badge?: number;

    /**
     * Sound to be played with the message.
     */
    sound?: string | CriticalSound;

    /**
     * Specifies whether to configure a background update notification.
     */
    contentAvailable?: boolean;

    /**
     * Specifies whether to set the `mutable-content` property on the message
     * so the clients can modify the notification via app extensions.
     */
    mutableContent?: boolean;

    /**
     * Type of the notification.
     */
    category?: string;

    /**
     * An app-specific identifier for grouping notifications.
     */
    threadId?: string;
    [customData: string]: any;
  }

  interface ApsAlert {
    title?: string;
    subtitle?: string;
    body?: string;
    locKey?: string;
    locArgs?: string[];
    titleLocKey?: string;
    titleLocArgs?: string[];
    subtitleLocKey?: string;
    subtitleLocArgs?: string[];
    actionLocKey?: string;
    launchImage?: string;
  }

  /**
   * Represents a critical sound configuration that can be included in the
   * `aps` dictionary of an APNs payload.
   */
  interface CriticalSound {

    /**
     * The critical alert flag. Set to `true` to enable the critical alert.
     */
    critical?: boolean;

    /**
     * The name of a sound file in the app's main bundle or in the `Library/Sounds`
     * folder of the app's container directory. Specify the string "default" to play
     * the system sound.
     */
    name: string;

    /**
     * The volume for the critical alert's sound. Must be a value between 0.0
     * (silent) and 1.0 (full volume).
     */
    volume?: number;
  }

  /**
   * Represents options for features provided by the FCM SDK for iOS.
   */
  interface ApnsFcmOptions {

    /**
     * The label associated with the message's analytics data.
     */
    analyticsLabel?: string;

    /**
     * URL of an image to be displayed in the notification.
     */
    imageUrl?: string;
  }

  /**
   * Represents platform-independent options for features provided by the FCM SDKs.
   */
  interface FcmOptions {

    /**
     * The label associated with the message's analytics data.
     */
    analyticsLabel?: string;
  }


  /**
   * A notification that can be included in {@link admin.messaging.Message}.
   */
  interface Notification {
    /**
     * The title of the notification.
     */
    title?: string;
    /**
     * The notification body
     */
    body?: string;
    /**
     * URL of an image to be displayed in the notification.
     */
    imageUrl?: string;
  }
  /**
   * Represents the WebPush protocol options that can be included in an
   * {@link admin.messaging.Message}.
   */
  interface WebpushConfig {

    /**
     * A collection of WebPush headers. Header values must be strings.
     *
     * See [WebPush specification](https://tools.ietf.org/html/rfc8030#section-5)
     * for supported headers.
     */
    headers?: { [key: string]: string };

    /**
     * A collection of data fields.
     */
    data?: { [key: string]: string };

    /**
     * A WebPush notification payload to be included in the message.
     */
    notification?: WebpushNotification;

    /**
     * Options for features provided by the FCM SDK for Web.
     */
    fcmOptions?: WebpushFcmOptions;
  }

  /** Represents options for features provided by the FCM SDK for Web
   * (which are not part of the Webpush standard).
   */
  interface WebpushFcmOptions {

    /**
     * The link to open when the user clicks on the notification.
     * For all URL values, HTTPS is required.
     */
    link?: string;
  }

  /**
   * Represents the WebPush-specific notification options that can be included in
   * {@link admin.messaging.WebpushConfig}. This supports most of the standard
   * options as defined in the Web Notification
   * [specification](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification).
   */
  interface WebpushNotification {

    /**
     * Title text of the notification.
     */
    title?: string;

    /**
     * An array of notification actions representing the actions
     * available to the user when the notification is presented.
     */
    actions?: Array<{

      /**
       * An action available to the user when the notification is presented
       */
      action: string;

      /**
       * Optional icon for a notification action.
       */
      icon?: string;

      /**
       * Title of the notification action.
       */
      title: string;
    }>;

    /**
     * URL of the image used to represent the notification when there is
     * not enough space to display the notification itself.
     */
    badge?: string;

    /**
     * Body text of the notification.
     */
    body?: string;

    /**
     * Arbitrary data that you want associated with the notification.
     * This can be of any data type.
     */
    data?: any;

    /**
     * The direction in which to display the notification. Must be one
     * of `auto`, `ltr` or `rtl`.
     */
    dir?: 'auto' | 'ltr' | 'rtl';

    /**
     * URL to the notification icon.
     */
    icon?: string;

    /**
     * URL of an image to be displayed in the notification.
     */
    image?: string;

    /**
     * The notification's language as a BCP 47 language tag.
     */
    lang?: string;

    /**
     * A boolean specifying whether the user should be notified after a
     * new notification replaces an old one. Defaults to false.
     */
    renotify?: boolean;

    /**
     * Indicates that a notification should remain active until the user
     * clicks or dismisses it, rather than closing automatically.
     * Defaults to false.
     */
    requireInteraction?: boolean;

    /**
     * A boolean specifying whether the notification should be silent.
     * Defaults to false.
     */
    silent?: boolean;

    /**
     * An identifying tag for the notification.
     */
    tag?: string;

    /**
     * Timestamp of the notification. Refer to
     * https://developer.mozilla.org/en-US/docs/Web/API/notification/timestamp
     * for details.
     */
    timestamp?: number;

    /**
     * A vibration pattern for the device's vibration hardware to emit
     * when the notification fires.
     */
    vibrate?: number | number[];
    [key: string]: any;
  }
  /**
   * Interface representing an FCM legacy API data message payload. Data
   * messages let developers send up to 4KB of custom key-value pairs. The
   * keys and values must both be strings. Keys can be any custom string,
   * except for the following reserved strings:
   *
   *   * `"from"`
   *   * Anything starting with `"google."`.
   *
   * See [Build send requests](/docs/cloud-messaging/send-message)
   * for code samples and detailed documentation.
   */
  interface DataMessagePayload {
    [key: string]: string;
  }

  /**
   * Interface representing an FCM legacy API notification message payload.
   * Notification messages let developers send up to 4KB of predefined
   * key-value pairs. Accepted keys are outlined below.
   *
   * See [Build send requests](/docs/cloud-messaging/send-message)
   * for code samples and detailed documentation.
   */
  interface NotificationMessagePayload {
    tag?: string;

    /**
     * The notification's body text.
     *
     * **Platforms:** iOS, Android, Web
     */
    body?: string;

    /**
     * The notification's icon.
     *
     * **Android:** Sets the notification icon to `myicon` for drawable resource
     * `myicon`. If you don't send this key in the request, FCM displays the
     * launcher icon specified in your app manifest.
     *
     * **Web:** The URL to use for the notification's icon.
     *
     * **Platforms:** Android, Web
     */
    icon?: string;

    /**
     * The value of the badge on the home screen app icon.
     *
     * If not specified, the badge is not changed.
     *
     * If set to `0`, the badge is removed.
     *
     * **Platforms:** iOS
     */
    badge?: string;

    /**
     * The notification icon's color, expressed in `#rrggbb` format.
     *
     * **Platforms:** Android
     */
    color?: string;

    /**
     * Identifier used to replace existing notifications in the notification drawer.
     *
     * If not specified, each request creates a new notification.
     *
     * If specified and a notification with the same tag is already being shown,
     * the new notification replaces the existing one in the notification drawer.
     *
     * **Platforms:** Android
     */
    sound?: string;

    /**
     * The notification's title.
     *
     * **Platforms:** iOS, Android, Web
     */
    title?: string;

    /**
     * The key to the body string in the app's string resources to use to localize
     * the body text to the user's current localization.
     *
     * **iOS:** Corresponds to `loc-key` in the APNs payload. See
     * [Payload Key Reference](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html)
     * and
     * [Localizing the Content of Your Remote Notifications](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html#//apple_ref/doc/uid/TP40008194-CH10-SW9)
     * for more information.
     *
     * **Android:** See
     * [String Resources](http://developer.android.com/guide/topics/resources/string-resource.html)      * for more information.
     *
     * **Platforms:** iOS, Android
     */
    bodyLocKey?: string;

    /**
     * Variable string values to be used in place of the format specifiers in
     * `body_loc_key` to use to localize the body text to the user's current
     * localization.
     *
     * The value should be a stringified JSON array.
     *
     * **iOS:** Corresponds to `loc-args` in the APNs payload. See
     * [Payload Key Reference](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html)
     * and
     * [Localizing the Content of Your Remote Notifications](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html#//apple_ref/doc/uid/TP40008194-CH10-SW9)
     * for more information.
     *
     * **Android:** See
     * [Formatting and Styling](http://developer.android.com/guide/topics/resources/string-resource.html#FormattingAndStyling)
     * for more information.
     *
     * **Platforms:** iOS, Android
     */
    bodyLocArgs?: string;

    /**
     * Action associated with a user click on the notification. If specified, an
     * activity with a matching Intent Filter is launched when a user clicks on the
     * notification.
     *
     *   * **Platforms:** Android
     */
    clickAction?: string;

    /**
     * The key to the title string in the app's string resources to use to localize
     * the title text to the user's current localization.
     *
     * **iOS:** Corresponds to `title-loc-key` in the APNs payload. See
     * [Payload Key Reference](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html)
     * and
     * [Localizing the Content of Your Remote Notifications](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html#//apple_ref/doc/uid/TP40008194-CH10-SW9)
     * for more information.
     *
     * **Android:** See
     * [String Resources](http://developer.android.com/guide/topics/resources/string-resource.html)
     * for more information.
     *
     * **Platforms:** iOS, Android
     */
    titleLocKey?: string;

    /**
     * Variable string values to be used in place of the format specifiers in
     * `title_loc_key` to use to localize the title text to the user's current
     * localization.
     *
     * The value should be a stringified JSON array.
     *
     * **iOS:** Corresponds to `title-loc-args` in the APNs payload. See
     * [Payload Key Reference](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html)
     * and
     * [Localizing the Content of Your Remote Notifications](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html#//apple_ref/doc/uid/TP40008194-CH10-SW9)
     * for more information.
     *
     * **Android:** See
     * [Formatting and Styling](http://developer.android.com/guide/topics/resources/string-resource.html#FormattingAndStyling)
     * for more information.
     *
     * **Platforms:** iOS, Android
     */
    titleLocArgs?: string;
    [key: string]: string | undefined;
  }

  /**
   * Interface representing a Firebase Cloud Messaging message payload. One or
   * both of the `data` and `notification` keys are required.
   *
   * See
   * [Build send requests](/docs/cloud-messaging/send-message)
   * for code samples and detailed documentation.
   */
  interface MessagingPayload {

    /**
     * The data message payload.
     */
    data?: admin.messaging.DataMessagePayload;

    /**
     * The notification message payload.
     */
    notification?: admin.messaging.NotificationMessagePayload;
  }
  /**
   * Interface representing the options that can be provided when sending a
   * message via the FCM legacy APIs.
   *
   * See [Build send requests](/docs/cloud-messaging/send-message)
   * for code samples and detailed documentation.
   */
  interface MessagingOptions {

    /**
     * Whether or not the message should actually be sent. When set to `true`,
     * allows developers to test a request without actually sending a message. When
     * set to `false`, the message will be sent.
     *
     * **Default value:** `false`
     */
    dryRun?: boolean;

    /**
     * The priority of the message. Valid values are `"normal"` and `"high".` On
     * iOS, these correspond to APNs priorities `5` and `10`.
     *
     * By default, notification messages are sent with high priority, and data
     * messages are sent with normal priority. Normal priority optimizes the client
     * app's battery consumption and should be used unless immediate delivery is
     * required. For messages with normal priority, the app may receive the message
     * with unspecified delay.
     *
     * When a message is sent with high priority, it is sent immediately, and the
     * app can wake a sleeping device and open a network connection to your server.
     *
     * For more information, see
     * [Setting the priority of a message](/docs/cloud-messaging/concept-options#setting-the-priority-of-a-message).
     *
     * **Default value:** `"high"` for notification messages, `"normal"` for data
     * messages
     */
    priority?: string;

    /**
     * How long (in seconds) the message should be kept in FCM storage if the device
     * is offline. The maximum time to live supported is four weeks, and the default
     * value is also four weeks. For more information, see
     * [Setting the lifespan of a message](/docs/cloud-messaging/concept-options#ttl).
     *
     * **Default value:** `2419200` (representing four weeks, in seconds)
     */
    timeToLive?: number;

    /**
     * String identifying a group of messages (for example, "Updates Available")
     * that can be collapsed, so that only the last message gets sent when delivery
     * can be resumed. This is used to avoid sending too many of the same messages
     * when the device comes back online or becomes active.
     *
     * There is no guarantee of the order in which messages get sent.
     *
     * A maximum of four different collapse keys is allowed at any given time. This
     * means FCM server can simultaneously store four different
     * send-to-sync messages per client app. If you exceed this number, there is no
     * guarantee which four collapse keys the FCM server will keep.
     *
     * **Default value:** None
     */
    collapseKey?: string;

    /**
     * On iOS, use this field to represent `mutable-content` in the APNs payload.
     * When a notification is sent and this is set to `true`, the content of the
     * notification can be modified before it is displayed, using a
     * [Notification Service app extension](https://developer.apple.com/reference/usernotifications/unnotificationserviceextension)
     *
     * On Android and Web, this parameter will be ignored.
     *
     * **Default value:** `false`
     */
    mutableContent?: boolean;

    /**
     * On iOS, use this field to represent `content-available` in the APNs payload.
     * When a notification or data message is sent and this is set to `true`, an
     * inactive client app is awoken. On Android, data messages wake the app by
     * default. On Chrome, this flag is currently not supported.
     *
     * **Default value:** `false`
     */
    contentAvailable?: boolean;

    /**
     * The package name of the application which the registration tokens must match
     * in order to receive the message.
     *
     * **Default value:** None
     */
    restrictedPackageName?: string;
    [key: string]: any | undefined;
  }

  /**
   * Interface representing the status of a message sent to an individual device
   * via the FCM legacy APIs.
   *
   * See
   * [Send to individual devices](/docs/cloud-messaging/admin/send-messages#send_to_individual_devices)
   * for code samples and detailed documentation.
   */
  interface MessagingDeviceResult {

    /**
     * The error that occurred when processing the message for the recipient.
     */
    error?: admin.FirebaseError;

    /**
     * A unique ID for the successfully processed message.
     */
    messageId?: string;

    /**
     * The canonical registration token for the client app that the message was
     * processed and sent to. You should use this value as the registration token
     * for future requests. Otherwise, future messages might be rejected.
     */
    canonicalRegistrationToken?: string;
  }

  /**
   * Interface representing the server response from the legacy
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToDevice `sendToDevice()`} method.
   *
   * See
   * [Send to individual devices](/docs/cloud-messaging/admin/send-messages#send_to_individual_devices)
   * for code samples and detailed documentation.
   */
  interface MessagingDevicesResponse {

    /**
     * The number of results that contain a canonical registration token. A
     * canonical registration token is the registration token corresponding to the
     * last registration requested by the client app. This is the token that you
     * should use when sending future messages to the device.
     *
     * You can access the canonical registration tokens within the
     * [`results`](#results) property.
     */
    canonicalRegistrationTokenCount: number;

    /**
     * The number of messages that could not be processed and resulted in an error.
     */
    failureCount: number;

    /**
     * The unique ID number identifying this multicast message.
     */
    multicastId: number;

    /**
     * An array of `MessagingDeviceResult` objects representing the status of the
     * processed messages. The objects are listed in the same order as in the
     * request. That is, for each registration token in the request, its result has
     * the same index in this array. If only a single registration token is
     * provided, this array will contain a single object.
     */
    results: admin.messaging.MessagingDeviceResult[];

    /**
     * The number of messages that were successfully processed and sent.
     */
    successCount: number;
  }
  /**
   * Interface representing the server response from the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToDeviceGroup `sendToDeviceGroup()`}
   * method.
   *
   * See
   * [Send messages to device groups](/docs/cloud-messaging/send-message?authuser=0#send_messages_to_device_groups)
   * for code samples and detailed documentation.
   */
  interface MessagingDeviceGroupResponse {

    /**
     * The number of messages that could not be processed and resulted in an error.
     */
    successCount: number;

    /**
     * The number of messages that could not be processed and resulted in an error.
     */
    failureCount: number;

    /**
    * An array of registration tokens that failed to receive the message.
    */
    failedRegistrationTokens: string[];
  }

  /**
   * Interface representing the server response from the legacy
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToTopic `sendToTopic()`} method.
   *
   * See
   * [Send to a topic](/docs/cloud-messaging/admin/send-messages#send_to_a_topic)
   * for code samples and detailed documentation.
   */
  interface MessagingTopicResponse {

    /**
     * The message ID for a successfully received request which FCM will attempt to
     * deliver to all subscribed devices.
     */
    messageId: number;
  }

  /**
   * Interface representing the server response from the legacy
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToCondition `sendToCondition()`} method.
   *
   * See
   * [Send to a condition](/docs/cloud-messaging/admin/send-messages#send_to_a_condition)
   * for code samples and detailed documentation.
   */
  interface MessagingConditionResponse {

    /**
     * The message ID for a successfully received request which FCM will attempt to
     * deliver to all subscribed devices.
     */
    messageId: number;
  }

  /**
   * Interface representing the server response from the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#subscribeToTopic `subscribeToTopic()`} and
   * {@link
   *   admin.messaging.Messaging#unsubscribeFromTopic
   *   `unsubscribeFromTopic()`}
   * methods.
   *
   * See
   * [Manage topics from the server](/docs/cloud-messaging/manage-topics)
   * for code samples and detailed documentation.
   */
  interface MessagingTopicManagementResponse {

    /**
     * The number of registration tokens that could not be subscribed to the topic
     * and resulted in an error.
     */
    failureCount: number;

    /**
     * The number of registration tokens that were successfully subscribed to the
     * topic.
     */
    successCount: number;

    /**
     * An array of errors corresponding to the provided registration token(s). The
     * length of this array will be equal to [`failureCount`](#failureCount).
     */
    errors: admin.FirebaseArrayIndexError[];
  }

  /**
   * Interface representing the server response from the
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendAll `sendAll()`} and
   * {@link https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendMulticast `sendMulticast()`} methods.
   */
  interface BatchResponse {

    /**
     * An array of responses, each corresponding to a message.
     */
    responses: admin.messaging.SendResponse[];

    /**
     * The number of messages that were successfully handed off for sending.
     */
    successCount: number;

    /**
     * The number of messages that resulted in errors when sending.
     */
    failureCount: number;
  }
  /**
   * Interface representing the status of an individual message that was sent as
   * part of a batch request.
   */
  interface SendResponse {

    /**
     * A boolean indicating if the message was successfully handed off to FCM or
     * not. When true, the `messageId` attribute is guaranteed to be set. When
     * false, the `error` attribute is guaranteed to be set.
     */
    success: boolean;

    /**
     * A unique message ID string, if the message was handed off to FCM for
     * delivery.
     *
     */
    messageId?: string;

    /**
     * An error, if the message was not handed off to FCM successfully.
     */
    error?: admin.FirebaseError;
  }

  /**
   * Gets the {@link admin.messaging.Messaging `Messaging`} service for the
   * current app.
   *
   * @example
   * ```javascript
   * var messaging = app.messaging();
   * // The above is shorthand for:
   * // var messaging = admin.messaging(app);
   * ```
   *
   * @return The `Messaging` service for the current app.
   */
  interface Messaging {
    /**
     * The {@link admin.app.App app} associated with the current `Messaging` service
     * instance.
     *
     * @example
     * ```javascript
     * var app = messaging.app;
     * ```
     */
    app: admin.app.App;

    /**
     * Sends the given message via FCM.
     *
     * @param message The message payload.
     * @param dryRun Whether to send the message in the dry-run
     *   (validation only) mode.
     * @return A promise fulfilled with a unique message ID
     *   string after the message has been successfully handed off to the FCM
     *   service for delivery.
     */
    send(message: admin.messaging.Message, dryRun?: boolean): Promise<string>;

    /**
     * Sends all the messages in the given array via Firebase Cloud Messaging.
     * Employs batching to send the entire list as a single RPC call. Compared
     * to the `send()` method, this method is a significantly more efficient way
     * to send multiple messages.
     *
     * The responses list obtained from the return value
     * corresponds to the order of tokens in the `MulticastMessage`. An error
     * from this method indicates a total failure -- i.e. none of the messages in
     * the list could be sent. Partial failures are indicated by a `BatchResponse`
     * return value.
     *
     * @param messages A non-empty array
     *   containing up to 500 messages.
     * @param dryRun Whether to send the messages in the dry-run
     *   (validation only) mode.
     * @return A Promise fulfilled with an object representing the result of the
     *   send operation.
     */
    sendAll(
      messages: Array<admin.messaging.Message>,
      dryRun?: boolean
    ): Promise<admin.messaging.BatchResponse>;

    /**
     * Sends the given multicast message to all the FCM registration tokens
     * specified in it.
     *
     * This method uses the `sendAll()` API under the hood to send the given
     * message to all the target recipients. The responses list obtained from the
     * return value corresponds to the order of tokens in the `MulticastMessage`.
     * An error from this method indicates a total failure -- i.e. the message was
     * not sent to any of the tokens in the list. Partial failures are indicated by
     * a `BatchResponse` return value.
     *
     * @param message A multicast message
     *   containing up to 500 tokens.
     * @param dryRun Whether to send the message in the dry-run
     *   (validation only) mode.
     * @return A Promise fulfilled with an object representing the result of the
     *   send operation.
     */
    sendMulticast(
      message: admin.messaging.MulticastMessage,
      dryRun?: boolean
    ): Promise<admin.messaging.BatchResponse>;

    /**
     * Sends an FCM message to a single device corresponding to the provided
     * registration token.
     *
     * See
     * [Send to individual devices](/docs/cloud-messaging/admin/legacy-fcm#send_to_individual_devices)
     * for code samples and detailed documentation. Takes either a
     * `registrationToken` to send to a single device or a
     * `registrationTokens` parameter containing an array of tokens to send
     * to multiple devices.
     *
     * @param registrationToken A device registration token or an array of
     *   device registration tokens to which the message should be sent.
     * @param payload The message payload.
     * @param options Optional options to
     *   alter the message.
     *
     * @return A promise fulfilled with the server's response after the message
     *   has been sent.
     */
    sendToDevice(
      registrationToken: string | string[],
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingDevicesResponse>;

    /**
     * Sends an FCM message to a device group corresponding to the provided
     * notification key.
     *
     * See
     * [Send to a device group](/docs/cloud-messaging/admin/legacy-fcm#send_to_a_device_group)
     * for code samples and detailed documentation.
     *
     * @param notificationKey The notification key for the device group to
     *   which to send the message.
     * @param payload The message payload.
     * @param options Optional options to
     *   alter the message.
     *
     * @return A promise fulfilled with the server's response after the message
     *   has been sent.
     */
    sendToDeviceGroup(
      notificationKey: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingDeviceGroupResponse>;

    /**
     * Sends an FCM message to a topic.
     *
     * See
     * [Send to a topic](/docs/cloud-messaging/admin/legacy-fcm#send_to_a_topic)
     * for code samples and detailed documentation.
     *
     * @param topic The topic to which to send the message.
     * @param payload The message payload.
     * @param options Optional options to
     *   alter the message.
     *
     * @return A promise fulfilled with the server's response after the message
     *   has been sent.
     */
    sendToTopic(
      topic: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingTopicResponse>;

    /**
     * Sends an FCM message to a condition.
     *
     * See
     * [Send to a condition](/docs/cloud-messaging/admin/legacy-fcm#send_to_a_condition)
     * for code samples and detailed documentation.
     *
     * @param condition The condition determining to which topics to send
     *   the message.
     * @param payload The message payload.
     * @param options Optional options to
     *   alter the message.
     *
     * @return A promise fulfilled with the server's response after the message
     *   has been sent.
     */
    sendToCondition(
      condition: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingConditionResponse>;

    /**
     * Subscribes a device to an FCM topic.
     *
     * See [Subscribe to a
     * topic](/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the)
     * for code samples and detailed documentation. Optionally, you can provide an
     * array of tokens to subscribe multiple devices.
     *
     * @param registrationTokens A token or array of registration tokens
     *   for the devices to subscribe to the topic.
     * @param topic The topic to which to subscribe.
     *
     * @return A promise fulfilled with the server's response after the device has been
     *   subscribed to the topic.
     */
    subscribeToTopic(
      registrationTokens: string | string[],
      topic: string
    ): Promise<admin.messaging.MessagingTopicManagementResponse>;

    /**
     * Unsubscribes a device from an FCM topic.
     *
     * See [Unsubscribe from a
     * topic](/docs/cloud-messaging/admin/manage-topic-subscriptions#unsubscribe_from_a_topic)
     * for code samples and detailed documentation.  Optionally, you can provide an
     * array of tokens to unsubscribe multiple devices.
     *
     * @param registrationTokens A device registration token or an array of
     *   device registration tokens to unsubscribe from the topic.
     * @param topic The topic from which to unsubscribe.
     *
     * @return A promise fulfilled with the server's response after the device has been
     *   unsubscribed from the topic.
     */
    unsubscribeFromTopic(
      registrationTokens: string | string[],
      topic: string
    ): Promise<admin.messaging.MessagingTopicManagementResponse>;
  }
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
  /**
   * Gets the {@link admin.instanceId.InstanceId `InstanceId`} service for the
   * current app.
   *
   * @example
   * ```javascript
   * var instanceId = app.instanceId();
   * // The above is shorthand for:
   * // var instanceId = admin.instanceId(app);
   * ```
   *
   * @return The `InstanceId` service for the
   *   current app.
   */
  interface InstanceId {
    app: admin.app.App;

    /**
     * Deletes the specified instance ID and the associated data from Firebase.
     *
     * Note that Google Analytics for Firebase uses its own form of Instance ID to
     * keep track of analytics data. Therefore deleting a Firebase Instance ID does
     * not delete Analytics data. See
     * [Delete an Instance ID](/support/privacy/manage-iids#delete_an_instance_id)
     * for more information.
     *
     * @param instanceId The instance ID to be deleted.
     *
     * @return A promise fulfilled when the instance ID is deleted.
     */
    deleteInstanceId(instanceId: string): Promise<void>;
  }
}

declare namespace admin.projectManagement {

  /**
   * A SHA-1 or SHA-256 certificate.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.shaCertificate()`](admin.projectManagement.ProjectManagement#shaCertificate).
   */
  interface ShaCertificate {

    /**
     * The SHA certificate type.
     *
     * @example
     * ```javascript
     * var certType = shaCertificate.certType;
     * ```
     */
    certType: ('sha1' | 'sha256');

    /**
     * The SHA-1 or SHA-256 hash for this certificate.
     *
     * @example
     * ```javascript
     * var shaHash = shaCertificate.shaHash;
     * ```
     */
    shaHash: string;

    /**
     * The fully-qualified resource name that identifies this sha-key.
     *
     * This is useful when manually constructing requests for Firebase's public API.
     *
     * @example
     * ```javascript
     * var resourceName = shaCertificate.resourceName;
     * ```
     */
    resourceName?: string;
  }

  /**
   * Metadata about a Firebase app.
   */
  interface AppMetadata {

    /**
     * The globally unique, Firebase-assigned identifier of the app.
     *
     * @example
     * ```javascript
     * var appId = appMetadata.appId;
     * ```
     */
    appId: string;

    /**
     * The optional user-assigned display name of the app.
     *
     * @example
     * ```javascript
     * var displayName = appMetadata.displayName;
     * ```
     */
    displayName?: string;

    /**
     * The development platform of the app. Supporting Android and iOS app platforms.
     *
     * @example
     * ```javascript
     * var platform = AppPlatform.ANDROID;
     * ```
     */
    platform: AppPlatform;

    /**
     * The globally unique, user-assigned ID of the parent project for the app.
     *
     * @example
     * ```javascript
     * var projectId = appMetadata.projectId;
     * ```
     */
    projectId: string;

    /**
     * The fully-qualified resource name that identifies this app.
     *
     * This is useful when manually constructing requests for Firebase's public API.
     *
     * @example
     * ```javascript
     * var resourceName = androidAppMetadata.resourceName;
     * ```
     */
    resourceName: string;
  }

  /**
   * Platforms with which a Firebase App can be associated.
   */
  enum AppPlatform {

    /**
     * Unknown state. This is only used for distinguishing unset values.
     */
    PLATFORM_UNKNOWN = 'PLATFORM_UNKNOWN',

    /**
     * The Firebase App is associated with iOS.
     */
    IOS = 'IOS',

    /**
     * The Firebase App is associated with Android.
     */
    ANDROID = 'ANDROID',
  }

  /**
   * Metadata about a Firebase Android App.
   */
  interface AndroidAppMetadata extends AppMetadata {

    platform: AppPlatform.ANDROID;

    /**
     * The canonical package name of the Android App, as would appear in the Google Play Developer
     * Console.
     *
     * @example
     * ```javascript
     * var packageName = androidAppMetadata.packageName;
     * ```
     */
    packageName: string;
  }

  /**
   * Metadata about a Firebase iOS App.
   */
  interface IosAppMetadata extends AppMetadata {
    platform: AppPlatform.IOS;

    /**
     * The canonical bundle ID of the iOS App as it would appear in the iOS App Store.
     *
     * @example
     * ```javascript
     * var bundleId = iosAppMetadata.bundleId;
     *```
     */
    bundleId: string;
  }

  /**
   * A reference to a Firebase Android app.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.androidApp()`](admin.projectManagement.ProjectManagement#androidApp).
   */
  interface AndroidApp {
    appId: string;

    /**
     * Retrieves metadata about this Android app.
     *
     * @return A promise that resolves to the retrieved metadata about this Android app.
     */
    getMetadata(): Promise<admin.projectManagement.AndroidAppMetadata>;

    /**
     * Sets the optional user-assigned display name of the app.
     *
     * @param newDisplayName The new display name to set.
     *
     * @return A promise that resolves when the display name has been set.
     */
    setDisplayName(newDisplayName: string): Promise<void>;

    /**
     * Gets the list of SHA certificates associated with this Android app in Firebase.
     *
     * @return The list of SHA-1 and SHA-256 certificates associated with this Android app in
     *     Firebase.
     */
    getShaCertificates(): Promise<admin.projectManagement.ShaCertificate[]>;

    /**
     * Adds the given SHA certificate to this Android app.
     *
     * @param certificateToAdd The SHA certificate to add.
     *
     * @return A promise that resolves when the given certificate
     *     has been added to the Android app.
     */
    addShaCertificate(certificateToAdd: ShaCertificate): Promise<void>;

    /**
     * Deletes the specified SHA certificate from this Android app.
     *
     * @param  certificateToDelete The SHA certificate to delete.
     *
     * @return A promise that resolves when the specified
     *     certificate has been removed from the Android app.
     */
    deleteShaCertificate(certificateToRemove: ShaCertificate): Promise<void>;

    /**
     * Gets the configuration artifact associated with this app.
     *
     * @return A promise that resolves to the Android app's
     *     Firebase config file, in UTF-8 string format. This string is typically
     *     intended to be written to a JSON file that gets shipped with your Android
     *     app.
     */
    getConfig(): Promise<string>;
  }

  /**
   * A reference to a Firebase iOS app.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.iosApp()`](admin.projectManagement.ProjectManagement#iosApp).
   */
  interface IosApp {
    appId: string;

    /**
     * Retrieves metadata about this iOS app.
     *
     * @return {!Promise<admin.projectManagement.IosAppMetadata>} A promise that
     *     resolves to the retrieved metadata about this iOS app.
     */
    getMetadata(): Promise<admin.projectManagement.IosAppMetadata>;

    /**
     * Sets the optional user-assigned display name of the app.
     *
     * @param newDisplayName The new display name to set.
     *
     * @return A promise that resolves when the display name has
     *     been set.
     */
    setDisplayName(newDisplayName: string): Promise<void>;

    /**
     * Gets the configuration artifact associated with this app.
     *
     * @return A promise that resolves to the iOS app's Firebase
     *     config file, in UTF-8 string format. This string is typically intended to
     *     be written to a plist file that gets shipped with your iOS app.
     */
    getConfig(): Promise<string>;
  }

  /**
   * The Firebase ProjectManagement service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.projectManagement()`](admin.projectManagement#projectManagement).
   */
  interface ProjectManagement {
    app: admin.app.App;

    /**
     * Lists up to 100 Firebase apps associated with this Firebase project.
     *
     * @return A promise that resolves to the metadata list of the apps.
     */
    listAppMetadata(): Promise<admin.projectManagement.AppMetadata[]>;

    /**
     * Lists up to 100 Firebase Android apps associated with this Firebase project.
     *
     * @return The list of Android apps.
     */
    listAndroidApps(): Promise<admin.projectManagement.AndroidApp[]>;

    /**
     * Lists up to 100 Firebase iOS apps associated with this Firebase project.
     *
     * @return The list of iOS apps.
     */
    listIosApps(): Promise<admin.projectManagement.IosApp[]>;

    /**
     * Creates an `AndroidApp` object, referencing the specified Android app within
     * this Firebase project.
     *
     * This method does not perform an RPC.
     *
     * @param appId The `appId` of the Android app to reference.
     *
     * @return An `AndroidApp` object that references the specified Firebase Android app.
     */
    androidApp(appId: string): admin.projectManagement.AndroidApp;

    /**
     * Update the display name of this Firebase project.
     *
     * @param newDisplayName The new display name to be updated.
     *
     * @return A promise that resolves when the project display name has been updated.
     */
    setDisplayName(newDisplayName: string): Promise<void>;

    /**
     * Creates an `iOSApp` object, referencing the specified iOS app within
     * this Firebase project.
     *
     * This method does not perform an RPC.
     *
     * @param appId The `appId` of the iOS app to reference.
     *
     * @return An `iOSApp` object that references the specified Firebase iOS app.
     */
    iosApp(appId: string): admin.projectManagement.IosApp;

    /**
     * Creates a `ShaCertificate` object.
     *
     * This method does not perform an RPC.
     *
     * @param shaHash The SHA-1 or SHA-256 hash for this certificate.
     *
     * @return A `ShaCertificate` object contains the specified SHA hash.
     */
    shaCertificate(shaHash: string): admin.projectManagement.ShaCertificate;

    /**
     * Creates a new Firebase Android app associated with this Firebase project.
     *
     * @param packageName The canonical package name of the Android App,
     *     as would appear in the Google Play Developer Console.
     * @param displayName An optional user-assigned display name for this
     *     new app.
     *
     * @return A promise that resolves to the newly created Android app.
     */
    createAndroidApp(
      packageName: string, displayName?: string): Promise<admin.projectManagement.AndroidApp>;

    /**
     * Creates a new Firebase iOS app associated with this Firebase project.
     *
     * @param bundleId The iOS app bundle ID to use for this new app.
     * @param displayName An optional user-assigned display name for this
     *     new app.
     *
     * @return A promise that resolves to the newly created iOS app.
     */
    createIosApp(bundleId: string, displayName?: string): Promise<admin.projectManagement.IosApp>;
  }
}

declare namespace admin.securityRules {
  /**
   * A source file containing some Firebase security rules. The content includes raw
   * source code including text formatting, indentation and comments. Use the
   * [`securityRules.createRulesFileFromSource()`](admin.securityRules.SecurityRules#createRulesFileFromSource)
   * method to create new instances of this type.
   */
  interface RulesFile {
    readonly name: string;
    readonly content: string;
  }

  /**
   * Required metadata associated with a ruleset.
   */
  interface RulesetMetadata {
    /**
     * Name of the `Ruleset` as a short string. This can be directly passed into APIs
     * like [`securityRules.getRuleset()`](admin.securityRules.SecurityRules#getRuleset)
     * and [`securityRules.deleteRuleset()`](admin.securityRules.SecurityRules#deleteRuleset).
     */
    readonly name: string;

    /**
     * Creation time of the `Ruleset` as a UTC timestamp string.
     */
    readonly createTime: string;
  }

  /**
   * A set of Firebase security rules.
   */
  interface Ruleset extends RulesetMetadata {
    readonly source: RulesFile[];
  }

  interface RulesetMetadataList {
    /**
     * A batch of ruleset metadata.
     */
    readonly rulesets: RulesetMetadata[];

    /**
     * The next page token if available. This is needed to retrieve the next batch.
     */
    readonly nextPageToken?: string;
  }

  /**
   * The Firebase `SecurityRules` service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.securityRules()`](admin.securityRules#securityRules).
   */
  interface SecurityRules {
    app: admin.app.App;

    /**
     * Creates a {@link admin.securityRules.RulesFile `RuleFile`} with the given name
     * and source. Throws an error if any of the arguments are invalid. This is a local
     * operation, and does not involve any network API calls.
     *
     * @example
     * ```javascript
     * const source = '// Some rules source';
     * const rulesFile = admin.securityRules().createRulesFileFromSource(
     *   'firestore.rules', source);
     * ```
     *
     * @param name Name to assign to the rules file. This is usually a short file name that
     *   helps identify the file in a ruleset.
     * @param source Contents of the rules file.
     * @return A new rules file instance.
     */
    createRulesFileFromSource(name: string, source: string | Buffer): RulesFile;

    /**
     * Creates a new {@link admin.securityRules.Ruleset `Ruleset`} from the given
     * {@link admin.securityRules.RulesFile `RuleFile`}.
     *
     * @param file Rules file to include in the new `Ruleset`.
     * @returns A promise that fulfills with the newly created `Ruleset`.
     */
    createRuleset(file: RulesFile): Promise<Ruleset>;

    /**
     * Gets the {@link admin.securityRules.Ruleset `Ruleset`} identified by the given
     * name. The input name should be the short name string without the project ID
     * prefix. For example, to retrieve the `projects/project-id/rulesets/my-ruleset`,
     * pass the short name "my-ruleset". Rejects with a `not-found` error if the
     * specified `Ruleset` cannot be found.
     *
     * @param name Name of the `Ruleset` to retrieve.
     * @return A promise that fulfills with the specified `Ruleset`.
     */
    getRuleset(name: string): Promise<Ruleset>;

    /**
     * Deletes the {@link admin.securityRules.Ruleset `Ruleset`} identified by the given
     * name. The input name should be the short name string without the project ID
     * prefix. For example, to delete the `projects/project-id/rulesets/my-ruleset`,
     * pass the  short name "my-ruleset". Rejects with a `not-found` error if the
     * specified `Ruleset` cannot be found.
     *
     * @param name Name of the `Ruleset` to delete.
     * @return A promise that fulfills when the `Ruleset` is deleted.
     */
    deleteRuleset(name: string): Promise<void>;

    /**
     * Retrieves a page of ruleset metadata.
     *
     * @param pageSize The page size, 100 if undefined. This is also the maximum allowed
     *   limit.
     * @param nextPageToken The next page token. If not specified, returns rulesets
     *   starting without any offset.
     * @return A promise that fulfills with a page of rulesets.
     */
    listRulesetMetadata(
      pageSize?: number, nextPageToken?: string): Promise<RulesetMetadataList>;

    /**
     * Gets the {@link admin.securityRules.Ruleset `Ruleset`} currently applied to
     * Cloud Firestore. Rejects with a `not-found` error if no ruleset is applied
     * on Firestore.
     *
     * @return A promise that fulfills with the Firestore ruleset.
     */
    getFirestoreRuleset(): Promise<Ruleset>;

    /**
     * Creates a new {@link admin.securityRules.Ruleset `Ruleset`} from the given
     * source, and applies it to Cloud Firestore.
     *
     * @param source Rules source to apply.
     * @return A promise that fulfills when the ruleset is created and released.
     */
    releaseFirestoreRulesetFromSource(source: string | Buffer): Promise<Ruleset>;

    /**
     * Applies the specified {@link admin.securityRules.Ruleset `Ruleset`} ruleset
     * to Cloud Firestore.
     *
     * @param ruleset Name of the ruleset to apply or a `RulesetMetadata` object
     *   containing the name.
     * @return A promise that fulfills when the ruleset is released.
     */
    releaseFirestoreRuleset(ruleset: string | RulesetMetadata): Promise<void>;

    /**
     * Gets the {@link admin.securityRules.Ruleset `Ruleset`} currently applied to a
     * Cloud Storage bucket. Rejects with a `not-found` error if no ruleset is applied
     * on the bucket.
     *
     * @param bucket Optional name of the Cloud Storage bucket to be retrieved. If not
     *   specified, retrieves the ruleset applied on the default bucket configured via
     *   `AppOptions`.
     * @return A promise that fulfills with the Cloud Storage ruleset.
     */
    getStorageRuleset(bucket?: string): Promise<Ruleset>;

    /**
     * Creates a new {@link admin.securityRules.Ruleset `Ruleset`} from the given
     * source, and applies it to a Cloud Storage bucket.
     *
     * @param source Rules source to apply.
     * @param bucket Optional name of the Cloud Storage bucket to apply the rules on. If
     *   not specified, applies the ruleset on the default bucket configured via
     *   {@link admin.AppOptions `AppOptions`}.
     * @return A promise that fulfills when the ruleset is created and released.
     */
    releaseStorageRulesetFromSource(
      source: string | Buffer, bucket?: string): Promise<Ruleset>;

    /**
     * Applies the specified {@link admin.securityRules.Ruleset `Ruleset`} ruleset
     * to a Cloud Storage bucket.
     *
     * @param ruleset Name of the ruleset to apply or a `RulesetMetadata` object
     *   containing the name.
     * @param bucket Optional name of the Cloud Storage bucket to apply the rules on. If
     *   not specified, applies the ruleset on the default bucket configured via
     *   {@link admin.AppOptions `AppOptions`}.
     * @return A promise that fulfills when the ruleset is released.
     */
    releaseStorageRuleset(
      ruleset: string | RulesetMetadata, bucket?: string): Promise<void>;
  }
}

declare module 'firebase-admin' {
}

export = admin;

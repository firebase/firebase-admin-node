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

import {Bucket} from '@google-cloud/storage';
import * as _firestore from '@google-cloud/firestore';
import {Agent} from 'http';

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
     * Returns a JSON-serializable representation of this object.
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
    databaseAuthVariableOverride?: Object;

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
     * The ID of the service account to be used for signing custom tokens. This
     * can be found in the `client_email` field of a service account JSON file.
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

  var SDK_VERSION: string;
  var apps: (admin.app.App|null)[];

  function app(name?: string): admin.app.App;
  function auth(app?: admin.app.App): admin.auth.Auth;
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
   * @param {!admin.app.App=} app Optional app whose `Messaging` service to
   *   return. If not provided, the default `Messaging` service will be returned.
   *
   * @return {!admin.messaging.Messaging} The default `Messaging` service if no
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
   * @param {!admin.app.App=} app Optional app whose `InstanceId` service to
   *   return. If not provided, the default `InstanceId` service will be
   *   returned.
   *
   * @return {!admin.instanceId.InstanceId} The default `InstanceId` service if
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
  * @param {!admin.app.App=} app Optional app whose `ProjectManagement` service
  *     to return. If not provided, the default `ProjectManagement` service will
  *     be returned. *
  * @return {!admin.projectManagement.ProjectManagement} The default
  *     `ProjectManagement` service if no app is provided or the
  *     `ProjectManagement` service associated with the provided app.
  */
  function projectManagement(app?: admin.app.App): admin.projectManagement.ProjectManagement;
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
  interface UserMetadata {
    lastSignInTime: string;
    creationTime: string;

    toJSON(): Object;
  }

  interface UserInfo {
    uid: string;
    displayName: string;
    email: string;
    phoneNumber: string;
    photoURL: string;
    providerId: string;

    toJSON(): Object;
  }

  interface UserRecord {
    uid: string;
    email?: string;
    emailVerified: boolean;
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    disabled: boolean;
    metadata: admin.auth.UserMetadata;
    providerData: admin.auth.UserInfo[];
    passwordHash?: string;
    passwordSalt?: string;
    customClaims?: Object;
    tokensValidAfterTime?: string;

    toJSON(): Object;
  }

  interface UpdateRequest {
    disabled?: boolean;
    displayName?: string | null;
    email?: string;
    emailVerified?: boolean;
    password?: string;
    phoneNumber?: string | null;
    photoURL?: string | null;
  }

  interface CreateRequest extends UpdateRequest {
    uid?: string;
  }

  interface DecodedIdToken {
    aud: string;
    auth_time: number;
    exp: number;
    firebase: {
      identities: {
        [key: string]: any;
      };
      sign_in_provider: string;
      [key: string]: any;
    };
    iat: number;
    iss: string;
    sub: string;
    uid: string;
    [key: string]: any;
  }

  interface ListUsersResult {
    users: admin.auth.UserRecord[];
    pageToken?: string;
  }

  type HashAlgorithmType = 'SCRYPT' | 'STANDARD_SCRYPT' | 'HMAC_SHA512' |
      'HMAC_SHA256' | 'HMAC_SHA1' | 'HMAC_MD5' | 'MD5' | 'PBKDF_SHA1' | 'BCRYPT' |
      'PBKDF2_SHA256' | 'SHA512' | 'SHA256' | 'SHA1';


  interface UserImportOptions {
    hash: {
      algorithm: HashAlgorithmType;
      key?: Buffer;
      saltSeparator?: string;
      rounds?: number;
      memoryCost?: number;
      parallelization?: number;
      blockSize?: number;
      derivedKeyLength?: number;
    };
  }

  interface UserImportResult {
    failureCount: number;
    successCount: number;
    errors: admin.FirebaseArrayIndexError[];
  }

  interface UserImportRecord {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    disabled?: boolean;
    metadata?: {
      lastSignInTime?: string;
      creationTime?: string;
    };
    providerData?: {
      uid: string,
      displayName?: string,
      email?: string,
      photoURL?: string,
      providerId: string,
    }[];
    customClaims?: Object;
    passwordHash?: Buffer;
    passwordSalt?: Buffer;
  }

  interface SessionCookieOptions {
    expiresIn: number;
  }

  interface ActionCodeSettings {
    url: string;
    handleCodeInApp?: boolean;
    iOS?: {
      bundleId: string;
    };
    android?: {
      packageName: string;
      installApp?: boolean;
      minimumVersion?: string;
    };
    dynamicLinkDomain?: string;
  }

  interface AuthProviderConfigFilter {
    type: 'saml' | 'oidc';
    maxResults?: number;
    pageToken?: string;
  }

  interface AuthProviderConfig {
    providerId: string;
    displayName: string;
    enabled: boolean;
  }

  interface SAMLAuthProviderConfig extends admin.auth.AuthProviderConfig {
    idpEntityId: string;
    ssoURL: string;
    x509Certificates: string[];
    rpEntityId: string;
    callbackURL?: string;
    enableRequestSigning?: boolean;
  }
  
  interface OIDCAuthProviderConfig extends admin.auth.AuthProviderConfig {
    clientId: string;
    issuer: string;
  }

  interface SAMLUpdateAuthProviderRequest {
    displayName?: string;
    enabled?: boolean;
    idpEntityId?: string;
    ssoURL?: string;
    x509Certificates?: string[];
    rpEntityId?: string;
    callbackURL?: string;
    enableRequestSigning?: boolean;
  }

  interface OIDCUpdateAuthProviderRequest {
    displayName?: string;
    enabled?: boolean;
    clientId?: string;
    issuer?: string;
  }

  interface ListProviderConfigResults {
    providerConfigs: admin.auth.AuthProviderConfig[];
    pageToken?: string;
  }

  type UpdateAuthProviderRequest =
      admin.auth.SAMLUpdateAuthProviderRequest | admin.auth.OIDCUpdateAuthProviderRequest;

  interface BaseAuth {
    createCustomToken(uid: string, developerClaims?: Object): Promise<string>;
    createUser(properties: admin.auth.CreateRequest): Promise<admin.auth.UserRecord>;
    deleteUser(uid: string): Promise<void>;
    getUser(uid: string): Promise<admin.auth.UserRecord>;
    getUserByEmail(email: string): Promise<admin.auth.UserRecord>;
    getUserByPhoneNumber(phoneNumber: string): Promise<admin.auth.UserRecord>;
    listUsers(maxResults?: number, pageToken?: string): Promise<admin.auth.ListUsersResult>;
    updateUser(uid: string, properties: admin.auth.UpdateRequest): Promise<admin.auth.UserRecord>;
    verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<admin.auth.DecodedIdToken>;
    setCustomUserClaims(uid: string, customUserClaims: Object): Promise<void>;
    revokeRefreshTokens(uid: string): Promise<void>;
    importUsers(
      users: admin.auth.UserImportRecord[],
      options?: admin.auth.UserImportOptions,
    ): Promise<admin.auth.UserImportResult>
    createSessionCookie(
      idToken: string,
      sessionCookieOptions: admin.auth.SessionCookieOptions,
    ): Promise<string>;
    verifySessionCookie(
      sessionCookie: string,
      checkForRevocation?: boolean,
    ): Promise<admin.auth.DecodedIdToken>;
    generatePasswordResetLink(
      email: string,
      actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string>;
    generateEmailVerificationLink(
      email: string,
      actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string>;
    generateSignInWithEmailLink(
      email: string,
      actionCodeSettings: admin.auth.ActionCodeSettings,
    ): Promise<string>;
    listProviderConfigs(
      options: admin.auth.AuthProviderConfigFilter
    ): Promise<admin.auth.ListProviderConfigResults>;
    getProviderConfig(providerId: string): Promise<admin.auth.AuthProviderConfig>
    deleteProviderConfig(providerId: string): Promise<void>;
    updateProviderConfig(
      providerId: string, updatedConfig: admin.auth.UpdateAuthProviderRequest
    ): Promise<admin.auth.AuthProviderConfig>;
    createProviderConfig(
      config: admin.auth.AuthProviderConfig
    ): Promise<admin.auth.AuthProviderConfig>;
  }

  interface Auth extends admin.auth.BaseAuth {
    app: admin.app.App;
  }
}

declare namespace admin.credential {
  interface Credential {
    getAccessToken(): Promise<admin.GoogleOAuthAccessToken>;
  }

  function applicationDefault(httpAgent?: Agent): admin.credential.Credential;
  function cert(serviceAccountPathOrObject: string|admin.ServiceAccount, httpAgent?: Agent): admin.credential.Credential;
  function refreshToken(refreshTokenPathOrObject: string|Object, httpAgent?: Agent): admin.credential.Credential;
}

declare namespace admin.database {
  interface Database {
    app: admin.app.App;

    goOffline(): void;
    goOnline(): void;
    ref(path?: string | admin.database.Reference): admin.database.Reference;
    refFromURL(url: string): admin.database.Reference;
  }

  interface DataSnapshot {
    key: string|null;
    ref: admin.database.Reference;

    child(path: string): admin.database.DataSnapshot;
    exists(): boolean;
    exportVal(): any;
    forEach(action: (a: admin.database.DataSnapshot) => boolean | void): boolean;
    getPriority(): string|number|null;
    hasChild(path: string): boolean;
    hasChildren(): boolean;
    numChildren(): number;
    toJSON(): Object | null;
    val(): any;
  }

  interface OnDisconnect {
    cancel(onComplete?: (a: Error|null) => any): Promise<void>;
    remove(onComplete?: (a: Error|null) => any): Promise<void>;
    set(value: any, onComplete?: (a: Error|null) => any): Promise<void>;
    setWithPriority(
      value: any,
      priority: number|string|null,
      onComplete?: (a: Error|null) => any
    ): Promise<void>;
    update(values: Object, onComplete?: (a: Error|null) => any): Promise<void>;
  }

  type EventType = 'value' | 'child_added' | 'child_changed' | 'child_moved' | 'child_removed';

  interface Query {
    ref: admin.database.Reference;

    endAt(value: number|string|boolean|null, key?: string): admin.database.Query;
    equalTo(value: number|string|boolean|null, key?: string): admin.database.Query;
    isEqual(other: admin.database.Query|null): boolean;
    limitToFirst(limit: number): admin.database.Query;
    limitToLast(limit: number): admin.database.Query;
    off(
      eventType?: admin.database.EventType,
      callback?: (a: admin.database.DataSnapshot, b?: string|null) => any,
      context?: Object|null
    ): void;
    on(
      eventType: admin.database.EventType,
      callback: (a: admin.database.DataSnapshot|null, b?: string) => any,
      cancelCallbackOrContext?: Object|null,
      context?: Object|null
    ): (a: admin.database.DataSnapshot|null, b?: string) => any;
    once(
      eventType: admin.database.EventType,
      successCallback?: (a: admin.database.DataSnapshot, b?: string) => any,
      failureCallbackOrContext?: Object|null,
      context?: Object|null
    ): Promise<admin.database.DataSnapshot>;
    orderByChild(path: string): admin.database.Query;
    orderByKey(): admin.database.Query;
    orderByPriority(): admin.database.Query;
    orderByValue(): admin.database.Query;
    startAt(value: number|string|boolean|null, key?: string): admin.database.Query;
    toJSON(): Object;
    toString(): string;
  }

  interface Reference extends admin.database.Query {
    key: string|null;
    parent: admin.database.Reference|null;
    root: admin.database.Reference;
    path: string;

    child(path: string): admin.database.Reference;
    onDisconnect(): admin.database.OnDisconnect;
    push(value?: any, onComplete?: (a: Error|null) => any): admin.database.ThenableReference;
    remove(onComplete?: (a: Error|null) => any): Promise<void>;
    set(value: any, onComplete?: (a: Error|null) => any): Promise<void>;
    setPriority(
      priority: string|number|null,
      onComplete: (a: Error|null) => any
    ): Promise<void>;
    setWithPriority(
      newVal: any, newPriority: string|number|null,
      onComplete?: (a: Error|null) => any
    ): Promise<void>;
    transaction(
      transactionUpdate: (a: any) => any,
      onComplete?: (a: Error|null, b: boolean, c: admin.database.DataSnapshot|null) => any,
      applyLocally?: boolean
    ): Promise<{
      committed: boolean,
      snapshot: admin.database.DataSnapshot|null
    }>;
    update(values: Object, onComplete?: (a: Error|null) => any): Promise<void>;
  }

  interface ThenableReference extends admin.database.Reference, PromiseLike<any> {}

  function enableLogging(logger?: boolean|((message: string) => any), persistent?: boolean): any;
}

declare namespace admin.database.ServerValue {
  var TIMESTAMP: number;
}

type BaseMessage = {
  data?: {[key: string]: string};
  notification?: admin.messaging.Notification;
  android?: admin.messaging.AndroidConfig;
  webpush?: admin.messaging.WebpushConfig;
  apns?: admin.messaging.ApnsConfig;
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
    priority?: ('high'|'normal');

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
    data?: {[key: string]: string};

    /**
     * Android notification to be included in the message.
     */
    notification?: AndroidNotification;
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
    headers?: {[key: string]: string};

    /**
     * An APNs payload to be included in the message.
     */
    payload?: ApnsPayload;
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
    headers?: {[key: string]: string};

    /**
     * A collection of data fields.
     */
    data?: {[key: string]: string};

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
      action: string;
      icon?: string;
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
   * @return {!admin.messaging.Messaging} The `Messaging` service for the current
   *   app.
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
     *
     * @type {!admin.app.App}
     */
    app: admin.app.App;

    /**
     * Sends the given message via FCM.
     *
     * @param {!admin.messaging.Message} message The message payload.
     * @param {boolean=} dryRun Whether to send the message in the dry-run
     *   (validation only) mode.
     * @return {!Promise<string>} A promise fulfilled with a unique message ID
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
     * @param {!Array<!admin.messaging.Message>} messages A non-empty array
     *   containing up to 100 messages.
     * @param {boolean=} dryRun Whether to send the messages in the dry-run
     *   (validation only) mode.
     * @return {!Promise<!admin.messaging.BatchResponse>} A Promise fulfilled
     *   with an object representing the result of the send operation.
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
     * @param {!admin.messaging.MulticastMessage} message A multicast message
     *   containing up to 100 tokens.
     * @param {boolean=} dryRun Whether to send the message in the dry-run
     *   (validation only) mode.
     * @return {!Promise<!admin.messaging.BatchResponse>} A Promise fulfilled
     *   with an object representing the result of the send operation.
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
     * @param {string} registrationToken The registration token for the device to
     *   which to send the message.
     * @param {!Array<string>} registrationTokens An array of registration tokens
     *   for the devices to which to send the message.
     * @param {!admin.messaging.MessagingPayload} payload The message payload.
     * @param {!admin.messaging.MessagingOptions=} options Optional options to
     *   alter the message.
     *
     * @return {!Promise<!admin.messaging.MessagingDevicesResponse>} A promise
     *   fulfilled with the server's response after the message has been sent.
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
     * @param {string} notificationKey The notification key for the device group to
     *   which to send the message.
     * @param {!admin.messaging.MessagingPayload} payload The message payload.
     * @param {!admin.messaging.MessagingOptions=} options Optional options to
     *   alter the message.
     *
     * @return {!Promise<!admin.messaging.MessagingDeviceGroupResponse>} A promise
     *   fulfilled with the server's response after the message has been sent.
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
     * @param {string} topic The topic to which to send the message.
     * @param {!admin.messaging.MessagingPayload} payload The message payload.
     * @param {!admin.messaging.MessagingOptions=} options Optional options to
     *   alter the message.
     *
     * @return {!Promise<!admin.messaging.MessagingTopicResponse>} A promise
     *   fulfilled with the server's response after the message has been sent.
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
     * @param {string} condition The condition determining to which topics to send
     *   the message.
     * @param {!admin.messaging.MessagingPayload} payload The message payload.
     * @param {!admin.messaging.MessagingOptions=} options Optional options to
     *   alter the message.
     *
     * @return {!Promise<!admin.messaging.MessagingConditionResponse>} A promise
     *   fulfilled with the server's response after the message has been sent.
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
     * @param {string} registrationToken The registration token for the device for
     *   which to subscribe to the topic.
     * @param {!Array<string>} registrationTokens An array of registration tokens
     *   for the devices for which to subscribe to the topic.
     * @param {string} topic The topic to which to subscribe.
     *
     * @return {!Promise<!admin.messaging.MessagingTopicManagementResponse>} A
     *   promise fulfilled with the server's response after the device has been
     *   subscribed to the topic.
     */
    subscribeToTopic(
      registrationToken: string,
      topic: string
    ): Promise<admin.messaging.MessagingTopicManagementResponse>;
    subscribeToTopic(
      registrationTokens: string[],
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
     * @param {string} registrationToken The registration token for the device for
     *   which to unsubscribe from the topic.
     * @param {!Array<string>} registrationTokens An array of registration tokens
     *   for the devices for which to unsubscribe from the topic.
     * @param {string} topic The topic from which to unsubscribe.
     *
     * @return {!Promise<!admin.messaging.MessagingTopicManagementResponse>} A
     *   promise fulfilled with the server's response after the device has been
     *   unsubscribed from the topic.
     */
    unsubscribeFromTopic(
      registrationToken: string,
      topic: string
    ): Promise<admin.messaging.MessagingTopicManagementResponse>;
    unsubscribeFromTopic(
      registrationTokens: string[],
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
   * var instanceId = app.instanceId();
   * // The above is shorthand for:
   * // var instanceId = admin.instanceId(app);
   *
   * @return {!admin.instanceId.InstanceId} The `InstanceId` service for the
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
     * @param {string} instanceId The instance ID to be deleted.
     *
     * @return {!Promise<void>} A promise fulfilled when the instance ID is
     *   deleted.
     */
    deleteInstanceId(instanceId: string): Promise<void>;
  }
}

declare namespace admin.projectManagement {
  interface ShaCertificate {
    certType: ('sha1' | 'sha256');
    shaHash: string;
    resourceName?: string;
  }

  interface AndroidAppMetadata {
    resourceName: string;
    appId: string;
    displayName: string | null;
    projectId: string;
    packageName: string;
  }
  
  interface AndroidApp {
    appId: string;
    getMetadata(): Promise<admin.projectManagement.AndroidAppMetadata>;
    setDisplayName(newDisplayName: string): Promise<void>;
    getShaCertificates(): Promise<admin.projectManagement.ShaCertificate[]>;
    addShaCertificate(certificateToAdd: ShaCertificate): Promise<void>;
    deleteShaCertificate(certificateToRemove: ShaCertificate): Promise<void>;
    getConfig(): Promise<string>;
  }

  interface IosAppMetadata {
    resourceName: string;
    appId: string;
    displayName: string;
    projectId: string;
    bundleId: string;
  }

  interface IosApp {
    appId: string;

    getMetadata(): Promise<admin.projectManagement.IosAppMetadata>;
    setDisplayName(newDisplayName: string): Promise<void>;
    getConfig(): Promise<string>;
  }

  interface ProjectManagement {
    app: admin.app.App;

    listAndroidApps(): Promise<admin.projectManagement.AndroidApp[]>;
    listIosApps(): Promise<admin.projectManagement.IosApp[]>;
    androidApp(appId: string): admin.projectManagement.AndroidApp;
    iosApp(appId: string): admin.projectManagement.IosApp;
    shaCertificate(shaHash: string): admin.projectManagement.ShaCertificate;
    createAndroidApp(
        packageName: string, displayName?: string): Promise<admin.projectManagement.AndroidApp>;
    createIosApp(bundleId: string, displayName?: string): Promise<admin.projectManagement.IosApp>;
  }
}

declare module 'firebase-admin' {
}

export = admin;

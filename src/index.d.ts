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

  interface ThenableReference extends admin.database.Reference, Promise<admin.database.Reference> {}

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

  interface AndroidConfig {
    collapseKey?: string;
    priority?: ('high'|'normal');
    ttl?: number;
    restrictedPackageName?: string;
    data?: {[key: string]: string};
    notification?: AndroidNotification;
  }

  interface AndroidNotification {
    title?: string;
    body?: string;
    icon?: string;
    color?: string;
    sound?: string;
    tag?: string;
    clickAction?: string;
    bodyLocKey?: string;
    bodyLocArgs?: string[];
    titleLocKey?: string;
    titleLocArgs?: string[];
    channelId?: string;
  }

  interface ApnsConfig {
    headers?: {[key: string]: string};
    payload?: ApnsPayload;
  }

  interface ApnsPayload {
    aps: Aps;
    [customData: string]: object;
  }

  interface Aps {
    alert?: string | ApsAlert;
    badge?: number;
    sound?: string | CriticalSound;
    contentAvailable?: boolean;
    mutableContent?: boolean;
    category?: string;
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

  interface CriticalSound {
    critical?: boolean;
    name: string;
    volume?: number;
  }

  interface Notification {
    title?: string;
    body?: string;
  }

  interface WebpushConfig {
    headers?: {[key: string]: string};
    data?: {[key: string]: string};
    notification?: WebpushNotification;
    fcmOptions?: WebpushFcmOptions;
  }

  interface WebpushFcmOptions {
    link?: string;
  }

  interface WebpushNotification {
    title?: string;
    actions?: Array<{
      action: string;
      icon?: string;
      title: string;
    }>;
    badge?: string;
    body?: string;
    data?: any;
    dir?: 'auto' | 'ltr' | 'rtl';
    icon?: string;
    image?: string;
    lang?: string;
    renotify?: boolean;
    requireInteraction?: boolean;
    silent?: boolean;
    tag?: string;
    timestamp?: number;
    vibrate?: number | number[];
    [key: string]: any;
  }

  interface DataMessagePayload {
    [key: string]: string;
  }

  interface NotificationMessagePayload {
    tag?: string;
    body?: string;
    icon?: string;
    badge?: string;
    color?: string;
    sound?: string;
    title?: string;
    bodyLocKey?: string;
    bodyLocArgs?: string;
    clickAction?: string;
    titleLocKey?: string;
    titleLocArgs?: string;
    [key: string]: string | undefined;
  }

  interface MessagingPayload {
    data?: admin.messaging.DataMessagePayload;
    notification?: admin.messaging.NotificationMessagePayload;
  }

  interface MessagingOptions {
    dryRun?: boolean;
    priority?: string;
    timeToLive?: number;
    collapseKey?: string;
    mutableContent?: boolean;
    contentAvailable?: boolean;
    restrictedPackageName?: string;
    [key: string]: any | undefined;
  }

  interface MessagingDeviceResult {
    error?: admin.FirebaseError;
    messageId?: string;
    canonicalRegistrationToken?: string;
  }

  interface MessagingDevicesResponse {
    canonicalRegistrationTokenCount: number;
    failureCount: number;
    multicastId: number;
    results: admin.messaging.MessagingDeviceResult[];
    successCount: number;
  }

  interface MessagingDeviceGroupResponse {
    successCount: number;
    failureCount: number;
    failedRegistrationTokens: string[];
  }

  interface MessagingTopicResponse {
    messageId: number;
  }

  interface MessagingConditionResponse {
    messageId: number;
  }

  interface MessagingTopicManagementResponse {
    failureCount: number;
    successCount: number;
    errors: admin.FirebaseArrayIndexError[];
  }

  interface BatchResponse {
    responses: admin.messaging.SendResponse[];
    successCount: number;
    failureCount: number;
  }

  interface SendResponse {
    success: boolean;
    messageId?: string;
    error?: admin.FirebaseError;
  }

  interface Messaging {
    app: admin.app.App;

    send(message: admin.messaging.Message, dryRun?: boolean): Promise<string>;
    sendAll(
      messages: Array<admin.messaging.Message>,
      dryRun?: boolean
    ): Promise<admin.messaging.BatchResponse>;
    sendMulticast(
      message: admin.messaging.MulticastMessage,
      dryRun?: boolean
    ): Promise<admin.messaging.BatchResponse>;
    sendToDevice(
      registrationToken: string | string[],
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingDevicesResponse>;
    sendToDeviceGroup(
      notificationKey: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingDeviceGroupResponse>;
    sendToTopic(
      topic: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingTopicResponse>;
    sendToCondition(
      condition: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): Promise<admin.messaging.MessagingConditionResponse>;
    subscribeToTopic(
      registrationToken: string,
      topic: string
    ): Promise<admin.messaging.MessagingTopicManagementResponse>;
    subscribeToTopic(
      registrationTokens: string[],
      topic: string
    ): Promise<admin.messaging.MessagingTopicManagementResponse>;
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
  interface InstanceId {
    app: admin.app.App;

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

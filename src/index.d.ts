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

declare namespace admin {
  interface FirebaseError {
    readonly code: string;
    readonly message: string;
    readonly stack: string;

    toJSON(): Object;
  }

  type FirebaseArrayIndexError = {
    readonly index: number;
    readonly error: FirebaseError;
  }

  interface ServiceAccount {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  }

  interface GoogleOAuthAccessToken {
    readonly access_token: string;
    readonly expires_in: number;
  }

  interface AppOptions {
    credential?: admin.credential.Credential;
    databaseAuthVariableOverride?: Object;
    databaseURL?: string;
    serviceAccountId?: string;
    storageBucket?: string;
    projectId?: string;
    httpAgent?: Agent;
  }

  var SDK_VERSION: string;
  var apps: (admin.app.App|null)[];

  function app(name?: string): admin.app.App;
  function auth(app?: admin.app.App): admin.auth.Auth;
  function database(app?: admin.app.App): admin.database.Database;
  function messaging(app?: admin.app.App): admin.messaging.Messaging;
  function storage(app?: admin.app.App): admin.storage.Storage;
  function firestore(app?: admin.app.App): admin.firestore.Firestore;
  function instanceId(app?: admin.app.App): admin.instanceId.InstanceId;
  function projectManagement(app?: admin.app.App): admin.projectManagement.ProjectManagement;
  function initializeApp(options?: admin.AppOptions, name?: string): admin.app.App;
}

declare namespace admin.app {
  interface App {
    readonly name: string;
    readonly options: admin.AppOptions;

    auth(): admin.auth.Auth;
    database(url?: string): admin.database.Database;
    firestore(): admin.firestore.Firestore;
    instanceId(): admin.instanceId.InstanceId;
    messaging(): admin.messaging.Messaging;
    projectManagement(): admin.projectManagement.ProjectManagement;
    storage(): admin.storage.Storage;
    delete(): Promise<void>;
  }
}

declare namespace admin.auth {
  interface UserMetadata {
    readonly lastSignInTime: string;
    readonly creationTime: string;

    toJSON(): Object;
  }

  interface UserInfo {
    readonly uid: string;
    readonly displayName: string;
    readonly email: string;
    readonly phoneNumber: string;
    readonly photoURL: string;
    readonly providerId: string;

    toJSON(): Object;
  }

  interface UserRecord {
    readonly uid: string;
    readonly email?: string;
    readonly emailVerified: boolean;
    readonly displayName?: string;
    readonly phoneNumber?: string;
    readonly photoURL?: string;
    readonly disabled: boolean;
    readonly metadata: admin.auth.UserMetadata;
    readonly providerData: admin.auth.UserInfo[];
    readonly passwordHash?: string;
    readonly passwordSalt?: string;
    readonly customClaims?: Object;
    readonly tokensValidAfterTime?: string;

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
    readonly aud: string;
    readonly auth_time: number;
    readonly exp: number;
    readonly firebase: {
      readonly identities: {
        readonly [key: string]: any;
      };
      readonly sign_in_provider: string;
      readonly [key: string]: any;
    };
    readonly iat: number;
    readonly iss: string;
    readonly sub: string;
    readonly uid: string;
    readonly [key: string]: any;
  }

  interface ListUsersResult {
    readonly users: admin.auth.UserRecord[];
    readonly pageToken?: string;
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
    readonly failureCount: number;
    readonly successCount: number;
    readonly errors: admin.FirebaseArrayIndexError[];
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
    readonly idpEntityId: string;
    readonly ssoURL: string;
    readonly x509Certificates: string[];
    readonly rpEntityId: string;
    readonly callbackURL?: string;
    readonly enableRequestSigning?: boolean;
  }

  interface OIDCAuthProviderConfig extends admin.auth.AuthProviderConfig {
    readonly clientId: string;
    readonly issuer: string;
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
    readonly providerConfigs: admin.auth.AuthProviderConfig[];
    readonly pageToken?: string;
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
    readonly app: admin.app.App;
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
    readonly app: admin.app.App;

    goOffline(): void;
    goOnline(): void;
    ref(path?: string | admin.database.Reference): admin.database.Reference;
    refFromURL(url: string): admin.database.Reference;
  }

  interface DataSnapshot {
    readonly key: string|null;
    readonly ref: admin.database.Reference;

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
    readonly ref: admin.database.Reference;

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
    readonly key: string|null;
    readonly parent: admin.database.Reference|null;
    readonly root: admin.database.Reference;
    readonly path: string;

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

  type AndroidConfig = {
    collapseKey?: string;
    priority?: ('high'|'normal');
    ttl?: number;
    restrictedPackageName?: string;
    data?: {[key: string]: string};
    notification?: AndroidNotification;
  };

  type AndroidNotification = {
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
  };

  type ApnsConfig = {
    headers?: {[key: string]: string};
    payload?: ApnsPayload;
  };

  type ApnsPayload = {
    aps: Aps;
    [customData: string]: object;
  };

  type Aps = {
    alert?: string | ApsAlert;
    badge?: number;
    sound?: string | CriticalSound;
    contentAvailable?: boolean;
    mutableContent?: boolean;
    category?: string;
    threadId?: string;
    [customData: string]: any;
  };

  type ApsAlert = {
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
  };

  type CriticalSound = {
    critical?: boolean;
    name: string;
    volume?: number;
  }

  type Notification = {
    title?: string;
    body?: string;
  };

  type WebpushConfig = {
    headers?: {[key: string]: string};
    data?: {[key: string]: string};
    notification?: WebpushNotification;
    fcmOptions?: WebpushFcmOptions;
  };

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

  type DataMessagePayload = {
    [key: string]: string;
  };

  type NotificationMessagePayload = {
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
  };

  type MessagingPayload = {
    data?: admin.messaging.DataMessagePayload;
    notification?: admin.messaging.NotificationMessagePayload;
  };

  type MessagingOptions = {
    dryRun?: boolean;
    priority?: string;
    timeToLive?: number;
    collapseKey?: string;
    mutableContent?: boolean;
    contentAvailable?: boolean;
    restrictedPackageName?: string;
    [key: string]: any | undefined;
  };

  type MessagingDeviceResult = {
    error?: admin.FirebaseError;
    messageId?: string;
    canonicalRegistrationToken?: string;
  };

  type MessagingDevicesResponse = {
    readonly canonicalRegistrationTokenCount: number;
    readonly failureCount: number;
    readonly multicastId: number;
    readonly results: admin.messaging.MessagingDeviceResult[];
    readonly successCount: number;
  };

  type MessagingDeviceGroupResponse = {
    readonly successCount: number;
    readonly failureCount: number;
    readonly failedRegistrationTokens: string[];
  };

  type MessagingTopicResponse = {
    readonly messageId: number;
  };

  type MessagingConditionResponse = {
    readonly messageId: number;
  };

  type MessagingTopicManagementResponse = {
    readonly failureCount: number;
    readonly successCount: number;
    readonly errors: admin.FirebaseArrayIndexError[];
  };

  type BatchResponse = {
    readonly responses: admin.messaging.SendResponse[];
    readonly successCount: number;
    readonly failureCount: number;
  }

  type SendResponse = {
    readonly success: boolean;
    readonly messageId?: string;
    readonly error?: admin.FirebaseError;
  };

  interface Messaging {
    readonly app: admin.app.App;

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
  interface Storage {
    readonly app: admin.app.App;
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
    readonly app: admin.app.App;

    deleteInstanceId(instanceId: string): Promise<void>;
  }
}

declare namespace admin.projectManagement {
  interface ShaCertificate {
    readonly certType: ('sha1' | 'sha256');
    readonly shaHash: string;
    readonly resourceName?: string;
  }

  interface AndroidAppMetadata {
    readonly resourceName: string;
    readonly appId: string;
    readonly displayName: string | null;
    readonly projectId: string;
    readonly packageName: string;
  }

  interface AndroidApp {
    readonly appId: string;

    getMetadata(): Promise<admin.projectManagement.AndroidAppMetadata>;
    setDisplayName(newDisplayName: string): Promise<void>;
    getShaCertificates(): Promise<admin.projectManagement.ShaCertificate[]>;
    addShaCertificate(certificateToAdd: ShaCertificate): Promise<void>;
    deleteShaCertificate(certificateToRemove: ShaCertificate): Promise<void>;
    getConfig(): Promise<string>;
  }

  interface IosAppMetadata {
    readonly resourceName: string;
    readonly appId: string;
    readonly displayName: string;
    readonly projectId: string;
    readonly bundleId: string;
  }

  interface IosApp {
    readonly appId: string;

    getMetadata(): Promise<admin.projectManagement.IosAppMetadata>;
    setDisplayName(newDisplayName: string): Promise<void>;
    getConfig(): Promise<string>;
  }

  interface ProjectManagement {
    readonly app: admin.app.App;

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

declare namespace admin {
  interface FirebaseError {
    code: string;
    message: string;
    stack: string;

    toJSON(): Object;
  }

  class Promise<T> extends Promise_Instance<T> {
    static all(values: admin.Promise<any>[]): admin.Promise<any[]>;
    static reject(error: Error): admin.Promise<any>;
    static resolve<T>(value?: T): admin.Promise<T>;
  }

  class Promise_Instance<T> implements admin.Thenable<any> {
    constructor(resolver: (a?: (a: T) => undefined, b?: (a: Error) => undefined) => any);
    catch(onReject?: (a: Error) => any): admin.Thenable<any>;
    then(onResolve?: (a: T) => any, onReject?: (a: Error) => any): admin.Promise<any>;
  }

  interface Thenable<T> {
    catch(onReject?: (a: Error) => any): admin.Thenable<any>;
    then(onResolve?: (a: T) => any, onReject?: (a: Error) => any): admin.Thenable<any>;
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

  interface AppOptions {
    credential?: admin.credential.Credential;
    databaseAuthVariableOverride?: Object;
    databaseURL?: string;
    serviceAccount?: string|admin.ServiceAccount;
    storageBucket?: string;
  }

  var SDK_VERSION: string;
  var apps: (admin.app.App|null)[];

  function app(name?: string): admin.app.App;
  function auth(app?: admin.app.App): admin.auth.Auth;
  function database(app?: admin.app.App): admin.database.Database;
  function messaging(app?: admin.app.App): admin.messaging.Messaging;
  function initializeApp(options: admin.AppOptions, name?: string): admin.app.App;
}

declare namespace admin.app {
  interface App {
    name: string;
    options: admin.AppOptions;

    auth(): admin.auth.Auth;
    database(): admin.database.Database;
    messaging(): admin.messaging.Messaging;
    delete(): admin.Promise<undefined>;
  }
}

declare namespace admin.auth {
  interface UserMetadata {
    lastSignedInAt: Date;
    createdAt: Date;

    toJSON(): Object;
  }

  interface UserInfo {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    providerId: string;

    toJSON(): Object;
  }

  interface UserRecord {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    photoURL: string;
    disabled: boolean;
    metadata: admin.auth.UserMetadata;
    providerData: admin.auth.UserInfo[];

    toJSON(): Object;
  }

  interface DecodedIdToken {
    uid: string;
    sub: string;
    [other: string]: any;
  }

  interface Auth {
    app: admin.app.App;

    createCustomToken(uid: string, developerClaims?: Object): admin.Promise<string>;
    createUser(properties: Object): admin.Promise<admin.auth.UserRecord>;
    deleteUser(uid: string): admin.Promise<undefined>;
    getUser(uid: string): admin.Promise<admin.auth.UserRecord>;
    getUserByEmail(email: string): admin.Promise<admin.auth.UserRecord>;
    updateUser(uid: string, properties: Object): admin.Promise<admin.auth.UserRecord>;
    verifyIdToken(idToken: string): admin.Promise<DecodedIdToken>;
  }
}

declare namespace admin.credential {
  interface Credential {
    getAccessToken(): admin.Promise<admin.GoogleOAuthAccessToken>;
  }

  function applicationDefault(): admin.credential.Credential;
  function cert(serviceAccountPathOrObject: string|admin.ServiceAccount): admin.credential.Credential;
  function refreshToken(refreshTokenPathOrObject: string|Object): admin.credential.Credential;
}

declare namespace admin.database {
  interface Database {
    app: admin.app.App;

    goOffline(): undefined;
    goOnline(): undefined;
    ref(path?: string): admin.database.Reference;
    refFromURL(url: string): admin.database.Reference;
  }

  interface DataSnapshot {
    key: string|null;
    ref: admin.database.Reference;

    child(path: string): admin.database.DataSnapshot;
    exists(): boolean;
    exportVal(): any;
    forEach(action: (a: admin.database.DataSnapshot) => boolean): boolean;
    getPriority(): string|number|null;
    hasChild(path: string): boolean;
    hasChildren(): boolean;
    numChildren(): number;
    toJSON(): Object;
    val(): any;
  }

  interface OnDisconnect {
    cancel(onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
    remove(onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
    set(value: any, onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
    setWithPriority(
      value: any,
      priority: number|string|null,
      onComplete?: (a: Error|null) => any
    ): admin.Promise<undefined>;
    update(values: Object, onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
  }

  interface Query {
    ref: admin.database.Reference;

    endAt(value: number|string|boolean|null, key?: string): admin.database.Query;
    equalTo(value: number|string|boolean|null, key?: string): admin.database.Query;
    isEqual(other: admin.database.Query|null): boolean;
    limitToFirst(limit: number): admin.database.Query;
    limitToLast(limit: number): admin.database.Query;
    off(
      eventType?: string,
      callback?: (a: admin.database.DataSnapshot, b?: string|null) => any,
      context?: Object|null
    ): undefined;
    on(
      eventType: string,
      callback: (a: admin.database.DataSnapshot|null, b?: string) => any,
      cancelCallbackOrContext?: Object|null,
      context?: Object|null
    ): (a: admin.database.DataSnapshot|null, b?: string) => any;
    once(
      eventType: string,
      successCallback?: (a: admin.database.DataSnapshot, b?: string) => any,
      failureCallbackOrContext?: Object|null,
      context?: Object|null
    ): admin.Promise<any>;
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

    child(path: string): admin.database.Reference;
    onDisconnect(): admin.database.OnDisconnect;
    push(value?: any, onComplete?: (a: Error|null) => any): admin.database.ThenableReference;
    remove(onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
    set(value: any, onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
    setPriority(
      priority: string|number|null,
      onComplete: (a: Error|null) => any
    ): admin.Promise<undefined>;
    setWithPriority(
      newVal: any, newPriority: string|number|null,
      onComplete?: (a: Error|null) => any
    ): admin.Promise<undefined>;
    transaction(
      transactionUpdate: (a: any) => any,
      onComplete?: (a: Error|null, b: boolean, c: admin.database.DataSnapshot|null) => any,
      applyLocally?: boolean
    ): admin.Promise<{
      committed: boolean,
      snapshot: admin.database.DataSnapshot|null
    }>;
    update(values: Object, onComplete?: (a: Error|null) => any): admin.Promise<undefined>;
  }

  interface ThenableReference extends admin.database.Reference, admin.Thenable<any> {}

  function enableLogging(logger?: boolean|((message: string) => any), persistent?: boolean): any;
}

declare namespace admin.database.ServerValue {
  var TIMESTAMP: number;
}

declare namespace admin.messaging {
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
    [other: string]: string;
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
    [other: string]: any;
  };

  type MessagingDeviceResult = {
    error?: admin.FirebaseError;
    messageId?: string;
    canonicalRegistrationToken?: string;
  };

  type MessagingDevicesResponse = {
    canonicalRegistrationTokenCount: number;
    failureCount: number;
    multicastId: number;
    results: admin.messaging.MessagingDeviceResult[];
    successCount: number;
  };

  type MessagingDeviceGroupResponse = {
    successCount: number;
    failureCount: number;
    failedRegistrationTokens: string[];
  };

  type MessagingTopicResponse = {
    messageId: number;
  };

  type MessagingConditionResponse = {
    messageId: number;
  };

  interface Messaging {
    app: admin.app.App;

    sendToDevice(
      registrationToken: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): admin.Promise<admin.messaging.MessagingDevicesResponse>;
    sendToDevice(
      registrationTokens: string[],
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): admin.Promise<admin.messaging.MessagingDevicesResponse>;
    sendToDeviceGroup(
      notificationKey: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): admin.Promise<admin.messaging.MessagingDeviceGroupResponse>;
    sendToTopic(
      topic: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): admin.Promise<admin.messaging.MessagingTopicResponse>;
    sendToCondition(
      condition: string,
      payload: admin.messaging.MessagingPayload,
      options?: admin.messaging.MessagingOptions
    ): admin.Promise<admin.messaging.MessagingConditionResponse>;
  }
}

declare module 'firebase-admin' {
  export = admin;
}

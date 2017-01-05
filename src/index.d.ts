declare namespace admin {
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
    databaseURL?: string;
    credential?: admin.credential.Credential;
    serviceAccount?: string|admin.ServiceAccount;
    databaseAuthVariableOverride?: Object;
  }

  var SDK_VERSION: string;
  var apps: (admin.app.App|null)[];

  function app(name?: string): admin.app.App;
  function auth(app?: admin.app.App): admin.auth.Auth;
  function database(app?: admin.app.App): admin.database.Database;
  function initializeApp(options: admin.AppOptions, name?: string): admin.app.App;
}

declare namespace admin.app {
  interface App {
    name: string;
    options: admin.AppOptions;

    auth(): admin.auth.Auth;
    database(): admin.database.Database;
    delete(): admin.Promise<undefined>;
  }
}

declare namespace admin.auth {
  interface UserMetadata {
    lastSignedInAt: Date;
    createdAt: Date;
  }

  interface UserInfo {
     uid: string;
     displayName: string;
     email: string;
     photoURL: string;
     providerId: string;
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

declare module 'firebase-admin' {
  export = admin;
}

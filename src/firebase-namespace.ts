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

import fs = require('fs');
import {deepExtend} from './utils/deep-copy';
import {AppErrorCodes, FirebaseAppError} from './utils/error';
import {AppHook, FirebaseApp, FirebaseAppOptions} from './firebase-app';
import {FirebaseServiceFactory, FirebaseServiceInterface} from './firebase-service';
import {
  Credential,
  CertCredential,
  RefreshTokenCredential,
  ApplicationDefaultCredential,
} from './auth/credential';

import {Auth} from './auth/auth';
import {Messaging} from './messaging/messaging';
import {Storage} from './storage/storage';
import {Database} from '@firebase/database';
import {Firestore} from '@google-cloud/firestore';
import {InstanceId} from './instance-id/instance-id';

import * as validator from './utils/validator';

const DEFAULT_APP_NAME = '[DEFAULT]';

/**
 * Constant holding the environment variable name with the default config.
 * If the environmet variable contains a string that starts with '{' it will be parsed as JSON,
 * otherwise it will be assumed to be pointing to a file.
 */
export const FIREBASE_CONFIG_VAR: string = 'FIREBASE_CONFIG';


let globalAppDefaultCred: ApplicationDefaultCredential;
const globalCertCreds: { [key: string]: CertCredential } = {};
const globalRefreshTokenCreds: { [key: string]: RefreshTokenCredential } = {};


export interface FirebaseServiceNamespace <T> {
  (app?: FirebaseApp): T;
  [key: string]: any;
}


/**
 * Internals of a FirebaseNamespace instance.
 */
export class FirebaseNamespaceInternals {
  public serviceFactories: {[serviceName: string]: FirebaseServiceFactory} = {};

  private apps_: {[appName: string]: FirebaseApp} = {};
  private appHooks_: {[service: string]: AppHook} = {};

  constructor(public firebase_) {}

  /**
   * Initializes the FirebaseApp instance.
   *
   * @param {FirebaseAppOptions} options Optional options for the FirebaseApp instance. If none present
   *                             will try to initialize from the FIREBASE_CONFIG environment variable.
   *                             If the environmet variable contains a string that starts with '{'
   *                             it will be parsed as JSON,
   *                             otherwise it will be assumed to be pointing to a file.
   * @param {string} [appName] Optional name of the FirebaseApp instance.
   *
   * @return {FirebaseApp} A new FirebaseApp instance.
   */
  public initializeApp(options?: FirebaseAppOptions, appName = DEFAULT_APP_NAME): FirebaseApp {
    if (typeof options === 'undefined') {
      options = this.loadOptionsFromEnvVar();
      options.credential = new ApplicationDefaultCredential();
    }
    if (typeof appName !== 'string' || appName === '') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_NAME,
        `Invalid Firebase app name "${appName}" provided. App name must be a non-empty string.`,
      );
    } else if (appName in this.apps_) {
      if (appName === DEFAULT_APP_NAME) {
        throw new FirebaseAppError(
          AppErrorCodes.DUPLICATE_APP,
          'The default Firebase app already exists. This means you called initializeApp() ' +
          'more than once without providing an app name as the second argument. In most cases ' +
          'you only need to call initializeApp() once. But if you do want to initialize ' +
          'multiple apps, pass a second argument to initializeApp() to give each app a unique ' +
          'name.',
        );
      } else {
        throw new FirebaseAppError(
          AppErrorCodes.DUPLICATE_APP,
          `Firebase app named "${appName}" already exists. This means you called initializeApp() ` +
          'more than once with the same app name as the second argument. Make sure you provide a ' +
          'unique name every time you call initializeApp().',
        );
      }
    }

    const app = new FirebaseApp(options, appName, this);

    this.apps_[appName] = app;

    this.callAppHooks_(app, 'create');

    return app;
  }

  /**
   * Returns the FirebaseApp instance with the provided name (or the default FirebaseApp instance
   * if no name is provided).
   *
   * @param {string} [appName=DEFAULT_APP_NAME] Optional name of the FirebaseApp instance to return.
   * @return {FirebaseApp} The FirebaseApp instance which has the provided name.
   */
  public app(appName = DEFAULT_APP_NAME): FirebaseApp {
    if (typeof appName !== 'string' || appName === '') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_NAME,
        `Invalid Firebase app name "${appName}" provided. App name must be a non-empty string.`,
      );
    } else if (!(appName in this.apps_)) {
      let errorMessage: string = (appName === DEFAULT_APP_NAME)
        ? 'The default Firebase app does not exist. ' : `Firebase app named "${appName}" does not exist. `;
      errorMessage += 'Make sure you call initializeApp() before using any of the Firebase services.';

      throw new FirebaseAppError(AppErrorCodes.NO_APP, errorMessage);
    }

    return this.apps_[appName];
  }

  /*
   * Returns an array of all the non-deleted FirebaseApp instances.
   *
   * @return {Array<FirebaseApp>} An array of all the non-deleted FirebaseApp instances
   */
  public get apps(): FirebaseApp[] {
    // Return a copy so the caller cannot mutate the array
    return Object.keys(this.apps_).map((appName) => this.apps_[appName]);
  }

  /*
   * Removes the specified FirebaseApp instance.
   *
   * @param {string} appName The name of the FirebaseApp instance to remove.
   */
  public removeApp(appName: string): void {
    if (typeof appName === 'undefined') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_NAME,
        `No Firebase app name provided. App name must be a non-empty string.`,
      );
    }

    const appToRemove = this.app(appName);
    this.callAppHooks_(appToRemove, 'delete');
    delete this.apps_[appName];
  }

  /*
   * Registers a new service on this Firebase namespace.
   *
   * @param {string} serviceName The name of the Firebase service to register.
   * @param {FirebaseServiceFactory} createService A factory method to generate an instance of the Firebase service.
   * @param {object} [serviceProperties] Optional properties to extend this Firebase namespace with.
   * @param {AppHook} [appHook] Optional callback that handles app-related events like app creation and deletion.
   * @return {FirebaseServiceNamespace<FirebaseServiceInterface>} The Firebase service's namespace.
   */
  public registerService(serviceName: string,
                         createService: FirebaseServiceFactory,
                         serviceProperties?: object,
                         appHook?: AppHook): FirebaseServiceNamespace<FirebaseServiceInterface> {
    let errorMessage;
    if (typeof serviceName === 'undefined') {
      errorMessage = `No service name provided. Service name must be a non-empty string.`;
    } else if (typeof serviceName !== 'string' || serviceName === '') {
      errorMessage = `Invalid service name "${serviceName}" provided. Service name must be a non-empty string.`;
    } else if (serviceName in this.serviceFactories) {
      errorMessage = `Firebase service named "${serviceName}" has already been registered.`;
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(
        AppErrorCodes.INTERNAL_ERROR,
        `INTERNAL ASSERT FAILED: ${errorMessage}`,
      );
    }

    this.serviceFactories[serviceName] = createService;
    if (appHook) {
      this.appHooks_[serviceName] = appHook;
    }

    let serviceNamespace: FirebaseServiceNamespace<FirebaseServiceInterface>;

    // The service namespace is an accessor function which takes a FirebaseApp instance
    // or uses the default app if no FirebaseApp instance is provided
    serviceNamespace = (appArg?: FirebaseApp) => {
      if (typeof appArg === 'undefined') {
        appArg = this.app();
      }

      // Forward service instance lookup to the FirebaseApp
      return (appArg as any)[serviceName]();
    };

    // ... and a container for service-level properties.
    if (serviceProperties !== undefined) {
      deepExtend(serviceNamespace, serviceProperties);
    }

    // Monkey-patch the service namespace onto the Firebase namespace
    this.firebase_[serviceName] = serviceNamespace;

    return serviceNamespace;
  }

  /**
   * Calls the app hooks corresponding to the provided event name for each service within the
   * provided FirebaseApp instance.
   *
   * @param {FirebaseApp} app The FirebaseApp instance whose app hooks to call.
   * @param {string} eventName The event name representing which app hooks to call.
   */
  private callAppHooks_(app: FirebaseApp, eventName: string) {
    Object.keys(this.serviceFactories).forEach((serviceName) => {
      if (this.appHooks_[serviceName]) {
        this.appHooks_[serviceName](eventName, app);
      }
    });
  }

  /**
   * Parse the file pointed to by the FIREBASE_CONFIG_VAR, if it exists.
   * Or if the FIREBASE_CONFIG_ENV contains a valid JSON object, parse it directly.
   * If the environmet variable contains a string that starts with '{' it will be parsed as JSON,
   * otherwise it will be assumed to be pointing to a file.
   */
  private loadOptionsFromEnvVar(): FirebaseAppOptions {
    const config = process.env[FIREBASE_CONFIG_VAR];
    if (!validator.isNonEmptyString(config)) {
      return {};
    }
    try {
      const contents = config.startsWith('{') ? config : fs.readFileSync(config, 'utf8');
      return JSON.parse(contents) as FirebaseAppOptions;
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_OPTIONS,
        'Failed to parse app options file: ' + error,
      );
    }
  }
}


const firebaseCredential = {
  cert: (serviceAccountPathOrObject: string | object): Credential => {
    const stringifiedServiceAccount = JSON.stringify(serviceAccountPathOrObject);
    if (!(stringifiedServiceAccount in globalCertCreds)) {
      globalCertCreds[stringifiedServiceAccount] = new CertCredential(serviceAccountPathOrObject);
    }
    return globalCertCreds[stringifiedServiceAccount];
  },

  refreshToken: (refreshTokenPathOrObject: string | object): Credential => {
    const stringifiedRefreshToken = JSON.stringify(refreshTokenPathOrObject);
    if (!(stringifiedRefreshToken in globalRefreshTokenCreds)) {
      globalRefreshTokenCreds[stringifiedRefreshToken] = new RefreshTokenCredential(refreshTokenPathOrObject);
    }
    return globalRefreshTokenCreds[stringifiedRefreshToken];
  },

  applicationDefault: (): Credential => {
    if (typeof globalAppDefaultCred === 'undefined') {
      globalAppDefaultCred = new ApplicationDefaultCredential();
    }
    return globalAppDefaultCred;
  },
};


/**
 * Global Firebase context object.
 */
export class FirebaseNamespace {
  // Hack to prevent Babel from modifying the object returned as the default admin namespace.
  /* tslint:disable:variable-name */
  public __esModule = true;
  /* tslint:enable:variable-name */

  public credential = firebaseCredential;
  public SDK_VERSION = '<XXX_SDK_VERSION_XXX>';
  public INTERNAL: FirebaseNamespaceInternals;

  /* tslint:disable */
  // TODO(jwenger): Database is the only consumer of firebase.Promise. We should update it to use
  // use the native Promise and then remove this.
  public Promise: any = Promise;
  /* tslint:enable */

  constructor() {
    this.INTERNAL = new FirebaseNamespaceInternals(this);
  }

  /**
   * Gets the `Auth` service namespace. The returned namespace can be used to get the
   * `Auth` service for the default app or an explicitly specified app.
   */
  get auth(): FirebaseServiceNamespace<Auth> {
    const fn: FirebaseServiceNamespace<Auth> = (app?: FirebaseApp) => {
      return this.ensureApp(app).auth();
    };
    return Object.assign(fn, {Auth});
  }

  /**
   * Gets the `Database` service namespace. The returned namespace can be used to get the
   * `Database` service for the default app or an explicitly specified app.
   */
  get database(): FirebaseServiceNamespace<Database> {
    const fn: FirebaseServiceNamespace<Database> = (app?: FirebaseApp) => {
      return this.ensureApp(app).database();
    };
    return Object.assign(fn, require('@firebase/database'));
  }

  /**
   * Gets the `Messaging` service namespace. The returned namespace can be used to get the
   * `Messaging` service for the default app or an explicitly specified app.
   */
  get messaging(): FirebaseServiceNamespace<Messaging> {
    const fn: FirebaseServiceNamespace<Messaging> = (app?: FirebaseApp) => {
      return this.ensureApp(app).messaging();
    };
    return Object.assign(fn, {Messaging});
  }

  /**
   * Gets the `Storage` service namespace. The returned namespace can be used to get the
   * `Storage` service for the default app or an explicitly specified app.
   */
  get storage(): FirebaseServiceNamespace<Storage> {
    const fn: FirebaseServiceNamespace<Storage> = (app?: FirebaseApp) => {
      return this.ensureApp(app).storage();
    };
    return Object.assign(fn, {Storage});
  }

  /**
   * Gets the `Firestore` service namespace. The returned namespace can be used to get the
   * `Firestore` service for the default app or an explicitly specified app.
   */
  get firestore(): FirebaseServiceNamespace<Firestore> {
    const fn: FirebaseServiceNamespace<Firestore> = (app?: FirebaseApp) => {
      return this.ensureApp(app).firestore();
    };
    return Object.assign(fn, require('@google-cloud/firestore'));
  }

  /**
   * Gets the `InstanceId` service namespace. The returned namespace can be used to get the
   * `Instance` service for the default app or an explicitly specified app.
   */
  get instanceId(): FirebaseServiceNamespace<InstanceId> {
    const fn: FirebaseServiceNamespace<InstanceId> = (app?: FirebaseApp) => {
      return this.ensureApp(app).instanceId();
    };
    return Object.assign(fn, {InstanceId});
  }

  /**
   * Initializes the FirebaseApp instance.
   *
   * @param {FirebaseAppOptions} [options] Optional options for the FirebaseApp instance.
   *   If none present will try to initialize from the FIREBASE_CONFIG environment variable.
   *   If the environmet variable contains a string that starts with '{' it will be parsed as JSON,
   *   otherwise it will be assumed to be pointing to a file.
   * @param {string} [appName] Optional name of the FirebaseApp instance.
   *
   * @return {FirebaseApp} A new FirebaseApp instance.
   */
  public initializeApp(options?: FirebaseAppOptions, appName?: string): FirebaseApp {
    return this.INTERNAL.initializeApp(options, appName);
  }

  /**
   * Returns the FirebaseApp instance with the provided name (or the default FirebaseApp instance
   * if no name is provided).
   *
   * @param {string} [appName] Optional name of the FirebaseApp instance to return.
   * @return {FirebaseApp} The FirebaseApp instance which has the provided name.
   */
  public app(appName?: string): FirebaseApp {
    return this.INTERNAL.app(appName);
  }

  /*
   * Returns an array of all the non-deleted FirebaseApp instances.
   *
   * @return {Array<FirebaseApp>} An array of all the non-deleted FirebaseApp instances
   */
  public get apps(): FirebaseApp[] {
    return this.INTERNAL.apps;
  }

  private ensureApp(app?: FirebaseApp): FirebaseApp {
    if (typeof app === 'undefined') {
      app = this.app();
    }
    return app;
  }
}

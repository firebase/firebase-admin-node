/*!
 * @license
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

import { deepExtend } from './utils/deep-copy';
import { AppErrorCodes, FirebaseAppError } from './utils/error';
import { AppOptions, app } from './firebase-namespace-api';
import { AppHook, FirebaseApp } from './firebase-app';
import { FirebaseServiceFactory, FirebaseServiceInterface } from './firebase-service';
import { cert, refreshToken, applicationDefault } from './credential/credential';
import { getApplicationDefault } from './credential/credential-internal';

import { auth } from './auth/index';
import { database } from './database/index';
import { firestore } from './firestore/index';
import { instanceId } from './instance-id/index';
import { machineLearning } from './machine-learning/index';
import { messaging } from './messaging/index';
import { projectManagement } from './project-management/index';
import { remoteConfig } from './remote-config/index';
import { securityRules } from './security-rules/index';
import { storage } from './storage/index';

import * as validator from './utils/validator';
import { getSdkVersion } from './utils/index';

import App = app.App;
import Auth = auth.Auth;
import Database = database.Database;
import Firestore = firestore.Firestore;
import InstanceId = instanceId.InstanceId;
import MachineLearning = machineLearning.MachineLearning;
import Messaging = messaging.Messaging;
import ProjectManagement = projectManagement.ProjectManagement;
import RemoteConfig = remoteConfig.RemoteConfig;
import SecurityRules = securityRules.SecurityRules;
import Storage = storage.Storage;

const DEFAULT_APP_NAME = '[DEFAULT]';

/**
 * Constant holding the environment variable name with the default config.
 * If the environment variable contains a string that starts with '{' it will be parsed as JSON,
 * otherwise it will be assumed to be pointing to a file.
 */
export const FIREBASE_CONFIG_VAR = 'FIREBASE_CONFIG';

export interface FirebaseServiceNamespace <T> {
  (app?: App): T;
  [key: string]: any;
}

/**
 * Internals of a FirebaseNamespace instance.
 */
export class FirebaseNamespaceInternals {
  public serviceFactories: {[serviceName: string]: FirebaseServiceFactory} = {};

  private apps_: {[appName: string]: App} = {};
  private appHooks_: {[service: string]: AppHook} = {};

  constructor(public firebase_: {[key: string]: any}) {}

  /**
   * Initializes the App instance.
   *
   * @param options Optional options for the App instance. If none present will try to initialize
   *   from the FIREBASE_CONFIG environment variable. If the environment variable contains a string
   *   that starts with '{' it will be parsed as JSON, otherwise it will be assumed to be pointing
   *   to a file.
   * @param appName Optional name of the FirebaseApp instance.
   *
   * @return A new App instance.
   */
  public initializeApp(options?: AppOptions, appName = DEFAULT_APP_NAME): App {
    if (typeof options === 'undefined') {
      options = this.loadOptionsFromEnvVar();
      options.credential = getApplicationDefault();
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
   * Returns the App instance with the provided name (or the default App instance
   * if no name is provided).
   *
   * @param appName Optional name of the FirebaseApp instance to return.
   * @return The App instance which has the provided name.
   */
  public app(appName = DEFAULT_APP_NAME): App {
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
   * Returns an array of all the non-deleted App instances.
   */
  public get apps(): App[] {
    // Return a copy so the caller cannot mutate the array
    return Object.keys(this.apps_).map((appName) => this.apps_[appName]);
  }

  /*
   * Removes the specified App instance.
   */
  public removeApp(appName: string): void {
    if (typeof appName === 'undefined') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_NAME,
        'No Firebase app name provided. App name must be a non-empty string.',
      );
    }

    const appToRemove = this.app(appName);
    this.callAppHooks_(appToRemove, 'delete');
    delete this.apps_[appName];
  }

  /**
   * Registers a new service on this Firebase namespace.
   *
   * @param serviceName The name of the Firebase service to register.
   * @param createService A factory method to generate an instance of the Firebase service.
   * @param serviceProperties Optional properties to extend this Firebase namespace with.
   * @param appHook Optional callback that handles app-related events like app creation and deletion.
   * @return The Firebase service's namespace.
   */
  public registerService(
    serviceName: string,
    createService: FirebaseServiceFactory,
    serviceProperties?: object,
    appHook?: AppHook): FirebaseServiceNamespace<FirebaseServiceInterface> {
    let errorMessage;
    if (typeof serviceName === 'undefined') {
      errorMessage = 'No service name provided. Service name must be a non-empty string.';
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

    // The service namespace is an accessor function which takes a FirebaseApp instance
    // or uses the default app if no FirebaseApp instance is provided
    const serviceNamespace: FirebaseServiceNamespace<FirebaseServiceInterface> = (appArg?: App) => {
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
   * provided App instance.
   *
   * @param app The App instance whose app hooks to call.
   * @param eventName The event name representing which app hooks to call.
   */
  private callAppHooks_(app: App, eventName: string): void {
    Object.keys(this.serviceFactories).forEach((serviceName) => {
      if (this.appHooks_[serviceName]) {
        this.appHooks_[serviceName](eventName, app);
      }
    });
  }

  /**
   * Parse the file pointed to by the FIREBASE_CONFIG_VAR, if it exists.
   * Or if the FIREBASE_CONFIG_ENV contains a valid JSON object, parse it directly.
   * If the environment variable contains a string that starts with '{' it will be parsed as JSON,
   * otherwise it will be assumed to be pointing to a file.
   */
  private loadOptionsFromEnvVar(): AppOptions {
    const config = process.env[FIREBASE_CONFIG_VAR];
    if (!validator.isNonEmptyString(config)) {
      return {};
    }
    try {
      const contents = config.startsWith('{') ? config : fs.readFileSync(config, 'utf8');
      return JSON.parse(contents) as AppOptions;
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
  cert, refreshToken, applicationDefault
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
  public SDK_VERSION = getSdkVersion();
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
    const fn: FirebaseServiceNamespace<Auth> = (app?: App) => {
      return this.ensureApp(app).auth();
    };
    const auth = require('./auth/auth').Auth;
    return Object.assign(fn, { Auth: auth });
  }

  /**
   * Gets the `Database` service namespace. The returned namespace can be used to get the
   * `Database` service for the default app or an explicitly specified app.
   */
  get database(): FirebaseServiceNamespace<Database> {
    const fn: FirebaseServiceNamespace<Database> = (app?: App) => {
      return this.ensureApp(app).database();
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return Object.assign(fn, require('@firebase/database'));
  }

  /**
   * Gets the `Messaging` service namespace. The returned namespace can be used to get the
   * `Messaging` service for the default app or an explicitly specified app.
   */
  get messaging(): FirebaseServiceNamespace<Messaging> {
    const fn: FirebaseServiceNamespace<Messaging> = (app?: App) => {
      return this.ensureApp(app).messaging();
    };
    const messaging = require('./messaging/messaging').Messaging;
    return Object.assign(fn, { Messaging: messaging });
  }

  /**
   * Gets the `Storage` service namespace. The returned namespace can be used to get the
   * `Storage` service for the default app or an explicitly specified app.
   */
  get storage(): FirebaseServiceNamespace<Storage> {
    const fn: FirebaseServiceNamespace<Storage> = (app?: App) => {
      return this.ensureApp(app).storage();
    };
    const storage = require('./storage/storage').Storage;
    return Object.assign(fn, { Storage: storage });
  }

  /**
   * Gets the `Firestore` service namespace. The returned namespace can be used to get the
   * `Firestore` service for the default app or an explicitly specified app.
   */
  get firestore(): FirebaseServiceNamespace<Firestore> {
    let fn: FirebaseServiceNamespace<Firestore> = (app?: App) => {
      return this.ensureApp(app).firestore();
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firestore = require('@google-cloud/firestore');

    fn = Object.assign(fn, firestore.Firestore);

    // `v1beta1` and `v1` are lazy-loaded in the Firestore SDK. We use the same trick here
    // to avoid triggering this lazy-loading upon initialization.
    Object.defineProperty(fn, 'v1beta1', {
      get: () => {
        return firestore.v1beta1;
      },
    });
    Object.defineProperty(fn, 'v1', {
      get: () => {
        return firestore.v1;
      },
    });

    return fn;
  }

  /**
   * Gets the `MachineLearning` service namespace. The returned namespace can be
   * used to get the `MachineLearning` service for the default app or an
   * explicityly specified app.
   */
  get machineLearning(): FirebaseServiceNamespace<MachineLearning> {
    const fn: FirebaseServiceNamespace<MachineLearning> =
        (app?: App) => {
          return this.ensureApp(app).machineLearning();
        };
    const machineLearning =
        require('./machine-learning/machine-learning').MachineLearning;
    return Object.assign(fn, { MachineLearning: machineLearning });
  }

  /**
   * Gets the `InstanceId` service namespace. The returned namespace can be used to get the
   * `Instance` service for the default app or an explicitly specified app.
   */
  get instanceId(): FirebaseServiceNamespace<InstanceId> {
    const fn: FirebaseServiceNamespace<InstanceId> = (app?: App) => {
      return this.ensureApp(app).instanceId();
    };
    const instanceId = require('./instance-id/instance-id').InstanceId;
    return Object.assign(fn, { InstanceId: instanceId });
  }

  /**
   * Gets the `ProjectManagement` service namespace. The returned namespace can be used to get the
   * `ProjectManagement` service for the default app or an explicitly specified app.
   */
  get projectManagement(): FirebaseServiceNamespace<ProjectManagement> {
    const fn: FirebaseServiceNamespace<ProjectManagement> = (app?: App) => {
      return this.ensureApp(app).projectManagement();
    };
    const projectManagement = require('./project-management/project-management').ProjectManagement;
    return Object.assign(fn, { ProjectManagement: projectManagement });
  }

  /**
   * Gets the `SecurityRules` service namespace. The returned namespace can be used to get the
   * `SecurityRules` service for the default app or an explicitly specified app.
   */
  get securityRules(): FirebaseServiceNamespace<SecurityRules> {
    const fn: FirebaseServiceNamespace<SecurityRules> = (app?: App) => {
      return this.ensureApp(app).securityRules();
    };
    const securityRules = require('./security-rules/security-rules').SecurityRules;
    return Object.assign(fn, { SecurityRules: securityRules });
  }

  /**
   * Gets the `RemoteConfig` service namespace. The returned namespace can be used to get the
   * `RemoteConfig` service for the default app or an explicitly specified app.
   */
  get remoteConfig(): FirebaseServiceNamespace<RemoteConfig> {
    const fn: FirebaseServiceNamespace<RemoteConfig> = (app?: App) => {
      return this.ensureApp(app).remoteConfig();
    };
    const remoteConfig = require('./remote-config/remote-config').RemoteConfig;
    return Object.assign(fn, { RemoteConfig: remoteConfig });
  }

  // TODO: Change the return types to app.App in the following methods.

  /**
   * Initializes the FirebaseApp instance.
   *
   * @param options Optional options for the FirebaseApp instance.
   *   If none present will try to initialize from the FIREBASE_CONFIG environment variable.
   *   If the environment variable contains a string that starts with '{' it will be parsed as JSON,
   *   otherwise it will be assumed to be pointing to a file.
   * @param appName Optional name of the FirebaseApp instance.
   *
   * @return A new FirebaseApp instance.
   */
  public initializeApp(options?: AppOptions, appName?: string): App {
    return this.INTERNAL.initializeApp(options, appName);
  }

  /**
   * Returns the FirebaseApp instance with the provided name (or the default FirebaseApp instance
   * if no name is provided).
   *
   * @param appName Optional name of the FirebaseApp instance to return.
   * @return The FirebaseApp instance which has the provided name.
   */
  public app(appName?: string): App {
    return this.INTERNAL.app(appName);
  }

  /*
   * Returns an array of all the non-deleted FirebaseApp instances.
   */
  public get apps(): App[] {
    return this.INTERNAL.apps;
  }

  private ensureApp(app?: App): App {
    if (typeof app === 'undefined') {
      app = this.app();
    }
    return app;
  }
}

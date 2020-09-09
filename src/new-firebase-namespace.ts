import fs = require('fs');

import { FirebaseAppError, AppErrorCodes } from './utils/error';
import { FirebaseApp, AppHook } from './firebase-app';
import { Agent } from 'http';
import { getApplicationDefault } from './credential/credential-internal';
import { credential } from './credential/index';
import * as validator from './utils/validator';
import { FirebaseNamespaceInternals } from './firebase-namespace';
import { FirebaseServiceFactory } from './firebase-service';

export { remoteConfig } from './remote-config/index';

const DEFAULT_APP_NAME = '[DEFAULT]';
const FIREBASE_CONFIG_VAR = 'FIREBASE_CONFIG';

const serviceFactories: {[serviceName: string]: FirebaseServiceFactory} = {};
const apps_: {[appName: string]: FirebaseApp} = {};
const appHooks_: {[service: string]: AppHook} = {};

export interface AppOptions {
  credential?: credential.Credential;
  databaseAuthVariableOverride?: object | null;
  databaseURL?: string;
  serviceAccountId?: string;
  storageBucket?: string;
  projectId?: string;
  httpAgent?: Agent;
}

/* eslint-disable @typescript-eslint/no-namespace */
export namespace app {
  export type App = FirebaseApp;
}

export { credential };

export function initializeApp(options?: AppOptions, appName = DEFAULT_APP_NAME): app.App {
  if (typeof options === 'undefined') {
    options = loadOptionsFromEnvVar();
    options.credential = getApplicationDefault();
  }
  if (typeof appName !== 'string' || appName === '') {
    throw new FirebaseAppError(
      AppErrorCodes.INVALID_APP_NAME,
      `Invalid Firebase app name "${appName}" provided. App name must be a non-empty string.`,
    );
  } else if (appName in apps_) {
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

  const app = new FirebaseApp(options, appName, new FirebaseNamespaceInternals({}));

  apps_[appName] = app;

  callAppHooks_(app, 'create');

  return app;
}

function loadOptionsFromEnvVar(): AppOptions {
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

function callAppHooks_(app: FirebaseApp, eventName: string): void {
  Object.keys(serviceFactories).forEach((serviceName) => {
    if (appHooks_[serviceName]) {
      appHooks_[serviceName](eventName, app);
    }
  });
}

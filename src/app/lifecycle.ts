/*!
 * @license
 * Copyright 2021 Google Inc.
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

import * as validator from '../utils/validator';
import { AppErrorCodes, FirebaseAppError } from '../utils/error';
import { App, AppOptions } from './core';
import { getApplicationDefault } from './credential-internal';
import { FirebaseApp } from './firebase-app';

const DEFAULT_APP_NAME = '[DEFAULT]';

export class AppStore {

  private readonly appStore = new Map<string, FirebaseApp>();

  public initializeApp(options?: AppOptions, appName: string = DEFAULT_APP_NAME): App {
    if (typeof options === 'undefined') {
      options = loadOptionsFromEnvVar();
      options.credential = getApplicationDefault();
    }

    if (typeof appName !== 'string' || appName === '') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_NAME,
        `Invalid Firebase app name "${appName}" provided. App name must be a non-empty string.`,
      );
    } else if (this.appStore.has(appName)) {
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
    this.appStore.set(app.name, app);
    return app;
  }

  public getApp(appName: string = DEFAULT_APP_NAME): App {
    if (typeof appName !== 'string' || appName === '') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_NAME,
        `Invalid Firebase app name "${appName}" provided. App name must be a non-empty string.`,
      );
    } else if (!this.appStore.has(appName)) {
      let errorMessage: string = (appName === DEFAULT_APP_NAME)
        ? 'The default Firebase app does not exist. ' : `Firebase app named "${appName}" does not exist. `;
      errorMessage += 'Make sure you call initializeApp() before using any of the Firebase services.';

      throw new FirebaseAppError(AppErrorCodes.NO_APP, errorMessage);
    }

    return this.appStore.get(appName)!;
  }

  public getApps(): App[] {
    // Return a copy so the caller cannot mutate the array
    return Array.from(this.appStore.values());
  }

  public deleteApp(app: App): Promise<void> {
    if (typeof app !== 'object' || app === null || !('options' in app)) {
      throw new FirebaseAppError(AppErrorCodes.INVALID_ARGUMENT, 'Invalid app argument.');
    }

    // Make sure the given app already exists.
    const existingApp = getApp(app.name);

    // Delegate delete operation to the App instance itself. That will also remove the App
    // instance from the AppStore.
    return (existingApp as FirebaseApp).delete();
  }

  public clearAllApps(): Promise<void> {
    const promises: Array<Promise<void>> = [];
    this.getApps().forEach((app) => {
      promises.push(this.deleteApp(app));
    })

    return Promise.all(promises).then();
  }

  /**
   * Removes the specified App instance from the store. This is currently called by the
   * {@link FirebaseApp.delete} method. Can be removed once the app deletion is handled
   * entirely by the {@link deleteApp} top-level function.
   */
  public removeApp(appName: string): void {
    this.appStore.delete(appName);
  }
}

export const defaultAppStore = new AppStore();

export function initializeApp(options?: AppOptions, appName: string = DEFAULT_APP_NAME): App {
  return defaultAppStore.initializeApp(options, appName);
}

export function getApp(appName: string = DEFAULT_APP_NAME): App {
  return defaultAppStore.getApp(appName);
}

export function getApps(): App[] {
  return defaultAppStore.getApps();
}

/**
 * Renders this given `App` unusable and frees the resources of
 * all associated services (though it does *not* clean up any backend
 * resources). When running the SDK locally, this method
 * must be called to ensure graceful termination of the process.
 *
 * @example
 * ```javascript
 * deleteApp(app)
 *   .then(function() {
 *     console.log("App deleted successfully");
 *   })
 *   .catch(function(error) {
 *     console.log("Error deleting app:", error);
 *   });
 * ```
 */
export function deleteApp(app: App): Promise<void> {
  return defaultAppStore.deleteApp(app);
}

/**
 * Constant holding the environment variable name with the default config.
 * If the environment variable contains a string that starts with '{' it will be parsed as JSON,
 * otherwise it will be assumed to be pointing to a file.
 */
export const FIREBASE_CONFIG_VAR = 'FIREBASE_CONFIG';

/**
 * Parse the file pointed to by the FIREBASE_CONFIG_VAR, if it exists.
 * Or if the FIREBASE_CONFIG_ENV contains a valid JSON object, parse it directly.
 * If the environment variable contains a string that starts with '{' it will be parsed as JSON,
 * otherwise it will be assumed to be pointing to a file.
 */
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

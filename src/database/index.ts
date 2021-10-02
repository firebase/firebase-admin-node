/*!
 * Copyright 2020 Google Inc.
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

/**
 * Firebase Realtime Database.
 *
 * @packageDocumentation
 */

import * as rtdb from '@firebase/database-types';
import {
  enableLogging as enableLoggingFunc,
  ServerValue as serverValueConst,
} from '@firebase/database-compat/standalone';

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { Database, DatabaseService } from './database';

export { Database };
export {
  DataSnapshot,
  EventType,
  OnDisconnect,
  Query,
  Reference,
  ThenableReference,
} from '@firebase/database-types';

// TODO: Remove the following any-cast once the typins in @firebase/database-types are fixed.

/**
 * {@link https://firebase.google.com/docs/reference/js/firebase.database#enablelogging | enableLogging}
 * function from the `@firebase/database` package.
 */
export const enableLogging: typeof rtdb.enableLogging = enableLoggingFunc as any;

/**
 * {@link https://firebase.google.com/docs/reference/js/firebase.database.ServerValue | ServerValue}
 * constant from the `@firebase/database` package.
 */
export const ServerValue: rtdb.ServerValue = serverValueConst;

/**
 * Gets the {@link Database} service for the default
 * app or a given app.
 *
 * `getDatabase()` can be called with no arguments to access the default
 * app's `Database` service or as `getDatabase(app)` to access the
 * `Database` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Database service for the default app
 * const defaultDatabase = getDatabase();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Database service for a specific app
 * const otherDatabase = getDatabase(app);
 * ```
 *
 * @param App - whose `Database` service to
 *   return. If not provided, the default `Database` service will be returned.
 *
 * @returns The default `Database` service if no app
 *   is provided or the `Database` service associated with the provided app.
 */
export function getDatabase(app?: App): Database {
  return getDatabaseInstance({ app });
}

/**
 * Gets the {@link Database} service for the default
 * app or a given app.
 *
 * `getDatabaseWithUrl()` can be called with no arguments to access the default
 * app's {@link Database} service or as `getDatabaseWithUrl(app)` to access the
 * {@link Database} service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Database service for the default app
 * const defaultDatabase = getDatabaseWithUrl('https://example.firebaseio.com');
 * ```
 *
 * @example
 * ```javascript
 * // Get the Database service for a specific app
 * const otherDatabase = getDatabaseWithUrl('https://example.firebaseio.com', app);
 * ```
 *
 * @param App - whose `Database` service to
 *   return. If not provided, the default `Database` service will be returned.
 *
 * @returns The default `Database` service if no app
 *   is provided or the `Database` service associated with the provided app.
 */
export function getDatabaseWithUrl(url: string, app?: App): Database {
  return getDatabaseInstance({ url, app });
}

function  getDatabaseInstance(options: { url?: string; app?: App }): Database {
  let { app } = options;
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  const dbService = firebaseApp.getOrInitService('database', (app) => new DatabaseService(app));
  return dbService.getDatabase(options.url);
}

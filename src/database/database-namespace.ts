/*!
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

import * as rtdb from '@firebase/database-types';
import { App } from '../app';
import { Database as TDatabase } from './database';

/**
 * Gets the {@link database.Database `Database`} service for the default
 * app or a given app.
 *
 * `admin.database()` can be called with no arguments to access the default
 * app's {@link database.Database `Database`} service or as
 * `admin.database(app)` to access the
 * {@link database.Database `Database`} service associated with a specific
 * app.
 *
 * `admin.database` is also a namespace that can be used to access global
 * constants and methods associated with the `Database` service.
 *
 * @example
 * ```javascript
 * // Get the Database service for the default app
 * var defaultDatabase = admin.database();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Database service for a specific app
 * var otherDatabase = admin.database(app);
 * ```
 *
 * @param App whose `Database` service to
 *   return. If not provided, the default `Database` service will be returned.
 *
 * @return The default `Database` service if no app
 *   is provided or the `Database` service associated with the provided app.
 */
export declare function database(app?: App): database.Database;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace database {
  export type Database = TDatabase;
  export type DataSnapshot = rtdb.DataSnapshot;
  export type EventType = rtdb.EventType;
  export type OnDisconnect = rtdb.OnDisconnect;
  export type Query = rtdb.Query;
  export type Reference = rtdb.Reference;
  export type ThenableReference = rtdb.ThenableReference;

  export declare const enableLogging: typeof rtdb.enableLogging;

  /**
   * [`ServerValue`](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue)
   * module from the `@firebase/database` package.
   */
  export declare const ServerValue: rtdb.ServerValue;
}

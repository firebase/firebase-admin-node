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

import { app } from '../firebase-namespace-api';
import { ServerValue as sv } from '@firebase/database';
import * as rtdb from '@firebase/database-types';

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
export declare function database(app?: app.App): database.Database;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace database {
  export interface Database extends rtdb.FirebaseDatabase {
    /**
     * Gets the currently applied security rules as a string. The return value consists of
     * the rules source including comments.
     *
     * @return A promise fulfilled with the rules as a raw string.
     */
    getRules(): Promise<string>;

    /**
     * Gets the currently applied security rules as a parsed JSON object. Any comments in
     * the original source are stripped away.
     *
     * @return A promise fulfilled with the parsed rules object.
     */
    getRulesJSON(): Promise<object>;

    /**
     * Sets the specified rules on the Firebase Realtime Database instance. If the rules source is
     * specified as a string or a Buffer, it may include comments.
     *
     * @param source Source of the rules to apply. Must not be `null` or empty.
     * @return Resolves when the rules are set on the Realtime Database.
     */
    setRules(source: string | Buffer | object): Promise<void>;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  export import DataSnapshot = rtdb.DataSnapshot;
  export import EventType = rtdb.EventType;
  export import OnDisconnect = rtdb.OnDisconnect;
  export import Query = rtdb.Query;
  export import Reference = rtdb.Reference;
  export import ThenableReference = rtdb.ThenableReference;
  export import enableLogging = rtdb.enableLogging;

  /**
   * [`ServerValue`](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue)
   * module from the `@firebase/database` package.
   */
  export const ServerValue: rtdb.ServerValue = sv;
}

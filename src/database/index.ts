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

import { FirebaseApp } from '../firebase-app';
import * as firebaseDbApi from '@firebase/database';
import * as adminDbApi from './database';

/**
 * Gets the {@link admin.database.Database `Database`} service for the default
 * app or a given app.
 *
 * `admin.database()` can be called with no arguments to access the default
 * app's {@link admin.database.Database `Database`} service or as
 * `admin.database(app)` to access the
 * {@link admin.database.Database `Database`} service associated with a specific
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
export function database(app: FirebaseApp): firebaseDbApi.Database {
  return app.database();
}

// This is unfortunate. But it seems we must define a namespace to make
// the typings work correctly. Otherwise `admin.database()` cannot be called
// like a function. It would be great if we can find an alternative.
/* eslint-disable @typescript-eslint/no-namespace */
export namespace database {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // For context: github.com/typescript-eslint/typescript-eslint/issues/363
  export import Database = firebaseDbApi.Database;
  export import DataSnapshot = firebaseDbApi.DataSnapshot;
  export import OnDisconnect = firebaseDbApi.OnDisconnect;
  export import EventType = adminDbApi.EventType;
  export import Query = firebaseDbApi.Query;
  export import Reference = firebaseDbApi.Reference;
  export import ThenableReference = adminDbApi.ThenableReference;
  export import enableLogging = firebaseDbApi.enableLogging;
  export import ServerValue = firebaseDbApi.ServerValue;
}



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
import { ServerValue as sv } from '@firebase/database';
import * as adminDb from './database';
import * as firebaseDbTypesApi from '@firebase/database-types';
import * as firebaseAdmin from '../index';

export function database(app?: FirebaseApp): adminDb.Database {
  if (typeof(app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.database();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.database()` cannot be called like a function. Temporarily,
 * admin.database is used as the namespace name because we cannot barrel
 * re-export the contents from @firebase/database-types, and we want it to
 * match the namespacing in the re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.database {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import DataSnapshot = firebaseDbTypesApi.DataSnapshot;
  export import Database = adminDb.Database;
  export import EventType = firebaseDbTypesApi.EventType;
  export import OnDisconnect = firebaseDbTypesApi.OnDisconnect;
  export import Query = firebaseDbTypesApi.Query;
  export import Reference = firebaseDbTypesApi.Reference;
  export import ThenableReference = firebaseDbTypesApi.ThenableReference;
  export import enableLogging = firebaseDbTypesApi.enableLogging;

  export const ServerValue: firebaseDbTypesApi.ServerValue = sv;
}

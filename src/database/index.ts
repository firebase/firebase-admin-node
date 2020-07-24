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
import * as firebaseAdmin from '../index';
import * as firebaseRtdbApi from '@firebase/database';
import * as firebaseRtdbTypesApi from '@firebase/database-types';

export function database(app?: FirebaseApp): firebaseRtdbApi.Database {
  if (typeof(app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.database();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.database()` cannot be called like a function. Temporarily,
 * admin.database is used as the namespace name because we cannot barrel 
 * re-export the contents from @firebase/database-types. 
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.database {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import Database = firebaseRtdbTypesApi.FirebaseDatabase;
  export import DataSnapshot = firebaseRtdbTypesApi.DataSnapshot;
  export import OnDisconnect = firebaseRtdbTypesApi.OnDisconnect;
  export import EventType = firebaseRtdbTypesApi.EventType;
  export import Query = firebaseRtdbTypesApi.Query;
  export import Reference = firebaseRtdbTypesApi.Reference;
  export import ThenableReference = firebaseRtdbTypesApi.ThenableReference;
  export import enableLogging = firebaseRtdbTypesApi.enableLogging;
  export import ServerValue = firebaseRtdbTypesApi.ServerValue;
}

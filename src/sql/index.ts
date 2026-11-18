/**
 * Firebase SQL service.
 *
 * @packageDocumentation
 */

/*!
 * @license
 * Copyright 2026 Google LLC
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

import { type App, getApp } from '../app';
import type { FirebaseApp } from '../app/firebase-app';
import type { ServiceConfig } from './serviceConfig';
import type { FirebaseSql } from './FirebaseSql';
import { FirebaseSqlService } from './FirebaseSqlService';


export function getFirebaseSql(serviceConfig: ServiceConfig, app?: App): FirebaseSql {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  const sqlService = firebaseApp.getOrInitService('sql', (app) => new FirebaseSqlService(app));
  return sqlService.getSql(serviceConfig);
}
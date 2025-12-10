/*!
 * @license
 * Copyright 2025 Google LLC
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
 * Firebase Phone Number Verification.
 *
 * @packageDocumentation
 */

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { Fpnv } from './fpnv';

/**
 * Gets the {@link Fpnv} service for the default app or a
 * given app.
 *
 * `getFirebasePnv()` can be called with no arguments to access the default app's
 * {@link Fpnv} service or as `getFirebasePnv(app)` to access the
 * {@link Fpnv} service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Fpnv service for the default app
 * const defaultFpnv = getFirebasePnv();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Fpnv service for a given app
 * const otherFpnv = getFirebasePnv(otherApp);
 * ```
 *
 */
export function getFirebasePnv(app?: App): Fpnv {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('fpnv', (app) => new Fpnv(app));
}

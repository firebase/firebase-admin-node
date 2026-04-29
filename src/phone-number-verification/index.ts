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
import { PhoneNumberVerification } from './phone-number-verification';

export {
  PhoneNumberVerification
} from './phone-number-verification';

export {
  PhoneNumberVerificationToken,
} from './phone-number-verification-api'

/**
 * Gets the {@link PhoneNumberVerification} service for the default app or a
 * given app.
 *
 * `getPhoneNumberVerification()` can be called with no arguments to access the default app's
 * {@link PhoneNumberVerification} service or as `getPhoneNumberVerification(app)` to access the
 * {@link PhoneNumberVerification} service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the PhoneNumberVerification service for the default app
 * const defaultPnv = getPhoneNumberVerification();
 * ```
 *
 * @example
 * ```javascript
 * // Get the PhoneNumberVerification service for a given app
 * const otherPnv = getPhoneNumberVerification(otherApp);
 * ```
 *
 * @returns The {@link PhoneNumberVerification} service associated with the provided app.
 *
 */
export function getPhoneNumberVerification(app?: App): PhoneNumberVerification {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('phone-number-verification', (app) => new PhoneNumberVerification(app));
}

export {
  FirebasePhoneNumberVerificationError,
  PhoneNumberVerificationErrorCode,
} from './phone-number-verification-api-client-internal';

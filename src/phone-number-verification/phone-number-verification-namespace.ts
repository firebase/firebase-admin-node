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

import { App } from '../app';
import {
  PhoneNumberVerificationToken as TPhoneNumberVerificationToken,
} from './phone-number-verification-api';
import { PhoneNumberVerification as TPhoneNumberVerification } from './phone-number-verification';

/**
 * Gets the {@link firebase-admin.phone-number-verification#PhoneNumberVerification} service
 * for the default app or a given app.
 *
 * `admin.phoneNumberVerification()` can be called with no arguments to access the default
 * app's `PhoneNumberVerification` service or as `admin.phoneNumberVerification(app)` to access the
 * `PhoneNumberVerification` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the `PhoneNumberVerification` service for the default app
 * var defaultPhoneNumberVerification = admin.phoneNumberVerification();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `PhoneNumberVerification` service for a given app
 * var otherPhoneNumberVerification = admin.phoneNumberVerification(otherApp);
 * ```
 *
 * @param app - Optional app for which to return the `PhoneNumberVerification` service.
 *   If not provided, the default `PhoneNumberVerification` service is returned.
 *
 * @returns The default `PhoneNumberVerification` service if no
 *   app is provided, or the `PhoneNumberVerification` service associated with the provided
 *   app.
 */
export declare function phoneNumberVerification(app?: App): phoneNumberVerification.PhoneNumberVerification;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace phoneNumberVerification {
  /**
   * Type alias to {@link firebase-admin.phone-number-verification#PhoneNumberVerification}.
   */
  export type PhoneNumberVerification = TPhoneNumberVerification;

  /**
   * Type alias to {@link firebase-admin.phone-number-verification#PhoneNumberVerificationToken}.
   */
  export type PhoneNumberVerificationToken = TPhoneNumberVerificationToken;
}


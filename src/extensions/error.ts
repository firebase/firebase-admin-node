/*!
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

import { PrefixedFirebaseError, ErrorInfo } from '../utils/error';

/**
 * Extensions client error codes and their default messages.
 */
export type ExtensionsErrorCode = 'invalid-argument' | 'not-found' | 'forbidden' | 'internal-error' | 'unknown-error';

/**
 * Firebase Extensions error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseExtensionsError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super('Extensions', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

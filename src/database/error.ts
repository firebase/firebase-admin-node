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

import { FirebaseError, ErrorInfo } from '../utils/error';

/**
 * The constant mapping for valid Database client error codes.
 */
export const DatabaseErrorCode = {
  INTERNAL_ERROR: 'internal-error',
  INVALID_ARGUMENT: 'invalid-argument',
} as const;

/**
 * The type definition for valid Database client error codes.
 */
export type DatabaseErrorCode = typeof DatabaseErrorCode[keyof typeof DatabaseErrorCode];

/**
 * Firebase Database error code structure. This extends `FirebaseError`.
 */
export class FirebaseDatabaseError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'database';

  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: `database/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

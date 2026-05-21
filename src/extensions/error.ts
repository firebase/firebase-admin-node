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
 * The constant mapping for valid Extensions client error codes.
 */
export const ExtensionsErrorCode = {
  INVALID_ARGUMENT: 'invalid-argument',
  NOT_FOUND: 'not-found',
  FORBIDDEN: 'forbidden',
  INTERNAL_ERROR: 'internal-error',
  UNKNOWN_ERROR: 'unknown-error',
} as const;

/**
 * The type definition for valid Extensions client error codes.
 */
export type ExtensionsErrorCode = typeof ExtensionsErrorCode[keyof typeof ExtensionsErrorCode];

/**
 * Firebase Extensions error code structure. This extends FirebaseError.
 */
export class FirebaseExtensionsError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'Extensions';

  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super({
      code: `Extensions/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

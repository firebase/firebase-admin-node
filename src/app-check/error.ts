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

/** @const {Record<string, AppCheckErrorCode>} App Check server to client error code mapping. */
export const APP_CHECK_ERROR_CODE_MAPPING: Record<string, AppCheckErrorCode> = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
};

/**
 * The constant mapping for valid App Check client error codes.
 */
export const AppCheckErrorCode = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  APP_CHECK_TOKEN_EXPIRED: 'app-check-token-expired',
  UNKNOWN: 'unknown-error',
} as const;

/**
 * The type definition for valid App Check client error codes.
 */
export type AppCheckErrorCode = typeof AppCheckErrorCode[keyof typeof AppCheckErrorCode];

/**
 * Firebase App Check error type. This extends FirebaseError.
 */
export class FirebaseAppCheckError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'app-check';

  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super({
      code: `app-check/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

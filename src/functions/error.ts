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

/** @const {Record<string, FunctionsErrorCode>} Functions server to client error code mapping. */
export const FUNCTIONS_ERROR_CODE_MAPPING: Record<string, FunctionsErrorCode> = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  FAILED_PRECONDITION: 'failed-precondition',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
};

/**
 * Functions client error codes and their default messages.
 */
export type FunctionsErrorCode =
  | 'aborted'
  | 'invalid-argument'
  | 'invalid-credential'
  | 'internal-error'
  | 'failed-precondition'
  | 'permission-denied'
  | 'unauthenticated'
  | 'not-found'
  | 'unknown-error'
  | 'task-already-exists';

/**
 * Firebase Functions error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseFunctionsError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super('functions', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

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

/** @const {Record<string, RemoteConfigErrorCode>} Remote Config server to client error code mapping. */
export const ERROR_CODE_MAPPING: Record<string, RemoteConfigErrorCode> = {
  ABORTED: 'aborted',
  ALREADY_EXISTS: 'already-exists',
  INVALID_ARGUMENT: 'invalid-argument',
  INTERNAL: 'internal-error',
  FAILED_PRECONDITION: 'failed-precondition',
  NOT_FOUND: 'not-found',
  OUT_OF_RANGE: 'out-of-range',
  PERMISSION_DENIED: 'permission-denied',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  UNAUTHENTICATED: 'unauthenticated',
  UNKNOWN: 'unknown-error',
};

/**
 * Remote Config client error codes and their default messages.
 */
export type RemoteConfigErrorCode =
  | 'aborted'
  | 'already-exists'
  | 'failed-precondition'
  | 'internal-error'
  | 'invalid-argument'
  | 'not-found'
  | 'out-of-range'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'unauthenticated'
  | 'unknown-error';

/**
 * Firebase Remote Config error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseRemoteConfigError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super('remote-config', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

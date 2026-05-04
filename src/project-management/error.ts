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
 * Project Management client error codes.
 */
export type ProjectManagementErrorCode =
  | 'already-exists'
  | 'authentication-error'
  | 'internal-error'
  | 'invalid-argument'
  | 'invalid-project-id'
  | 'invalid-server-response'
  | 'not-found'
  | 'service-unavailable'
  | 'unknown-error';

/**
 * Firebase project management error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseProjectManagementError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('project-management', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

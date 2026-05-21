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
 * The constant mapping for valid Project Management client error codes.
 */
export const ProjectManagementErrorCode = {
  ALREADY_EXISTS: 'already-exists',
  AUTHENTICATION_ERROR: 'authentication-error',
  INTERNAL_ERROR: 'internal-error',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_PROJECT_ID: 'invalid-project-id',
  INVALID_SERVER_RESPONSE: 'invalid-server-response',
  NOT_FOUND: 'not-found',
  SERVICE_UNAVAILABLE: 'service-unavailable',
  UNKNOWN_ERROR: 'unknown-error',
} as const;

/**
 * The type definition for valid Project Management client error codes.
 */
export type ProjectManagementErrorCode = typeof ProjectManagementErrorCode[keyof typeof ProjectManagementErrorCode];

/**
 * Firebase project management error code structure. This extends FirebaseError.
 */
export class FirebaseProjectManagementError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'project-management';

  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: `project-management/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

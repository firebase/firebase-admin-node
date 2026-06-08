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

import { ErrorInfo, FirebaseError } from '../utils/error';

/**
 * Firebase App error code structure. This extends `FirebaseError`.
 */
export class FirebaseAppError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'app';

  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: `app/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

/**
 * The constant mapping for valid App client error codes.
 */
export const AppErrorCode = {
  APP_DELETED: 'app-deleted',
  DUPLICATE_APP: 'duplicate-app',
  INVALID_ARGUMENT: 'invalid-argument',
  INTERNAL_ERROR: 'internal-error',
  INVALID_APP_NAME: 'invalid-app-name',
  INVALID_APP_OPTIONS: 'invalid-app-options',
  INVALID_CREDENTIAL: 'invalid-credential',
  NETWORK_ERROR: 'network-error',
  NETWORK_TIMEOUT: 'network-timeout',
  NO_APP: 'no-app',
  UNABLE_TO_PARSE_RESPONSE: 'unable-to-parse-response',
} as const;

/**
 * The type definition for valid App client error codes.
 */
export type AppErrorCode = typeof AppErrorCode[keyof typeof AppErrorCode];

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

import { ErrorInfo, PrefixedFirebaseError } from '../utils/error';

/**
 * Firebase App error code structure. This extends PrefixedFirebaseError.
 */
export class FirebaseAppError extends PrefixedFirebaseError {
  /**
   * @param info - The error code info.
   * @param message - The error message. This will override the default message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('app', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

/**
 * App client error codes and their default messages.
 */
export class AppErrorCodes {
  public static APP_DELETED = 'app-deleted';
  public static DUPLICATE_APP = 'duplicate-app';
  public static INVALID_ARGUMENT = 'invalid-argument';
  public static INTERNAL_ERROR = 'internal-error';
  public static INVALID_APP_NAME = 'invalid-app-name';
  public static INVALID_APP_OPTIONS = 'invalid-app-options';
  public static INVALID_CREDENTIAL = 'invalid-credential';
  public static NETWORK_ERROR = 'network-error';
  public static NETWORK_TIMEOUT = 'network-timeout';
  public static NO_APP = 'no-app';
  public static UNABLE_TO_PARSE_RESPONSE = 'unable-to-parse-response';
}

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
 * Installations client error codes.
 */
export type InstallationsErrorCode =
  | 'invalid-argument'
  | 'invalid-project-id'
  | 'invalid-installation-id'
  | 'api-error';

/**
 * Installations client error codes and their default messages.
 */
const installationsClientErrorMessages: Record<InstallationsErrorCode, string> = {
  'invalid-argument': 'Invalid argument provided.',
  'invalid-project-id': 'Invalid project ID provided.',
  'invalid-installation-id': 'Invalid installation ID provided.',
  'api-error': 'Installation ID API call failed.',
};

/**
 * Internal Installations client error code mapping used to construct ErrorInfo.
 */
export const installationsClientErrorCode = {
  INVALID_ARGUMENT: createInstallationsErrorInfo('invalid-argument'),
  INVALID_PROJECT_ID: createInstallationsErrorInfo('invalid-project-id'),
  INVALID_INSTALLATION_ID: createInstallationsErrorInfo('invalid-installation-id'),
  API_ERROR: createInstallationsErrorInfo('api-error'),
};

function createInstallationsErrorInfo(code: InstallationsErrorCode): ErrorInfo {
  return {
    code,
    message: installationsClientErrorMessages[code] || 'An unknown error occurred.',
  };
}

/**
 * Firebase Installations service error code structure. This extends `FirebaseError`.
 */
export class FirebaseInstallationsError extends FirebaseError {
  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: 'installations/' + info.code,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause
    });
  }
}

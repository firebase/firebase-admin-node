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
 * The constant mapping for valid Installations client error codes.
 */
export const InstallationsErrorCode = {
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_PROJECT_ID: 'invalid-project-id',
  INVALID_INSTALLATION_ID: 'invalid-installation-id',
  API_ERROR: 'api-error',
} as const;

/**
 * The type definition for valid Installations client error codes.
 */
export type InstallationsErrorCode = typeof InstallationsErrorCode[keyof typeof InstallationsErrorCode];

/**
 * Internal Installations client error code mapping used to construct ErrorInfo.
 */
export const installationsClientErrorCode: { readonly [K in keyof typeof InstallationsErrorCode]: ErrorInfo } = {
  INVALID_ARGUMENT: {
    code: InstallationsErrorCode.INVALID_ARGUMENT,
    message: 'Invalid argument provided.',
  },
  INVALID_PROJECT_ID: {
    code: InstallationsErrorCode.INVALID_PROJECT_ID,
    message: 'Invalid project ID provided.',
  },
  INVALID_INSTALLATION_ID: {
    code: InstallationsErrorCode.INVALID_INSTALLATION_ID,
    message: 'Invalid installation ID provided.',
  },
  API_ERROR: {
    code: InstallationsErrorCode.API_ERROR,
    message: 'Installation ID API call failed.',
  },
};

/**
 * Firebase Installations service error code structure. This extends `FirebaseError`.
 */
export class FirebaseInstallationsError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'installations';

  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: `installations/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

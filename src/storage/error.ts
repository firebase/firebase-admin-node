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
 * The constant mapping for valid Storage client error codes.
 */
export const StorageErrorCode = {
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_EMULATOR_HOST: 'invalid-emulator-host',
  MISSING_DEPENDENCIES: 'missing-dependencies',
  INVALID_CREDENTIAL: 'invalid-credential',
  NO_DOWNLOAD_TOKEN: 'no-download-token',
} as const;

/**
 * The type definition for valid Storage client error codes.
 */
export type StorageErrorCode = typeof StorageErrorCode[keyof typeof StorageErrorCode];

/**
 * Firebase Storage error code structure. This extends FirebaseError.
 */
export class FirebaseStorageError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'storage';

  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super({
      code: `storage/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

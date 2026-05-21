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

/** @const {Record<string, DataConnectErrorCode>} Data Connect server to client error code mapping. */
export const DATA_CONNECT_ERROR_CODE_MAPPING: Record<string, DataConnectErrorCode> = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
  QUERY_ERROR: 'query-error',
};

/**
 * The constant mapping for valid Data Connect client error codes.
 */
export const DataConnectErrorCode = {
  ABORTED: 'aborted',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_CREDENTIAL: 'invalid-credential',
  INTERNAL: 'internal-error',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  UNKNOWN: 'unknown-error',
  QUERY_ERROR: 'query-error',
} as const;

/**
 * The type definition for valid Data Connect client error codes.
 */
export type DataConnectErrorCode = typeof DataConnectErrorCode[keyof typeof DataConnectErrorCode];

/**
 * Firebase Data Connect error type. This extends FirebaseError.
 */
export class FirebaseDataConnectError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'data-connect';

  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super({
      code: `data-connect/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

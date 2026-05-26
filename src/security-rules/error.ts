/*!
 * Copyright 2019 Google LLC
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
 * The constant mapping for valid Security Rules client error codes.
 */
export const SecurityRulesErrorCode = {
  ALREADY_EXISTS: 'already-exists',
  AUTHENTICATION_ERROR: 'authentication-error',
  INTERNAL_ERROR: 'internal-error',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_SERVER_RESPONSE: 'invalid-server-response',
  NOT_FOUND: 'not-found',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  SERVICE_UNAVAILABLE: 'service-unavailable',
  UNKNOWN_ERROR: 'unknown-error',
} as const;

/**
 * The type definition for valid Security Rules client error codes.
 */
export type SecurityRulesErrorCode = typeof SecurityRulesErrorCode[keyof typeof SecurityRulesErrorCode];

/**
 * Firebase Security Rules error code structure. This extends `FirebaseError`.
 */
export class FirebaseSecurityRulesError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'security-rules';

  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super({
      code: `security-rules/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

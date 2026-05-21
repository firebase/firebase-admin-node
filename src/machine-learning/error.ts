/*!
 * Copyright 2020 Google LLC
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
 * The constant mapping for valid Machine Learning client error codes.
 */
export const MachineLearningErrorCode = {
  ALREADY_EXISTS: 'already-exists',
  AUTHENTICATION_ERROR: 'authentication-error',
  INTERNAL_ERROR: 'internal-error',
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_SERVER_RESPONSE: 'invalid-server-response',
  NOT_FOUND: 'not-found',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  SERVICE_UNAVAILABLE: 'service-unavailable',
  UNKNOWN_ERROR: 'unknown-error',
  CANCELLED: 'cancelled',
  DEADLINE_EXCEEDED: 'deadline-exceeded',
  PERMISSION_DENIED: 'permission-denied',
  FAILED_PRECONDITION: 'failed-precondition',
  ABORTED: 'aborted',
  OUT_OF_RANGE: 'out-of-range',
  DATA_LOSS: 'data-loss',
  UNAUTHENTICATED: 'unauthenticated',
} as const;

/**
 * The type definition for valid Machine Learning client error codes.
 */
export type MachineLearningErrorCode = typeof MachineLearningErrorCode[keyof typeof MachineLearningErrorCode];

export class FirebaseMachineLearningError extends FirebaseError {
  /** @internal */
  protected readonly codePrefix = 'machine-learning';

  /** @internal */
  public static fromOperationError(code: number, message: string): FirebaseMachineLearningError {
    switch (code) {
    case 1: return new FirebaseMachineLearningError({ code: 'cancelled', message });
    case 2: return new FirebaseMachineLearningError({ code: 'unknown-error', message });
    case 3: return new FirebaseMachineLearningError({ code: 'invalid-argument', message });
    case 4: return new FirebaseMachineLearningError({ code: 'deadline-exceeded', message });
    case 5: return new FirebaseMachineLearningError({ code: 'not-found', message });
    case 6: return new FirebaseMachineLearningError({ code: 'already-exists', message });
    case 7: return new FirebaseMachineLearningError({ code: 'permission-denied', message });
    case 8: return new FirebaseMachineLearningError({ code: 'resource-exhausted', message });
    case 9: return new FirebaseMachineLearningError({ code: 'failed-precondition', message });
    case 10: return new FirebaseMachineLearningError({ code: 'aborted', message });
    case 11: return new FirebaseMachineLearningError({ code: 'out-of-range', message });
    case 13: return new FirebaseMachineLearningError({ code: 'internal-error', message });
    case 14: return new FirebaseMachineLearningError({ code: 'service-unavailable', message });
    case 15: return new FirebaseMachineLearningError({ code: 'data-loss', message });
    case 16: return new FirebaseMachineLearningError({ code: 'unauthenticated', message });
    default:
      return new FirebaseMachineLearningError({ code: 'unknown-error', message });
    }
  }

  /**
   * @param info - The error code info.
   * @param message - The error message. If provided, this will override the default message.
   */
  constructor(info: ErrorInfo, message?: string) {
    super({
      code: `machine-learning/${info.code}`,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause,
    });
  }
}

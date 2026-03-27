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

import { PrefixedFirebaseError, ErrorInfo } from '../utils/error';

export type MachineLearningErrorCode =
  'already-exists'
  | 'authentication-error'
  | 'internal-error'
  | 'invalid-argument'
  | 'invalid-server-response'
  | 'not-found'
  | 'resource-exhausted'
  | 'service-unavailable'
  | 'unknown-error'
  | 'cancelled'
  | 'deadline-exceeded'
  | 'permission-denied'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'data-loss'
  | 'unauthenticated';

export class FirebaseMachineLearningError extends PrefixedFirebaseError {
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

  constructor(info: ErrorInfo, message?: string) {
    super('machine-learning', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

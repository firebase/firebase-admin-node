/*!
 * Copyright 2020 Google Inc.
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

import { PrefixedFirebaseError } from '../utils/error';

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
    case 1: return new FirebaseMachineLearningError('cancelled', message);
    case 2: return new FirebaseMachineLearningError('unknown-error', message);
    case 3: return new FirebaseMachineLearningError('invalid-argument', message);
    case 4: return new FirebaseMachineLearningError('deadline-exceeded', message);
    case 5: return new FirebaseMachineLearningError('not-found', message);
    case 6: return new FirebaseMachineLearningError('already-exists', message);
    case 7: return new FirebaseMachineLearningError('permission-denied', message);
    case 8: return new FirebaseMachineLearningError('resource-exhausted', message);
    case 9: return new FirebaseMachineLearningError('failed-precondition', message);
    case 10: return new FirebaseMachineLearningError('aborted', message);
    case 11: return new FirebaseMachineLearningError('out-of-range', message);
    case 13: return new FirebaseMachineLearningError('internal-error', message);
    case 14: return new FirebaseMachineLearningError('service-unavailable', message);
    case 15: return new FirebaseMachineLearningError('data-loss', message);
    case 16: return new FirebaseMachineLearningError('unauthenticated', message);
    default:
      return new FirebaseMachineLearningError('unknown-error', message);
    }
  }

  constructor(code: MachineLearningErrorCode, message: string) {
    super('machine-learning', code, message);
  }
}

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
import { installationsClientErrorCode } from '../installations/error';

/**
 * Instance ID client error codes.
 */
export type InstanceIdErrorCode =
  | 'invalid-argument'
  | 'invalid-project-id'
  | 'invalid-installation-id'
  | 'api-error'
  | 'invalid-instance-id';


/**
 * Instance ID client error codes and their default messages.
 */
const instanceIdClientErrorMessages = {
  'invalid-instance-id': 'Invalid instance ID provided.',
};

function createInstanceIdErrorInfo(code: 'invalid-instance-id'): ErrorInfo {
  return {
    code,
    message: instanceIdClientErrorMessages[code] || 'An unknown error occurred.',
  };
}

/**
 * Internal Instance ID client error code mapping used to construct ErrorInfo.
 */
export const instanceIdClientErrorCode = {
  ...installationsClientErrorCode,
  INVALID_INSTANCE_ID: createInstanceIdErrorInfo('invalid-instance-id'),
};

/**
 * Firebase Instance ID service error code structure. This extends `FirebaseError`.
 */
export class FirebaseInstanceIdError extends FirebaseError {
  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super({
      code: 'instance-id/' + info.code,
      message: message || info.message,
      httpResponse: info.httpResponse,
      cause: info.cause
    });
  }
}

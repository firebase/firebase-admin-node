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

import { PrefixedFirebaseError, ErrorInfo } from '../utils/error';
import { installationsClientErrorCode } from '../installations/error';

/**
 * The constant mapping for valid Instance ID client error codes.
 */
export const InstanceIdErrorCode = {
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_PROJECT_ID: 'invalid-project-id',
  INVALID_INSTALLATION_ID: 'invalid-installation-id',
  API_ERROR: 'api-error',
  INVALID_INSTANCE_ID: 'invalid-instance-id',
} as const;

/**
 * The type definition for valid Instance ID client error codes.
 */
export type InstanceIdErrorCode = typeof InstanceIdErrorCode[keyof typeof InstanceIdErrorCode];

/**
 * Internal Instance ID client error code mapping used to construct ErrorInfo.
 */
export const instanceIdClientErrorCode: { readonly [K in keyof typeof InstanceIdErrorCode]: ErrorInfo } = {
  ...installationsClientErrorCode,
  INVALID_INSTANCE_ID: {
    code: InstanceIdErrorCode.INVALID_INSTANCE_ID,
    message: 'Invalid instance ID provided.',
  },
};

/**
 * Firebase Instance ID service error code structure. This extends `PrefixedFirebaseError`.
 */
export class FirebaseInstanceIdError extends PrefixedFirebaseError {
  /**
   * 
   * @param info - The error code info.
   * @param message - The error message. This will override the default
   *     message if provided.
   */
  constructor(info: ErrorInfo, message?: string) {
    // Override default message if custom message provided.
    super('instance-id', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

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

/**
 * The constant mapping for valid Phone Number Verification client error codes.
 */
export const PhoneNumberVerificationErrorCode = {
  INVALID_ARGUMENT: 'invalid-argument',
  INVALID_TOKEN: 'invalid-token',
  EXPIRED_TOKEN: 'expired-token',
} as const;

/**
 * The type definition for valid Phone Number Verification client error codes.
 */
export type PhoneNumberVerificationErrorCode =
  typeof PhoneNumberVerificationErrorCode[keyof typeof PhoneNumberVerificationErrorCode];

export const FPNV_ERROR_CODE_MAPPING = PhoneNumberVerificationErrorCode;

/**
 * Firebase Phone Number Verification error code structure. This extends `PrefixedFirebaseError`.
 *
 * @param info - The error code info.
 * @param message - The error message. If provided, this will override the default message.
 */
export class FirebasePhoneNumberVerificationError extends PrefixedFirebaseError {
  constructor(info: ErrorInfo, message?: string) {
    super('phone-number-verification', info.code, message || info.message, info.httpResponse, info.cause);
  }
}

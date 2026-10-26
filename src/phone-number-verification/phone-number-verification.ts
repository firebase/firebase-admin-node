/*!
 * @license
 * Copyright 2025 Google LLC
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

import { App } from '../app';
import * as validator from '../utils/validator';
import {
  FirebasePhoneNumberVerificationError,
  PhoneNumberVerificationToken,
  VerifyPhoneNumberTokenOptions,
} from './phone-number-verification-api';
import { FPNV_ERROR_CODE_MAPPING } from './error';
import { PhoneNumberTokenVerifier } from './token-verifier';
import { JWKS_URL, FPNV_TOKEN_INFO } from './phone-number-verification-api-client-internal';

/**
 * PhoneNumberVerification service bound to the provided app.
 */
export class PhoneNumberVerification {
  private readonly appInternal: App;
  private readonly phoneNumberVerificationVerifier: PhoneNumberTokenVerifier;

  /**
   * @param app - The app for this `PhoneNumberVerification` service.
   * @constructor
   * @internal
   */
  constructor(app: App) {

    this.appInternal = app;
    this.phoneNumberVerificationVerifier = new PhoneNumberTokenVerifier(
      JWKS_URL,
      'https://fpnv.googleapis.com/projects/',
      FPNV_TOKEN_INFO,
      app
    );
  }

  /**
   * Returns the app associated with this `PhoneNumberVerification` instance.
   *
   * @returns The app associated with this `PhoneNumberVerification` instance.
   */
  get app(): App {
    return this.appInternal;
  }

  /**
   * Verifies a Firebase Phone Number Verification token. By default, tokens issued in
   * test mode (containing `"test_number": true`) are rejected unless
   * `options.acceptTestTokens` is set to `true`.
   *
   * @param jwt - A string containing the Firebase Phone Number Verification JWT.
   * @param options - Optional {@link VerifyPhoneNumberTokenOptions} object when verifying a
   *   Phone Number Verification token.
   * @returns A promise that resolves with the decoded token.
   */
  public verifyToken(
    jwt: string,
    options?: VerifyPhoneNumberTokenOptions
  ): Promise<PhoneNumberVerificationToken> {
    this.validateVerifyPhoneNumberTokenOptions(options);
    return this.phoneNumberVerificationVerifier.verifyJWT(jwt, options);
  }

  private validateVerifyPhoneNumberTokenOptions(options?: VerifyPhoneNumberTokenOptions): void {
    if (typeof options === 'undefined') {
      return;
    }
    if (!validator.isNonNullObject(options)) {
      throw new FirebasePhoneNumberVerificationError({
        code: FPNV_ERROR_CODE_MAPPING.INVALID_ARGUMENT,
        message: 'VerifyPhoneNumberTokenOptions must be a non-null object.',
      });
    }
  }
}


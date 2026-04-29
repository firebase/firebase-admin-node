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
import { PhoneNumberVerificationToken } from './phone-number-verification-api';
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
   * Verifies a Firebase Phone Number Verification token.
   *
   * @param jwt - A string containing the Firebase Phone Number Verification JWT.
   * @returns A promise that resolves with the decoded token.
   */
  public verifyToken(jwt: string): Promise<PhoneNumberVerificationToken> {
    return this.phoneNumberVerificationVerifier.verifyJWT(jwt);
  }
}


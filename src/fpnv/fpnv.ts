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
import { FpnvToken } from './fpnv-api';
import { FirebasePhoneNumberTokenVerifier } from './token-verifier';
import { CLIENT_CERT_URL, PN_TOKEN_INFO } from './fpnv-api-client-internal';

/**
 * Fpnv service bound to the provided app.
 */
export class Fpnv {
  private readonly appInternal: App;
  private readonly fpnvVerifier: FirebasePhoneNumberTokenVerifier;

  /**
   * @param app - The app for this `Fpnv` service.
   * @constructor
   * @internal
   */
  constructor(app: App) {

    this.appInternal = app;
    this.fpnvVerifier = new FirebasePhoneNumberTokenVerifier(
      CLIENT_CERT_URL,
      'https://fpnv.googleapis.com/projects/',
      PN_TOKEN_INFO,
      app
    );
  }

  /**
   * Returns the app associated with this `Fpnv` instance.
   *
   * @returns The app associated with this `Fpnv` instance.
   */
  get app(): App {
    return this.appInternal;
  }

  /**
   * Verifies a Firebase Phone Number Verification token (FPNV JWT).
   *
   * @param fpnvJwt - The FPNV JWT string to verify.
   * @returns A promise that resolves with the decoded token.
   */
  public verifyToken(fpnvJwt: string): Promise<FpnvToken> {
    return this.fpnvVerifier.verifyJWT(fpnvJwt);
  }
}

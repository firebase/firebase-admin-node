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
import {
  FirebasePhoneNumberTokenVerifier,
  createFPNTVerifier,
} from './token-verifier';

/**
 * Fpnv service bound to the provided app.
 */
export class Fpnv  {
  private readonly app_: App;

   protected readonly fpnvVerifier: FirebasePhoneNumberTokenVerifier;

  constructor(app: App) {

    this.app_ = app;
    this.fpnvVerifier = createFPNTVerifier(app);
  }

  /**
   * Returns the app associated with this Auth instance.
   *
   * @returns The app associated with this Auth instance.
   */
  get app(): App {
    return this.app_;
  }

  public async verifyToken(idToken: string): Promise<FpnvToken> {
    return await this.fpnvVerifier.verifyJWT(idToken);
  }
}

/*!
 * @license
 * Copyright 2021 Google Inc.
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

import { FirebaseApp } from '../firebase-app';
import { appCheck } from './index';
import { AppCheckApiClient } from './app-check-api-client-internal';
import {
  appCheckErrorFromCryptoSignerError, AppCheckTokenGenerator
} from './token-generator';
import { AppCheckTokenVerifier } from './token-verifier';
import { cryptoSignerFromApp } from '../utils/crypto-signer';

import AppCheckInterface = appCheck.AppCheck;
import AppCheckToken = appCheck.AppCheckToken;
import AppCheckTokenOptions = appCheck.AppCheckTokenOptions;
import VerifyAppCheckTokenResponse = appCheck.VerifyAppCheckTokenResponse;

/**
 * AppCheck service bound to the provided app.
 */
export class AppCheck implements AppCheckInterface {

  private readonly client: AppCheckApiClient;
  private readonly tokenGenerator: AppCheckTokenGenerator;
  private readonly appCheckTokenVerifier: AppCheckTokenVerifier;

  /**
   * @param app The app for this AppCheck service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    this.client = new AppCheckApiClient(app);
    try {
      this.tokenGenerator = new AppCheckTokenGenerator(cryptoSignerFromApp(app));
    } catch (err) {
      throw appCheckErrorFromCryptoSignerError(err);
    }
    this.appCheckTokenVerifier = new AppCheckTokenVerifier(app);
  }

  /**
   * Creates a new {@link appCheck.AppCheckToken `AppCheckToken`} that can be sent
   * back to a client.
   *
   * @param appId The app ID to use as the JWT app_id.
   * @param options Optional options object when creating a new App Check Token.
   *
   * @returns A promise that fulfills with a `AppCheckToken`.
   */
  public createToken(appId: string, options?: AppCheckTokenOptions): Promise<AppCheckToken> {
    return this.tokenGenerator.createCustomToken(appId, options)
      .then((customToken) => {
        return this.client.exchangeToken(customToken, appId);
      });
  }

  /**
   * Verifies an App Check token.
   *
   * @param appCheckToken The App Check token to verify.
   *
   * @return A promise that fulfills with a `VerifyAppCheckTokenResponse` on successful
   *     verification.
   */
  public verifyToken(appCheckToken: string): Promise<VerifyAppCheckTokenResponse> {
    return this.appCheckTokenVerifier.verifyToken(appCheckToken)
      .then((decodedToken) => {
        return {
          appId: decodedToken.app_id,
          token: decodedToken,
        };
      });
  }
}

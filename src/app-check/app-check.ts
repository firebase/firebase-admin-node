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
import { cryptoSignerFromApp } from '../utils/crypto-signer';

import AppCheckInterface = appCheck.AppCheck;
import AppCheckToken = appCheck.AppCheckToken;

/**
 * AppCheck service bound to the provided app.
 */
export class AppCheck implements AppCheckInterface {

  private readonly client: AppCheckApiClient;
  private readonly tokenGenerator: AppCheckTokenGenerator;

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
  }

  /**
   * Creates a new {@link appCheck.AppCheckToken `AppCheckToken`} that can be sent
   * back to a client.
   *
   * @return A promise that fulfills with a `AppCheckToken`.
   */
  public createToken(appId: string): Promise<AppCheckToken> {
    return this.tokenGenerator.createCustomToken(appId)
      .then((customToken) => {
        return this.client.exchangeToken(customToken, appId);
      });
  }
}

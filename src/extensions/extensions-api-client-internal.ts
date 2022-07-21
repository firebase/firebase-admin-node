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
import { App } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { HttpClient, AuthorizedHttpClient } from '../utils/api-request';
import { FirebaseAppError } from '../utils/error';
import * as validator from '../utils/validator';
/**
 * Class that facilitates sending requests to the Firebase Extensions backend API.
 *
 * @internal
 */
export class ExtensionsApiClient {
  /* eslint-disable-next-line no-unused-vars */
  private readonly httpClient: HttpClient;

  constructor(private readonly app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseAppError(
        'invalid-argument',
        'First argument passed to getExtensions() must be a valid Firebase app instance.');
    }
    this.httpClient = new AuthorizedHttpClient(app as FirebaseApp);
  }
}
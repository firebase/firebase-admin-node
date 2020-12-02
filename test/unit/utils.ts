/*!
 * @license
 * Copyright 2017 Google Inc.
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

import * as _ from 'lodash';
import * as sinon from 'sinon';

import * as mocks from '../resources/mocks';

import { FirebaseNamespace } from '../../src/firebase-namespace';
import { AppOptions } from '../../src/firebase-namespace-api';
import { FirebaseApp, FirebaseAppInternals, FirebaseAccessToken } from '../../src/firebase-app';
import { HttpError, HttpResponse } from '../../src/utils/api-request';

/**
 * Returns a new FirebaseApp instance with the provided options.
 *
 * @param options The options for the FirebaseApp instance to create.
 * @return A new FirebaseApp instance with the provided options.
 */
export function createAppWithOptions(options: object): FirebaseApp {
  const mockFirebaseNamespaceInternals = new FirebaseNamespace().INTERNAL;
  return new FirebaseApp(options as AppOptions, mocks.appName, mockFirebaseNamespaceInternals);
}


/** @return {string} A randomly generated access token string. */
export function generateRandomAccessToken(): string {
  return 'access_token_' + _.random(999999999);
}

/**
 * Creates a stub for retrieving an access token from a FirebaseApp. All services should use this
 * method for stubbing the OAuth2 flow during unit tests.
 *
 * @param {string} accessToken The access token string to return.
 * @param {FirebaseApp} app The app instance to stub. If not specified, the stub will affect all apps.
 * @return {sinon.SinonStub} A Sinon stub.
 */
export function stubGetAccessToken(accessToken?: string, app?: FirebaseApp): sinon.SinonStub {
  if (typeof accessToken === 'undefined') {
    accessToken = generateRandomAccessToken();
  }
  const result: FirebaseAccessToken = {
    accessToken,
    expirationTime: Date.now() + 3600,
  };
  if (app) {
    return sinon.stub(app.INTERNAL, 'getToken').resolves(result);
  } else {
    return sinon.stub(FirebaseAppInternals.prototype, 'getToken').resolves(result);
  }
}

/**
 * Creates a mock HTTP response from the given data and parameters.
 *
 * @param {object | string} data Data to be included in the response body.
 * @param {number=} status HTTP status code (defaults to 200).
 * @param {*=} headers HTTP headers to be included in the ersponse.
 * @return {HttpResponse} An HTTP response object.
 */
export function responseFrom(data: object | string, status = 200, headers: any = {}): HttpResponse {
  let responseData: any;
  let responseText: string;
  if (typeof data === 'object') {
    responseData = data;
    responseText = JSON.stringify(data);
  } else {
    try {
      responseData = JSON.parse(data);
    } catch (error) {
      responseData = null;
    }
    responseText = data as string;
  }
  return {
    status,
    headers,
    data: responseData,
    text: responseText,
    isJson: () => responseData != null,
  };
}

export function errorFrom(data: any, status = 500): HttpError {
  return new HttpError(responseFrom(data, status));
}

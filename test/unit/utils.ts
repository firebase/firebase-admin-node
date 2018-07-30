/*!
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
import * as nock from 'nock';

import * as mocks from '../resources/mocks';

import {FirebaseNamespace} from '../../src/firebase-namespace';
import {FirebaseApp, FirebaseAppOptions} from '../../src/firebase-app';
import { HttpError, HttpResponse } from '../../src/utils/api-request';

/**
 * Returns a new FirebaseApp instance with the provided options.
 *
 * @param {object} options The options for the FirebaseApp instance to create.
 * @return {FirebaseApp} A new FirebaseApp instance with the provided options.
 */
export function createAppWithOptions(options: object) {
  const mockFirebaseNamespaceInternals = new FirebaseNamespace().INTERNAL;
  return new FirebaseApp(options as FirebaseAppOptions, mocks.appName, mockFirebaseNamespaceInternals);
}


/**
 * Returns a mocked out success response from the URL generating Google access tokens given a JWT
 * signed with a service account private key.
 *
 * Calling this once will mock ALL future requests to this endpoint. Use nock.cleanAll() to unmock.
 *
 * @param {string} [token] The optional access token to return. If not specified, a random one
 *     is created.
 * @param {number} [expiresIn] The optional expires in value to use for the access token.
 * @return {Object} A nock response object.
 */
export function mockFetchAccessTokenRequests(
  token: string = generateRandomAccessToken(),
  expiresIn: number = 60 * 60,
): nock.Scope {
  return nock('https://accounts.google.com')
    .persist()
    .post('/o/oauth2/token')
    .reply(200, {
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
    }, {
      'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    });
}


/** @return {string} A randomly generated access token string. */
export function generateRandomAccessToken(): string {
  return 'access_token_' + _.random(999999999);
}

/**
 * Creates a mock HTTP response from the given data and parameters.
 *
 * @param {object | string} data Data to be included in the response body.
 * @param {number=} status HTTP status code (defaults to 200).
 * @param {*=} headers HTTP headers to be included in the ersponse.
 * @returns {HttpResponse} An HTTP response object.
 */
export function responseFrom(data: object | string, status: number = 200, headers: any = {}): HttpResponse {
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

export function errorFrom(data: any, status: number = 500): HttpError {
  return new HttpError(responseFrom(data, status));
}

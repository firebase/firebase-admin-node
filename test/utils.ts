import * as _ from 'lodash';
import * as nock from 'nock';

import * as mocks from './resources/mocks';

import {FirebaseNamespace} from '../src/firebase-namespace';
import {FirebaseApp, FirebaseAppOptions} from '../src/firebase-app';

/**
 * Returns a new FirebaseApp instance with the provided options.
 *
 * @param {Object} options The options for the FirebaseApp instance to create.
 * @return {FirebaseApp} A new FirebaseApp instance with the provided options.
 */
export function createAppWithOptions(options: Object) {
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
 * @return {Object} A nock response object.
 */
export function mockFetchAccessTokenRequests(token?: string): nock.Scope {
  return nock('https://accounts.google.com:443')
    .persist()
    .post('/o/oauth2/token')
    .reply(200, {
      access_token: token || generateRandomAccessToken(),
      token_type: 'Bearer',
      expires_in: 3600,
    }, {
      'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    });
}


/** @return {string} A randomly generated access token string. */
export function generateRandomAccessToken(): string {
  return 'access_token_' + _.random(999999999);
}

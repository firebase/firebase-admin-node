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

'use strict';

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { getSdkVersion } from '../../../src/utils';

import { FirebaseApp } from '../../../src/firebase-app';
import { AppCheckApiClient, FirebaseAppCheckError } from '../../../src/app-check/app-check-api-client-internal';
import { FirebaseAppError } from '../../../src/utils/error';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('AppCheckApiClient', () => {

  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };

  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
  };

  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const APP_ID = '1:1234:android:1234';

  const TEST_TOKEN_TO_EXCHANGE = 'signed-custom-token';

  const TEST_RESPONSE = {
    attestationToken: 'token',
    ttl: '3s'
  };

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  const clientWithoutProjectId = new AppCheckApiClient(
    mocks.mockCredentialApp());

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let app: FirebaseApp;
  let apiClient: AppCheckApiClient;

  beforeEach(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new AppCheckApiClient(app);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return app.delete();
  });

  describe('Constructor', () => {
    it('should reject when the app is null', () => {
      expect(() => new AppCheckApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to admin.appCheck() must be a valid Firebase app instance.');
    });
  });

  describe('exchangeToken', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should throw given no appId', () => {
      expect(() => {
        (apiClient as any).exchangeToken(TEST_TOKEN_TO_EXCHANGE);
      }).to.throw('appId` must be a non-empty string.');
    });

    const invalidAppIds = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidAppIds.forEach((invalidAppId) => {
      it('should throw given a non-string appId: ' + JSON.stringify(invalidAppId), () => {
        expect(() => {
          apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, invalidAppId as any);
        }).to.throw('appId` must be a non-empty string.');
      });
    });

    it('should throw given an empty string appId', () => {
      expect(() => {
        apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, '');
      }).to.throw('appId` must be a non-empty string.');
    });

    it('should throw given no customToken', () => {
      expect(() => {
        (apiClient as any).exchangeToken(undefined, APP_ID);
      }).to.throw('customToken` must be a non-empty string.');
    });

    const invalidCustomTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidCustomTokens.forEach((invalidCustomToken) => {
      it('should throw given a non-string customToken: ' + JSON.stringify(invalidCustomToken), () => {
        expect(() => {
          apiClient.exchangeToken(invalidCustomToken as any, APP_ID);
        }).to.throw('customToken` must be a non-empty string.');
      });
    });

    it('should throw given an empty string customToken', () => {
      expect(() => {
        apiClient.exchangeToken('', APP_ID);
      }).to.throw('customToken` must be a non-empty string.');
    });

    it('should reject when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseAppCheckError('not-found', 'Requested entity not found');
      return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseAppCheckError('unknown-error', 'Unknown server error: {}');
      return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseAppCheckError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    ['', 'abc', '3s2', 'sssa', '3.000000001', '3.2', null, NaN, true, [], {}, 100, 1.2, -200, -2.4]
      .forEach((invalidDuration) => {
        it(`should throw if the returned ttl duration is: ${invalidDuration}`, () => {
          const response = deepCopy(TEST_RESPONSE);
          (response as any).ttl = invalidDuration;
          const stub = sinon
            .stub(HttpClient.prototype, 'send')
            .resolves(utils.responseFrom(response, 200));
          stubs.push(stub);
          const expected = new FirebaseAppCheckError(
            'invalid-argument', '`ttl` must be a valid duration string with the suffix `s`.');
          return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
            .should.eventually.be.rejected.and.deep.include(expected);
        });
      });

    it('should resolve with the App Check token on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200));
      stubs.push(stub);
      return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
        .then((resp) => {
          expect(resp.token).to.deep.equal(TEST_RESPONSE.attestationToken);
          expect(resp.ttlMillis).to.deep.equal(3000);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: `https://firebaseappcheck.googleapis.com/v1beta/projects/test-project/apps/${APP_ID}:exchangeCustomToken`,
            headers: EXPECTED_HEADERS,
            data: { customToken: TEST_TOKEN_TO_EXCHANGE }
          });
        });
    });

    new Map([['3s', 3000], ['4.1s', 4100], ['3.000000001s', 3000], ['3.000001s', 3000]])
      .forEach((ttlMillis, ttlString) => { // value, key, map
        // 3 seconds with 0 nanoseconds expressed as "3s"
        // 3 seconds and 1 nanosecond expressed as "3.000000001s"
        // 3 seconds and 1 microsecond expressed as "3.000001s"
        it(`should resolve with ttlMillis as ${ttlMillis} when ttl
       from server is: ${ttlString}`, () => {
          const response = deepCopy(TEST_RESPONSE);
          (response as any).ttl = ttlString;
          const stub = sinon
            .stub(HttpClient.prototype, 'send')
            .resolves(utils.responseFrom(response, 200));
          stubs.push(stub);
          return apiClient.exchangeToken(TEST_TOKEN_TO_EXCHANGE, APP_ID)
            .then((resp) => {
              expect(resp.token).to.deep.equal(response.attestationToken);
              expect(resp.ttlMillis).to.deep.equal(ttlMillis);
            });
        });
      });
  });
});

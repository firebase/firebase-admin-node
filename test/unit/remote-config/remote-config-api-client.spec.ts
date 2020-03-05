/*!
 * Copyright 2020 Google Inc.
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
import { RemoteConfigApiClient } from '../../../src/remote-config/remote-config-api-client';
import { FirebaseRemoteConfigError } from '../../../src/remote-config/remote-config-utils';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';

const expect = chai.expect;

describe('RemoteConfigApiClient', () => {

  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };
  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': 'fire-admin-node/<XXX_SDK_VERSION_XXX>',
    'Accept-Encoding': 'gzip',
  };
  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials, or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  const clientWithoutProjectId = new RemoteConfigApiClient(
    mocks.mockCredentialApp());

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let app: FirebaseApp;
  let apiClient: RemoteConfigApiClient;

  beforeEach(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new RemoteConfigApiClient(app);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return app.delete();
  });

  describe('Constructor', () => {
    it('should reject when the app is null', () => {
      expect(() => new RemoteConfigApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to admin.remoteConfig() must be a valid Firebase app instance.');
    });
  });

  describe('getTemplate', () => {
    const testResponse = {
      conditions: [{ name: 'ios', expression: 'exp' }],
      parameters: { param: { defaultValue: { value: 'true' } } },
      version: {},
    };

    it(`should reject when project id is not available`, () => {
      return clientWithoutProjectId.getTemplate()
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve with the requested template on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(testResponse, 200, { etag: 'etag-123456789012-1' }));
      stubs.push(stub);
      return apiClient.getTemplate()
        .then((resp) => {
          expect(resp.conditions).to.deep.equal(testResponse.conditions);
          expect(resp.parameters).to.deep.equal(testResponse.parameters);
          expect(resp.etag).to.equal('etag-123456789012-1');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should reject when the etag is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(testResponse));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('invalid-argument', 'ETag header is not present in the server response.');
      return apiClient.getTemplate()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('not-found', 'Requested entity not found');
      return apiClient.getTemplate()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('unknown-error', 'Unknown server error: {}');
      return apiClient.getTemplate()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getTemplate()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getTemplate()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });
});

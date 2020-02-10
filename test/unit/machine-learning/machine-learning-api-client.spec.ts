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
import { MachineLearningApiClient } from '../../../src/machine-learning/machine-learning-api-client';
import { FirebaseMachineLearningError } from '../../../src/machine-learning/machine-learning-utils';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';

const expect = chai.expect;

describe('MachineLearningApiClient', () => {

  const MODEL_ID = '1234567';
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
  };
  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials, or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  const clientWithoutProjectId = new MachineLearningApiClient(
    mocks.mockCredentialApp());

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let app: FirebaseApp;
  let apiClient: MachineLearningApiClient;

  beforeEach(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new MachineLearningApiClient(app);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return app.delete();
  });

  describe('Constructor', () => {
    it('should throw when the app is null', () => {
      expect(() => new MachineLearningApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to admin.machineLearning() must be a valid Firebase app');
    });
  });

  describe('getModel', () => {
    const INVALID_NAMES: any[] = [null, undefined, '', 1, true, {}, []];
    INVALID_NAMES.forEach((invalidName) => {
      it(`should reject when called with: ${JSON.stringify(invalidName)}`, () => {
        return apiClient.getModel(invalidName)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Model ID must be a non-empty string.');
      });
    });

    it(`should reject when called with prefixed name`, () => {
      return apiClient.getModel('projects/foo/models/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Model ID must not contain any "/" characters.');
    });

    it(`should reject when project id is not available`, () => {
      return clientWithoutProjectId.getModel(MODEL_ID)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve with the requested model on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({ name: 'bar' }));
      stubs.push(stub);
      return apiClient.getModel(MODEL_ID)
        .then((resp) => {
          expect(resp.name).to.equal('bar');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://mlkit.googleapis.com/v1beta1/projects/test-project/models/1234567',
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should reject when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('not-found', 'Requested entity not found');
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });
});

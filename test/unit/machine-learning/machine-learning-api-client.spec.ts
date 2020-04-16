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
import { MachineLearningApiClient, ModelContent,
  ListModelsOptions } from '../../../src/machine-learning/machine-learning-api-client';
import { FirebaseMachineLearningError } from '../../../src/machine-learning/machine-learning-utils';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';

const expect = chai.expect;

describe('MachineLearningApiClient', () => {

  const BASE_URL = 'https://firebaseml.googleapis.com/v1beta2';

  const MODEL_ID = '1234567';
  const MODEL_RESPONSE = {
    name: 'projects/test-project/models/1234567',
    createTime: '2020-02-07T23:45:23.288047Z',
    updateTime: '2020-02-08T23:45:23.288047Z',
    etag: 'etag123',
    modelHash: 'modelHash123',
    displayName: 'model_1',
    tags: ['tag_1', 'tag_2'],
    state: {published: true},
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model1.tflite',
      sizeBytes: 16900988,
    },
  };
  const MODEL_RESPONSE2 = {
    name: 'projects/test-project/models/2345678',
    createTime: '2020-02-07T23:45:22.288047Z',
    updateTime: '2020-02-08T23:45:22.288047Z',
    etag: 'etag234',
    modelHash: 'modelHash234',
    displayName: 'model_2',
    tags: ['tag_2', 'tag_3'],
    state: {published: true},
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model2.tflite',
      sizeBytes: 2220022,
    },
  };

  const STATUS_ERROR_RESPONSE = {
    code: 3,
    message: 'Invalid Argument message',
  };
  const OPERATION_SUCCESS_RESPONSE = {
    done: true,
    response: MODEL_RESPONSE,
  };
  const OPERATION_ERROR_RESPONSE = {
    done: true,
    error: STATUS_ERROR_RESPONSE,
  };

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

  describe('createModel', () => {
    const NAME_ONLY_CONTENT: ModelContent = {displayName: 'name1'};


    const invalidContent: any[] = [null, undefined, {}, { tags: []}];
    invalidContent.forEach((content) => {
      it(`should reject when called with: ${JSON.stringify(content)}`, () => {
        return apiClient.createModel(content)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid model content.');
      });
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.createModel(NAME_ONLY_CONTENT)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should throw when an error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('not-found', 'Requested entity not found');
      return apiClient.createModel(NAME_ONLY_CONTENT)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should resolve with the created resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.createModel(NAME_ONLY_CONTENT)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.empty;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
        });
    });

    it('should resolve with error when the operation fails', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_ERROR_RESPONSE));
      stubs.push(stub);
      return apiClient.createModel(NAME_ONLY_CONTENT)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.empty;
          expect(resp.error).to.deep.equal(STATUS_ERROR_RESPONSE);
        });
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.createModel(NAME_ONLY_CONTENT)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.createModel(NAME_ONLY_CONTENT)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.createModel(NAME_ONLY_CONTENT)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });

  describe('updateModel', () => {
    const NAME_ONLY_CONTENT: ModelContent = {displayName: 'name1'};
    const NAME_ONLY_MASK = ['displayName'];

    const invalidContent: any[] = [null, undefined];
    invalidContent.forEach((content) => {
      it(`should reject when called with: ${JSON.stringify(content)}`, () => {
        return apiClient.updateModel(MODEL_ID, content, NAME_ONLY_MASK)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid model or mask content.');
      });
    });

    it('should reject when called with empty mask', () => {
      return apiClient.updateModel(MODEL_ID, {}, [])
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid model or mask content.');
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should throw when an error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('not-found', 'Requested entity not found');
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should resolve with the updated resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.empty;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            headers: EXPECTED_HEADERS,
            url: `${BASE_URL}/projects/test-project/models/${MODEL_ID}?updateMask=displayName`,
            data: NAME_ONLY_CONTENT,
          });
        });
    });

    it('should resolve with error when the operation fails', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_ERROR_RESPONSE));
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.empty;
          expect(resp.error).to.deep.equal(STATUS_ERROR_RESPONSE);
        });
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_CONTENT, NAME_ONLY_MASK)
        .should.eventually.be.rejected.and.deep.equal(expected);
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
            url: `${BASE_URL}/projects/test-project/models/1234567`,
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

    it('should reject when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });

  describe('listModels', () => {
    const LIST_RESPONSE = {
      models: [MODEL_RESPONSE, MODEL_RESPONSE2],
      nextPageToken: 'next',
    };

    const invalidListFilters: any[] = [null, 0, '', true, {}, []];
    invalidListFilters.forEach((invalidFilter) => {
      it(`should reject when called with invalid pageToken: ${JSON.stringify(invalidFilter)}`, () => {
        return apiClient.listModels({filter: invalidFilter})
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid list filter.');
      });
    });

    const invalidPageSizes: any[] = [null, '', '10', true, {}, []];
    invalidPageSizes.forEach((invalidPageSize) => {
      it(`should reject when called with invalid page size: ${JSON.stringify(invalidPageSize)}`, () => {
        return apiClient.listModels({pageSize: invalidPageSize})
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid page size.');
      });
    });

    const outOfRangePageSizes: number[] = [-1, 0, 101];
    outOfRangePageSizes.forEach((invalidPageSize) => {
      it(`should reject when called with invalid page size: ${invalidPageSize}`, () => {
        return apiClient.listModels({pageSize: invalidPageSize})
          .should.eventually.be.rejected.and.have.property(
            'message', 'Page size must be between 1 and 100.');
      });
    });

    const invalidPageTokens: any[] = [null, 0, '', true, {}, []];
    invalidPageTokens.forEach((invalidToken) => {
      it(`should reject when called with invalid pageToken: ${JSON.stringify(invalidToken)}`, () => {
        return apiClient.listModels({pageToken: invalidToken})
          .should.eventually.be.rejected.and.have.property(
            'message', 'Next page token must be a non-empty string.');
      });
    });

    it('should resolve on success when called without any arguments', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(LIST_RESPONSE));
      stubs.push(stub);
      return apiClient.listModels()
        .then((resp) => {
          expect(resp).to.deep.equal(LIST_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/projects/test-project/models`,
            headers: EXPECTED_HEADERS,
            data: {},
          });
        });
    });

    const validOptions: ListModelsOptions[] = [
      {pageSize: 5},
      {pageToken: 'next'},
      {filter: 'displayName=name1'},
      {
        filter: 'displayName=name1',
        pageSize: 5,
        pageToken: 'next',
      },
    ];
    validOptions.forEach((options) => {
      it(`should resolve on success when called with options: ${JSON.stringify(options)}`, () => {
        const stub = sinon
          .stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(LIST_RESPONSE));
        stubs.push(stub);
        return apiClient.listModels(options)
          .then((resp) => {
            expect(resp.models).not.to.be.empty;
            expect(resp.models!.length).to.equal(2);
            expect(resp.models![0]).to.deep.equal(MODEL_RESPONSE);
            expect(resp.models![1]).to.deep.equal(MODEL_RESPONSE2);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url: `${BASE_URL}/projects/test-project/models`,
              headers: EXPECTED_HEADERS,
              data: options,
            });
          });
      });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('not-found', 'Requested entity not found');
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });

  describe('deleteModel', () => {
    const INVALID_NAMES: any[] = [null, undefined, '', 1, true, {}, []];
    INVALID_NAMES.forEach((invalidName) => {
      it(`should reject when called with: ${JSON.stringify(invalidName)}`, () => {
        return apiClient.deleteModel(invalidName)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Model ID must be a non-empty string.');
      });
    });

    it(`should reject when called with prefixed name`, () => {
      return apiClient.deleteModel('projects/foo/rulesets/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Model ID must not contain any "/" characters.');
    });

    it(`should reject when project id is not available`, () => {
      return clientWithoutProjectId.deleteModel(MODEL_ID)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));
      stubs.push(stub);
      return apiClient.deleteModel(MODEL_ID)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'DELETE',
            url: `${BASE_URL}/projects/test-project/models/1234567`,
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
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });
});

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
import { FirebaseMachineLearningError } from '../../../src/machine-learning/machine-learning-utils';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';
import { getSdkVersion } from '../../../src/utils/index';
import { MachineLearningApiClient } from '../../../src/machine-learning/machine-learning-api-client';
import { machineLearning } from '../../../src/machine-learning/index';

import ListModelsOptions = machineLearning.ListModelsOptions;
import ModelOptions = machineLearning.ModelOptions;

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
    state: { published: true },
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
    state: { published: true },
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model2.tflite',
      sizeBytes: 2220022,
    },
  };
  const MODEL_RESPONSE_AUTOML = {
    name: 'projects/test-project/models/3456789',
    createTime: '2020-07-15T18:12:25.123987Z',
    updateTime: '2020-07-15T19:15:32.965435Z',
    etag: 'etag345',
    modelHash: 'modelHash345',
    displayName: 'model_automl',
    tags: ['tag_automl'],
    state: { published: true },
    tfliteModel: {
      automlModel: 'projects/65432/models/ICN123',
      sizeBytes: 3330033,
    },
  };

  const PROJECT_ID = 'test-project';
  const PROJECT_NUMBER = '1234567';
  const OPERATION_ID = '987654';
  const OPERATION_NAME = `projects/${PROJECT_NUMBER}/operations/${OPERATION_ID}`;
  const STATUS_ERROR_MESSAGE = 'Invalid Argument message'
  const STATUS_ERROR_RESPONSE = {
    code: 3,
    message: STATUS_ERROR_MESSAGE,
  };
  const OPERATION_SUCCESS_RESPONSE = {
    done: true,
    response: MODEL_RESPONSE,
  };
  const OPERATION_ERROR_RESPONSE = {
    done: true,
    error: STATUS_ERROR_RESPONSE,
  };
  const OPERATION_NOT_DONE_RESPONSE = {
    name: OPERATION_NAME,
    metadata: {
      '@type': 'type.googleapis.com/google.firebase.ml.v1beta2.ModelOperationMetadata',
      name: `projects/${PROJECT_ID}/models/${MODEL_ID}`,
      basicOperationStatus: 'BASIC_OPERATION_STATUS_UPLOADING'
    },
    done: false,
  };
  const OPERATION_AUTOML_RESPONSE = {
    done: true,
    response: MODEL_RESPONSE_AUTOML,
  };
  const LOCKED_MODEL_RESPONSE = {
    name: 'projects/test-project/models/1234567',
    createTime: '2020-02-07T23:45:23.288047Z',
    updateTime: '2020-02-08T23:45:23.288047Z',
    etag: 'etag123',
    modelHash: 'modelHash123',
    displayName: 'model_1',
    tags: ['tag_1', 'tag_2'],
    activeOperations: [OPERATION_NOT_DONE_RESPONSE],
    state: { published: true },
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model1.tflite',
      sizeBytes: 16900988,
    },
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
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
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
    const NAME_ONLY_OPTIONS: ModelOptions = { displayName: 'name1' };
    const GCS_OPTIONS: ModelOptions = {
      displayName: 'name2',
      tfliteModel: {
        gcsTfliteUri: 'gcsUri1',
      },
    };
    const AUTOML_OPTIONS: ModelOptions = {
      displayName: 'name3',
      tfliteModel: {
        automlModel: 'automlModel',
      },
    };

    const invalidContent: any[] = [null, undefined, {}, { tags: [] }];
    invalidContent.forEach((content) => {
      it(`should reject when called with: ${JSON.stringify(content)}`, () => {
        return apiClient.createModel(content)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid model content.');
      });
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.createModel(NAME_ONLY_OPTIONS)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should throw when an error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('not-found', 'Requested entity not found');
      return apiClient.createModel(NAME_ONLY_OPTIONS)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should resolve with the created resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.createModel(NAME_ONLY_OPTIONS)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
        });
    });

    it('should accept TFLite GCS options', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.createModel(GCS_OPTIONS)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
        });
    });

    it('should accept AutoML options', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_AUTOML_RESPONSE));
      stubs.push(stub);
      return apiClient.createModel(AUTOML_OPTIONS)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE_AUTOML);
        });
    });

    it('should resolve with error when the operation fails', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_ERROR_RESPONSE));
      stubs.push(stub);
      return apiClient.createModel(NAME_ONLY_OPTIONS)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.error).to.deep.equal(STATUS_ERROR_RESPONSE);
        });
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.createModel(NAME_ONLY_OPTIONS)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.createModel(NAME_ONLY_OPTIONS)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.createModel(NAME_ONLY_OPTIONS)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('updateModel', () => {
    const NAME_ONLY_OPTIONS: ModelOptions = { displayName: 'name1' };
    const GCS_OPTIONS: ModelOptions = {
      displayName: 'name2',
      tfliteModel: {
        gcsTfliteUri: 'gcsUri1',
      },
    };
    const AUTOML_OPTIONS: ModelOptions = {
      displayName: 'name3',
      tfliteModel: {
        automlModel: 'automlModel',
      },
    };

    const NAME_ONLY_MASK_LIST = ['displayName'];
    const GCS_MASK_LIST = ['displayName', 'tfliteModel.gcsTfliteUri'];
    const AUTOML_MASK_LIST = ['displayName', 'tfliteModel.automlModel'];

    const NAME_ONLY_UPDATE_MASK_STRING = 'updateMask=displayName';
    const GCS_UPDATE_MASK_STRING = 'updateMask=displayName,tfliteModel.gcsTfliteUri';
    const AUTOML_UPDATE_MASK_STRING = 'updateMask=displayName,tfliteModel.automlModel';

    const invalidOptions: any[] = [null, undefined];
    invalidOptions.forEach((option) => {
      it(`should reject when called with: ${JSON.stringify(option)}`, () => {
        return apiClient.updateModel(MODEL_ID, option, NAME_ONLY_MASK_LIST)
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
      return clientWithoutProjectId.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should throw when an error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('not-found', 'Requested entity not found');
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should resolve with the updated resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            headers: EXPECTED_HEADERS,
            url: `${BASE_URL}/projects/test-project/models/${MODEL_ID}?${NAME_ONLY_UPDATE_MASK_STRING}`,
            data: NAME_ONLY_OPTIONS,
          });
        });
    });

    it('should resolve with the updated GCS resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, GCS_OPTIONS, GCS_MASK_LIST)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            headers: EXPECTED_HEADERS,
            url: `${BASE_URL}/projects/test-project/models/${MODEL_ID}?${GCS_UPDATE_MASK_STRING}`,
            data: GCS_OPTIONS,
          });
        });
    });

    it('should resolve with the updated AutoML resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, AUTOML_OPTIONS, AUTOML_MASK_LIST)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.response).to.deep.equal(MODEL_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            headers: EXPECTED_HEADERS,
            url: `${BASE_URL}/projects/test-project/models/${MODEL_ID}?${AUTOML_UPDATE_MASK_STRING}`,
            data: AUTOML_OPTIONS,
          });
        });
    });

    it('should resolve with error when the operation fails', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_ERROR_RESPONSE));
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .then((resp) => {
          expect(resp.done).to.be.true;
          expect(resp.name).to.be.undefined;
          expect(resp.error).to.deep.equal(STATUS_ERROR_RESPONSE);
        });
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.updateModel(MODEL_ID, NAME_ONLY_OPTIONS, NAME_ONLY_MASK_LIST)
        .should.eventually.be.rejected.and.deep.include(expected);
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

    it('should reject when called with prefixed name', () => {
      return apiClient.getModel('projects/foo/models/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Model ID must not contain any "/" characters.');
    });

    it('should reject when project id is not available', () => {
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
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('getOperation', () => {
    it('should resolve with the requested operation on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.getOperation(OPERATION_NAME)
        .then((resp) => {
          expect(resp).to.deep.equal(OPERATION_SUCCESS_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/projects/${PROJECT_NUMBER}/operations/${OPERATION_ID}`,
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
      return apiClient.getOperation(OPERATION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.getOperation(OPERATION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getOperation(OPERATION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getOperation(OPERATION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('handleOperation', () => {
    it('handles a done operation with result', () => {
      return apiClient.handleOperation(OPERATION_SUCCESS_RESPONSE)
        .then((resp) => {
          expect(resp).deep.equals(MODEL_RESPONSE);
        });
    });

    it('handles a done operation with error', () => {
      const expected = new FirebaseMachineLearningError('invalid-argument', STATUS_ERROR_MESSAGE);
      return apiClient.handleOperation(OPERATION_ERROR_RESPONSE)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('handles a running operation with no wait', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(LOCKED_MODEL_RESPONSE));
      stubs.push(stub);
      return apiClient.handleOperation(OPERATION_NOT_DONE_RESPONSE)
        .then((resp) => {
          expect(resp).to.deep.equal(LOCKED_MODEL_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/projects/${PROJECT_ID}/models/${MODEL_ID}`,
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('handles a running operation with wait', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stub.onCall(0).resolves(utils.responseFrom(OPERATION_NOT_DONE_RESPONSE));
      stub.onCall(1).resolves(utils.responseFrom(OPERATION_SUCCESS_RESPONSE));
      stubs.push(stub);
      return apiClient.handleOperation(OPERATION_NOT_DONE_RESPONSE, {
        wait: true,
        maxTimeMillis: 1000,
        baseWaitMillis: 2,
        maxWaitMillis: 5 })
        .then((resp) => {
          expect(resp).to.deep.equal(MODEL_RESPONSE);
          expect(stub).to.have.been.calledTwice.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/projects/${PROJECT_NUMBER}/operations/${OPERATION_ID}`,
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('handles a running operation with wait ending in error', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stub.onCall(0).resolves(utils.responseFrom(OPERATION_NOT_DONE_RESPONSE));
      stub.onCall(1).resolves(utils.responseFrom(OPERATION_ERROR_RESPONSE));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('invalid-argument', STATUS_ERROR_MESSAGE);
      return apiClient.handleOperation(OPERATION_NOT_DONE_RESPONSE, {
        wait: true,
        maxTimeMillis: 1000,
        baseWaitMillis: 2,
        maxWaitMillis: 5 })
        .should.eventually.be.rejected.and.deep.include(expected)
        .then(() => {
          expect(stub).to.have.been.calledTwice.and.calledWith({
            method: 'GET',
            url: `${BASE_URL}/projects/${PROJECT_NUMBER}/operations/${OPERATION_ID}`,
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('handles a running operation with wait ending in timeout', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stub.onCall(0).resolves(utils.responseFrom(OPERATION_NOT_DONE_RESPONSE));
      stub.onCall(1).resolves(utils.responseFrom(OPERATION_NOT_DONE_RESPONSE));
      stub.onCall(2).resolves(utils.responseFrom(OPERATION_NOT_DONE_RESPONSE));
      stubs.push(stub);
      const expected = new Error('ExponentialBackoffPoller dealine exceeded - Master timeout reached');
      return apiClient.handleOperation(OPERATION_NOT_DONE_RESPONSE, {
        wait: true,
        maxTimeMillis: 1000,
        baseWaitMillis: 500,
        maxWaitMillis: 1000 })
        .should.eventually.be.rejected.and.deep.include(expected);
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
        return apiClient.listModels({ filter: invalidFilter })
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid list filter.');
      });
    });

    const invalidPageSizes: any[] = [null, '', '10', true, {}, []];
    invalidPageSizes.forEach((invalidPageSize) => {
      it(`should reject when called with invalid page size: ${JSON.stringify(invalidPageSize)}`, () => {
        return apiClient.listModels({ pageSize: invalidPageSize })
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid page size.');
      });
    });

    const outOfRangePageSizes: number[] = [-1, 0, 101];
    outOfRangePageSizes.forEach((invalidPageSize) => {
      it(`should reject when called with invalid page size: ${invalidPageSize}`, () => {
        return apiClient.listModels({ pageSize: invalidPageSize })
          .should.eventually.be.rejected.and.have.property(
            'message', 'Page size must be between 1 and 100.');
      });
    });

    const invalidPageTokens: any[] = [null, 0, '', true, {}, []];
    invalidPageTokens.forEach((invalidToken) => {
      it(`should reject when called with invalid pageToken: ${JSON.stringify(invalidToken)}`, () => {
        return apiClient.listModels({ pageToken: invalidToken })
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
      { pageSize: 5 },
      { pageToken: 'next' },
      { filter: 'displayName=name1' },
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
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.listModels()
        .should.eventually.be.rejected.and.deep.include(expected);
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

    it('should reject when called with prefixed name', () => {
      return apiClient.deleteModel('projects/foo/rulesets/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Model ID must not contain any "/" characters.');
    });

    it('should reject when project id is not available', () => {
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
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError('unknown-error', 'Unknown server error: {}');
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseMachineLearningError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when failed with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });
});

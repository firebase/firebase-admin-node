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
import { FirebaseApp } from '../../../src/firebase-app';
import * as mocks from '../../resources/mocks';
import { MachineLearning, Model } from '../../../src/machine-learning/machine-learning';
import {
  MachineLearningApiClient,
  StatusErrorResponse,
  ModelResponse,
  OperationResponse
} from '../../../src/machine-learning/machine-learning-api-client';
import { FirebaseMachineLearningError } from '../../../src/machine-learning/machine-learning-utils';
import { deepCopy } from '../../../src/utils/deep-copy';
import { machineLearning } from '../../../src/machine-learning/index';

import ModelOptions = machineLearning.ModelOptions;

const expect = chai.expect;

describe('MachineLearning', () => {

  const MODEL_ID = '1234567';
  const PROJECT_ID = 'test-project';
  const PROJECT_NUMBER = '987654';
  const OPERATION_ID = '456789';
  const OPERATION_NAME = `projects/${PROJECT_NUMBER}/operations/${OPERATION_ID}`
  const EXPECTED_ERROR = new FirebaseMachineLearningError('internal-error', 'message');
  const CREATE_TIME_UTC = 'Fri, 07 Feb 2020 23:45:23 GMT';
  const UPDATE_TIME_UTC = 'Sat, 08 Feb 2020 23:45:23 GMT';
  const MODEL_RESPONSE: {
    name: string;
    createTime: string;
    updateTime: string;
    etag: string;
    modelHash: string;
    displayName?: string;
    tags?: string[];
    state?: {
      validationError?: {
        code: number;
        message: string;
      };
      published?: boolean;
    };
    tfliteModel?: {
      gcsTfliteUri: string;
      sizeBytes: number;
    };
  } = {
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


  const MODEL_RESPONSE2: {
    name: string;
    createTime: string;
    updateTime: string;
    etag: string;
    modelHash: string;
    displayName?: string;
    tags?: string[];
    state?: {
      validationError?: {
        code: number;
        message: string;
      };
      published?: boolean;
    };
    tfliteModel?: {
      gcsTfliteUri: string;
      sizeBytes: number;
    };
  } = {
    name: 'projects/test-project/models/2345678',
    createTime: '2020-02-07T23:45:22.288047Z',
    updateTime: '2020-02-08T23:45:22.288047Z',
    etag: 'etag234',
    modelHash: 'modelHash234',
    displayName: 'model_2',
    tags: ['tag_2', 'tag_3'],
    state: { published: false },
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model2.tflite',
      sizeBytes: 22200222,
    },
  };

  const MODEL_RESPONSE3: any = {
    name: 'projects/test-project/models/3456789',
    createTime: '2020-02-07T23:45:23.288047Z',
    updateTime: '2020-02-08T23:45:23.288047Z',
    etag: 'etag345',
    modelHash: 'modelHash345',
    displayName: 'model_3',
    tags: ['tag_3', 'tag_4'],
    state: { published: true },
    tfliteModel: {
      managedUpload: true,
      sizeBytes: 22200222,
    },
  };

  const STATUS_ERROR_RESPONSE: {
    code: number;
    message: string;
  } = {
    code: 3,
    message: 'Invalid Argument message',
  };

  const OPERATION_RESPONSE: {
    name?: string;
    metadata?: any;
    done: boolean;
    error?: StatusErrorResponse;
    response?: {
      name: string;
      createTime: string;
      updateTime: string;
      etag: string;
      modelHash: string;
      displayName?: string;
      tags?: string[];
      state?: {
        validationError?: {
          code: number;
          message: string;
        };
        published?: boolean;
      };
      tfliteModel?: {
        gcsTfliteUri: string;
        sizeBytes: number;
      };
    };
  } = {
    done: true,
    response: MODEL_RESPONSE,
  };

  const OPERATION_RESPONSE_ERROR: {
    name?: string;
    metadata?: any;
    done: boolean;
    error?: {
      code: number;
      message: string;
    };
    response?: ModelResponse;
  } = {
    done: true,
    error: STATUS_ERROR_RESPONSE,
  };

  const OPERATION_RESPONSE_NOT_DONE: {
    name?: string;
    metadata?: any;
    done: boolean;
    error?: {
      code: number;
      message: string;
    };
    response?: ModelResponse;
  } = {
    name: OPERATION_NAME,
    metadata: {
      '@type': 'type.googleapis.com/google.firebase.ml.v1beta2.ModelOperationMetadata',
      name: `projects/${PROJECT_ID}/models/${MODEL_ID}`,
      basicOperationStatus: 'BASIC_OPERATION_STATUS_UPLOADING'
    },
    done: false,
  };

  const MODEL_RESPONSE_LOCKED: {
      name: string;
      createTime: string;
      updateTime: string;
      etag: string;
      modelHash: string;
      displayName?: string;
      tags?: string[];
      activeOperations?: OperationResponse[];
      state?: {
        validationError?: {
          code: number;
          message: string;
        };
        published?: boolean;
      };
      tfliteModel?: {
        gcsTfliteUri: string;
        sizeBytes: number;
      };
    } = {
      name: 'projects/test-project/models/1234567',
      createTime: '2020-02-07T23:45:23.288047Z',
      updateTime: '2020-02-08T23:45:23.288047Z',
      etag: 'etag123',
      modelHash: 'modelHash123',
      displayName: 'model_1',
      tags: ['tag_1', 'tag_2'],
      activeOperations: [OPERATION_RESPONSE_NOT_DONE],
      state: { published: true },
      tfliteModel: {
        gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model1.tflite',
        sizeBytes: 16900988,
      },
    };


  let machineLearning: MachineLearning;
  let mockApp: FirebaseApp;
  let mockClient: MachineLearningApiClient;
  let mockCredentialApp: FirebaseApp;

  let model1: Model;
  let model2: Model;

  const stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockClient = new MachineLearningApiClient(mockApp);
    mockCredentialApp = mocks.mockCredentialApp();
    machineLearning = new MachineLearning(mockApp);
    model1 = new Model(MODEL_RESPONSE, mockClient);
    model2 = new Model(MODEL_RESPONSE2, mockClient);
  });

  after(() => {
    return mockApp.delete();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const machineLearningAny: any = MachineLearning;
          return new machineLearningAny(invalidApp);
        }).to.throw(
          'First argument passed to admin.machineLearning() must be a valid Firebase app '
              + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const machineLearningAny: any = MachineLearning;
        return new machineLearningAny();
      }).to.throw(
        'First argument passed to admin.machineLearning() must be a valid Firebase app '
            + 'instance.');
    });

    it('should throw given invalid credential', () => {
      const expectedError = 'Failed to initialize Google Cloud Storage client with ' +
          'the available credential. Must initialize the SDK with a certificate credential ' +
          'or application default credentials to use Cloud Storage API.';
      expect(() => {
        const machineLearningAny: any = MachineLearning;
        return new machineLearningAny(mockCredentialApp).createModel({
          displayName: 'foo',
          tfliteModel: {
            gcsTfliteUri: 'gs://some-bucket/model.tflite',
          } });
      }).to.throw(expectedError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new MachineLearning(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(machineLearning.app).to.equal(mockApp);
    });
  });

  describe('Model', () => {
    it('should successfully construct a model', () => {
      const model = new Model(MODEL_RESPONSE, mockClient);
      expect(model.modelId).to.equal(MODEL_ID);
      expect(model.displayName).to.equal('model_1');
      expect(model.tags).to.deep.equal(['tag_1', 'tag_2']);
      expect(model.createTime).to.equal(CREATE_TIME_UTC);
      expect(model.updateTime).to.equal(UPDATE_TIME_UTC);
      expect(model.validationError).to.be.undefined;
      expect(model.published).to.be.true;
      expect(model.etag).to.equal('etag123');
      expect(model.modelHash).to.equal('modelHash123');

      const tflite = model.tfliteModel!;
      expect(tflite.gcsTfliteUri).to.be.equal(
        'gs://test-project-bucket/Firebase/ML/Models/model1.tflite');
      expect(tflite.sizeBytes).to.be.equal(16900988);
    });

    it('should accept unknown fields gracefully', () => {
      const model = new Model(MODEL_RESPONSE3, mockClient);
      expect(model.modelId).to.equal('3456789');
      expect(model.displayName).to.equal('model_3');
      expect(model.tags).to.deep.equal(['tag_3', 'tag_4']);
      expect(model.createTime).to.equal(CREATE_TIME_UTC);
      expect(model.updateTime).to.equal(UPDATE_TIME_UTC);
      expect(model.validationError).to.be.undefined;
      expect(model.published).to.be.true;
      expect(model.etag).to.equal('etag345');
      expect(model.modelHash).to.equal('modelHash345');
      expect(model.tfliteModel).to.be.undefined;
    });

    it('should successfully serialize a model to JSON', () => {
      const model = new Model(MODEL_RESPONSE, mockClient);
      const expectedModel = {
        modelId: MODEL_ID,
        displayName: 'model_1',
        tags: ['tag_1', 'tag_2'],
        createTime: CREATE_TIME_UTC,
        updateTime: UPDATE_TIME_UTC,
        published: true,
        etag: 'etag123',
        locked: false,
        modelHash: 'modelHash123',
        tfliteModel: {
          gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model1.tflite',
          sizeBytes: 16900988,
        }
      }
      const jsonString = JSON.stringify(model);
      expect(JSON.parse(jsonString)).to.deep.equal(expectedModel);
    })

    it('should return locked when active operations are present', () => {
      const model = new Model(MODEL_RESPONSE_LOCKED, mockClient);
      expect(model.locked).to.be.true;
    });

    it('should return locked as false when no active operations are present', () => {
      const model = new Model(MODEL_RESPONSE, mockClient);
      expect(model.locked).to.be.false;
    });

    it('should successfully update a model from a Response', () => {
      const model = new Model(MODEL_RESPONSE_LOCKED, mockClient);
      expect(model.locked).to.be.true;

      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'handleOperation')
        .resolves(MODEL_RESPONSE2);
      stubs.push(stub);

      model.waitForUnlocked()
        .then(() => {
          expect(model.locked).to.be.false;
          expect(model).to.deep.equal(model2);
        });
    });
  });



  describe('getModel', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(null as any);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Model response: null');
    });

    it('should reject when API response does not contain a name', () => {
      const response = deepCopy(MODEL_RESPONSE);
      response.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const response = deepCopy(MODEL_RESPONSE);
      response.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const response = deepCopy(MODEL_RESPONSE);
      response.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const response = deepCopy(MODEL_RESPONSE);
      response.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const response = deepCopy(MODEL_RESPONSE);
      response.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should resolve with Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(MODEL_RESPONSE);
      stubs.push(stub);

      return machineLearning.getModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(model1);
        });
    });
  });

  describe('listModels', () => {

    const LIST_MODELS_RESPONSE = {
      models: [
        MODEL_RESPONSE,
        MODEL_RESPONSE2,
      ],
      nextPageToken: 'next',
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'listModels')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.listModels({})
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'listModels')
        .resolves(null as any);
      stubs.push(stub);
      return machineLearning.listModels()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid ListModels response: null');
    });

    it('should resolve with Models on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'listModels')
        .resolves(LIST_MODELS_RESPONSE);
      stubs.push(stub);
      return machineLearning.listModels()
        .then((result) => {
          expect(result.models.length).equals(2);
          expect(result.models[0]).to.deep.equal(model1);
          expect(result.models[1]).to.deep.equal(model2);
          expect(result.pageToken).to.equal(LIST_MODELS_RESPONSE.nextPageToken);
        });
    });
  });

  describe('deleteModel', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'deleteModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.deleteModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'deleteModel')
        .resolves();
      stubs.push(stub);

      return machineLearning.deleteModel(MODEL_ID);
    });
  });

  describe('createModel', () => {
    const GCS_TFLITE_URI = 'gs://test-bucket/Firebase/ML/Models/model1.tflite';
    const MODEL_OPTIONS_NO_GCS: ModelOptions = {
      displayName: 'display_name',
      tags: ['tag1', 'tag2'],
    };
    const MODEL_OPTIONS_WITH_GCS: ModelOptions = {
      displayName: 'display_name_2',
      tags: ['tag3', 'tag4'],
      tfliteModel: {
        gcsTfliteUri: GCS_TFLITE_URI,
      },
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(null as any);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_WITH_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.createModel(MODEL_OPTIONS_WITH_GCS)
        .then((model) => {
          expect(model).to.deep.equal(model1);
        });
    });

    it('should resolve with Error on operation error', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(OPERATION_RESPONSE_ERROR);
      stubs.push(stub);

      return machineLearning.createModel(MODEL_OPTIONS_WITH_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Argument message');
    });
  });

  describe('updateModel', () => {
    const GCS_TFLITE_URI = 'gs://test-bucket/Firebase/ML/Models/model1.tflite';
    const MODEL_OPTIONS_NO_GCS: ModelOptions = {
      displayName: 'display_name',
      tags: ['tag1', 'tag2'],
    };
    const MODEL_OPTIONS_WITH_GCS: ModelOptions = {
      displayName: 'display_name_2',
      tags: ['tag3', 'tag4'],
      tfliteModel: {
        gcsTfliteUri: GCS_TFLITE_URI,
      },
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(null as any);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_WITH_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NO_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_WITH_GCS)
        .then((model) => {
          expect(model).to.deep.equal(model1);
        });
    });

    it('should resolve with Error on operation error', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE_ERROR);
      stubs.push(stub);

      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_WITH_GCS)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Argument message');
    });
  });

  describe('publishModel', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(null as any);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.publishModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(model1);
        });
    });

    it('should resolve with Error on operation error', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE_ERROR);
      stubs.push(stub);

      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Argument message');
    });
  });

  describe('unpublishModel', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(null as any);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const op = deepCopy(OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.unpublishModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(model1);
        });
    });

    it('should resolve with Error on operation error', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE_ERROR);
      stubs.push(stub);

      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Argument message');
    });
  });
});

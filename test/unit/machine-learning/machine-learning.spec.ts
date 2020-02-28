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
import { MachineLearning, Model } from '../../../src/machine-learning/machine-learning';
import { FirebaseApp } from '../../../src/firebase-app';
import * as mocks from '../../resources/mocks';
import { MachineLearningApiClient, StatusErrorResponse,
  ModelOptions, ModelResponse } from '../../../src/machine-learning/machine-learning-api-client';
import { FirebaseMachineLearningError } from '../../../src/machine-learning/machine-learning-utils';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('MachineLearning', () => {

  const MODEL_ID = '1234567';
  const MODEL_ID3 = '3456789';
  const AUTOML_MODEL_ID = 'automlModelId123';
  const EXPECTED_ERROR = new FirebaseMachineLearningError('internal-error', 'message');
  const CREATE_TIME_UTC = 'Fri, 07 Feb 2020 23:45:23 GMT';
  const UPDATE_TIME_UTC = 'Sat, 08 Feb 2020 23:45:23 GMT';
  const CREATE_TIME_UTC3 = 'Fri, 07 Feb 2020 23:45:19 GMT';
  const UPDATE_TIME_UTC3 = 'Sat, 08 Feb 2020 23:45:19 GMT';

  const GCS_TFLITE_MODEL_RESPONSE: {
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
    state: {published: true},
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model1.tflite',
      sizeBytes: 16900988,
    },
  };
  const GCS_TFLITE_MODEL = new Model(GCS_TFLITE_MODEL_RESPONSE);

  const GCS_TFLITE_MODEL_RESPONSE2: {
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
    state: {published: false},
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model2.tflite',
      sizeBytes: 22200222,
    },
  };
  const GCS_TFLITE_MODEL2 = new Model(GCS_TFLITE_MODEL_RESPONSE2);

  const AUTOML_MODEL_RESPONSE: {
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
      automlModelId?: string;
      sizeBytes: number;
    };
  } = {
    name: 'projects/test-project/models/3456789',
    createTime: '2020-02-07T23:45:19.288047Z',
    updateTime: '2020-02-08T23:45:19.288047Z',
    etag: 'etag345',
    modelHash: 'modelHash345',
    displayName: 'model_3',
    tags: ['tag_3', 'tag_4'],
    state: {published: false},
    tfliteModel: {
      automlModelId: 'automlModelId123',
      sizeBytes: 33300333,
    },
  };
  const AUTOML_MODEL = new Model(AUTOML_MODEL_RESPONSE);

  const STATUS_ERROR_RESPONSE: {
    code: number;
    message: string;
  } = {
    code: 3,
    message: 'Invalid Argument message',
  };

  const GCS_TFLITE_OPERATION_RESPONSE: {
    name?: string;
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
    }
  } = {
    done: true,
    response: GCS_TFLITE_MODEL_RESPONSE,
  };

  const AUTOML_OPERATION_RESPONSE: {
    name?: string;
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
        automlModelId?: string;
        sizeBytes: number;
      };
    }
  } = {
    done: true,
    response: AUTOML_MODEL_RESPONSE,
  };

  const OPERATION_RESPONSE_ERROR: {
    name?: string;
    done: boolean;
    error?: {
      code: number;
      message: string;
    }
    response?: ModelResponse;
  } = {
    done: true,
    error: STATUS_ERROR_RESPONSE,
  };

  let machineLearning: MachineLearning;
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  const stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    machineLearning = new MachineLearning(mockApp);
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
          }});
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
    it('should successfully construct a gcs tflite model', () => {
      const model = new Model(GCS_TFLITE_MODEL_RESPONSE);
      expect(model.modelId).to.equal(MODEL_ID);
      expect(model.displayName).to.equal('model_1');
      expect(model.tags).to.deep.equal(['tag_1', 'tag_2']);
      expect(model.createTime).to.equal(CREATE_TIME_UTC);
      expect(model.updateTime).to.equal(UPDATE_TIME_UTC);
      expect(model.validationError).to.be.empty;
      expect(model.published).to.be.true;
      expect(model.etag).to.equal('etag123');
      expect(model.modelHash).to.equal('modelHash123');

      const tflite = model.tfliteModel!;
      expect(tflite.automlModelId).not.to.exist;
      expect(tflite.gcsTfliteUri).to.be.equal(
        'gs://test-project-bucket/Firebase/ML/Models/model1.tflite');
      expect(tflite.sizeBytes).to.be.equal(16900988);
    });

    it('should successfully construct an autoML model', () => {
      const model = new Model(AUTOML_MODEL_RESPONSE);
      expect(model.modelId).to.equal(MODEL_ID3);
      expect(model.displayName).to.equal('model_3');
      expect(model.tags).to.deep.equal(['tag_3', 'tag_4']);
      expect(model.createTime).to.equal(CREATE_TIME_UTC3);
      expect(model.updateTime).to.equal(UPDATE_TIME_UTC3);
      expect(model.validationError).to.be.empty;
      expect(model.published).to.be.false;
      expect(model.etag).to.equal('etag345');
      expect(model.modelHash).to.equal('modelHash345');

      const tflite = model.tfliteModel!;
      expect(tflite.gcsTfliteUri).not.to.exist;
      expect(tflite.automlModelId).to.be.equal('automlModelId123');
      expect(tflite.sizeBytes).to.be.equal(33300333);
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
        .resolves(null);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Model response: null');
    });

    it('should reject when API response does not contain a name', () => {
      const response = deepCopy(GCS_TFLITE_MODEL_RESPONSE);
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
      const response = deepCopy(GCS_TFLITE_MODEL_RESPONSE);
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
      const response = deepCopy(GCS_TFLITE_MODEL_RESPONSE);
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
      const response = deepCopy(GCS_TFLITE_MODEL_RESPONSE);
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
      const response = deepCopy(GCS_TFLITE_MODEL_RESPONSE);
      response.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response has tflite model but no source', () => {
      const response = deepCopy(GCS_TFLITE_MODEL_RESPONSE);
      response.tfliteModel!.gcsTfliteUri = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(response);
      stubs.push(stub);
      return machineLearning.getModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should resolve with gcsTFLite Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(GCS_TFLITE_MODEL_RESPONSE);
      stubs.push(stub);

      return machineLearning.getModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(GCS_TFLITE_MODEL);
        });
    });

    it('should resolve with automl Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(AUTOML_MODEL_RESPONSE);
      stubs.push(stub);

      return machineLearning.getModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(AUTOML_MODEL);
        });
    });
  });

  describe('listModels', () => {

    const LIST_MODELS_RESPONSE = {
      models: [
        GCS_TFLITE_MODEL_RESPONSE,
        GCS_TFLITE_MODEL_RESPONSE2,
        AUTOML_MODEL_RESPONSE,
      ],
      nextPageToken: 'next',
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'listModels')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.listModels()
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'listModels')
        .resolves(null);
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
          expect(result.models.length).equals(3);
          expect(result.models[0]).to.deep.equal(GCS_TFLITE_MODEL);
          expect(result.models[1]).to.deep.equal(GCS_TFLITE_MODEL2);
          expect(result.models[2]).to.deep.equal(AUTOML_MODEL);
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
        .resolves({});
      stubs.push(stub);

      return machineLearning.deleteModel(MODEL_ID);
    });
  });

  describe('createModel', () => {
    const GCS_TFLITE_URI = 'gs://test-bucket/Firebase/ML/Models/model1.tflite';
    const MODEL_OPTIONS_NAME_TAGS: ModelOptions = {
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
    const MODEL_OPTIONS_WITH_AUTOML: ModelOptions = {
      displayName: 'display_name_3',
      tags: ['tag5', 'tag6'],
      tfliteModel: {
        automlModelId: AUTOML_MODEL_ID,
      },
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(null);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
      .should.eventually.be.rejected.and.have.property(
        'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response has tflite model but no source', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.tfliteModel!.gcsTfliteUri = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with gcsTFLite Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(GCS_TFLITE_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.createModel(MODEL_OPTIONS_WITH_GCS)
        .then((model) => {
          expect(model).to.deep.equal(GCS_TFLITE_MODEL);
        });
    });

    it('should resolve with autoML Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(AUTOML_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.createModel(MODEL_OPTIONS_WITH_AUTOML)
        .then((model) => {
          expect(model).to.deep.equal(AUTOML_MODEL);
        });
    });

    it('should resolve with Error on operation error', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'createModel')
        .resolves(OPERATION_RESPONSE_ERROR);
      stubs.push(stub);

      return machineLearning.createModel(MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Argument message');
    });
  });

  describe('updateModel', () => {
    const GCS_TFLITE_URI = 'gs://test-bucket/Firebase/ML/Models/model1.tflite';
    const MODEL_OPTIONS_NAME_TAGS: ModelOptions = {
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
    const MODEL_OPTIONS_WITH_AUTOML: ModelOptions = {
      displayName: 'display_name_3',
      tags: ['tag5', 'tag6'],
      tfliteModel: {
        automlModelId: AUTOML_MODEL_ID,
      },
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(null);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
      .should.eventually.be.rejected.and.have.property(
        'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.name = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.createTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a updateTime', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.updateTime = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain a displayName', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.displayName = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response does not contain an etag', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response has tflite model but no source', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.tfliteModel!.gcsTfliteUri = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with gcsTFlite Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(GCS_TFLITE_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_WITH_GCS)
        .then((model) => {
          expect(model).to.deep.equal(GCS_TFLITE_MODEL);
        });
    });

    it('should resolve with autoML Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(AUTOML_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_WITH_AUTOML)
        .then((model) => {
          expect(model).to.deep.equal(AUTOML_MODEL);
        });
    });

    it('should resolve with Error on operation error', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(OPERATION_RESPONSE_ERROR);
      stubs.push(stub);

      return machineLearning.updateModel(MODEL_ID, MODEL_OPTIONS_NAME_TAGS)
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
        .resolves(null);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
      .should.eventually.be.rejected.and.have.property(
        'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response has tflite model but no source', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.tfliteModel!.gcsTfliteUri = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.publishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with gcs TFLite Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(GCS_TFLITE_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.publishModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(GCS_TFLITE_MODEL);
        });
    });

    it('should resolve with autoML Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(AUTOML_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.publishModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(AUTOML_MODEL);
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
        .resolves(null);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
      .should.eventually.be.rejected.and.have.property(
        'message', 'Cannot read property \'done\' of null');
    });

    it('should reject when API response does not contain a name', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
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
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.etag = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should reject when API response has tflite model but no source', () => {
      const op = deepCopy(GCS_TFLITE_OPERATION_RESPONSE);
      op.response!.tfliteModel!.gcsTfliteUri = '';
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(op);
      stubs.push(stub);
      return machineLearning.unpublishModel(MODEL_ID)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(op.response)}`);
    });

    it('should resolve with gcs tflite Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(GCS_TFLITE_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.unpublishModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(GCS_TFLITE_MODEL);
        });
    });

    it('should resolve with autoML Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'updateModel')
        .resolves(AUTOML_OPERATION_RESPONSE);
      stubs.push(stub);

      return machineLearning.publishModel(MODEL_ID)
        .then((model) => {
          expect(model).to.deep.equal(AUTOML_MODEL);
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

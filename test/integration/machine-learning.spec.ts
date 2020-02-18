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


import path = require('path');
import * as chai from 'chai';
import * as admin from '../../lib/index';
import {Bucket} from '@google-cloud/storage';

const expect = chai.expect;

describe('admin.machineLearning', () => {

  const modelsToDelete: string[] = [];

  function scheduleForDelete(model: admin.machineLearning.Model) {
    modelsToDelete.push(model.modelId);
  }

  function unscheduleForDelete(model: admin.machineLearning.Model) {
    modelsToDelete.splice(modelsToDelete.indexOf(model.modelId), 1);
  }

  function deleteTempModels(): Promise<void[]> {
    const promises: Array<Promise<void>> = [];
    modelsToDelete.forEach((modelId) => {
      promises.push(admin.machineLearning().deleteModel(modelId));
    });
    modelsToDelete.splice(0, modelsToDelete.length);  // Clear out the array.
    return Promise.all(promises);
  }

  function createTemporaryModel(options?: admin.machineLearning.ModelOptions)
    : Promise<admin.machineLearning.Model> {
    let modelOptions: admin.machineLearning.ModelOptions = {
      displayName: 'nodejs_integration_temp_model',
    };
    if (options) {
      modelOptions = options;
    }
    return admin.machineLearning().createModel(modelOptions)
      .then((model) => {
        scheduleForDelete(model);
        return model;
      });
  }

  function uploadModelToGcs(localFileName: string, gcsFileName: string): Promise<string> {
    const bucket: Bucket = admin.storage().bucket();
    const tfliteFileName = path.join(__dirname, `../resources/${localFileName}`);
    return bucket.upload(tfliteFileName, {destination: gcsFileName})
      .then(() => {
      return `gs://${bucket.name}/${gcsFileName}`;
    });
  }

  afterEach(() => {
    console.log('DEBUGG: Cleaning up.');
    return deleteTempModels();
  });

  describe('createModel', () => {
    it('creates a new Model without ModelFormat', () => {
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'node-integration-test-create-1',
        tags: ['tag123', 'tag345']};
      return admin.machineLearning().createModel(modelOptions)
        .then((model) => {
          scheduleForDelete(model);
          verifyModel(model, modelOptions);
        });
    });

    it('creates a new Model with valid ModelFormat', () => {
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'node-integration-test-create-2',
        tags: ['tag234', 'tag456'],
        tfliteModel: {gcsTfliteUri: 'this will be replaced below'},
      };
      return uploadModelToGcs('model1.tflite', 'valid_model.tflite')
        .then((fileName: string) => {
          modelOptions.tfliteModel!.gcsTfliteUri = fileName;
          return admin.machineLearning().createModel(modelOptions)
          .then((model) => {
            scheduleForDelete(model);
            verifyModel(model, modelOptions);
          });
        })
    });

    it('creates a new Model with invalid ModelFormat', () => {
      // Upload a file to default gcs bucket
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'node-integration-test-create-3',
        tags: ['tag234', 'tag456'],
        tfliteModel: {gcsTfliteUri: 'this will be replaced below'},
      };
      return uploadModelToGcs('invalid_model.tflite', 'invalid_model.tflite')
        .then((fileName: string) => {
          modelOptions.tfliteModel!.gcsTfliteUri = fileName;
          return admin.machineLearning().createModel(modelOptions)
          .then((model) => {
            scheduleForDelete(model);
            verifyModel(model, modelOptions);
          });
        });
    });

    it ('rejects with invalid-argument when modelOptions are invalid', () => {
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'Invalid Name#*^!',
      };
      return admin.machineLearning().createModel(modelOptions)
        .should.eventually.be.rejected.and.have.property('code', 'machine-learning/invalid-argument');
    });

  });

  describe('getModel()', () => {
    it('rejects with not-found when the Model does not exist', () => {
      const nonExistingName = '00000000';
      return admin.machineLearning().getModel(nonExistingName)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/not-found');
    });

    it('rejects with invalid-argument when the ModelId is invalid', () => {
      return admin.machineLearning().getModel('invalid-model-id')
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/invalid-argument');
    });

    it('resolves with existing Model', () => {
      return createTemporaryModel()
        .then((expectedModel) =>
          admin.machineLearning().getModel(expectedModel.modelId)
            .then((actualModel) => {
              expect(actualModel).to.deep.equal(expectedModel);
            }),
        );
    });
  });

  describe('deleteModel()', () => {
    it('rejects with not-found when the Model does not exist', () => {
      const nonExistingName = '00000000';
      return admin.machineLearning().deleteModel(nonExistingName)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/not-found');
    });

    it('rejects with invalid-argument when the Model ID is invalid', () => {
      return admin.machineLearning().deleteModel('invalid-model-id')
      .should.eventually.be.rejected.and.have.property(
        'code', 'machine-learning/invalid-argument');
    });

    it('deletes existing Model', () => {
      return createTemporaryModel().then((model) => {
        return admin.machineLearning().deleteModel(model.modelId)
          .then(() => {
            return admin.machineLearning().getModel(model.modelId)
              .should.eventually.be.rejected.and.have.property('code', 'machine-learning/not-found');
          })
          .then(() => {
            unscheduleForDelete(model);  // Already deleted.
          });
      });
    });
  });

  function verifyModel(model: admin.machineLearning.Model, modelOptions: admin.machineLearning.ModelOptions) {
    expect(model.displayName).to.equal(modelOptions.displayName);
    expect(model.createTime).to.not.be.empty;
    expect(model.updateTime).to.not.be.empty;
    expect(model.etag).to.not.be.empty;
    if (modelOptions.tags) {
      expect(model.tags).to.deep.equal(modelOptions.tags);
    } else {
      expect(model.tags).to.be.empty;
    }
    if (modelOptions.tfliteModel) {
      expect(model.tfliteModel!.gcsTfliteUri).to.equal(modelOptions.tfliteModel.gcsTfliteUri);
      if (modelOptions.tfliteModel.gcsTfliteUri.endsWith('invalid_model.tflite')) {
        expect(model.modelHash).to.be.empty;
        expect(model.validationError).to.equal('Invalid flatbuffer format');
      } else {
        expect(model.modelHash).to.not.be.empty;
        expect(model.validationError).to.be.empty;
      }
    } else {
      expect(model.validationError).to.equal('No model file has been uploaded.');
    }
    expect(model.locked).to.be.false;

  }
});

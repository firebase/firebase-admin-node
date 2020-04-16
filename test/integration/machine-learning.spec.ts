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

  function scheduleForDelete(model: admin.machineLearning.Model): void {
    modelsToDelete.push(model.modelId);
  }

  function unscheduleForDelete(model: admin.machineLearning.Model): void {
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

  function createTemporaryModel(options?: admin.machineLearning.ModelOptions):
    Promise<admin.machineLearning.Model> {
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
    return deleteTempModels();
  });

  describe('createModel()', () => {
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
        });
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

  describe('updateModel()', () => {

    const UPDATE_NAME: admin.machineLearning.ModelOptions = {
      displayName: 'update-model-new-name',
    };

    it('rejects with not-found when the Model does not exist', () => {
      const nonExistingId = '00000000';
      return admin.machineLearning().updateModel(nonExistingId, UPDATE_NAME)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/not-found');
    });

    it('rejects with invalid-argument when the ModelId is invalid', () => {
      return admin.machineLearning().updateModel('invalid-model-id', UPDATE_NAME)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/invalid-argument');
    });

    it ('rejects with invalid-argument when modelOptions are invalid', () => {
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'Invalid Name#*^!',
      };
      return createTemporaryModel({displayName: 'node-integration-invalid-argument'})
        .then((model) => admin.machineLearning().updateModel(model.modelId, modelOptions)
          .should.eventually.be.rejected.and.have.property(
            'code', 'machine-learning/invalid-argument'));
    });

    it('updates the displayName', () => {
      const DISPLAY_NAME = 'node-integration-test-update-1b';
      return createTemporaryModel({displayName: 'node-integration-test-update-1a'})
        .then((model) => {
          const modelOptions: admin.machineLearning.ModelOptions = {
            displayName: DISPLAY_NAME,
          };
          return admin.machineLearning().updateModel(model.modelId, modelOptions)
            .then((updatedModel) => {
              verifyModel(updatedModel, modelOptions);
            });
        });
    });

    it('sets tags for a model', () => {
      const ORIGINAL_TAGS = ['tag-node-update-1'];
      const NEW_TAGS = ['tag-node-update-2', 'tag-node-update-3'];

      return createTemporaryModel({
        displayName: 'node-integration-test-update-2',
        tags: ORIGINAL_TAGS,
      }).then((expectedModel) => {
        const modelOptions: admin.machineLearning.ModelOptions = {
          tags: NEW_TAGS,
        };
        return admin.machineLearning().updateModel(expectedModel.modelId, modelOptions)
          .then((actualModel) => {
            expect(actualModel.tags!.length).to.equal(2);
            expect(actualModel.tags).to.have.same.members(NEW_TAGS);
          });
      });
    });

    it('updates the tflite file', () => {
      return Promise.all([
        createTemporaryModel(),
        uploadModelToGcs('model1.tflite', 'valid_model.tflite')])
        .then(([model, fileName]) => {
          const modelOptions: admin.machineLearning.ModelOptions = {
            tfliteModel: {gcsTfliteUri: fileName},
          };
          return admin.machineLearning().updateModel(model.modelId, modelOptions)
            .then((updatedModel) => {
              verifyModel(updatedModel, modelOptions);
            });
        });
    });

    it('can update more than 1 field', () => {
      const DISPLAY_NAME = 'node-integration-test-update-3b';
      const TAGS = ['node-integration-tag-1', 'node-integration-tag-2'];
      return createTemporaryModel({displayName: 'node-integration-test-update-3a'})
        .then((model) => {
          const modelOptions: admin.machineLearning.ModelOptions = {
            displayName: DISPLAY_NAME,
            tags: TAGS,
          };
          return admin.machineLearning().updateModel(model.modelId, modelOptions)
            .then((updatedModel) => {
              expect(updatedModel.displayName).to.equal(DISPLAY_NAME);
              expect(updatedModel.tags).to.have.same.members(TAGS);
            });
        });
    });
  });

  describe('publishModel()', () => {
    it('should reject when model does not exist', () => {
      const nonExistingName = '00000000';
      return admin.machineLearning().publishModel(nonExistingName)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/not-found');
    });

    it('rejects with invalid-argument when the ModelId is invalid', () => {
      return admin.machineLearning().publishModel('invalid-model-id')
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/invalid-argument');
    });

    it('publishes the model successfully', () => {
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'node-integration-test-publish-1',
        tfliteModel: {gcsTfliteUri: 'this will be replaced below'},
      };
      return uploadModelToGcs('model1.tflite', 'valid_model.tflite')
        .then((fileName: string) => {
          modelOptions.tfliteModel!.gcsTfliteUri = fileName;
          createTemporaryModel(modelOptions)
            .then((createdModel) => {
              expect(createdModel.validationError).to.be.empty;
              expect(createdModel.published).to.be.false;
              admin.machineLearning().publishModel(createdModel.modelId)
                .then((publishedModel) => {
                  expect(publishedModel.published).to.be.true;
                });
            });
        });
    });
  });

  describe('unpublishModel()', () => {
    it('should reject when model does not exist', () => {
      const nonExistingName = '00000000';
      return admin.machineLearning().unpublishModel(nonExistingName)
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/not-found');
    });

    it('rejects with invalid-argument when the ModelId is invalid', () => {
      return admin.machineLearning().unpublishModel('invalid-model-id')
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/invalid-argument');
    });

    it('unpublishes the model successfully', () => {
      const modelOptions: admin.machineLearning.ModelOptions = {
        displayName: 'node-integration-test-unpublish-1',
        tfliteModel: {gcsTfliteUri: 'this will be replaced below'},
      };
      return uploadModelToGcs('model1.tflite', 'valid_model.tflite')
        .then((fileName: string) => {
          modelOptions.tfliteModel!.gcsTfliteUri = fileName;
          createTemporaryModel(modelOptions)
            .then((createdModel) => {
              expect(createdModel.validationError).to.be.empty;
              expect(createdModel.published).to.be.false;
              admin.machineLearning().publishModel(createdModel.modelId)
                .then((publishedModel) => {
                  expect(publishedModel.published).to.be.true;
                  admin.machineLearning().unpublishModel(publishedModel.modelId)
                    .then((unpublishedModel) => {
                      expect(unpublishedModel.published).to.be.false;
                    });
                });
            });
        });
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

  describe('listModels()', () => {
    let model1: admin.machineLearning.Model;
    let model2: admin.machineLearning.Model;
    let model3: admin.machineLearning.Model;

    before(() => {
      return Promise.all([
        admin.machineLearning().createModel({
          displayName: 'node-integration-list1',
          tags: ['node-integration-tag-1'],
        }),
        admin.machineLearning().createModel({
          displayName: 'node-integration-list2',
          tags: ['node-integration-tag-1'],
        }),
        admin.machineLearning().createModel({
          displayName: 'node-integration-list3',
          tags: ['node-integration-tag-1'],
        })])
        .then(([m1, m2, m3]: admin.machineLearning.Model[]) => {
          model1 = m1;
          model2 = m2;
          model3 = m3;
        });
    });

    after(() => {
      return Promise.all([
        admin.machineLearning().deleteModel(model1.modelId),
        admin.machineLearning().deleteModel(model2.modelId),
        admin.machineLearning().deleteModel(model3.modelId),
      ]);
    });

    it('resolves with a list of models', () => {
      return admin.machineLearning().listModels({pageSize: 100})
        .then((modelList) => {
          expect(modelList.models.length).to.be.at.least(2);
          expect(modelList.models).to.deep.include(model1);
          expect(modelList.models).to.deep.include(model2);
          expect(modelList.pageToken).to.be.empty;
        });
    });

    it('respects page size', () => {
      return admin.machineLearning().listModels({pageSize: 2})
        .then((modelList) => {
          expect(modelList.models.length).to.equal(2);
          expect(modelList.pageToken).not.to.be.empty;
        });
    });

    it('filters by exact displayName', () => {
      return admin.machineLearning().listModels({filter: 'displayName=node-integration-list1'})
        .then((modelList) => {
          expect(modelList.models.length).to.equal(1);
          expect(modelList.models[0]).to.deep.equal(model1);
          expect(modelList.pageToken).to.be.empty;
        });
    });

    it('filters by displayName prefix', () => {
      return admin.machineLearning().listModels({filter: 'displayName:node-integration-list*', pageSize: 100})
        .then((modelList) => {
          expect(modelList.models.length).to.be.at.least(3);
          expect(modelList.models).to.deep.include(model1);
          expect(modelList.models).to.deep.include(model2);
          expect(modelList.models).to.deep.include(model3);
          expect(modelList.pageToken).to.be.empty;
        });
    });

    it('filters by tag', () => {
      return admin.machineLearning().listModels({filter: 'tags:node-integration-tag-1', pageSize: 100})
        .then((modelList) => {
          expect(modelList.models.length).to.be.at.least(3);
          expect(modelList.models).to.deep.include(model1);
          expect(modelList.models).to.deep.include(model2);
          expect(modelList.models).to.deep.include(model3);
          expect(modelList.pageToken).to.be.empty;
        });
    });

    it('handles pageTokens properly', () => {
      return admin.machineLearning().listModels({filter: 'displayName:node-integration-list*', pageSize: 2})
        .then((modelList) => {
          expect(modelList.models.length).to.equal(2);
          expect(modelList.pageToken).not.to.be.empty;
          return admin.machineLearning().listModels({
            filter: 'displayName:node-integration-list*',
            pageSize: 2,
            pageToken: modelList.pageToken})
            .then((modelList2) => {
              expect(modelList2.models.length).to.be.at.least(1);
              expect(modelList2.pageToken).to.be.empty;
            });
        });
    });

    it('successfully returns an empty list of models', () => {
      return admin.machineLearning().listModels({filter: 'displayName=non-existing-model'})
        .then((modelList) => {
          expect(modelList.models.length).to.equal(0);
          expect(modelList.pageToken).to.be.empty;
        });
    });

    it('rejects with invalid argument if the filter is invalid', () => {
      return admin.machineLearning().listModels({filter: 'invalidFilterItem=foo'})
        .should.eventually.be.rejected.and.have.property(
          'code', 'machine-learning/invalid-argument');
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

  function verifyModel(model: admin.machineLearning.Model, expectedOptions: admin.machineLearning.ModelOptions): void {
    if (expectedOptions.displayName) {
      expect(model.displayName).to.equal(expectedOptions.displayName);
    } else {
      expect(model.displayName).not.to.be.empty;
    }
    expect(model.createTime).to.not.be.empty;
    expect(model.updateTime).to.not.be.empty;
    expect(model.etag).to.not.be.empty;
    if (expectedOptions.tags) {
      expect(model.tags).to.deep.equal(expectedOptions.tags);
    } else {
      expect(model.tags).to.be.empty;
    }
    if (expectedOptions.tfliteModel) {
      verifyTfliteModel(model, expectedOptions.tfliteModel.gcsTfliteUri);
    } else {
      expect(model.validationError).to.equal('No model file has been uploaded.');
    }
    expect(model.locked).to.be.false;
  }
});

function verifyTfliteModel(model: admin.machineLearning.Model, expectedGcsTfliteUri: string): void {
  expect(model.tfliteModel!.gcsTfliteUri).to.equal(expectedGcsTfliteUri);
  if (expectedGcsTfliteUri.endsWith('invalid_model.tflite')) {
    expect(model.modelHash).to.be.empty;
    expect(model.validationError).to.equal('Invalid flatbuffer format');
  } else {
    expect(model.modelHash).to.not.be.empty;
    expect(model.validationError).to.be.empty;
  }
}

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
import { MachineLearning } from '../../../src/machine-learning/machine-learning';
import { FirebaseApp } from '../../../src/firebase-app';
import * as mocks from '../../resources/mocks';
import { MachineLearningApiClient } from '../../../src/machine-learning/machine-learning-api-client';
import { FirebaseMachineLearningError } from '../../../src/machine-learning/machine-learning-utils';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('MachineLearning', () => {

  const EXPECTED_ERROR = new FirebaseMachineLearningError('internal-error', 'message');
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
    state: {published: true},
    tfliteModel: {
      gcsTfliteUri: 'gs://test-project-bucket/Firebase/ML/Models/model1.tflite',
      sizeBytes: 16900988,
    },
  };

  const CREATE_TIME_UTC = 'Fri, 07 Feb 2020 23:45:23 GMT';
  const UPDATE_TIME_UTC = 'Sat, 08 Feb 2020 23:45:23 GMT';

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

    it('should reject when initialized without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials, or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      const rulesWithoutProjectId = new MachineLearning(mockCredentialApp);
      return rulesWithoutProjectId.getModel('test')
        .should.eventually.rejectedWith(noProjectId);
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

  describe('getModel', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return machineLearning.getModel('1234567')
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(null);
      stubs.push(stub);
      return machineLearning.getModel('1234567')
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
      return machineLearning.getModel('1234567')
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
      return machineLearning.getModel('1234567')
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
      return machineLearning.getModel('1234567')
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
      return machineLearning.getModel('1234567')
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
      return machineLearning.getModel('1234567')
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Model response: ${JSON.stringify(response)}`);
    });

    it('should resolve with Model on success', () => {
      const stub = sinon
        .stub(MachineLearningApiClient.prototype, 'getModel')
        .resolves(MODEL_RESPONSE);
      stubs.push(stub);

      return machineLearning.getModel('1234567')
        .then((model) => {
          expect(model.modelId).to.equal('1234567');
          expect(model.displayName).to.equal('model_1');
          expect(model.tags).to.deep.equal(['tag_1', 'tag_2']);
          expect(model.createTime).to.equal(CREATE_TIME_UTC);
          expect(model.updateTime).to.equal(UPDATE_TIME_UTC);
          expect(model.validationError).to.be.empty;
          expect(model.published).to.be.true;
          expect(model.etag).to.equal('etag123');
          expect(model.modelHash).to.equal('modelHash123');

          const tflite = model.tfliteModel!;
          expect(tflite.gcsTfliteUri).to.be.equal(
            'gs://test-project-bucket/Firebase/ML/Models/model1.tflite');
          expect(tflite.sizeBytes).to.be.equal(16900988);
        });
    });
  });
});

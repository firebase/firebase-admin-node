/*!
 * @license
 * Copyright 2022 Google Inc.
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
import * as mocks from '../../resources/mocks';

import { FirebaseApp } from '../../../src/app/firebase-app';
import { FunctionsApiClient, FirebaseFunctionsError } from '../../../src/functions/functions-api-client-internal';
import { HttpClient } from '../../../src/utils/api-request';
import { Functions, TaskQueue } from '../../../src/functions/functions';

const expect = chai.expect;

describe('Functions', () => {
  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  let functions: Functions;

  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.appWithOptions(mockOptions);
    mockCredentialApp = mocks.mockCredentialApp();
    functions = new Functions(mockApp);
  });

  after(() => {
    return mockApp.delete();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
  });

  describe('Constructor', () => {
    for (const invalidApp of [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop,
      undefined]) {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const functionsAny: any = Functions;
          return new functionsAny(invalidApp);
        }).to.throw(
          'First argument passed to getFunctions() must be a valid Firebase app '
          + 'instance.');
      });
    }

    it('should reject when initialized without project ID', () => {
      // Remove Project ID from the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      const functionsWithoutProjectId = new Functions(mockCredentialApp);
      return functionsWithoutProjectId.taskQueue('task-name').enqueue({})
        .should.eventually.rejectedWith(noProjectId);
    });

    it('should reject when failed to contact the Metadata server for service account email', () => {
      const functionsWithProjectId = new Functions(mockApp);
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .rejects(new Error('network error.'));
      stubs.push(stub);
      const expected = 'Failed to determine service account. Initialize the '
        + 'SDK with service account credentials or set service account ID as an app option.';
      return functionsWithProjectId.taskQueue('task-name').enqueue({})
        .should.eventually.be.rejectedWith(expected);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new Functions(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(functions.app).to.equal(mockApp);
    });
  });
});

describe('TaskQueue', () => {
  const INTERNAL_ERROR = new FirebaseFunctionsError('internal-error', 'message');
  const FUNCTION_NAME = 'function-name';

  let taskQueue: TaskQueue;
  let mockClient: FunctionsApiClient;

  let mockApp: FirebaseApp;

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockClient = new FunctionsApiClient(mockApp);
    taskQueue = new TaskQueue(FUNCTION_NAME, mockClient);
  });

  after(() => {
    return mockApp.delete();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
  });

  describe('Constructor', () => {
    for (const invalidClient of [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop,
      undefined]) {
      it('should throw given invalid client: ' + JSON.stringify(invalidClient), () => {
        expect(() => {
          const taskQueueAny: any = TaskQueue;
          return new taskQueueAny(FUNCTION_NAME, invalidClient);
        }).to.throw(
          'Must provide a valid FunctionsApiClient instance to create a new TaskQueue.');
      });
    }

    for (const invalidFunctionName of [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop,
      undefined]) {
      it('should throw given invalid name: ' + JSON.stringify(invalidFunctionName), () => {
        expect(() => {
          const taskQueueAny: any = TaskQueue;
          return new taskQueueAny(invalidFunctionName, mockClient);
        }).to.throw('`functionName` must be a non-empty string.');
      });
    }

    it('should not throw given a valid name and client', () => {
      expect(() => {
        return new TaskQueue(FUNCTION_NAME, mockClient);
      }).not.to.throw();
    });
  });

  describe('enqueue', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(FunctionsApiClient.prototype, 'enqueue')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return taskQueue.enqueue({})
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    it('should propagate API errors with task options', () => {
      const stub = sinon
        .stub(FunctionsApiClient.prototype, 'enqueue')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return taskQueue.enqueue({}, { scheduleDelaySeconds: 3600 })
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });
  });
});

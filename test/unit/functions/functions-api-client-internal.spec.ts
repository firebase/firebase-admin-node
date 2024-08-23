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
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { getSdkVersion } from '../../../src/utils';

import { FirebaseApp } from '../../../src/app/firebase-app';
import { FirebaseFunctionsError, FunctionsApiClient, Task } from '../../../src/functions/functions-api-client-internal';
import { HttpClient } from '../../../src/utils/api-request';
import { FirebaseAppError } from '../../../src/utils/error';
import { deepCopy } from '../../../src/utils/deep-copy';
import { EMULATED_SERVICE_ACCOUNT_DEFAULT } from '../../../src/functions/functions-api-client-internal';

const expect = chai.expect;

describe('FunctionsApiClient', () => {

  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };

  const EXPECTED_HEADERS = {
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
    'Authorization': 'Bearer mock-token',
    'x-goog-user-project': 'test-project',
  };

  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const DEFAULT_REGION = 'us-central1';
  const CUSTOM_REGION = 'us-west1';
  const FUNCTION_NAME = 'function-name';
  const CUSTOM_PROJECT_ID = 'taskq-project';
  const EXTENSION_ID = 'image-resize';
  const PARTIAL_RESOURCE_NAME = `locations/${CUSTOM_REGION}/functions/${FUNCTION_NAME}`;
  const FULL_RESOURCE_NAME = `projects/${CUSTOM_PROJECT_ID}/locations/${CUSTOM_REGION}/functions/${FUNCTION_NAME}`;

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
    serviceAccountId: 'service-acct@email.com'
  };

  const mockExtensionOptions = {
    credential: new mocks.MockComputeEngineCredential(),
    projectId: 'test-project',
    serviceAccountId: 'service-acct@email.com'
  };

  const TEST_TASK_PAYLOAD: Task  = {
    httpRequest: {
      url: `https://${DEFAULT_REGION}-${mockOptions.projectId}.cloudfunctions.net/${FUNCTION_NAME}`,
      oidcToken: {
        serviceAccountEmail: mockOptions.serviceAccountId,
      },
      body: Buffer.from(JSON.stringify({ data: {} })).toString('base64'),
      headers: { 'Content-Type' : 'application/json' }
    }
  }

  const CLOUD_TASKS_URL = `https://cloudtasks.googleapis.com/v2/projects/${mockOptions.projectId}/locations/${DEFAULT_REGION}/queues/${FUNCTION_NAME}/tasks`;

  const CLOUD_TASKS_URL_EXT = `https://cloudtasks.googleapis.com/v2/projects/${mockOptions.projectId}/locations/${DEFAULT_REGION}/queues/ext-${EXTENSION_ID}-${FUNCTION_NAME}/tasks`;

  const CLOUD_TASKS_URL_FULL_RESOURCE = `https://cloudtasks.googleapis.com/v2/projects/${CUSTOM_PROJECT_ID}/locations/${CUSTOM_REGION}/queues/${FUNCTION_NAME}/tasks`;

  const CLOUD_TASKS_URL_PARTIAL_RESOURCE = `https://cloudtasks.googleapis.com/v2/projects/${mockOptions.projectId}/locations/${CUSTOM_REGION}/queues/${FUNCTION_NAME}/tasks`;
  
  const CLOUD_TASKS_EMULATOR_HOST = '127.0.0.1:9499';

  const CLOUD_TASKS_URL_EMULATOR = `http://${CLOUD_TASKS_EMULATOR_HOST}/projects/${mockOptions.projectId}/locations/${DEFAULT_REGION}/queues/${FUNCTION_NAME}/tasks`;

  const clientWithoutProjectId = new FunctionsApiClient(mocks.mockCredentialApp());

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let app: FirebaseApp;
  let apiClient: FunctionsApiClient;

  beforeEach(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new FunctionsApiClient(app);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    if (process.env.CLOUD_TASKS_EMULATOR_HOST) {
      delete process.env.CLOUD_TASKS_EMULATOR_HOST;
    }
    return app.delete();
  });

  describe('Constructor', () => {
    it('should reject when the app is null', () => {
      expect(() => new FunctionsApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to getFunctions() must be a valid Firebase app instance.');
    });
  });

  describe('enqueue', () => {
    let clock: sinon.SinonFakeTimers | undefined;

    afterEach(() => {
      if (clock) {
        clock.restore();
        clock = undefined;
      }
    });
    
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.enqueue({}, FUNCTION_NAME)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should reject when project id is not available in partial resource name', () => {
      return clientWithoutProjectId.enqueue({}, PARTIAL_RESOURCE_NAME)
        .should.eventually.be.rejectedWith(noProjectId);
    });
    
    for (const invalidName of [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop, undefined]) {
      it(`should throw if functionName is ${invalidName}`, () => {
        expect(apiClient.enqueue({}, invalidName as any))
          .to.eventually.throw('Function name must be a non empty string');
      });
    }

    for (const invalidName of ['project/abc/locations/east/fname', 'location/west/', '//']) {
      it(`should throw if functionName is ${invalidName}`, () => {
        expect(apiClient.enqueue({}, invalidName as any))
          .to.eventually.throw('Function name must be a single string or a qualified resource name');
      });
    }

    for (const invalidOption of [null, 'abc', '', [], true, 102, 1.2]) {
      it(`should throw if options is ${invalidOption}`, () => {
        expect(apiClient.enqueue({}, FUNCTION_NAME, '', invalidOption as any))
          .to.eventually.throw('TaskOptions must be a non-null object');
      });
    }

    for (const invalidScheduleTime of [null, '', 'abc', 102, 1.2, [], {}, true, NaN]) {
      it(`should throw if scheduleTime is ${invalidScheduleTime}`, () => {
        expect(apiClient.enqueue({}, FUNCTION_NAME, '', { scheduleTime: invalidScheduleTime } as any))
          .to.eventually.throw('scheduleTime must be a valid Date object.');
      });
    }

    for (const invalidScheduleDelaySeconds of [null, 'abc', '', [], {}, true, NaN, -1]) {
      it(`should throw if scheduleDelaySeconds is ${invalidScheduleDelaySeconds}`, () => {
        expect(apiClient.enqueue({}, FUNCTION_NAME, '',
          { scheduleDelaySeconds: invalidScheduleDelaySeconds } as any))
          .to.eventually.throw('scheduleDelaySeconds must be a non-negative duration in seconds.');
      });
    }

    for (const invalidDispatchDeadlineSeconds of [null, 'abc', '', [], {}, true, NaN, -1, 14, 1801]) {
      it(`should throw if dispatchDeadlineSeconds is ${invalidDispatchDeadlineSeconds}`, () => {
        expect(apiClient.enqueue({}, FUNCTION_NAME, '',
          { dispatchDeadlineSeconds: invalidDispatchDeadlineSeconds } as any))
          .to.eventually.throw('dispatchDeadlineSeconds must be a non-negative duration in seconds '
          + 'and must be in the range of 15s to 30 mins.');
      });
    }

    for (const invalidUri of [null, '', 'a', 'foo', 'image.jpg', [], {}, true, NaN]) {
      it(`should throw given an invalid uri: ${invalidUri}`, () => {
        expect(apiClient.enqueue({}, FUNCTION_NAME, '',
          { uri: invalidUri } as any))
          .to.eventually.throw('uri must be a valid URL string.');
      });
    }

    for (const invalidTaskId of [1234, 'task!', 'id:0', '[1234]', '(1234)']) {
      it(`should throw given an invalid task ID: ${invalidTaskId}`, () => {
        expect(apiClient.enqueue({}, FUNCTION_NAME, '', 
        { id: invalidTaskId } as any ))
          .to.eventually.throw('id can contain only letters ([A-Za-z]), numbers ([0-9]), '
          + 'hyphens (-), or underscores (_). The maximum length is 500 characters.')
      });
    }

    it('should throw when both scheduleTime and scheduleDelaySeconds are provided', () => {
      expect(apiClient.enqueue({}, FUNCTION_NAME, '', {
        scheduleTime: new Date(),
        scheduleDelaySeconds: 1000
      } as any))
        .to.eventually.throw('Both scheduleTime and scheduleDelaySeconds are provided. Only one value should be set.');
    });

    it('should reject when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseFunctionsError('not-found', 'Requested entity not found');
      return apiClient.enqueue({}, FUNCTION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseFunctionsError('unknown-error', 'Unknown server error: {}');
      return apiClient.enqueue({}, FUNCTION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseFunctionsError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.enqueue({}, FUNCTION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.enqueue({}, FUNCTION_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when a task with the same ID exists', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 409));
      stubs.push(stub);
      expect(apiClient.enqueue({}, FUNCTION_NAME, undefined, { id: 'mock-task' })).to.eventually.throw(
        new FirebaseFunctionsError(
          'task-already-exists',
          'A task with ID mock-task already exists'
        )
      )
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, FUNCTION_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL,
            headers: EXPECTED_HEADERS,
            data: {
              task: TEST_TASK_PAYLOAD
            }
          });
        });
    });

    it('should resolve the projectId and location from the full resource name', () => {
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.url =
        `https://${CUSTOM_REGION}-${CUSTOM_PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`;
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, FULL_RESOURCE_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_FULL_RESOURCE,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });
        });
    });

    it('should resolve the location from the partial resource name', () => {
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.url =
        `https://${CUSTOM_REGION}-${mockOptions.projectId}.cloudfunctions.net/${FUNCTION_NAME}`;
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, PARTIAL_RESOURCE_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_PARTIAL_RESOURCE,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });
        });
    });

    it('should update the function name and set headers when the extension-id is provided', () => {
      app = mocks.appWithOptions(mockExtensionOptions);
      apiClient = new FunctionsApiClient(app);

      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.url =
        `https://${DEFAULT_REGION}-${mockOptions.projectId}.cloudfunctions.net/ext-${EXTENSION_ID}-${FUNCTION_NAME}`;
      expectedPayload.httpRequest.headers['Authorization'] = 'Bearer mockIdToken';
      delete expectedPayload.httpRequest.oidcToken;
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, FUNCTION_NAME, EXTENSION_ID)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_EXT,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });
        });
    });

    it('should use the default projectId following a request with a full resource name', () => {
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.url =
        `https://${CUSTOM_REGION}-${CUSTOM_PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`;
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      // pass the full resource name. SDK should not use the default values
      return apiClient.enqueue({}, FULL_RESOURCE_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_FULL_RESOURCE,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });

          // passing just the function name. SDK should deffer to default values
          return apiClient.enqueue({}, FUNCTION_NAME);
        })
        .then(() => {
          expect(stub).to.have.been.calledTwice.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL,
            headers: EXPECTED_HEADERS,
            data: {
              task: TEST_TASK_PAYLOAD
            }
          });
        });
    });



    // tests for Task Options
    it('should convert scheduleTime to ISO string', () => {
      const scheduleTime = new Date();
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      // timestamps should be converted to ISO strings
      (expectedPayload as any).scheduleTime = scheduleTime.toISOString();

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, FUNCTION_NAME, '', { scheduleTime })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload,
            }
          });
        });
    });

    it('should set scheduleTime based on scheduleDelaySeconds', () => {
      clock = sinon.useFakeTimers(1000);

      const scheduleDelaySeconds = 1800;
      const scheduleTime = new Date(); // '1970-01-01T00:00:01.000Z'
      scheduleTime.setSeconds(scheduleTime.getSeconds() + scheduleDelaySeconds); // '1970-01-01T00:30:01.000Z'
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      // timestamps should be converted to ISO strings
      (expectedPayload as any).scheduleTime = scheduleTime.toISOString();

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, FUNCTION_NAME, '', { scheduleDelaySeconds })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload,
            }
          });
        });
    });

    it('should convert dispatchDeadline to a duration with `s` prefix', () => {
      const dispatchDeadlineSeconds = 1800;
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      (expectedPayload as any).dispatchDeadline = `${dispatchDeadlineSeconds}s`;

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue({}, FUNCTION_NAME, '', { dispatchDeadlineSeconds })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload,
            }
          });
        });
    });

    it('should encode data in the payload', () => {
      const data = { privateKey: '~/.ssh/id_rsa.pub' };
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.body = Buffer.from(JSON.stringify({ data })).toString('base64');

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      return apiClient.enqueue(data, FUNCTION_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload,
            }
          });
        });
    });

    it('should redirect to the emulator when CLOUD_TASKS_EMULATOR_HOST is set', () => {
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      process.env.CLOUD_TASKS_EMULATOR_HOST = CLOUD_TASKS_EMULATOR_HOST;
      return apiClient.enqueue({}, FUNCTION_NAME, '', { uri: TEST_TASK_PAYLOAD.httpRequest.url })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_EMULATOR,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });
        });
    });

    it('should leave empty urls alone when CLOUD_TASKS_EMULATOR_HOST is set', () => {
      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.url = '';
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      process.env.CLOUD_TASKS_EMULATOR_HOST = CLOUD_TASKS_EMULATOR_HOST;
      return apiClient.enqueue({}, FUNCTION_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_EMULATOR,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });
        });
    });

    it('should use a fake service account if the emulator is running and no service account is defined', () => {
      app = mocks.appWithOptions({
        credential: new mocks.MockCredential(),
        projectId: 'test-project',
        serviceAccountId: ''
      });
      apiClient = new FunctionsApiClient(app);

      const expectedPayload = deepCopy(TEST_TASK_PAYLOAD);
      expectedPayload.httpRequest.oidcToken = { serviceAccountEmail: EMULATED_SERVICE_ACCOUNT_DEFAULT };
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      process.env.CLOUD_TASKS_EMULATOR_HOST = CLOUD_TASKS_EMULATOR_HOST;
      return apiClient.enqueue({}, FUNCTION_NAME, '', { uri: TEST_TASK_PAYLOAD.httpRequest.url })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: CLOUD_TASKS_URL_EMULATOR,
            headers: EXPECTED_HEADERS,
            data: {
              task: expectedPayload
            }
          });
        });
    })

  });


  describe('delete', () => {
    for (const invalidTaskId of [1234, 'task!', 'id:0', '[1234]', '(1234)']) {
      it(`should throw given an invalid task ID: ${invalidTaskId}`, () => {
        expect(apiClient.delete(invalidTaskId as any, FUNCTION_NAME))
          .to.eventually.throw('id can contain only letters ([A-Za-z]), numbers ([0-9]), '
          + 'hyphens (-), or underscores (_). The maximum length is 500 characters.')
      });
    }
    
    it('should reject when no valid function name is specified', () => {
      expect(apiClient.delete('mock-task', '/projects/abc/locations/def'))
        .to.eventually.throw('No valid function name specified to enqueue tasks for.');
    });

    it('should resolve on success', async () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      await apiClient.delete('mock-task', FUNCTION_NAME);
      expect(stub).to.have.been.calledWith({
        method: 'DELETE',
        url: CLOUD_TASKS_URL.concat('/', 'mock-task'),
        headers: EXPECTED_HEADERS,
      });
    });

    it('should ignore deletes if no task with task ID exists', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      expect(apiClient.delete('nonexistent-task', FUNCTION_NAME)).to.eventually.not.throw(utils.errorFrom({}, 404));
    });

    it('should redirect to the emulator when CLOUD_TASKS_EMULATOR_HOST is set', async () => {
      process.env.CLOUD_TASKS_EMULATOR_HOST = CLOUD_TASKS_EMULATOR_HOST;
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}, 200));
      stubs.push(stub);
      await apiClient.delete('mock-task', FUNCTION_NAME);
      expect(stub).to.have.been.calledWith({
        method: 'DELETE',
        url: CLOUD_TASKS_URL_EMULATOR.concat('/', 'mock-task'),
        headers: EXPECTED_HEADERS,
      });
    });

    it('should throw on non-404 HTTP errors', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 500));
      stubs.push(stub);
      expect(apiClient.delete('mock-task', FUNCTION_NAME)).to.eventually.throw(utils.errorFrom({}, 500));
    });
  })
});

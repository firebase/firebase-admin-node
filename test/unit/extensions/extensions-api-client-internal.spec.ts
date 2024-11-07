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

import { expect } from 'chai';
import * as sinon from 'sinon';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseApp } from '../../../src/app/firebase-app';
import { ExtensionsApiClient, FirebaseExtensionsError } from '../../../src/extensions/extensions-api-client-internal';
import { HttpClient } from '../../../src/utils/api-request';
import { SettableProcessingState } from '../../../src/extensions/extensions-api';
import { getMetricsHeader, getSdkVersion } from '../../../src/utils';

const testProjectId = 'test-project';
const testInstanceId = 'test-instance';

describe('Extension API client', () => {
  let app: FirebaseApp;
  let apiClient: ExtensionsApiClient;

  let httpClientStub: sinon.SinonStub;
  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
    serviceAccountId: 'service-acct@email.com'
  };

  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
    'x-goog-user-project': 'test-project',
    'X-Goog-Api-Client': getMetricsHeader(),
  }
  
  before(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new ExtensionsApiClient(app);
  });

  after(() => {
    return app.delete();
  });

  beforeEach(() => {
    httpClientStub = sinon.stub(HttpClient.prototype, 'send');
  });

  afterEach(() => {
    httpClientStub.restore();
  });

  describe('Constructor', () => {
    it('should reject when the app is null', () => {
      expect(() => new ExtensionsApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to getExtensions() must be a valid Firebase app instance.');
    });
  });

  describe('updateRuntimeData', () => {
    it('should updateRuntimeData', async () => {
      const testRuntimeData = {
        processingState: {
          state: 'PROCESSING_COMPLETE' as SettableProcessingState,
          detailMessage: 'done processing',
        },
      }
      const url = 'https://firebaseextensions.googleapis.com/' +
      'v1beta/projects/test-project/instances/test-instance/runtimeData';
      httpClientStub = httpClientStub.resolves(utils.responseFrom(testRuntimeData, 200));
      return apiClient.updateRuntimeData(testProjectId, testInstanceId, testRuntimeData)
        .then((runtimeData) => {
          expect(runtimeData).to.deep.equal(testRuntimeData)
          expect(httpClientStub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            url: url,
            headers: EXPECTED_HEADERS,
            data: testRuntimeData
          })
        })
    });

    it('should convert errors in FirebaseErrors', async () => {
      httpClientStub.rejects(utils.errorFrom('Something went wrong', 404));
      await expect(apiClient.updateRuntimeData(testProjectId, testInstanceId, {}))
        .to.eventually.be.rejectedWith(FirebaseExtensionsError);
    });
  });
});

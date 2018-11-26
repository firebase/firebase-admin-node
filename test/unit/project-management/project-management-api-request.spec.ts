/*!
 * Copyright 2018 Google Inc.
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as _ from 'lodash';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FirebaseApp } from '../../../src/firebase-app';
import { ProjectManagementRequestHandler } from '../../../src/project-management/project-management-api-request';
import { HttpClient } from '../../../src/utils/api-request';
import * as mocks from '../../resources/mocks';
import * as utils from '../utils';
import { ShaCertificate } from '../../../src/project-management/android-app';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const VALID_SHA_1_HASH = '0123456789abcdefABCDEF012345678901234567';

describe('ProjectManagementRequestHandler', () => {
  const HOST = 'firebase.googleapis.com';
  const PORT = 443;
  const PROJECT_ID: string = 'test-project-id';
  const APP_ID: string = 'test-app-id';
  const PACKAGE_NAME: string = 'test-package-name';
  const BUNDLE_ID: string = 'test-bundle-id';
  const DISPLAY_NAME: string = 'test-display-name';
  const OPERATION_RESOURCE_NAME: string = 'test-operation-resource-name';

  const mockedRequests: nock.Scope[] = [];
  const mockAccessToken: string = utils.generateRandomAccessToken();
  let stubs: sinon.SinonStub[] = [];
  let mockApp: FirebaseApp;
  let expectedHeaders: object;
  let requestHandler: ProjectManagementRequestHandler;

  before(() => utils.mockFetchAccessTokenRequests(mockAccessToken));

  after(() => {
    stubs = [];
    nock.cleanAll();
  });

  beforeEach(() => {
    mockApp = mocks.app();
    expectedHeaders = {
      'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
      'Authorization': 'Bearer ' + mockAccessToken,
    };
    requestHandler = new ProjectManagementRequestHandler(mockApp);
    return mockApp.INTERNAL.getToken();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    return mockApp.delete();
  });

  function testHttpErrors(callback: () => Promise<any>) {
    const errorCodeMap: any = {
      400: 'project-management/invalid-argument',
      401: 'project-management/authentication-error',
      403: 'project-management/authentication-error',
      404: 'project-management/not-found',
      500: 'project-management/internal-error',
      503: 'project-management/service-unavailable',
    };
    Object.keys(errorCodeMap).forEach((errorCode) => {
      if (!errorCodeMap.hasOwnProperty(errorCode)) {
        return;
      }
      it(`should throw for HTTP ${errorCode} errors`, () => {
          const stub = sinon.stub(HttpClient.prototype, 'send')
              .rejects(utils.errorFrom({}, parseInt(errorCode, 10)));
          stubs.push(stub);

          return callback()
              .should.eventually.be.rejected
              .and.have.property('code', errorCodeMap[errorCode]);
      });
    });

    it('should throw for HTTP unknown errors', () => {
        const stub = sinon.stub(HttpClient.prototype, 'send')
            .rejects(utils.errorFrom({}, 1337));
        stubs.push(stub);

        return callback()
            .should.eventually.be.rejected
            .and.have.property('code', 'project-management/unknown-error');
    });
  }

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        return new ProjectManagementRequestHandler(mockApp);
      }).not.to.throw(Error);
    });
  });

  describe('listAndroidApps', () => {
    testHttpErrors(() => requestHandler.listAndroidApps(PROJECT_ID));

    it('should succeed', () => {
      const expectedResult = {
        apps: [{ appId: APP_ID }],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url =
          `https://${HOST}:${PORT}/v1beta1/projects/${PROJECT_ID}/androidApps?page_size=100`;
      return requestHandler.listAndroidApps(PROJECT_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('listIosApps', () => {
    testHttpErrors(() => requestHandler.listIosApps(PROJECT_ID));

    it('should succeed', () => {
      const expectedResult = {
        apps: [{ appId: APP_ID }],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/projects/${PROJECT_ID}/iosApps?page_size=100`;
      return requestHandler.listIosApps(PROJECT_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('createAndroidApp', () => {
    testHttpErrors(() => requestHandler.createAndroidApp(PROJECT_ID, PACKAGE_NAME));

    it('should throw when initial API responseData.name is null', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      return requestHandler.createAndroidApp(PROJECT_ID, PACKAGE_NAME, DISPLAY_NAME)
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              'createAndroidApp\'s responseData.name must be a non-empty string. Response data: '
                  + '{}');
    });

    it('should propagate polling API response returned errors', () => {
      const initialResult = { name: OPERATION_RESOURCE_NAME };
      const pollErrorResult = {
        name: OPERATION_RESOURCE_NAME,
        done: true,
        error: {
          code: 409,
          message: 'Already exists',
        },
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .onFirstCall().resolves(utils.responseFrom(initialResult))
          .onSecondCall().resolves(utils.responseFrom(pollErrorResult));
      stubs.push(stub);

      return requestHandler.createAndroidApp(PROJECT_ID, PACKAGE_NAME, DISPLAY_NAME)
          .should.eventually.be.rejected
          .and.have.property('code', 'project-management/already-exists');
    });

    it('should propagate polling API response thrown errors', () => {
      const initialResult = { name: OPERATION_RESOURCE_NAME };
      const pollError = 'second-poll-error';

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .onFirstCall().resolves(utils.responseFrom(initialResult))
          .onSecondCall().returns(Promise.reject(pollError));
      stubs.push(stub);

      return requestHandler.createAndroidApp(PROJECT_ID, PACKAGE_NAME, DISPLAY_NAME)
          .should.eventually.be.rejected
          .and.equal(pollError);
    });

    it('should succeed after multiple polls', () => {
      const initialResult = { name: OPERATION_RESOURCE_NAME };
      const firstPollResult = { name: OPERATION_RESOURCE_NAME };
      const expectedJsonResponse = '{"field1":"value1"}';
      const secondPollResult = {
        name: OPERATION_RESOURCE_NAME,
        done: true,
        response: expectedJsonResponse,
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .onFirstCall().resolves(utils.responseFrom(initialResult))
          .onSecondCall().resolves(utils.responseFrom(firstPollResult))
          .onThirdCall().resolves(utils.responseFrom(secondPollResult));
      stubs.push(stub);

      const initialUrl = `https://${HOST}:${PORT}/v1beta1/projects/${PROJECT_ID}/androidApps`;
      const initialData = {
        packageName: PACKAGE_NAME,
        displayName: DISPLAY_NAME,
      };

      const pollingUrl = `https://${HOST}:${PORT}/v1/${OPERATION_RESOURCE_NAME}`;

      return requestHandler.createAndroidApp(PROJECT_ID, PACKAGE_NAME, DISPLAY_NAME)
          .then((result) => {
            expect(result).to.equal(expectedJsonResponse);
            expect(stub)
                .to.have.been.calledThrice
                .and.calledWith({
                  method: 'POST',
                  url: initialUrl,
                  data: initialData,
                  headers: expectedHeaders,
                  timeout: 10000,
                })
                .and.calledWith({
                  method: 'GET',
                  url: pollingUrl,
                  data: null,
                  headers: expectedHeaders,
                  timeout: 10000,
                });
          });
    });
  });

  describe('createIosApp', () => {
    testHttpErrors(() => requestHandler.createIosApp(PROJECT_ID, BUNDLE_ID));

    it('should throw when initial API responseData.name is null', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      return requestHandler.createIosApp(PROJECT_ID, BUNDLE_ID, DISPLAY_NAME)
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              'createIosApp\'s responseData.name must be a non-empty string. Response data: {}');
    });

    it('should propagate polling API response returned errors', () => {
      const initialResult = { name: OPERATION_RESOURCE_NAME };
      const pollErrorResult = {
        name: OPERATION_RESOURCE_NAME,
        done: true,
        error: {
          code: 409,
          message: 'Already exists',
        },
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .onFirstCall().resolves(utils.responseFrom(initialResult))
          .onSecondCall().resolves(utils.responseFrom(pollErrorResult));
      stubs.push(stub);

      return requestHandler.createIosApp(PROJECT_ID, BUNDLE_ID, DISPLAY_NAME)
          .should.eventually.be.rejected
          .and.have.property('code', 'project-management/already-exists');
    });

    it('should propagate polling API response thrown errors', () => {
      const initialResult = { name: OPERATION_RESOURCE_NAME };
      const pollError = 'second-poll-error';

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .onFirstCall().resolves(utils.responseFrom(initialResult))
          .onSecondCall().returns(Promise.reject(pollError));
      stubs.push(stub);

      return requestHandler.createIosApp(PROJECT_ID, BUNDLE_ID, DISPLAY_NAME)
          .should.eventually.be.rejected
          .and.equal(pollError);
    });

    it('should succeed after multiple polls', () => {
      const initialResult = { name: OPERATION_RESOURCE_NAME };
      const firstPollResult = { name: OPERATION_RESOURCE_NAME };
      const expectedJsonResponse = '{"field1":"value1"}';
      const secondPollResult = {
        name: OPERATION_RESOURCE_NAME,
        done: true,
        response: expectedJsonResponse,
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .onFirstCall().resolves(utils.responseFrom(initialResult))
          .onSecondCall().resolves(utils.responseFrom(firstPollResult))
          .onThirdCall().resolves(utils.responseFrom(secondPollResult));
      stubs.push(stub);

      const initialUrl = `https://${HOST}:${PORT}/v1beta1/projects/${PROJECT_ID}/iosApps`;
      const initialData = {
        bundleId: BUNDLE_ID,
        displayName: DISPLAY_NAME,
      };

      const pollingUrl = `https://${HOST}:${PORT}/v1/${OPERATION_RESOURCE_NAME}`;

      return requestHandler.createIosApp(PROJECT_ID, BUNDLE_ID, DISPLAY_NAME)
          .then((result) => {
            expect(result).to.equal(expectedJsonResponse);
            expect(stub)
                .to.have.been.calledThrice
                .and.calledWith({
                  method: 'POST',
                  url: initialUrl,
                  data: initialData,
                  headers: expectedHeaders,
                  timeout: 10000,
                })
                .and.calledWith({
                  method: 'GET',
                  url: pollingUrl,
                  data: null,
                  headers: expectedHeaders,
                  timeout: 10000,
                });
          });
    });
  });

  describe('getAndroidMetadata', () => {
    testHttpErrors(() => requestHandler.getAndroidMetadata(APP_ID));

    it('should succeed', () => {
      const expectedResult = {
        name: 'test-resource-name',
        appId: APP_ID,
        displayName: 'test-display-name',
        projectId: 'test-project-id',
        packageName: 'test-package-name',
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.getAndroidMetadata(APP_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url: `https://${HOST}:${PORT}/v1beta1/projects/-/androidApps/${APP_ID}`,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('getIosMetadata', () => {
    testHttpErrors(() => requestHandler.getIosMetadata(APP_ID));

    it('should succeed', () => {
      const expectedResult = {
        name: 'test-resource-name',
        appId: APP_ID,
        displayName: 'test-display-name',
        projectId: 'test-project-id',
        bundleId: 'test-bundle-id',
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.getIosMetadata(APP_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url: `https://${HOST}:${PORT}/v1beta1/projects/-/iosApps/${APP_ID}`,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('setAndroidDisplayName', () => {
    const newDisplayName = 'test-new-display-name';

    testHttpErrors(() => requestHandler.setAndroidDisplayName(APP_ID, newDisplayName));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestData = {
        displayName: newDisplayName,
      };
      return requestHandler.setAndroidDisplayName(APP_ID, newDisplayName)
          .then((result) => {
            expect(result).to.deep.equal(null);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'PATCH',
              url: `https://${HOST}:${PORT}/v1beta1/projects/-/androidApps/${APP_ID}`
                  + '?update_mask=display_name',
              data: requestData,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('setIosDisplayName', () => {
    const newDisplayName = 'test-new-display-name';

    testHttpErrors(() => requestHandler.setIosDisplayName(APP_ID, newDisplayName));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestData = {
        displayName: newDisplayName,
      };
      return requestHandler.setIosDisplayName(APP_ID, newDisplayName)
          .then((result) => {
            expect(result).to.deep.equal(null);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'PATCH',
              url: `https://${HOST}:${PORT}/v1beta1/projects/-/iosApps/${APP_ID}`
                  + '?update_mask=display_name',
              data: requestData,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('getAndroidShaCertificates', () => {
    testHttpErrors(() => requestHandler.getAndroidShaCertificates(APP_ID));

    it('should succeed', () => {
      const expectedResult: any = { certificates: [] };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/projects/-/androidApps/${APP_ID}/sha`;
      return requestHandler.getAndroidShaCertificates(APP_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('addAndroidShaCertificate', () => {
    const certificateToAdd = new ShaCertificate(VALID_SHA_1_HASH);

    testHttpErrors(() => requestHandler.addAndroidShaCertificate(APP_ID, certificateToAdd));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestData = {
        shaHash: VALID_SHA_1_HASH,
        certType: 'SHA_1',
      };
      return requestHandler.addAndroidShaCertificate(APP_ID, certificateToAdd)
          .then((result) => {
            expect(result).to.deep.equal(null);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'POST',
              url: `https://${HOST}:${PORT}/v1beta1/projects/-/androidApps/${APP_ID}/sha`,
              data: requestData,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('deleteAndroidShaCertificate', () => {
    const certificateResourceName = 'test-certificate-resource-name';
    const certificateToDelete = new ShaCertificate(VALID_SHA_1_HASH, certificateResourceName);

    testHttpErrors(() => requestHandler.deleteAndroidShaCertificate(certificateToDelete));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      return requestHandler.deleteAndroidShaCertificate(certificateToDelete)
          .then((result) => {
            expect(result).to.deep.equal(null);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'DELETE',
              url: `https://${HOST}:${PORT}/v1beta1/${certificateResourceName}`,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('getAndroidConfig', () => {
    testHttpErrors(() => requestHandler.getAndroidConfig(APP_ID));

    it('should succeed', () => {
      const expectedResult = {
        configFileContents: 'test-base64-string',
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/projects/-/androidApps/${APP_ID}/config`;
      return requestHandler.getAndroidConfig(APP_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });

  describe('getIosConfig', () => {
    testHttpErrors(() => requestHandler.getIosConfig(APP_ID));

    it('should succeed', () => {
      const expectedResult = {
        configFileContents: 'test-base64-string',
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/projects/-/iosApps/${APP_ID}/config`;
      return requestHandler.getIosConfig(APP_ID)
          .then((result) => {
            expect(result).to.deep.equal(expectedResult);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'GET',
              url,
              data: null,
              headers: expectedHeaders,
              timeout: 10000,
            });
          });
    });
  });
});

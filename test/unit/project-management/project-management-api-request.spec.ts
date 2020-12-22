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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FirebaseApp } from '../../../src/firebase-app';
import {
  ProjectManagementRequestHandler
} from '../../../src/project-management/project-management-api-request-internal';
import { HttpClient } from '../../../src/utils/api-request';
import * as mocks from '../../resources/mocks';
import * as utils from '../utils';
import { getSdkVersion } from '../../../src/utils/index';
import { ShaCertificate } from '../../../src/project-management/android-app';
import { projectManagement } from '../../../src/project-management/index';

import AppPlatform = projectManagement.AppPlatform;

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const VALID_SHA_1_HASH = '0123456789abcdefABCDEF012345678901234567';

describe('ProjectManagementRequestHandler', () => {
  const HOST = 'firebase.googleapis.com';
  const PORT = 443;
  const PROJECT_RESOURCE_NAME = 'projects/test-project-id';
  const APP_ID = 'test-app-id';
  const APP_ID_ANDROID = 'test-android-app-id';
  const APP_ID_IOS = 'test-ios-app-id';
  const ANDROID_APP_RESOURCE_NAME = `projects/-/androidApp/${APP_ID}`;
  const IOS_APP_RESOURCE_NAME = `projects/-/iosApp/${APP_ID}`;
  const PACKAGE_NAME = 'test-package-name';
  const BUNDLE_ID = 'test-bundle-id';
  const DISPLAY_NAME = 'test-display-name';
  const DISPLAY_NAME_ANDROID = 'test-display-name-android';
  const DISPLAY_NAME_IOS = 'test-display-name-ios';
  const OPERATION_RESOURCE_NAME = 'test-operation-resource-name';

  const mockAccessToken: string = utils.generateRandomAccessToken();
  let stubs: sinon.SinonStub[] = [];
  let getTokenStub: sinon.SinonStub;
  let mockApp: FirebaseApp;
  let expectedHeaders: object;
  let requestHandler: ProjectManagementRequestHandler;

  before(() => {
    getTokenStub = utils.stubGetAccessToken(mockAccessToken);
  });

  after(() => {
    stubs = [];
    getTokenStub.restore();
  });

  beforeEach(() => {
    mockApp = mocks.app();
    expectedHeaders = {
      'X-Client-Version': `Node/Admin/${getSdkVersion()}`,
      'Authorization': 'Bearer ' + mockAccessToken,
    };
    requestHandler = new ProjectManagementRequestHandler(mockApp);
    return mockApp.INTERNAL.getToken();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    return mockApp.delete();
  });

  function testHttpErrors(callback: () => Promise<any>): void {
    const errorCodeMap: any = {
      400: 'project-management/invalid-argument',
      401: 'project-management/authentication-error',
      403: 'project-management/authentication-error',
      404: 'project-management/not-found',
      500: 'project-management/internal-error',
      503: 'project-management/service-unavailable',
    };
    Object.keys(errorCodeMap).forEach((errorCode) => {
      if (!Object.prototype.hasOwnProperty.call(errorCodeMap, errorCode)) {
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
    testHttpErrors(() => requestHandler.listAndroidApps(PROJECT_RESOURCE_NAME));

    it('should succeed', () => {
      const expectedResult = {
        apps: [{
          resourceName: ANDROID_APP_RESOURCE_NAME,
          appId: APP_ID,
        }],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url =
          `https://${HOST}:${PORT}/v1beta1/${PROJECT_RESOURCE_NAME}/androidApps?page_size=100`;
      return requestHandler.listAndroidApps(PROJECT_RESOURCE_NAME)
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
    testHttpErrors(() => requestHandler.listIosApps(PROJECT_RESOURCE_NAME));

    it('should succeed', () => {
      const expectedResult = {
        apps: [{
          resourceName: IOS_APP_RESOURCE_NAME,
          appId: APP_ID,
        }],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/${PROJECT_RESOURCE_NAME}/iosApps?page_size=100`;
      return requestHandler.listIosApps(PROJECT_RESOURCE_NAME)
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

  describe('listAppMetadata', () => {
    testHttpErrors(() => requestHandler.listAppMetadata(PROJECT_RESOURCE_NAME));

    it('should succeed', () => {
      const expectedResult = {
        apps: [
          {
            appId: APP_ID_ANDROID,
            displayName: DISPLAY_NAME_ANDROID,
            platform: AppPlatform.ANDROID,
          },
          {
            appId: APP_ID_IOS,
            displayName: DISPLAY_NAME_IOS,
            platform: AppPlatform.IOS,
          }],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url =
        `https://${HOST}:${PORT}/v1beta1/${PROJECT_RESOURCE_NAME}:searchApps?page_size=100`;
      return requestHandler.listAppMetadata(PROJECT_RESOURCE_NAME)
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
    testHttpErrors(() => requestHandler.createAndroidApp(PROJECT_RESOURCE_NAME, PACKAGE_NAME));

    it('should throw when initial API responseData.name is null', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      return requestHandler.createAndroidApp(PROJECT_RESOURCE_NAME, PACKAGE_NAME, DISPLAY_NAME)
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

      return requestHandler.createAndroidApp(PROJECT_RESOURCE_NAME, PACKAGE_NAME, DISPLAY_NAME)
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

      return requestHandler.createAndroidApp(PROJECT_RESOURCE_NAME, PACKAGE_NAME, DISPLAY_NAME)
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

      const initialUrl = `https://${HOST}:${PORT}/v1beta1/${PROJECT_RESOURCE_NAME}/androidApps`;
      const initialData = {
        packageName: PACKAGE_NAME,
        displayName: DISPLAY_NAME,
      };

      const pollingUrl = `https://${HOST}:${PORT}/v1/${OPERATION_RESOURCE_NAME}`;

      return requestHandler.createAndroidApp(PROJECT_RESOURCE_NAME, PACKAGE_NAME, DISPLAY_NAME)
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
    testHttpErrors(() => requestHandler.createIosApp(PROJECT_RESOURCE_NAME, BUNDLE_ID));

    it('should throw when initial API responseData.name is null', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      return requestHandler.createIosApp(PROJECT_RESOURCE_NAME, BUNDLE_ID, DISPLAY_NAME)
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

      return requestHandler.createIosApp(PROJECT_RESOURCE_NAME, BUNDLE_ID, DISPLAY_NAME)
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

      return requestHandler.createIosApp(PROJECT_RESOURCE_NAME, BUNDLE_ID, DISPLAY_NAME)
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

      const initialUrl = `https://${HOST}:${PORT}/v1beta1/${PROJECT_RESOURCE_NAME}/iosApps`;
      const initialData = {
        bundleId: BUNDLE_ID,
        displayName: DISPLAY_NAME,
      };

      const pollingUrl = `https://${HOST}:${PORT}/v1/${OPERATION_RESOURCE_NAME}`;

      return requestHandler.createIosApp(PROJECT_RESOURCE_NAME, BUNDLE_ID, DISPLAY_NAME)
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

  describe('setDisplayName', () => {
    const newDisplayName = 'test-new-display-name';

    testHttpErrors(
      () => requestHandler.setDisplayName(ANDROID_APP_RESOURCE_NAME, newDisplayName));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const url =
          `https://${HOST}:${PORT}/v1beta1/${ANDROID_APP_RESOURCE_NAME}?update_mask=display_name`;
      const requestData = {
        displayName: newDisplayName,
      };
      return requestHandler.setDisplayName(ANDROID_APP_RESOURCE_NAME, newDisplayName)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            url,
            data: requestData,
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });

  describe('getAndroidShaCertificates', () => {
    testHttpErrors(() => requestHandler.getAndroidShaCertificates(ANDROID_APP_RESOURCE_NAME));

    it('should succeed', () => {
      const expectedResult: any = { certificates: [] };

      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/${ANDROID_APP_RESOURCE_NAME}/sha`;
      return requestHandler.getAndroidShaCertificates(ANDROID_APP_RESOURCE_NAME)
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

    testHttpErrors(
      () => requestHandler.addAndroidShaCertificate(ANDROID_APP_RESOURCE_NAME, certificateToAdd));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/${ANDROID_APP_RESOURCE_NAME}/sha`;
      const requestData = {
        shaHash: VALID_SHA_1_HASH,
        certType: 'SHA_1',
      };
      return requestHandler.addAndroidShaCertificate(ANDROID_APP_RESOURCE_NAME, certificateToAdd)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url,
            data: requestData,
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });

  describe('getConfig', () => {
    testHttpErrors(() => requestHandler.getConfig(ANDROID_APP_RESOURCE_NAME));

    it('should succeed', () => {
      const expectedResult = {
        configFileContents: 'test-base64-string',
      };

      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/${ANDROID_APP_RESOURCE_NAME}/config`;
      return requestHandler.getConfig(ANDROID_APP_RESOURCE_NAME)
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

  describe('getResource', () => {
    const resourceName = 'test-resource-name';

    testHttpErrors(() => requestHandler.getResource(resourceName));

    it('should succeed', () => {
      const expectedResult = { success: true };

      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/${resourceName}`;
      return requestHandler.getResource(resourceName)
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

  describe('deleteResource', () => {
    const resourceName = 'test-resource-name';

    testHttpErrors(() => requestHandler.deleteResource(resourceName));

    it('should succeed', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const url = `https://${HOST}:${PORT}/v1beta1/${resourceName}`;
      return requestHandler.deleteResource(resourceName)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'DELETE',
            url,
            data: null,
            headers: expectedHeaders,
            timeout: 10000,
          });
        });
    });
  });
});

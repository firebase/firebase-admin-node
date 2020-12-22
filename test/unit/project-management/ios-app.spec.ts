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
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { FirebaseApp } from '../../../src/firebase-app';
import { IosApp } from '../../../src/project-management/ios-app';
import {
  ProjectManagementRequestHandler
} from '../../../src/project-management/project-management-api-request-internal';
import { deepCopy } from '../../../src/utils/deep-copy';
import { FirebaseProjectManagementError } from '../../../src/utils/error';
import * as mocks from '../../resources/mocks';
import { projectManagement } from '../../../src/project-management/index';

import IosAppMetadata = projectManagement.IosAppMetadata;
import AppPlatform = projectManagement.AppPlatform;

const expect = chai.expect;

const APP_ID = 'test-app-id';
const EXPECTED_ERROR = new FirebaseProjectManagementError('internal-error', 'message');

describe('IosApp', () => {
  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  let iosApp: IosApp;
  let requestHandler: ProjectManagementRequestHandler;
  let mockApp: FirebaseApp;

  beforeEach(() => {
    mockApp = mocks.app();
    requestHandler = new ProjectManagementRequestHandler(mockApp);
    iosApp = new IosApp(APP_ID, requestHandler);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return mockApp.delete();
  });

  describe('Constructor', () => {
    const invalidAppIds = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidAppIds.forEach((invalidAppId) => {
      it('should throw given invalid app ID: ' + JSON.stringify(invalidAppId), () => {
        expect(() => {
          const iosAppAny: any = IosApp;
          return new iosAppAny(invalidAppId);
        }).to.throw('appId must be a non-empty string.');
      });
    });

    it('should throw given no appId', () => {
      expect(() => {
        const iosAppAny: any = IosApp;
        return new iosAppAny();
      }).to.throw('appId must be a non-empty string.');
    });

    it('should not throw given a valid app ID', () => {
      expect(() => {
        return new IosApp(APP_ID, requestHandler);
      }).not.to.throw();
    });
  });

  describe('getMetadata', () => {
    const expectedError = new FirebaseProjectManagementError('internal-error', 'message');

    const VALID_IOS_APP_METADATA_API_RESPONSE = {
      name: 'test-resource-name',
      appId: APP_ID,
      displayName: 'test-display-name',
      projectId: 'test-project-id',
      bundleId: 'test-bundle-id',
    };

    const VALID_IOS_APP_METADATA: IosAppMetadata = {
      platform: AppPlatform.IOS,
      resourceName: VALID_IOS_APP_METADATA_API_RESPONSE.name,
      appId: APP_ID,
      displayName: VALID_IOS_APP_METADATA_API_RESPONSE.displayName,
      projectId: VALID_IOS_APP_METADATA_API_RESPONSE.projectId,
      bundleId: VALID_IOS_APP_METADATA_API_RESPONSE.bundleId,
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getResource')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return iosApp.getMetadata().should.eventually.be.rejected.and.equal(expectedError);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getResource')
        .resolves(null as any);
      stubs.push(stub);
      return iosApp.getMetadata()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getMetadata()\'s responseData must be a non-null object. Response data: null');
    });

    const requiredFieldsList = ['name', 'appId', 'projectId', 'bundleId'];
    requiredFieldsList.forEach((requiredField) => {
      it(`should throw with API response missing ${requiredField}`, () => {
        const partialApiResponse: any = deepCopy(VALID_IOS_APP_METADATA_API_RESPONSE);
        delete partialApiResponse[requiredField];

        const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'getResource')
          .returns(Promise.resolve(partialApiResponse));
        stubs.push(stub);
        return iosApp.getMetadata()
          .should.eventually.be.rejected
          .and.have.property(
            'message',
            `getMetadata()'s responseData.${requiredField} must be a non-empty string. `
                    + `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`);
      });
    });

    it('should resolve with metadata on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getResource')
        .returns(Promise.resolve(VALID_IOS_APP_METADATA_API_RESPONSE));
      stubs.push(stub);
      return iosApp.getMetadata().should.eventually.deep.equal(VALID_IOS_APP_METADATA);
    });
  });

  describe('setDisplayName', () => {
    const newDisplayName = 'test-new-display-name';

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'setDisplayName')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return iosApp.setDisplayName(newDisplayName)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'setDisplayName')
        .returns(Promise.resolve());
      stubs.push(stub);
      return iosApp.setDisplayName(newDisplayName).should.eventually.be.fulfilled;
    });
  });

  describe('getConfig', () => {
    const VALID_IOS_CONFIG_API_RESPONSE = {
      configFileContents: 'QmFzZTY0IHRlc3Qu',
    };
    const VALID_IOS_CONFIG = 'Base64 test.';

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return iosApp.getConfig().should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .resolves(null as any);
      stubs.push(stub);
      return iosApp.getConfig()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getConfig()\'s responseData must be a non-null object. Response data: null');
    });

    it('should throw with non-base64 response.configFileContents', () => {
      const apiResponse = deepCopy(VALID_IOS_CONFIG_API_RESPONSE);
      apiResponse.configFileContents = '1' + apiResponse.configFileContents;

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .returns(Promise.resolve(apiResponse));
      stubs.push(stub);
      return iosApp.getConfig()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getConfig()\'s responseData.configFileContents must be a base64 string. '
                  + `Response data: ${JSON.stringify(apiResponse, null, 2)}`);
    });

    it('should resolve with metadata on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .returns(Promise.resolve(VALID_IOS_CONFIG_API_RESPONSE));
      stubs.push(stub);
      return iosApp.getConfig().should.eventually.deep.equal(VALID_IOS_CONFIG);
    });
  });
});

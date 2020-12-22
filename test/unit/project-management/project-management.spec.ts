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
import { AndroidApp } from '../../../src/project-management/android-app';
import { ProjectManagement } from '../../../src/project-management/project-management';
import {
  ProjectManagementRequestHandler
} from '../../../src/project-management/project-management-api-request-internal';
import { FirebaseProjectManagementError } from '../../../src/utils/error';
import * as mocks from '../../resources/mocks';
import { projectManagement } from '../../../src/project-management/index';

import AppMetadata = projectManagement.AppMetadata;
import AppPlatform = projectManagement.AppPlatform;
import IosApp = projectManagement.IosApp;

const expect = chai.expect;

const APP_ID = 'test-app-id';
const APP_ID_ANDROID = 'test-app-id-android';
const APP_ID_IOS = 'test-app-id-ios';
const PACKAGE_NAME = 'test-package-name';
const BUNDLE_ID = 'test-bundle-id';
const DISPLAY_NAME_ANDROID = 'test-display-name-android';
const DISPLAY_NAME_IOS = 'test-display-name-ios';
const EXPECTED_ERROR = new FirebaseProjectManagementError('internal-error', 'message');
const RESOURCE_NAME = 'projects/test/resources-name';
const RESOURCE_NAME_ANDROID = 'projects/test/resources-name:android';
const RESOURCE_NAME_IOS = 'projects/test/resources-name:ios';

const VALID_SHA_256_HASH = '0123456789abcdefABCDEF01234567890123456701234567890123456789abcd';

describe('ProjectManagement', () => {
  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  let projectManagement: ProjectManagement;
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  const noProjectIdErrorMessage = 'Failed to determine project ID. Initialize the SDK with service '
      + 'account credentials, or set project ID as an app option. Alternatively, set the '
      + 'GOOGLE_CLOUD_PROJECT environment variable.';

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    projectManagement = new ProjectManagement(mockApp);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return mockApp.delete();
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const projectManagementAny: any = ProjectManagement;
          return new projectManagementAny(invalidApp);
        }).to.throw(
          'First argument passed to admin.projectManagement() must be a valid Firebase app '
                + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const projectManagementAny: any = ProjectManagement;
        return new projectManagementAny();
      }).to.throw(
        'First argument passed to admin.projectManagement() must be a valid Firebase app '
              + 'instance.');
    });

    it('should reject given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const projectMgt = new ProjectManagement(mockCredentialApp);
      return projectMgt.listIosApps()
        .should.eventually.rejectedWith(noProjectIdErrorMessage);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new ProjectManagement(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(projectManagement.app).to.equal(mockApp);
    });
  });

  describe('listAndroidApps', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
        .resolves(null as any);
      stubs.push(stub);
      return projectManagement.listAndroidApps()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'listAndroidApps()\'s responseData must be a non-null object. Response data: null');
    });

    it('should return empty array when API response missing "apps" field', () => {
      const partialApiResponse = {};

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
        .should.eventually.deep.equal([]);
    });

    it('should throw when API response has non-array "apps" field', () => {
      const partialApiResponse = { apps: 'none' };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps" field must be present in the listAndroidApps() response data. Response data: '
                  + JSON.stringify(partialApiResponse, null, 2));
    });

    it('should throw with API response missing "apps[].appId" field', () => {
      const partialApiResponse = {
        apps: [{}],
      };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps[].appId" field must be present in the listAndroidApps() response data. '
                  + `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`);
    });

    it('should resolve with list of Android apps on success', () => {
      const validAndroidApps: AndroidApp[] = [projectManagement.androidApp(APP_ID)];
      const validListAndroidAppsApiResponse = {
        apps: [{ appId: APP_ID }],
      };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
        .returns(Promise.resolve(validListAndroidAppsApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
        .should.eventually.deep.equal(validAndroidApps);
    });
  });

  describe('listIosApps', () => {
    const VALID_LIST_IOS_APPS_API_RESPONSE = {
      apps: [{ appId: APP_ID }],
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.listIosApps()
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
        .resolves(null as any);
      stubs.push(stub);
      return projectManagement.listIosApps()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'listIosApps()\'s responseData must be a non-null object. Response data: null');
    });

    it('should return empty array when API response missing "apps" field', () => {
      const partialApiResponse = {};

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listIosApps()
        .should.eventually.deep.equal([]);
    });

    it('should throw when API response has non-array "apps" field', () => {
      const partialApiResponse = { apps: 'none' };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listIosApps()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps" field must be present in the listIosApps() response data. Response data: '
                  + JSON.stringify(partialApiResponse, null, 2));
    });

    it('should throw with API response missing "apps[].appId" field', () => {
      const partialApiResponse = {
        apps: [{}],
      };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listIosApps()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps[].appId" field must be present in the listIosApps() response data. '
                  + `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`);
    });

    it('should resolve with list of Ios apps on success', () => {
      const validIosApps: IosApp[] = [projectManagement.iosApp(APP_ID)];

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
        .returns(Promise.resolve(VALID_LIST_IOS_APPS_API_RESPONSE));
      stubs.push(stub);
      return projectManagement.listIosApps()
        .should.eventually.deep.equal(validIosApps);
    });
  });

  describe('androidApp', () => {
    it('should successfully return an AndroidApp', () => {
      return projectManagement.androidApp(APP_ID).appId.should.equal(APP_ID);
    });
  });

  describe('iosApp', () => {
    it('should successfully return an IosApp', () => {
      return projectManagement.iosApp(APP_ID).appId.should.equal(APP_ID);
    });
  });

  describe('shaCertificate', () => {
    it('should successfully return a ShaCertificate', () => {
      const shaCertificate = projectManagement.shaCertificate(VALID_SHA_256_HASH);
      shaCertificate.shaHash.should.equal(VALID_SHA_256_HASH);
      shaCertificate.certType.should.equal('sha256');
    });
  });

  describe('createAndroidApp', () => {
    it('should propagate intial API response errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when initial API response is null', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
        .resolves(null as any);
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'createAndroidApp()\'s responseData must be a non-null object. Response data: null');
    });

    it('should throw when initial API response.appId is undefined', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
        .returns(Promise.resolve({}));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"responseData.appId" field must be present in createAndroidApp()\'s response data. '
                  + 'Response data: {}');
    });

    it('should resolve with AndroidApp on success', () => {
      const createdAndroidApp: AndroidApp = projectManagement.androidApp(APP_ID);
      const validCreateAppResponse = { appId: APP_ID };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
        .returns(Promise.resolve(validCreateAppResponse));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
        .should.eventually.deep.equal(createdAndroidApp);
    });
  });

  describe('createIosApp', () => {
    it('should propagate intial API response errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when initial API response is null', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
        .resolves(null as any);
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'createIosApp()\'s responseData must be a non-null object. Response data: null');
    });

    it('should throw when initial API response.appId is undefined', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
        .returns(Promise.resolve({}));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"responseData.appId" field must be present in createIosApp()\'s response data. '
                  + 'Response data: {}');
    });

    it('should resolve with IosApp on success', () => {
      const createdIosApp: IosApp = projectManagement.iosApp(APP_ID);
      const validCreateAppResponse = { appId: APP_ID };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
        .returns(Promise.resolve(validCreateAppResponse));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
        .should.eventually.deep.equal(createdIosApp);
    });
  });

  describe('listAppMetadata', () => {
    const VALID_LIST_APP_METADATA_API_RESPONSE = {
      apps: [
        {
          appId: APP_ID_ANDROID,
          displayName: DISPLAY_NAME_ANDROID,
          platform: 'ANDROID',
          name: RESOURCE_NAME_ANDROID,
        },
        {
          appId: APP_ID_IOS,
          displayName: DISPLAY_NAME_IOS,
          platform: 'IOS',
          name: RESOURCE_NAME_IOS,
        },
        {
          appId: APP_ID,
          platform: 'WEB',
          name: RESOURCE_NAME,
        },
      ],
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .resolves(null as any);
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'listAppMetadata()\'s responseData must be a non-null object. Response data: null');
    });

    it('should return empty array when API response missing "apps" field', () => {
      const partialApiResponse = {};

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.deep.equal([]);
    });

    it('should throw when API response has non-array "apps" field', () => {
      const partialApiResponse = { apps: 'none' };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps" field must be present in the listAppMetadata() response data. Response data: '
                  + JSON.stringify(partialApiResponse, null, 2));
    });

    it('should throw with API response missing "apps[].appId" field', () => {
      const partialApiResponse = {
        apps: [{}],
      };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps[].appId" field must be present in the listAppMetadata() response data. '
                  + `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`);
    });

    it('should throw with API response missing "apps[].platform" field', () => {
      const missingPlatformApiResponse = {
        apps: [{
          appId: APP_ID,
        }],
      };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.resolve(missingPlatformApiResponse));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"apps[].platform" field must be present in the listAppMetadata() response data. '
                  + `Response data: ${JSON.stringify(missingPlatformApiResponse, null, 2)}`);
    });

    it('should resolve with list of apps metadata on success', () => {
      const expectedAppMetadata: AppMetadata[] = [
        {
          appId: VALID_LIST_APP_METADATA_API_RESPONSE.apps[0].appId,
          displayName: VALID_LIST_APP_METADATA_API_RESPONSE.apps[0].displayName,
          platform: AppPlatform.ANDROID,
          projectId: mocks.projectId,
          resourceName: RESOURCE_NAME_ANDROID,
        },
        {
          appId: VALID_LIST_APP_METADATA_API_RESPONSE.apps[1].appId,
          displayName: VALID_LIST_APP_METADATA_API_RESPONSE.apps[1].displayName,
          platform: AppPlatform.IOS,
          projectId: mocks.projectId,
          resourceName: RESOURCE_NAME_IOS,
        },
        {
          appId: VALID_LIST_APP_METADATA_API_RESPONSE.apps[2].appId,
          platform: AppPlatform.PLATFORM_UNKNOWN,
          projectId: mocks.projectId,
          resourceName: RESOURCE_NAME,
        },
      ];
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.resolve(VALID_LIST_APP_METADATA_API_RESPONSE));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.deep.equal(expectedAppMetadata);
    });

    it('should resolve with "apps[].platform" to be "PLATFORM_UNKNOWN" for web app', () => {
      const webPlatformApiResponse = {
        apps: [{
          appId: APP_ID,
          platform: 'WEB',
          name: RESOURCE_NAME,
        }],
      };
      const expectedAppMetadata: AppMetadata[] = [{
        appId: APP_ID,
        platform: AppPlatform.PLATFORM_UNKNOWN,
        projectId: mocks.projectId,
        resourceName: RESOURCE_NAME,
      }];

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'listAppMetadata')
        .returns(Promise.resolve(webPlatformApiResponse));
      stubs.push(stub);
      return projectManagement.listAppMetadata()
        .should.eventually.deep.equal(expectedAppMetadata);
    });
  });

  describe('setDisplayName', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'setDisplayName')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.setDisplayName(DISPLAY_NAME_ANDROID)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'setDisplayName')
        .returns(Promise.resolve());
      stubs.push(stub);
      return projectManagement.setDisplayName(DISPLAY_NAME_ANDROID).should.eventually.be.fulfilled;
    });
  });
});

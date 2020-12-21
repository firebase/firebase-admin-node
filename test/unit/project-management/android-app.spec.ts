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
import { AndroidApp, ShaCertificate } from '../../../src/project-management/android-app';
import {
  ProjectManagementRequestHandler
} from '../../../src/project-management/project-management-api-request-internal';
import { deepCopy } from '../../../src/utils/deep-copy';
import { FirebaseProjectManagementError } from '../../../src/utils/error';
import * as mocks from '../../resources/mocks';
import { projectManagement } from '../../../src/project-management/index';

import AndroidAppMetadata = projectManagement.AndroidAppMetadata;
import AppPlatform = projectManagement.AppPlatform;

const expect = chai.expect;

const APP_ID = 'test-app-id';
const EXPECTED_ERROR = new FirebaseProjectManagementError('internal-error', 'message');

const VALID_SHA_1_HASH = '0123456789abcdefABCDEF012345678901234567';
const VALID_SHA_256_HASH = '0123456789abcdefABCDEF01234567890123456701234567890123456789abcd';

describe('AndroidApp', () => {
  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  let androidApp: AndroidApp;
  let requestHandler: ProjectManagementRequestHandler;
  let mockApp: FirebaseApp;

  beforeEach(() => {
    mockApp = mocks.app();
    requestHandler = new ProjectManagementRequestHandler(mockApp);
    androidApp = new AndroidApp(APP_ID, requestHandler);
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
          const androidAppAny: any = AndroidApp;
          return new androidAppAny(invalidAppId);
        }).to.throw('appId must be a non-empty string.');
      });
    });

    it('should throw given no appId', () => {
      expect(() => {
        const androidAppAny: any = AndroidApp;
        return new androidAppAny();
      }).to.throw('appId must be a non-empty string.');
    });

    it('should not throw given a valid app ID', () => {
      expect(() => {
        return new AndroidApp(APP_ID, requestHandler);
      }).not.to.throw();
    });
  });

  describe('getMetadata', () => {
    const VALID_ANDROID_APP_METADATA_API_RESPONSE = {
      name: 'test-resource-name',
      appId: APP_ID,
      displayName: 'test-display-name',
      projectId: 'test-project-id',
      packageName: 'test-package-name',
    };

    const VALID_ANDROID_APP_METADATA: AndroidAppMetadata = {
      platform: AppPlatform.ANDROID,
      resourceName: VALID_ANDROID_APP_METADATA_API_RESPONSE.name,
      appId: APP_ID,
      displayName: VALID_ANDROID_APP_METADATA_API_RESPONSE.displayName,
      projectId: VALID_ANDROID_APP_METADATA_API_RESPONSE.projectId,
      packageName: VALID_ANDROID_APP_METADATA_API_RESPONSE.packageName,
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getResource')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return androidApp.getMetadata().should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getResource')
        .resolves(null as any);
      stubs.push(stub);
      return androidApp.getMetadata()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getMetadata()\'s responseData must be a non-null object. Response data: null');
    });

    const requiredFieldsList = ['name', 'appId', 'projectId', 'packageName'];
    requiredFieldsList.forEach((requiredField) => {
      it(`should throw with API response missing ${requiredField}`, () => {
        const partialApiResponse: any = deepCopy(VALID_ANDROID_APP_METADATA_API_RESPONSE);
        delete partialApiResponse[requiredField];

        const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'getResource')
          .returns(Promise.resolve(partialApiResponse));
        stubs.push(stub);
        return androidApp.getMetadata()
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
        .returns(Promise.resolve(VALID_ANDROID_APP_METADATA_API_RESPONSE));
      stubs.push(stub);
      return androidApp.getMetadata().should.eventually.deep.equal(VALID_ANDROID_APP_METADATA);
    });
  });

  describe('setDisplayName', () => {
    const newDisplayName = 'test-new-display-name';

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'setDisplayName')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return androidApp.setDisplayName(newDisplayName)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'setDisplayName')
        .returns(Promise.resolve());
      stubs.push(stub);
      return androidApp.setDisplayName(newDisplayName).should.eventually.be.fulfilled;
    });
  });

  describe('getShaCertificates', () => {
    const testResourceName1 = 'test-resource-name-1';
    const testResourceName2 = 'test-resource-name-2';
    const VALID_ANDROID_CERTS_API_RESPONSE = {
      certificates: [
        {
          name: testResourceName1,
          shaHash: VALID_SHA_1_HASH,
        },
        {
          name: testResourceName2,
          shaHash: VALID_SHA_256_HASH,
        },
      ],
    };

    const VALID_ANDROID_CERTS: ShaCertificate[] = [
      new ShaCertificate(VALID_SHA_1_HASH, testResourceName1),
      new ShaCertificate(VALID_SHA_256_HASH, testResourceName2),
    ];

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getAndroidShaCertificates')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return androidApp.getShaCertificates()
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getAndroidShaCertificates')
        .resolves(null as any);
      stubs.push(stub);
      return androidApp.getShaCertificates()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getShaCertificates()\'s responseData must be a non-null object. Response data: '
                  + 'null');
    });

    it('should return empty array when API response missing "certificates" field', () => {
      const partialApiResponse = {};

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getAndroidShaCertificates')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return androidApp.getShaCertificates()
        .should.eventually.deep.equal([]);
    });

    it('should throw when API response has non-array "certificates" field', () => {
      const partialApiResponse = { certificates: 'none' };

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getAndroidShaCertificates')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return androidApp.getShaCertificates()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          '"certificates" field must be present in the getShaCertificates() response data. '
                  + 'Response data: ' + JSON.stringify(partialApiResponse, null, 2));
    });

    const requiredFieldsList = ['name', 'shaHash'];
    requiredFieldsList.forEach((requiredField) => {
      it(`should throw with API response missing "certificates[].${requiredField}" field`, () => {
        const partialApiResponse: any = deepCopy(VALID_ANDROID_CERTS_API_RESPONSE);
        delete partialApiResponse.certificates[1][requiredField];

        const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'getAndroidShaCertificates')
          .returns(Promise.resolve(partialApiResponse));
        stubs.push(stub);
        return androidApp.getShaCertificates()
          .should.eventually.be.rejected
          .and.have.property(
            'message',
            `getShaCertificates()'s responseData.certificates[].${requiredField} must be a `
                    + 'non-empty string. Response data: '
                    + JSON.stringify(partialApiResponse, null, 2));
      });
    });

    it('should resolve with metadata on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getAndroidShaCertificates')
        .returns(Promise.resolve(VALID_ANDROID_CERTS_API_RESPONSE));
      stubs.push(stub);
      return androidApp.getShaCertificates()
        .should.eventually.deep.equal(VALID_ANDROID_CERTS);
    });
  });

  describe('addShaCertificate', () => {
    const certificateToAdd = new ShaCertificate(VALID_SHA_1_HASH);

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'addAndroidShaCertificate')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return androidApp.addShaCertificate(certificateToAdd)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'addAndroidShaCertificate')
        .returns(Promise.resolve());
      stubs.push(stub);
      return androidApp.addShaCertificate(certificateToAdd).should.eventually.be.fulfilled;
    });
  });

  describe('deleteShaCertificate', () => {
    const certificateToDelete = new ShaCertificate(VALID_SHA_1_HASH);
    const certificateToDeleteWithResourceName =
        new ShaCertificate(VALID_SHA_1_HASH, 'resource/name');

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'deleteResource')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return androidApp
        .deleteShaCertificate(certificateToDeleteWithResourceName)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should fail on certificate without resourceName', () => {
      expect(() => androidApp.deleteShaCertificate(certificateToDelete))
        .to.throw(FirebaseProjectManagementError)
        .with.property('code', 'project-management/invalid-argument');
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'deleteResource')
        .returns(Promise.resolve());
      stubs.push(stub);
      return androidApp
        .deleteShaCertificate(certificateToDeleteWithResourceName)
        .should.eventually.be.fulfilled;
    });
  });

  describe('getConfig', () => {
    const VALID_ANDROID_CONFIG_API_RESPONSE = {
      configFileContents: 'QmFzZTY0IHRlc3Qu',
    };
    const VALID_ANDROID_CONFIG = 'Base64 test.';

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return androidApp.getConfig().should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw with null API response', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .resolves(null as any);
      stubs.push(stub);
      return androidApp.getConfig()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getConfig()\'s responseData must be a non-null object. Response data: null');
    });

    it('should throw with non-base64 response.configFileContents', () => {
      const apiResponse = deepCopy(VALID_ANDROID_CONFIG_API_RESPONSE);
      apiResponse.configFileContents = '1' + apiResponse.configFileContents;

      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .returns(Promise.resolve(apiResponse));
      stubs.push(stub);
      return androidApp.getConfig()
        .should.eventually.be.rejected
        .and.have.property(
          'message',
          'getConfig()\'s responseData.configFileContents must be a base64 string. '
                  + `Response data: ${JSON.stringify(apiResponse, null, 2)}`);
    });

    it('should resolve with metadata on success', () => {
      const stub = sinon
        .stub(ProjectManagementRequestHandler.prototype, 'getConfig')
        .returns(Promise.resolve(VALID_ANDROID_CONFIG_API_RESPONSE));
      stubs.push(stub);
      return androidApp.getConfig().should.eventually.deep.equal(VALID_ANDROID_CONFIG);
    });
  });
});

describe('ShaCertificate', () => {
  describe('Constructor', () => {
    const invalidShaHashes = [
      null,
      undefined,
      '0123456789',
      123456789,
      '0123456789abcdefABCDEF01234567890123456',
      '0123456789abcdefABCDEF0123456789012345670123456789012345678',
    ];
    invalidShaHashes.forEach((invalidShaHash) => {
      it('should throw given invalid SHA hash: ' + JSON.stringify(invalidShaHash), () => {
        expect(() => {
          const shaCertificateAny: any = ShaCertificate;
          return new shaCertificateAny(invalidShaHash);
        }).to.throw('shaHash must be either a sha256 hash or a sha1 hash.');
      });
    });

    it('should throw given no SHA hash', () => {
      expect(() => {
        const shaCertificateAny: any = ShaCertificate;
        return new shaCertificateAny();
      }).to.throw('shaHash must be either a sha256 hash or a sha1 hash.');
    });

    it('should not throw given a valid SHA1 hash', () => {
      expect(() => {
        return new ShaCertificate(VALID_SHA_1_HASH);
      }).not.to.throw();
    });

    it('should not throw given a valid SHA256 hash', () => {
      expect(() => {
        return new ShaCertificate(VALID_SHA_256_HASH);
      }).not.to.throw();
    });
  });
});

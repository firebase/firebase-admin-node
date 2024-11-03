/*!
 * @license
 * Copyright 2017 Google Inc.
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

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import path = require('path');

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';

import {
  Credential
} from '../../../src/app/index';
import {
  RefreshTokenCredential, ServiceAccountCredential,
  getApplicationDefault, isApplicationDefault, ImpersonatedServiceAccountCredential, ApplicationDefaultCredential
} from '../../../src/app/credential-internal';
import { deepCopy } from '../../../src/utils/deep-copy';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
if (!process.env.HOME) {
  throw new Error('$HOME environment variable must be set to run the tests.');
}
const GCLOUD_CREDENTIAL_PATH = path.resolve(process.env.HOME!, '.config', GCLOUD_CREDENTIAL_SUFFIX);
const MOCK_IMPERSONATED_TOKEN_CONFIG = {
  delegates: [],
  service_account_impersonation_url: '',
  source_credentials: {
    client_id: 'test_client_id',
    client_secret: 'test_client_secret',
    refresh_token: 'test_refresh_token',
    type: 'authorized_user'
  },
  type: 'impersonated_service_account'
}

describe('Credential', () => {
  let mockCertificateObject: any;
  let oldProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    mockCertificateObject = _.clone(mocks.certificateObject);
    oldProcessEnv = process.env;
  });

  afterEach(() => {
    process.env = oldProcessEnv;
  });

  describe('ServiceAccountCredential', () => {
    const invalidFilePaths = [null, NaN, 0, 1, true, false, undefined, _.noop];
    invalidFilePaths.forEach((invalidFilePath) => {
      it('should throw if called with non-string argument: ' + JSON.stringify(invalidFilePath), () => {
        expect(() => new ServiceAccountCredential(invalidFilePath as any))
          .to.throw('Service account must be an object');
      });
    });

    it('should throw if called with the path to a non-existent file', () => {
      expect(() => new ServiceAccountCredential('invalid-file'))
        .to.throw('Failed to parse service account json file: Error: ENOENT: no such file or directory');
    });

    it('should throw if called with the path to an invalid file', () => {
      const invalidPath = path.resolve(__dirname, '../../resources/unparsable.key.json');
      expect(() => new ServiceAccountCredential(invalidPath))
        .to.throw('Failed to parse service account json file: SyntaxError');
    });

    it('should throw if called with an empty string path', () => {
      expect(() => new ServiceAccountCredential(''))
        .to.throw('Failed to parse service account json file: Error: ENOENT: no such file or directory');
    });

    it('should throw given an object without a "project_id" property', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'project_id');
      expect(() => new ServiceAccountCredential(invalidCertificate as any))
        .to.throw('Service account object must contain a string "project_id" property');
    });

    it('should throw given an object without a "private_key" property', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'private_key');
      expect(() => new ServiceAccountCredential(invalidCertificate as any))
        .to.throw('Service account object must contain a string "private_key" property');
    });

    it('should throw given an object with an empty string "private_key" property', () => {
      const invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.private_key = '';
      expect(() => new ServiceAccountCredential(invalidCertificate as any))
        .to.throw('Service account object must contain a string "private_key" property');
    });

    it('should throw given an object without a "client_email" property', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'client_email');
      expect(() => new ServiceAccountCredential(invalidCertificate as any))
        .to.throw('Service account object must contain a string "client_email" property');
    });

    it('should throw given an object with an empty string "client_email" property', () => {
      const invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.client_email = '';
      expect(() => new ServiceAccountCredential(invalidCertificate as any))
        .to.throw('Service account object must contain a string "client_email" property');
    });

    it('should throw given an object with a malformed "private_key" property', () => {
      const invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.private_key = 'malformed';
      expect(() => new ServiceAccountCredential(invalidCertificate as any))
        .to.throw('Failed to parse private key');
    });

    it('should not throw given a valid path to a key file', () => {
      const validPath = path.resolve(__dirname, '../../resources/mock.key.json');
      expect(() => new ServiceAccountCredential(validPath)).not.to.throw();
    });

    it('should accept "clientEmail" in place of "client_email" for the certificate object', () => {
      mockCertificateObject.clientEmail = mockCertificateObject.client_email;
      delete mockCertificateObject.client_email;

      expect(() => new ServiceAccountCredential(mockCertificateObject))
        .not.to.throw();
    });

    it('should accept "privateKey" in place of "private_key" for the certificate object', () => {
      mockCertificateObject.privateKey = mockCertificateObject.private_key;
      delete mockCertificateObject.private_key;

      expect(() => new ServiceAccountCredential(mockCertificateObject))
        .not.to.throw();
    });

    it('should return a Credential', () => {
      const c = new ServiceAccountCredential(mockCertificateObject);
      expect(c).to.deep.include({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
        implicit: false,
      });
    });

    it('should return an implicit Credential', () => {
      const c = new ServiceAccountCredential(mockCertificateObject, undefined, true);
      expect(c).to.deep.include({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
        implicit: true,
      });
    });
  });

  describe('RefreshTokenCredential', () => {
    it('should throw if called with the path to an invalid file', () => {
      const invalidPath = path.resolve(__dirname, '../../resources/unparsable.key.json');
      expect(() => new RefreshTokenCredential(invalidPath))
        .to.throw('Failed to parse refresh token file');
    });

    it('should throw given an object without a "clientId" property', () => {
      const invalidCredential = _.omit(mocks.refreshToken, 'clientId');
      expect(() => new RefreshTokenCredential(invalidCredential as any))
        .to.throw('Refresh token must contain a "client_id" property');
    });

    it('should throw given an object without a "clientSecret" property', () => {
      const invalidCredential = _.omit(mocks.refreshToken, 'clientSecret');
      expect(() => new RefreshTokenCredential(invalidCredential as any))
        .to.throw('Refresh token must contain a "client_secret" property');
    });

    it('should throw given an object without a "refreshToken" property', () => {
      const invalidCredential = _.omit(mocks.refreshToken, 'refreshToken');
      expect(() => new RefreshTokenCredential(invalidCredential as any))
        .to.throw('Refresh token must contain a "refresh_token" property');
    });

    it('should throw given an object without a "type" property', () => {
      const invalidCredential = _.omit(mocks.refreshToken, 'type');
      expect(() => new RefreshTokenCredential(invalidCredential as any))
        .to.throw('Refresh token must contain a "type" property');
    });

    it('should return a Credential', () => {
      const c = new RefreshTokenCredential(mocks.refreshToken);
      expect(c).to.deep.include({
        implicit: false,
      });
    });

    it('should return an implicit Credential', () => {
      const c = new RefreshTokenCredential(mocks.refreshToken, undefined, true);
      expect(c).to.deep.include({
        implicit: true,
      });
    });
  });

  describe('ImpersonatedServiceAccountCredential', () => {
    it('should throw if called with the path to an invalid file', () => {
      const invalidPath = path.resolve(__dirname, '../../resources/unparsable.key.json');
      expect(() => new ImpersonatedServiceAccountCredential(invalidPath))
        .to.throw('Failed to parse impersonated service account file');
    });

    it('should throw given an object without a "clientId" property', () => {
      const invalidCredential = deepCopy(MOCK_IMPERSONATED_TOKEN_CONFIG);
      invalidCredential.source_credentials.client_id = '';
      expect(() => new ImpersonatedServiceAccountCredential(invalidCredential as any))
        .to.throw('Impersonated Service Account must contain a "source_credentials.client_id" property.');
    });

    it('should throw given an object without a "clientSecret" property', () => {
      const invalidCredential = deepCopy(MOCK_IMPERSONATED_TOKEN_CONFIG);
      invalidCredential.source_credentials.client_secret = '';
      expect(() => new ImpersonatedServiceAccountCredential(invalidCredential as any))
        .to.throw('Impersonated Service Account must contain a "source_credentials.client_secret" property.');
    });

    it('should throw given an object without a "refreshToken" property', () => {
      const invalidCredential = deepCopy(MOCK_IMPERSONATED_TOKEN_CONFIG);
      invalidCredential.source_credentials.refresh_token = '';
      expect(() => new ImpersonatedServiceAccountCredential(invalidCredential as any))
        .to.throw('Impersonated Service Account must contain a "source_credentials.refresh_token" property.');
    });

    it('should throw given an object without a "type" property', () => {
      const invalidCredential = deepCopy(MOCK_IMPERSONATED_TOKEN_CONFIG);
      invalidCredential.source_credentials.type = '';
      expect(() => new ImpersonatedServiceAccountCredential(invalidCredential as any))
        .to.throw('Impersonated Service Account must contain a "source_credentials.type" property.');
    });

    it('should return a Credential', () => {
      const c = new ImpersonatedServiceAccountCredential(MOCK_IMPERSONATED_TOKEN_CONFIG);
      expect(c).to.deep.include({
        implicit: false,
      });
    });

    it('should return an implicit Credential', () => {
      const c = new ImpersonatedServiceAccountCredential(MOCK_IMPERSONATED_TOKEN_CONFIG, undefined, true);
      expect(c).to.deep.include({
        implicit: true,
      });
    });
  });

  describe('getApplicationDefault()', () => {
    let fsStub: sinon.SinonStub;

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
    });

    it('should return an ApplicationDefaultCredential with GOOGLE_APPLICATION_CREDENTIALS set', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = getApplicationDefault();
      expect(c).to.be.an.instanceof(ApplicationDefaultCredential);
    });

    it('should return a RefreshTokenCredential with gcloud login', () => {
      if (!fs.existsSync(GCLOUD_CREDENTIAL_PATH)) {
        // tslint:disable-next-line:no-console
        console.log(
          'WARNING: Test being skipped because gcloud credentials not found. Run `gcloud beta auth ' +
          'application-default login`.');
        return;
      }
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      expect((getApplicationDefault())).to.be.an.instanceof(RefreshTokenCredential);
    });

    it('should return a MetadataServiceCredential as a last resort', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').throws(new Error('no gcloud credential file'));
      expect(getApplicationDefault()).to.be.an.instanceof(ApplicationDefaultCredential);
    });
  });

  describe('isApplicationDefault()', () => {
    let fsStub: sinon.SinonStub;

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
    });

    it('should return true for ApplicationDefaultCredential loaded from GOOGLE_APPLICATION_CREDENTIALS', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = getApplicationDefault();
      expect(c).to.be.an.instanceof(ApplicationDefaultCredential);
      expect(isApplicationDefault(c)).to.be.true;
    });

    it('should return true for credential loaded from gcloud SDK', () => {
      if (!fs.existsSync(GCLOUD_CREDENTIAL_PATH)) {
        // tslint:disable-next-line:no-console
        console.log(
          'WARNING: Test being skipped because gcloud credentials not found. Run `gcloud beta auth ' +
          'application-default login`.');
        return;
      }
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const c = getApplicationDefault();
      expect(c).to.be.an.instanceof(RefreshTokenCredential);
      expect(isApplicationDefault(c)).to.be.true;
    });

    it('should return true for ComputeEngineCredential', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').throws(new Error('no gcloud credential file'));
      const c = getApplicationDefault();
      expect(c).to.be.an.instanceof(ApplicationDefaultCredential);
      expect(isApplicationDefault(c)).to.be.true;
    });

    it('should return false for explicitly loaded ServiceAccountCredential', () => {
      const c = new ServiceAccountCredential(mockCertificateObject);
      expect(isApplicationDefault(c)).to.be.false;
    });

    it('should return false for explicitly loaded RefreshTokenCredential', () => {
      const c = new RefreshTokenCredential(mocks.refreshToken);
      expect(isApplicationDefault(c)).to.be.false;
    });

    it('should return false for explicitly loaded ImpersonatedServiceAccountCredential', () => {
      const c = new ImpersonatedServiceAccountCredential(MOCK_IMPERSONATED_TOKEN_CONFIG);
      expect(isApplicationDefault(c)).to.be.false;
    });

    it('should return false for custom credential', () => {
      const c: Credential = {
        getAccessToken: () => {
          throw new Error();
        },
      };
      expect(isApplicationDefault(c)).to.be.false;
    });
  });
});

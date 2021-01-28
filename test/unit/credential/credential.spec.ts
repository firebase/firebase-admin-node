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
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {
  GoogleOAuthAccessToken, credential
} from '../../../src/credential/index';
import {
  RefreshTokenCredential, ServiceAccountCredential,
  ComputeEngineCredential, getApplicationDefault, isApplicationDefault
} from '../../../src/credential/credential-internal';
import { HttpClient } from '../../../src/utils/api-request';
import { Agent } from 'https';
import { FirebaseAppError } from '../../../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

/* eslint-disable @typescript-eslint/camelcase */

const expect = chai.expect;

const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
if (!process.env.HOME) {
  throw new Error('$HOME environment variable must be set to run the tests.');
}
const GCLOUD_CREDENTIAL_PATH = path.resolve(process.env.HOME!, '.config', GCLOUD_CREDENTIAL_SUFFIX);
const MOCK_REFRESH_TOKEN_CONFIG = {
  client_id: 'test_client_id',
  client_secret: 'test_client_secret',
  type: 'authorized_user',
  refresh_token: 'test_token',
};

const ONE_HOUR_IN_SECONDS = 60 * 60;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;


describe('Credential', () => {
  let mockCertificateObject: any;
  let oldProcessEnv: NodeJS.ProcessEnv;
  let getTokenScope: nock.Scope;
  let mockedRequests: nock.Scope[] = [];

  before(() => {
    getTokenScope = nock('https://accounts.google.com')
      .persist()
      .post('/o/oauth2/token')
      .reply(200, {
        access_token: utils.generateRandomAccessToken(),
        token_type: 'Bearer',
        expires_in: 3600,
      }, {
        'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
      });
  });

  after(() => getTokenScope.done());

  beforeEach(() => {
    mockCertificateObject = _.clone(mocks.certificateObject);
    oldProcessEnv = process.env;
  });

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];
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

    it('should create access tokens', () => {
      const c = new ServiceAccountCredential(mockCertificateObject);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
      });
    });

    describe('Error Handling', () => {
      let httpStub: sinon.SinonStub;
      before(() => {
        httpStub = sinon.stub(HttpClient.prototype, 'send');
      });
      after(() => httpStub.restore());

      it('should throw an error including error details', () => {
        httpStub.rejects(utils.errorFrom({
          error: 'invalid_grant',
          error_description: 'reason',
        }));
        const c = new ServiceAccountCredential(mockCertificateObject);
        return expect(c.getAccessToken()).to.be
          .rejectedWith('Error fetching access token: invalid_grant (reason)');
      });

      it('should throw an error including error text payload', () => {
        httpStub.rejects(utils.errorFrom('not json'));
        const c = new ServiceAccountCredential(mockCertificateObject);
        return expect(c.getAccessToken()).to.be
          .rejectedWith('Error fetching access token: not json');
      });

      it('should throw when the success response is malformed', () => {
        httpStub.resolves(utils.responseFrom({}));
        const c = new ServiceAccountCredential(mockCertificateObject);
        return expect(c.getAccessToken()).to.be
          .rejectedWith('Unexpected response while fetching access token');
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

    it('should create access tokens', () => {
      const scope = nock('https://www.googleapis.com')
        .post('/oauth2/v4/token')
        .reply(200, {
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 60 * 60,
        }, {
          'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
        });
      mockedRequests.push(scope);

      const c = new RefreshTokenCredential(mocks.refreshToken);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.greaterThan(FIVE_MINUTES_IN_SECONDS);
      });
    });
  });

  describe('ComputeEngineCredential', () => {
    let httpStub: sinon.SinonStub;
    beforeEach(() => httpStub = sinon.stub(HttpClient.prototype, 'send'));
    afterEach(() => httpStub.restore());

    it('should create access tokens', () => {
      const expected: GoogleOAuthAccessToken = {
        access_token: 'anAccessToken',
        expires_in: 42,
      };
      const response = utils.responseFrom(expected);
      httpStub.resolves(response);

      const c = new ComputeEngineCredential();
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal('anAccessToken');
        expect(token.expires_in).to.equal(42);
        expect(httpStub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
          headers: { 'Metadata-Flavor': 'Google' },
          httpAgent: undefined,
        });
      });
    });

    it('should discover project id', () => {
      const expectedProjectId = 'test-project-id';
      const response = utils.responseFrom(expectedProjectId);
      httpStub.resolves(response);

      const c = new ComputeEngineCredential();
      return c.getProjectId().then((projectId) => {
        expect(projectId).to.equal(expectedProjectId);
        expect(httpStub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: 'http://metadata.google.internal/computeMetadata/v1/project/project-id',
          headers: { 'Metadata-Flavor': 'Google' },
          httpAgent: undefined,
        });
      });
    });

    it('should cache discovered project id', () => {
      const expectedProjectId = 'test-project-id';
      const response = utils.responseFrom(expectedProjectId);
      httpStub.resolves(response);

      const c = new ComputeEngineCredential();
      return c.getProjectId()
        .then((projectId) => {
          expect(projectId).to.equal(expectedProjectId);
          return c.getProjectId();
        })
        .then((projectId) => {
          expect(projectId).to.equal(expectedProjectId);
          expect(httpStub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'http://metadata.google.internal/computeMetadata/v1/project/project-id',
            headers: { 'Metadata-Flavor': 'Google' },
            httpAgent: undefined,
          });
        });
    });

    it('should reject when the metadata service is not available', () => {
      httpStub.rejects(new FirebaseAppError('network-error', 'Failed to connect'));

      const c = new ComputeEngineCredential();
      return c.getProjectId().should.eventually
        .rejectedWith('Failed to determine project ID: Failed to connect')
        .and.have.property('code', 'app/invalid-credential');
    });

    it('should reject when the metadata service responds with an error', () => {
      const response = utils.errorFrom('Unexpected error');
      httpStub.rejects(response);

      const c = new ComputeEngineCredential();
      return c.getProjectId().should.eventually
        .rejectedWith('Failed to determine project ID: Unexpected error')
        .and.have.property('code', 'app/invalid-credential');
    });
  });

  describe('getApplicationDefault()', () => {
    let fsStub: sinon.SinonStub;

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
    });

    it('should return a CertCredential with GOOGLE_APPLICATION_CREDENTIALS set', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = getApplicationDefault();
      expect(c).to.be.an.instanceof(ServiceAccountCredential);
    });

    it('should throw if explicitly pointing to an invalid path', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'invalidpath';
      expect(() => getApplicationDefault()).to.throw(Error);
    });

    it('should throw if explicitly pointing to an invalid cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns('invalidjson');
      expect(() => getApplicationDefault()).to.throw(Error);
    });

    it('should throw error if type not specified on cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify({}));
      expect(() => getApplicationDefault())
        .to.throw(Error, 'Invalid contents in the credentials file');
    });

    it('should throw error if type is unknown on cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify({
        type: 'foo',
      }));
      expect(() => getApplicationDefault()).to.throw(Error, 'Invalid contents in the credentials file');
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

    it('should throw if a the gcloud login cache is invalid', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').returns('invalidjson');
      expect(() => getApplicationDefault()).to.throw(Error);
    });

    it('should throw if the credentials file content is not an object', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      fsStub = sinon.stub(fs, 'readFileSync').returns('2');
      expect(() => getApplicationDefault()).to.throw(Error);
    });

    it('should return a MetadataServiceCredential as a last resort', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').throws(new Error('no gcloud credential file'));
      expect(getApplicationDefault()).to.be.an.instanceof(ComputeEngineCredential);
    });

    it('should create access tokens', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = getApplicationDefault();
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
      });
    });

    it('should return a Credential', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = getApplicationDefault();
      expect(c).to.deep.include({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
      });
    });

    it('should parse valid RefreshTokenCredential if GOOGLE_APPLICATION_CREDENTIALS environment variable ' +
        'points to default refresh token location', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = GCLOUD_CREDENTIAL_PATH;

      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify(MOCK_REFRESH_TOKEN_CONFIG));

      const c = getApplicationDefault();
      expect(c).is.instanceOf(RefreshTokenCredential);
      expect(c).to.have.property('refreshToken').that.includes({
        clientId: MOCK_REFRESH_TOKEN_CONFIG.client_id,
        clientSecret: MOCK_REFRESH_TOKEN_CONFIG.client_secret,
        refreshToken: MOCK_REFRESH_TOKEN_CONFIG.refresh_token,
        type: MOCK_REFRESH_TOKEN_CONFIG.type,
      });
      expect(fsStub.alwaysCalledWith(GCLOUD_CREDENTIAL_PATH, 'utf8')).to.be.true;
    });
  });

  describe('isApplicationDefault()', () => {
    let fsStub: sinon.SinonStub;

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
    });

    it('should return true for ServiceAccountCredential loaded from GOOGLE_APPLICATION_CREDENTIALS', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = getApplicationDefault();
      expect(c).to.be.an.instanceof(ServiceAccountCredential);
      expect(isApplicationDefault(c)).to.be.true;
    });

    it('should return true for RefreshTokenCredential loaded from GOOGLE_APPLICATION_CREDENTIALS', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = GCLOUD_CREDENTIAL_PATH;
      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify(MOCK_REFRESH_TOKEN_CONFIG));
      const c = getApplicationDefault();
      expect(c).is.instanceOf(RefreshTokenCredential);
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
      expect(c).to.be.an.instanceof(ComputeEngineCredential);
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

    it('should return false for custom credential', () => {
      const c: credential.Credential = {
        getAccessToken: () => {
          throw new Error();
        },
      };
      expect(isApplicationDefault(c)).to.be.false;
    });
  });

  describe('HTTP Agent', () => {
    const expectedToken = utils.generateRandomAccessToken();
    let stub: sinon.SinonStub;

    beforeEach(() => {
      stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({
        access_token: expectedToken,
        token_type: 'Bearer',
        expires_in: 60 * 60,
      }));
    });

    afterEach(() => {
      stub.restore();
    });

    it('ServiceAccountCredential should use the provided HTTP Agent', () => {
      const agent = new Agent();
      const c = new ServiceAccountCredential(mockCertificateObject, agent);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal(expectedToken);
        expect(stub).to.have.been.calledOnce;
        expect(stub.args[0][0].httpAgent).to.equal(agent);
      });
    });

    it('RefreshTokenCredential should use the provided HTTP Agent', () => {
      const agent = new Agent();
      const c = new RefreshTokenCredential(MOCK_REFRESH_TOKEN_CONFIG, agent);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal(expectedToken);
        expect(stub).to.have.been.calledOnce;
        expect(stub.args[0][0].httpAgent).to.equal(agent);
      });
    });

    it('ComputeEngineCredential should use the provided HTTP Agent', () => {
      const agent = new Agent();
      const c = new ComputeEngineCredential(agent);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal(expectedToken);
        expect(stub).to.have.been.calledOnce;
        expect(stub.args[0][0].httpAgent).to.equal(agent);
      });
    });

    it('ApplicationDefaultCredential should use the provided HTTP Agent', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const agent = new Agent();
      const c = getApplicationDefault(agent);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal(expectedToken);
        expect(stub).to.have.been.calledOnce;
        expect(stub.args[0][0].httpAgent).to.equal(agent);
      });
    });
  });
});

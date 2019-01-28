/*!
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
  ApplicationDefaultCredential, CertCredential, Certificate, GoogleOAuthAccessToken,
  MetadataServiceCredential, RefreshTokenCredential,
} from '../../../src/auth/credential';
import { HttpClient } from '../../../src/utils/api-request';
import {Agent} from 'https';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
const GCLOUD_CREDENTIAL_PATH = path.resolve(process.env.HOME, '.config', GCLOUD_CREDENTIAL_SUFFIX);
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


  describe('Certificate', () => {
    describe('fromPath', () => {
      const invalidFilePaths = [null, NaN, 0, 1, true, false, {}, [], { a: 1 }, [1, 'a'], _.noop];
      invalidFilePaths.forEach((invalidFilePath) => {
        it('should throw if called with non-string argument: ' + JSON.stringify(invalidFilePath), () => {
          expect(() => {
            Certificate.fromPath(invalidFilePath as any);
          }).to.throw('Failed to parse certificate key file: TypeError: path must be a string');
        });
      });

      it('should throw if called with no argument', () => {
        expect(() => {
          (Certificate as any).fromPath();
        }).to.throw('Failed to parse certificate key file: TypeError: path must be a string');
      });

      it('should throw if called with the path to a non-existent file', () => {
        expect(() => Certificate.fromPath('invalid-file'))
          .to.throw('Failed to parse certificate key file: Error: ENOENT: no such file or directory');
      });

      it('should throw if called with the path to an invalid file', () => {
        const invalidPath = path.resolve(__dirname, '../../resources/unparesable.json');
        expect(() => Certificate.fromPath(invalidPath))
          .to.throw('Failed to parse certificate key file: Error: ENOENT: no such file or directory');
      });

      it('should throw if called with an empty string path', () => {
        expect(() => Certificate.fromPath(''))
          .to.throw('Failed to parse certificate key file: Error: ENOENT: no such file or directory');
      });

      it('should not throw given a valid path to a key file', () => {
        const validPath = path.resolve(__dirname, '../../resources/mock.key.json');
        expect(() => Certificate.fromPath(validPath)).not.to.throw();
      });

      it('should throw given an object without a "private_key" property', () => {
        const invalidCertificate = _.omit(mocks.certificateObject, 'private_key');
        expect(() => {
          return new Certificate(invalidCertificate as any);
        }).to.throw('Certificate object must contain a string "private_key" property');
      });

      it('should throw given an object with an empty string "private_key" property', () => {
        const invalidCertificate = _.clone(mocks.certificateObject);
        invalidCertificate.private_key = '';
        expect(() => {
          return new Certificate(invalidCertificate as any);
        }).to.throw('Certificate object must contain a string "private_key" property');
      });

      it('should throw given an object without a "client_email" property', () => {
        const invalidCertificate = _.omit(mocks.certificateObject, 'client_email');
        expect(() => {
          return new Certificate(invalidCertificate as any);
        }).to.throw('Certificate object must contain a string "client_email" property');
      });

      it('should throw given an object with an empty string "client_email" property', () => {
        const invalidCertificate = _.clone(mocks.certificateObject);
        invalidCertificate.client_email = '';
        expect(() => {
          return new Certificate(invalidCertificate as any);
        }).to.throw('Certificate object must contain a string "client_email" property');
      });

      const invalidCredentials = [null, NaN, 0, 1, true, false, '', 'a', [], {}, { a: 1 }, _.noop];
      invalidCredentials.forEach((invalidCredential) => {
        it('should throw given invalid Credential: ' + JSON.stringify(invalidCredential), () => {
          expect(() => {
            return new Certificate(invalidCredential as any);
          }).to.throw(Error);
        });
      });
    });

    describe('constructor', () => {
      const invalidCertificateObjects = [null, NaN, 0, 1, true, false, _.noop];
      invalidCertificateObjects.forEach((invalidCertificateObject) => {
        it('should throw if called with non-object argument: ' + JSON.stringify(invalidCertificateObject), () => {
          expect(() => {
            return new Certificate(invalidCertificateObject as any);
          }).to.throw('Certificate object must be an object.');
        });
      });

      it('should throw if called with no argument', () => {
        expect(() => {
          return new (Certificate as any)();
        }).to.throw('Certificate object must be an object.');
      });

      it('should throw if certificate object does not contain a valid "client_email"', () => {
        mockCertificateObject.client_email = '';

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).to.throw('Certificate object must contain a string "client_email" property');

        delete mockCertificateObject.client_email;

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).to.throw('Certificate object must contain a string "client_email" property');
      });

      it('should throw if certificate object does not contain a "private_key"', () => {
        mockCertificateObject.private_key = '';

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).to.throw('Certificate object must contain a string "private_key" property');

        delete mockCertificateObject.private_key;

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).to.throw('Certificate object must contain a string "private_key" property');
      });

      it('should throw if certificate object does not contain a valid "private_key"', () => {
        mockCertificateObject.private_key = 'invalid.key';

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).to.throw('Failed to parse private key: Error: Invalid PEM formatted message.');
      });

      it('should not throw given a valid certificate object', () => {
        expect(() => {
          return new Certificate(mockCertificateObject);
        }).not.to.throw();
      });

      it('should accept "clientEmail" in place of "client_email" for the certificate object', () => {
        mockCertificateObject.clientEmail = mockCertificateObject.client_email;
        delete mockCertificateObject.client_email;

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).not.to.throw();
      });

      it('should accept "privateKey" in place of "private_key" for the certificate object', () => {
        mockCertificateObject.privateKey = mockCertificateObject.private_key;
        delete mockCertificateObject.private_key;

        expect(() => {
          return new Certificate(mockCertificateObject);
        }).not.to.throw();
      });
    });
  });

  describe('CertCredential', () => {
    it('should return a Credential', () => {
      const c = new CertCredential(mockCertificateObject);
      expect(c.getCertificate()).to.deep.equal({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
      });
    });

    it('should create access tokens', () => {
      const c = new CertCredential(mockCertificateObject);
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
        const c = new CertCredential(mockCertificateObject);
        return expect(c.getAccessToken()).to.be
          .rejectedWith('Error fetching access token: invalid_grant (reason)');
      });

      it('should throw an error including error text payload', () => {
        httpStub.rejects(utils.errorFrom('not json'));
        const c = new CertCredential(mockCertificateObject);
        return expect(c.getAccessToken()).to.be
          .rejectedWith('Error fetching access token: not json');
      });
    });
  });

  describe('RefreshTokenCredential', () => {
    it('should not return a certificate', () => {
      const c = new RefreshTokenCredential(MOCK_REFRESH_TOKEN_CONFIG);
      expect(c.getCertificate()).to.be.null;
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

  describe('MetadataServiceCredential', () => {
    let httpStub: sinon.SinonStub;
    before(() => httpStub = sinon.stub(HttpClient.prototype, 'send'));
    after(() => httpStub.restore());

    it('should not return a certificate', () => {
      const c = new MetadataServiceCredential();
      expect(c.getCertificate()).to.be.null;
    });

    it('should create access tokens', () => {
      const expected: GoogleOAuthAccessToken = {
        access_token: 'anAccessToken',
        expires_in: 42,
      };
      const response = utils.responseFrom(expected);
      httpStub.resolves(response);

      const c = new MetadataServiceCredential();
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal('anAccessToken');
        expect(token.expires_in).to.equal(42);
      });
    });
  });

  describe('ApplicationDefaultCredential', () => {
    let fsStub: sinon.SinonStub;

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
    });

    it('should return a CertCredential with GOOGLE_APPLICATION_CREDENTIALS set', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = new ApplicationDefaultCredential();
      expect(c.getCredential()).to.be.an.instanceof(CertCredential);
    });

    it('should throw if explicitly pointing to an invalid path', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'invalidpath';
      expect(() => new ApplicationDefaultCredential()).to.throw(Error);
    });

    it('should throw if explicitly pointing to an invalid cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns('invalidjson');
      expect(() => new ApplicationDefaultCredential()).to.throw(Error);
    });

    it('should throw error if type not specified on cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify({}));
      expect(() => new ApplicationDefaultCredential())
          .to.throw(Error, 'Invalid contents in the credentials file');
    });

    it('should throw error if type is unknown on cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify({
        type: 'foo',
      }));
      expect(() => new ApplicationDefaultCredential()).to.throw(Error, 'Invalid contents in the credentials file');
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
      expect((new ApplicationDefaultCredential()).getCredential()).to.be.an.instanceof(RefreshTokenCredential);
    });

    it('should throw if a the gcloud login cache is invalid', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').returns('invalidjson');
      expect(() => new ApplicationDefaultCredential()).to.throw(Error);
    });

    it('should return a MetadataServiceCredential as a last resort', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').throws(new Error('no gcloud credential file'));
      expect((new ApplicationDefaultCredential()).getCredential()).to.be.an.instanceof(MetadataServiceCredential);
    });

    it('should create access tokens', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = new ApplicationDefaultCredential();
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
      });
    });

    it('should return a Credential', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const c = new ApplicationDefaultCredential();
      expect(c.getCertificate()).to.deep.equal({
        projectId: mockCertificateObject.project_id,
        clientEmail: mockCertificateObject.client_email,
        privateKey: mockCertificateObject.private_key,
      });
    });

    it('should parse valid RefreshTokenCredential if GOOGLE_APPLICATION_CREDENTIALS environment variable ' +
        'points to default refresh token location', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = GCLOUD_CREDENTIAL_PATH;

      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify(MOCK_REFRESH_TOKEN_CONFIG));

      const adc = new ApplicationDefaultCredential();
      const c = adc.getCredential();
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

    it('CertCredential should use the provided HTTP Agent', () => {
      const agent = new Agent();
      const c = new CertCredential(mockCertificateObject, agent);
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

    it('MetadataServiceCredential should use the provided HTTP Agent', () => {
      const agent = new Agent();
      const c = new MetadataServiceCredential(agent);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal(expectedToken);
        expect(stub).to.have.been.calledOnce;
        expect(stub.args[0][0].httpAgent).to.equal(agent);
      });
    });

    it('ApplicationDefaultCredential should use the provided HTTP Agent', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../resources/mock.key.json');
      const agent = new Agent();
      const c = new ApplicationDefaultCredential(agent);
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal(expectedToken);
        expect(stub).to.have.been.calledOnce;
        expect(stub.args[0][0].httpAgent).to.equal(agent);
      });
    });
  });
});

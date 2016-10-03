'use strict';

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import path = require('path');
import http = require('http');
import stream = require('stream');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  ApplicationDefaultCredential, CertCredential, Certificate, GoogleOAuthAccessToken,
  MetadataServiceCredential, RefreshToken, RefreshTokenCredential, UnauthenticatedCredential,
} from '../src/auth/credential';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const certPath = path.resolve(__dirname, 'resources/mock.key.json');
const MOCK_CERTIFICATE_OBJECT = JSON.parse(fs.readFileSync(certPath).toString());

let TEST_GCLOUD_CREDENTIALS;
const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
const GCLOUD_CREDENTIAL_PATH = path.resolve(process.env.HOME, '.config', GCLOUD_CREDENTIAL_SUFFIX);
try {
  TEST_GCLOUD_CREDENTIALS = JSON.parse(fs.readFileSync(GCLOUD_CREDENTIAL_PATH).toString());
} catch (error) {
  throw new Error('gcloud credentials not found. Have you tried running `gcloud beta auth application-default login`?');
}

const ONE_HOUR_IN_SECONDS = 60 * 60;


/**
 * Returns a mocked out success response from the URL generating Google access tokens.
 *
 * @return {Object} A nock response object.
 */
function mockFetchAccessToken(): nock.Scope {
  return nock('https://accounts.google.com:443')
    .post('/o/oauth2/token')
    .reply(200, {
      access_token: 'access_token_' + _.random(999999999),
      token_type: 'Bearer',
      expires_in: 3600,
    }, {
      'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    });
}


describe('Credential', () => {
  let mockedRequests: nock.Scope[] = [];

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];
  });

  after(() => {
    nock.cleanAll();
  });

  describe('Certificate', () => {
    describe('fromPath', () => {
      it('should throw if called with no argument', () => {
        expect(() => {
          // Need to remove type information to even compile this.
          let untypedFactory: any = Certificate.fromPath;
          untypedFactory();
        }).to.throw(Error);
      });

      it('should throw if service account points to an invalid path', () => {
        expect(() => Certificate.fromPath('invalid-file')).to.throw(Error);
      });

      it('should throw if called with the path to an invalid file', () => {
        const invalidPath = path.resolve(__dirname, 'resources/unparesable.json');
        expect(() => Certificate.fromPath(invalidPath)).to.throw(Error);
      });

      it('should throw if service account is an empty string', () => {
        expect(() => Certificate.fromPath('')).to.throw(Error);
      });

      it('should not throw given a valid path to a service account', () => {
        const validPath = path.resolve(__dirname, 'resources/mock.key.json');
        expect(() => Certificate.fromPath(validPath)).not.to.throw();
      });
    });

    describe('constructor', () => {
      it('should throw if service account does not contain a valid "client_email"', () => {
        expect(() => {
          return new Certificate({
            client_email: '',
            private_key: MOCK_CERTIFICATE_OBJECT.private_key,
          });
        }).to.throw(Error);

        expect(() => {
          return new Certificate({
            private_key: MOCK_CERTIFICATE_OBJECT.private_key,
          });
        }).to.throw(Error);
      });

      it('should throw if service account does not contain a valid "private_key"', () => {
        expect(() => {
          return new Certificate({
            client_email: MOCK_CERTIFICATE_OBJECT.client_email,
            private_key: '',
          });
        }).to.throw(Error);

        expect(() => {
          return new Certificate({
            client_email: MOCK_CERTIFICATE_OBJECT.client_email,
          });
        }).to.throw(Error);
      });

      it('should not throw given a valid service account object', () => {
        expect(() => {
          return new Certificate({
            private_key: MOCK_CERTIFICATE_OBJECT.private_key,
            client_email: MOCK_CERTIFICATE_OBJECT.client_email,
          });
        }).not.to.throw();
      });

      it('should accept "clientEmail" in place of "client_email" for the service account', () => {
        expect(() => {
          return new Certificate({
            private_key: MOCK_CERTIFICATE_OBJECT.private_key,
            clientEmail: MOCK_CERTIFICATE_OBJECT.client_email,
          });
        }).not.to.throw();
      });

      it('should accept "privateKey" in place of "private_key" for the service account', () => {
        expect(() => {
          return new Certificate({
            privateKey: MOCK_CERTIFICATE_OBJECT.private_key,
            client_email: MOCK_CERTIFICATE_OBJECT.client_email,
          });
        }).not.to.throw();
      });
    });

  });

  describe('CertCredential', () => {
    it('should return a Credential', () => {
      const c = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      expect(c.getCertificate()).to.deep.equal({
        projectId: MOCK_CERTIFICATE_OBJECT.project_id,
        clientEmail: MOCK_CERTIFICATE_OBJECT.client_email,
        privateKey: MOCK_CERTIFICATE_OBJECT.private_key,
      });
    });

    it('should create access tokens', () => {
      mockedRequests.push(mockFetchAccessToken());

      const c = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
      });
    });
  });

  describe('UnauthenticatedCredential', () => {
    it('should not return a service account', () => {
      const c = new UnauthenticatedCredential();
      expect(c.getCertificate()).to.be.null;
    });

    it('should resolve null for access tokens', () => {
      const c = new UnauthenticatedCredential();
      return c.getAccessToken().then((token) => expect(token).to.be.null);
    });
  });

  describe('RefreshTokenCredential', () => {
    it('should not return a service account', () => {
      const c = new RefreshTokenCredential(new RefreshToken(TEST_GCLOUD_CREDENTIALS));
      expect(c.getCertificate()).to.be.null;
    });

    it('should create access tokens', () => {
      const c = new RefreshTokenCredential(new RefreshToken(TEST_GCLOUD_CREDENTIALS));
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
      });
    });
  });

  describe('MetadataServiceCredential', () => {
    let httpStub;
    before(() => httpStub = sinon.stub(http, 'request'));
    after(() => httpStub.restore());

    it('should not return a service account', () => {
      const c = new MetadataServiceCredential();
      expect(c.getCertificate()).to.be.null;
    });

    it('should create access tokens', () => {
      const expected: GoogleOAuthAccessToken = {
        access_token: 'anAccessToken',
        expires_in: 42,
      };
      const response = new stream.PassThrough();
      response.write(JSON.stringify(expected));
      response.end();

      const request = new stream.PassThrough();

      httpStub.callsArgWith(1, response)
        .returns(request);

      const c = new MetadataServiceCredential();
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.equal('anAccessToken');
        expect(token.expires_in).to.equal(42);
      });
    });
  });

  describe('ApplicationDefaultCredential', () => {
    let credPath: string;
    let fsStub;

    beforeEach(()  => credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS);

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
      process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credPath;
    });

    it('should return a CertCredential with GOOGLE_APPLICATION_CREDENTIALS set', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, './resources/mock.key.json');
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

    it('should return a RefreshTokenCredential with gcloud login', () => {
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
      mockedRequests.push(mockFetchAccessToken());

      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, './resources/mock.key.json');
      const c = new ApplicationDefaultCredential();
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
      });
    });

    it('should return a Credential', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, './resources/mock.key.json');
      const c = new ApplicationDefaultCredential();
      expect(c.getCertificate()).to.deep.equal({
        projectId: MOCK_CERTIFICATE_OBJECT.project_id,
        clientEmail: MOCK_CERTIFICATE_OBJECT.client_email,
        privateKey: MOCK_CERTIFICATE_OBJECT.private_key,
      });
    });
  });
});

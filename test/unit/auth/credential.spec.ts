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
import http = require('http');
import stream = require('stream');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {
  ApplicationDefaultCredential, CertCredential, Certificate, GoogleOAuthAccessToken,
  MetadataServiceCredential, RefreshToken, RefreshTokenCredential,
} from '../../../src/auth/credential';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

let TEST_GCLOUD_CREDENTIALS;
const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
const GCLOUD_CREDENTIAL_PATH = path.resolve(process.env.HOME, '.config', GCLOUD_CREDENTIAL_SUFFIX);
try {
  TEST_GCLOUD_CREDENTIALS = JSON.parse(fs.readFileSync(GCLOUD_CREDENTIAL_PATH).toString());
} catch (error) {
  // tslint:disable-next-line:no-console
  console.log(
    'WARNING: gcloud credentials not found. Run `gcloud beta auth application-default login`. ' +
    'Relevant tests will be skipped.'
  );
}

/**
 * Logs a warning and returns true if no gcloud credentials are found, meaning the test which calls
 * this will be skipped.
 *
 * The only thing that should ever skip these tests is continuous integration. When developing
 * locally, these tests should be run.
 *
 * @return {boolean} Whether or not the caller should skip the current test.
 */
const skipAndLogWarningIfNoGcloud = () => {
  if (typeof TEST_GCLOUD_CREDENTIALS === 'undefined') {
    // tslint:disable-next-line:no-console
    console.log(
      'WARNING: Test being skipped because gcloud credentials not found. Run `gcloud beta auth ' +
      'application-default login`.'
    );

    return true;
  }

  return false;
};

const ONE_HOUR_IN_SECONDS = 60 * 60;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;


describe('Credential', () => {
  let mockedRequests: nock.Scope[] = [];
  let mockCertificateObject;
  let oldProcessEnv: NodeJS.ProcessEnv;

  before(() => utils.mockFetchAccessTokenRequests());

  after(() => nock.cleanAll());

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
  });

  describe('RefreshTokenCredential', () => {
    it('should not return a certificate', () => {
      if (skipAndLogWarningIfNoGcloud()) {
        return;
      }

      const c = new RefreshTokenCredential(new RefreshToken(TEST_GCLOUD_CREDENTIALS));
      expect(c.getCertificate()).to.be.null;
    });

    it('should create access tokens', () => {
      if (skipAndLogWarningIfNoGcloud()) {
        return;
      }

      const c = new RefreshTokenCredential(new RefreshToken(TEST_GCLOUD_CREDENTIALS));
      return c.getAccessToken().then((token) => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.greaterThan(FIVE_MINUTES_IN_SECONDS);
      });
    });
  });

  describe('MetadataServiceCredential', () => {
    let httpStub;
    before(() => httpStub = sinon.stub(http, 'request'));
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

    it('should return a RefreshTokenCredential with gcloud login', () => {
      if (skipAndLogWarningIfNoGcloud()) {
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
  });
});

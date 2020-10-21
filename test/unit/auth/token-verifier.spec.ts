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

// Use untyped import syntax for Node built-ins
import https = require('https');

import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import LegacyFirebaseTokenGenerator = require('firebase-token-generator');

import * as mocks from '../../resources/mocks';
import { FirebaseTokenGenerator, ServiceAccountSigner } from '../../../src/auth/token-generator';
import * as verifier from '../../../src/auth/token-verifier';

import { ServiceAccountCredential } from '../../../src/credential/credential-internal';
import { AuthClientErrorCode } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';
import { Algorithm } from 'jsonwebtoken';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const ONE_HOUR_IN_SECONDS = 60 * 60;
const idTokenPublicCertPath = '/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/**
 * Returns a mocked out success response from the URL containing the public keys for the Google certs.
 *
 * @param {string=} path URL path to which the mock request should be made. If not specified, defaults
 *   to the URL path of ID token public key certificates.
 * @return {Object} A nock response object.
 */
function mockFetchPublicKeys(path: string = idTokenPublicCertPath): nock.Scope {
  const mockedResponse: {[key: string]: string} = {};
  mockedResponse[mocks.certificateObject.private_key_id] = mocks.keyPairs[0].public;
  return nock('https://www.googleapis.com')
    .get(path)
    .reply(200, mockedResponse, {
      'cache-control': 'public, max-age=1, must-revalidate, no-transform',
    });
}

/**
 * Returns a mocked out success response from the URL containing the public keys for the Google certs
 * which contains a public key which won't match the mocked token.
 *
 * @return {Object} A nock response object.
 */
function mockFetchWrongPublicKeys(): nock.Scope {
  const mockedResponse: {[key: string]: string} = {};
  mockedResponse[mocks.certificateObject.private_key_id] = mocks.keyPairs[1].public;
  return nock('https://www.googleapis.com')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    .reply(200, mockedResponse, {
      'cache-control': 'public, max-age=1, must-revalidate, no-transform',
    });
}

/**
 * Returns a mocked out error response from the URL containing the public keys for the Google certs.
 * The status code is 200 but the response itself will contain an 'error' key.
 *
 * @return {Object} A nock response object.
 */
function mockFetchPublicKeysWithErrorResponse(): nock.Scope {
  return nock('https://www.googleapis.com')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    .reply(200, {
      error: 'message',
      error_description: 'description', // eslint-disable-line @typescript-eslint/camelcase
    });
}

/**
 * Returns a mocked out failed response from the URL containing the public keys for the Google certs.
 * The status code is non-200 and the response itself will fail.
 *
 * @return {Object} A nock response object.
 */
function mockFailedFetchPublicKeys(): nock.Scope {
  return nock('https://www.googleapis.com')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    .replyWithError('message');
}

function createTokenVerifier(
  app: FirebaseApp, 
  options: { algorithm?: Algorithm } = {}
): verifier.FirebaseTokenVerifier {
  const algorithm = options.algorithm || 'RS256';
  return new verifier.FirebaseTokenVerifier(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
    algorithm,
    'https://securetoken.google.com/',
    verifier.ID_TOKEN_INFO,
    app
  );
}


describe('FirebaseTokenVerifier', () => {
  let app: FirebaseApp;
  let tokenVerifier: verifier.FirebaseTokenVerifier;
  let tokenGenerator: FirebaseTokenGenerator;
  let clock: sinon.SinonFakeTimers | undefined;
  let httpsSpy: sinon.SinonSpy;
  beforeEach(() => {
    // Needed to generate custom token for testing.
    app = mocks.app();
    const cert = new ServiceAccountCredential(mocks.certificateObject);
    tokenGenerator = new FirebaseTokenGenerator(new ServiceAccountSigner(cert));
    tokenVerifier = createTokenVerifier(app);
    httpsSpy = sinon.spy(https, 'request');
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
    httpsSpy.restore();
  });

  after(() => {
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should not throw when valid arguments are provided', () =>  {
      expect(() => {
        tokenVerifier = new verifier.FirebaseTokenVerifier(
          'https://www.example.com/publicKeys',
          'RS256',
          'https://www.example.com/issuer/',
          {
            url: 'https://docs.example.com/verify-tokens',
            verifyApiName: 'verifyToken()',
            jwtName: 'Important Token',
            shortName: 'token',
            expiredErrorCode: AuthClientErrorCode.INVALID_ARGUMENT,
          },
          app,
        );
      }).not.to.throw();
    });

    const invalidCertURLs = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, 'file://invalid'];
    invalidCertURLs.forEach((invalidCertUrl) => {
      it('should throw given a non-URL public cert: ' + JSON.stringify(invalidCertUrl), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            invalidCertUrl as any,
            'RS256',
            'https://www.example.com/issuer/',
            verifier.ID_TOKEN_INFO,
            app,
          );
        }).to.throw('The provided public client certificate URL is an invalid URL.');
      });
    });

    const invalidAlgorithms = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, ''];
    invalidAlgorithms.forEach((invalidAlgorithm) => {
      it('should throw given an invalid algorithm: ' + JSON.stringify(invalidAlgorithm), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
            invalidAlgorithm as any,
            'https://www.example.com/issuer/',
            verifier.ID_TOKEN_INFO,
            app);
        }).to.throw('The provided JWT algorithm is an empty string.');
      });
    });

    const invalidIssuers = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, 'file://invalid'];
    invalidIssuers.forEach((invalidIssuer) => {
      it('should throw given a non-URL issuer: ' + JSON.stringify(invalidIssuer), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
            'RS256',
            invalidIssuer as any,
            verifier.ID_TOKEN_INFO,
            app,
          );
        }).to.throw('The provided JWT issuer is an invalid URL.');
      });
    });

    const invalidVerifyApiNames = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, ''];
    invalidVerifyApiNames.forEach((invalidVerifyApiName) => {
      it('should throw given an invalid verify API name: ' + JSON.stringify(invalidVerifyApiName), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
            'RS256',
            'https://www.example.com/issuer/',
            {
              url: 'https://docs.example.com/verify-tokens',
              verifyApiName: invalidVerifyApiName as any,
              jwtName: 'Important Token',
              shortName: 'token',
              expiredErrorCode: AuthClientErrorCode.INVALID_ARGUMENT,
            },
            app,
          );
        }).to.throw('The JWT verify API name must be a non-empty string.');
      });
    });

    const invalidJwtNames = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, ''];
    invalidJwtNames.forEach((invalidJwtName) => {
      it('should throw given an invalid JWT full name: ' + JSON.stringify(invalidJwtName), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
            'RS256',
            'https://www.example.com/issuer/',
            {
              url: 'https://docs.example.com/verify-tokens',
              verifyApiName: 'verifyToken()',
              jwtName: invalidJwtName as any,
              shortName: 'token',
              expiredErrorCode: AuthClientErrorCode.INVALID_ARGUMENT,
            },
            app,
          );
        }).to.throw('The JWT public full name must be a non-empty string.');
      });
    });

    const invalidShortNames = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, ''];
    invalidShortNames.forEach((invalidShortName) => {
      it('should throw given an invalid JWT short name: ' + JSON.stringify(invalidShortName), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
            'RS256',
            'https://www.example.com/issuer/',
            {
              url: 'https://docs.example.com/verify-tokens',
              verifyApiName: 'verifyToken()',
              jwtName: 'Important Token',
              shortName: invalidShortName as any,
              expiredErrorCode: AuthClientErrorCode.INVALID_ARGUMENT,
            },
            app,
          );
        }).to.throw('The JWT public short name must be a non-empty string.');
      });
    });

    const invalidExpiredErrorCodes = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, '', 'test'];
    invalidExpiredErrorCodes.forEach((invalidExpiredErrorCode) => {
      it('should throw given an invalid expiration error code: ' + JSON.stringify(invalidExpiredErrorCode), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
            'RS256',
            'https://www.example.com/issuer/',
            {
              url: 'https://docs.example.com/verify-tokens',
              verifyApiName: 'verifyToken()',
              jwtName: 'Important Token',
              shortName: 'token',
              expiredErrorCode: invalidExpiredErrorCode as any,
            },
            app,
          );
        }).to.throw('The JWT expiration error code must be a non-null ErrorInfo object.');
      });
    });
  });

  describe('verifyJWT()', () => {
    let mockedRequests: nock.Scope[] = [];

    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];
    });

    it('should throw given no Firebase JWT token', () => {
      expect(() => {
        (tokenVerifier as any).verifyJWT();
      }).to.throw('First argument to verifyIdToken() must be a Firebase ID token');
    });

    const invalidIdTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidIdTokens.forEach((invalidIdToken) => {
      it('should throw given a non-string Firebase JWT token: ' + JSON.stringify(invalidIdToken), () => {
        expect(() => {
          tokenVerifier.verifyJWT(invalidIdToken as any);
        }).to.throw('First argument to verifyIdToken() must be a Firebase ID token');
      });
    });

    it('should throw given an empty string Firebase JWT token', () => {
      return tokenVerifier.verifyJWT('')
        .should.eventually.be.rejectedWith('Decoding Firebase ID token failed');
    });

    it('should be rejected given an invalid Firebase JWT token', () => {
      return tokenVerifier.verifyJWT('invalid-token')
        .should.eventually.be.rejectedWith('Decoding Firebase ID token failed');
    });

    it('should throw if the token verifier was initialized with no "project_id"', () => {
      const tokenVerifierWithNoProjectId = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        'RS256',
        'https://securetoken.google.com/',
        verifier.ID_TOKEN_INFO,
        mocks.mockCredentialApp(),
      );
      const mockIdToken = mocks.generateIdToken();
      const expected = 'Must initialize app with a cert credential or set your Firebase project ID as ' +
        'the GOOGLE_CLOUD_PROJECT environment variable to call verifyIdToken().';
      return tokenVerifierWithNoProjectId.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith(expected);
    });

    it('should be rejected given a Firebase JWT token with no kid', () => {
      const mockIdToken = mocks.generateIdToken({
        header: { foo: 'bar' },
      });
      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has no "kid" claim');
    });

    it('should be rejected given a Firebase JWT token with a kid which does not match any of the ' +
        'actual public keys', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const mockIdToken = mocks.generateIdToken({
        header: {
          kid: 'wrongkid',
        },
      });

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has "kid" claim which does not ' +
          'correspond to a known public key');
    });

    it('should be rejected given a Firebase JWT token with an incorrect algorithm', () => {
      const mockIdToken = mocks.generateIdToken({
        algorithm: 'HS256',
      });
      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect algorithm');
    });

    it('should be rejected given a Firebase JWT token with an incorrect audience', () => {
      const mockIdToken = mocks.generateIdToken({
        audience: 'incorrectAudience',
      });

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect "aud" (audience) claim');
    });

    it('should be rejected given a Firebase JWT token with an incorrect issuer', () => {
      const mockIdToken = mocks.generateIdToken({
        issuer: 'incorrectIssuer',
      });

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect "iss" (issuer) claim');
    });

    it('should be rejected given a Firebase JWT token with a subject with greater than 128 characters', () => {
      mockedRequests.push(mockFetchPublicKeys());

      // uid of length 128 should be fulfilled
      let uid = Array(129).join('a');
      expect(uid).to.have.length(128);
      let mockIdToken = mocks.generateIdToken({
        subject: uid,
      });
      return tokenVerifier.verifyJWT(mockIdToken).then(() => {
        // uid of length 129 should be rejected
        uid = Array(130).join('a');
        expect(uid).to.have.length(129);
        mockIdToken = mocks.generateIdToken({
          subject: uid,
        });

        return tokenVerifier.verifyJWT(mockIdToken)
          .should.eventually.be.rejectedWith('Firebase ID token has "sub" (subject) claim longer than 128 characters');
      });
    });

    it('should be rejected given an expired Firebase JWT token', () => {
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

      // Token should still be valid
      return tokenVerifier.verifyJWT(mockIdToken).then(() => {
        clock!.tick(1);

        // Token should now be invalid
        return tokenVerifier.verifyJWT(mockIdToken)
          .should.eventually.be.rejectedWith('Firebase ID token has expired. Get a fresh ID token from your client ' +
            'app and try again (auth/id-token-expired)')
          .and.have.property('code', 'auth/id-token-expired');
      });
    });

    it('should be rejected given an expired Firebase session cookie', () => {
      const tokenVerifierSessionCookie = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys',
        'RS256',
        'https://session.firebase.google.com/',
        verifier.SESSION_COOKIE_INFO,
        app,
      );
      mockedRequests.push(mockFetchPublicKeys('/identitytoolkit/v3/relyingparty/publicKeys'));

      clock = sinon.useFakeTimers(1000);

      const mockSessionCookie = mocks.generateSessionCookie();

      clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

      // Cookie should still be valid
      return tokenVerifierSessionCookie.verifyJWT(mockSessionCookie).then(() => {
        clock!.tick(1);

        // Cookie should now be invalid
        return tokenVerifierSessionCookie.verifyJWT(mockSessionCookie)
          .should.eventually.be.rejectedWith('Firebase session cookie has expired. Get a fresh session cookie from ' +
            'your client app and try again (auth/session-cookie-expired).')
          .and.have.property('code', 'auth/session-cookie-expired');
      });
    });

    it('should be rejected given a Firebase JWT token which was not signed with the kid it specifies', () => {
      mockedRequests.push(mockFetchWrongPublicKeys());

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has invalid signature');
    });

    it('should be rejected given a custom token with error using article "an" before JWT short name', () => {
      return tokenGenerator.createCustomToken(mocks.uid)
        .then((customToken) => {
          return tokenVerifier.verifyJWT(customToken)
            .should.eventually.be.rejectedWith('verifyIdToken() expects an ID token, but was given a custom token');
        });
    });

    it('should be rejected given a custom token with error using article "a" before JWT short name', () => {
      const tokenVerifierSessionCookie = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys',
        'RS256',
        'https://session.firebase.google.com/',
        verifier.SESSION_COOKIE_INFO,
        app,
      );
      return tokenGenerator.createCustomToken(mocks.uid)
        .then((customToken) => {
          return tokenVerifierSessionCookie.verifyJWT(customToken)
            .should.eventually.be.rejectedWith(
              'verifySessionCookie() expects a session cookie, but was given a custom token');
        });
    });

    it('should be rejected given a legacy custom token with error using article "an" before JWT short name', () => {
      const legacyTokenGenerator = new LegacyFirebaseTokenGenerator('foo');
      const legacyCustomToken = legacyTokenGenerator.createToken({
        uid: mocks.uid,
      });

      return tokenVerifier.verifyJWT(legacyCustomToken)
        .should.eventually.be.rejectedWith('verifyIdToken() expects an ID token, but was given a legacy custom token');
    });

    it('should be rejected given a legacy custom token with error using article "a" before JWT short name', () => {
      const tokenVerifierSessionCookie = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys',
        'RS256',
        'https://session.firebase.google.com/',
        verifier.SESSION_COOKIE_INFO,
        app,
      );
      const legacyTokenGenerator = new LegacyFirebaseTokenGenerator('foo');
      const legacyCustomToken = legacyTokenGenerator.createToken({
        uid: mocks.uid,
      });

      return tokenVerifierSessionCookie.verifyJWT(legacyCustomToken)
        .should.eventually.be.rejectedWith(
          'verifySessionCookie() expects a session cookie, but was given a legacy custom token');
    });

    it('should be fulfilled with decoded claims given a valid Firebase JWT token', () => {
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.fulfilled.and.deep.equal({
          one: 'uno',
          two: 'dos',
          iat: 1,
          exp: ONE_HOUR_IN_SECONDS + 1,
          aud: mocks.projectId,
          iss: 'https://securetoken.google.com/' + mocks.projectId,
          sub: mocks.uid,
          uid: mocks.uid,
        });
    });

    it('should decode an unsigned token when the algorithm is set to none (emulator)', async () => {
      clock = sinon.useFakeTimers(1000);

      const emulatorVerifier = createTokenVerifier(app, { algorithm: 'none' });
      const mockIdToken = mocks.generateIdToken({
        algorithm: 'none',
        header: {}
      });

      const decoded = await emulatorVerifier.verifyJWT(mockIdToken);
      expect(decoded).to.deep.equal({
        one: 'uno',
        two: 'dos',
        iat: 1,
        exp: ONE_HOUR_IN_SECONDS + 1,
        aud: mocks.projectId,
        iss: 'https://securetoken.google.com/' + mocks.projectId,
        sub: mocks.uid,
        uid: mocks.uid,
      });
    });

    it('should not decode a signed token when the algorithm is set to none (emulator)', async () => {
      clock = sinon.useFakeTimers(1000);

      const emulatorVerifier = createTokenVerifier(app, { algorithm: 'none' });
      const mockIdToken = mocks.generateIdToken();

      await emulatorVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect algorithm. Expected "none"');
    });

    it('should not decode an unsigned token when the algorithm is not overridden (emulator)', async () => {
      clock = sinon.useFakeTimers(1000);

      const idTokenNoAlg = mocks.generateIdToken({
        algorithm: 'none',
      });
      await tokenVerifier.verifyJWT(idTokenNoAlg)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect algorithm.');

      const idTokenNoHeader = mocks.generateIdToken({
        algorithm: 'none',
        header: {}
      });
      await tokenVerifier.verifyJWT(idTokenNoHeader)
        .should.eventually.be.rejectedWith('Firebase ID token has no "kid" claim.');
    });

    it('should use the given HTTP Agent', () => {
      const agent = new https.Agent();
      const appWithAgent = mocks.appWithOptions({
        credential: mocks.credential,
        httpAgent: agent,
      });
      tokenVerifier = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        'RS256',
        'https://securetoken.google.com/',
        verifier.ID_TOKEN_INFO,
        appWithAgent,
      );
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .then(() => {
          expect(https.request).to.have.been.calledOnce;
          expect(httpsSpy.args[0][0].agent).to.equal(agent);
        });
    });

    it('should not fetch the Google cert public keys until the first time verifyJWT() is called', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const testTokenVerifier = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        'RS256',
        'https://securetoken.google.com/',
        verifier.ID_TOKEN_INFO,
        app,
      );
      expect(https.request).not.to.have.been.called;

      const mockIdToken = mocks.generateIdToken();

      return testTokenVerifier.verifyJWT(mockIdToken)
        .then(() => expect(https.request).to.have.been.calledOnce);
    });

    it('should not re-fetch the Google cert public keys every time verifyJWT() is called', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken).then(() => {
        expect(https.request).to.have.been.calledOnce;
        return tokenVerifier.verifyJWT(mockIdToken);
      }).then(() => expect(https.request).to.have.been.calledOnce);
    });

    it('should refresh the Google cert public keys after the "max-age" on the request expires', () => {
      mockedRequests.push(mockFetchPublicKeys());
      mockedRequests.push(mockFetchPublicKeys());
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken).then(() => {
        expect(https.request).to.have.been.calledOnce;
        clock!.tick(999);
        return tokenVerifier.verifyJWT(mockIdToken);
      }).then(() => {
        expect(https.request).to.have.been.calledOnce;
        clock!.tick(1);
        return tokenVerifier.verifyJWT(mockIdToken);
      }).then(() => {
        // One second has passed
        expect(https.request).to.have.been.calledTwice;
        clock!.tick(999);
        return tokenVerifier.verifyJWT(mockIdToken);
      }).then(() => {
        expect(https.request).to.have.been.calledTwice;
        clock!.tick(1);
        return tokenVerifier.verifyJWT(mockIdToken);
      }).then(() => {
        // Two seconds have passed
        expect(https.request).to.have.been.calledThrice;
      });
    });

    it('should be rejected if fetching the Google public keys fails', () => {
      mockedRequests.push(mockFailedFetchPublicKeys());

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('message');
    });

    it('should be rejected if fetching the Google public keys returns a response with an error message', () => {
      mockedRequests.push(mockFetchPublicKeysWithErrorResponse());

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Error fetching public keys for Google certs: message (description)');
    });
  });
});

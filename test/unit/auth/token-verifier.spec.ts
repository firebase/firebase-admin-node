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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Agent } from 'http';

import LegacyFirebaseTokenGenerator = require('firebase-token-generator');

import * as mocks from '../../resources/mocks';
import { FirebaseTokenGenerator } from '../../../src/auth/token-generator';
import { ServiceAccountSigner } from '../../../src/utils/crypto-signer';
import * as verifier from '../../../src/auth/token-verifier';

import { ServiceAccountCredential } from '../../../src/credential/credential-internal';
import { AuthClientErrorCode } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';
import { JwtError, JwtErrorCode, PublicKeySignatureVerifier } from '../../../src/utils/jwt';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const ONE_HOUR_IN_SECONDS = 60 * 60;

function createTokenVerifier(
  app: FirebaseApp
): verifier.FirebaseTokenVerifier {
  return new verifier.FirebaseTokenVerifier(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
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
  beforeEach(() => {
    // Needed to generate custom token for testing.
    app = mocks.app();
    const cert = new ServiceAccountCredential(mocks.certificateObject);
    tokenGenerator = new FirebaseTokenGenerator(new ServiceAccountSigner(cert));
    tokenVerifier = createTokenVerifier(app);
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  after(() => {
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should not throw when valid arguments are provided', () =>  {
      expect(() => {
        tokenVerifier = new verifier.FirebaseTokenVerifier(
          'https://www.example.com/publicKeys',
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
            'https://www.example.com/issuer/',
            verifier.ID_TOKEN_INFO,
            app,
          );
        }).to.throw('The provided public client certificate URL is an invalid URL.');
      });
    });

    const invalidIssuers = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop, 'file://invalid'];
    invalidIssuers.forEach((invalidIssuer) => {
      it('should throw given a non-URL issuer: ' + JSON.stringify(invalidIssuer), () => {
        expect(() => {
          new verifier.FirebaseTokenVerifier(
            'https://www.example.com/publicKeys',
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
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];

      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
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

    it('should be rejected when the verifier throws no maching kid error', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.NO_MATCHING_KID, 'No matching key ID.'));
      stubs.push(verifierStub);

      const mockIdToken = mocks.generateIdToken({
        header: {
          kid: 'wrongkid',
        },
      });

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has "kid" claim which does not ' +
            'correspond to a known public key');
    });

    it('should be rejected given a Firebase JWT token with a subject with greater than 128 characters', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .resolves();
      stubs.push(verifierStub);

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

    it('should be rejected when the verifier throws for expired Firebase JWT token', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.TOKEN_EXPIRED, 'Expired token.'));
      stubs.push(verifierStub);

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has expired. Get a fresh ID token from your client ' +
          'app and try again (auth/id-token-expired)')
        .and.have.property('code', 'auth/id-token-expired');
    });

    it('should be rejected when the verifier throws for expired Firebase session cookie', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.TOKEN_EXPIRED, 'Expired token.'));
      stubs.push(verifierStub);

      const tokenVerifierSessionCookie = new verifier.FirebaseTokenVerifier(
        'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys',
        'https://session.firebase.google.com/',
        verifier.SESSION_COOKIE_INFO,
        app,
      );

      const mockSessionCookie = mocks.generateSessionCookie();

      return tokenVerifierSessionCookie.verifyJWT(mockSessionCookie)
        .should.eventually.be.rejectedWith('Firebase session cookie has expired. Get a fresh session cookie from ' +
          'your client app and try again (auth/session-cookie-expired).')
        .and.have.property('code', 'auth/session-cookie-expired');
    });

    it('should be rejected when the verifier throws invalid signature for a Firebase JWT token.', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.INVALID_SIGNATURE, 'invalid signature.'));
      stubs.push(verifierStub);

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has invalid signature');
    });

    it('should be rejected when the verifier throws key fetch error.', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .rejects(new JwtError(JwtErrorCode.KEY_FETCH_ERROR, 'Error fetching public keys.'));
      stubs.push(verifierStub);

      const mockIdToken = mocks.generateIdToken();

      return tokenVerifier.verifyJWT(mockIdToken)
        .should.eventually.be.rejectedWith('Error fetching public keys.');
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

    it('AppOptions.httpAgent should be passed to the verifier', () => {
      const mockAppWithAgent = mocks.appWithOptions({
        httpAgent: new Agent()
      });
      const agentForApp = mockAppWithAgent.options.httpAgent;
      const verifierSpy = sinon.spy(PublicKeySignatureVerifier, 'withCertificateUrl');

      expect(verifierSpy.args).to.be.empty;

      createTokenVerifier(mockAppWithAgent);

      expect(verifierSpy.args[0][1]).to.equal(agentForApp);
      
      verifierSpy.restore();
    });

    it('should be fulfilled with decoded claims given a valid Firebase JWT token', () => {
      const verifierStub = sinon.stub(PublicKeySignatureVerifier.prototype, 'verify')
        .resolves();
      stubs.push(verifierStub);

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

    it('should decode an unsigned token if isEmulator=true', async () => {
      clock = sinon.useFakeTimers(1000);

      const emulatorVerifier = createTokenVerifier(app);
      const mockIdToken = mocks.generateIdToken({
        algorithm: 'none',
        header: {}
      });

      const isEmulator = true;
      const decoded = await emulatorVerifier.verifyJWT(mockIdToken, isEmulator);
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
  });
});

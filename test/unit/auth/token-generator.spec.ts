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

import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import {
  FirebaseTokenGenerator, SESSION_COOKIE_INFO, ID_TOKEN_INFO,
} from '../../../src/auth/token-generator';
import * as verifier from '../../../src/auth/token-verifier';
import {FirebaseAuthError, AuthClientErrorCode} from '../../../src/utils/error';

import {Certificate} from '../../../src/auth/credential';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;


const ALGORITHM = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];


/**
 * Verifies a token is signed with the private key corresponding to the provided public key.
 *
 * @param {string} token The token to verify.
 * @param {string} publicKey The public key to use to verify the token.
 * @return {Promise<object>} A promise fulfilled with the decoded token if it is valid; otherwise, a rejected promise.
 */
function verifyToken(token: string, publicKey: string): Promise<object> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, {
      algorithms: [ALGORITHM],
    }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}


describe('FirebaseTokenGenerator', () => {
  let tokenGenerator: FirebaseTokenGenerator;

  let clock: sinon.SinonFakeTimers;
  beforeEach(() => {
    tokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  describe('Constructor', () => {
    it('should throw given no service account', () => {
      expect(() => {
        // Need to overcome the type system to allow a call with no parameter
        const anyFirebaseTokenGenerator: any = FirebaseTokenGenerator;
        return new anyFirebaseTokenGenerator();
      }).to.throw('Must provide a certificate to use FirebaseTokenGenerator');
    });

    const invalidCredentials = [null, NaN, 0, 1, true, false, '', 'a', [], {}, { a: 1 }, _.noop];
    invalidCredentials.forEach((invalidCredential) => {
      it('should throw given invalid Credential: ' + JSON.stringify(invalidCredential), () => {
        expect(() => {
          return new FirebaseTokenGenerator(new Certificate(invalidCredential as any));
        }).to.throw(Error);
      });
    });

    it('should throw given an object without a "private_key" property', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'private_key');
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Certificate object must contain a string "private_key" property');
    });

    it('should throw given an object with an empty string "private_key" property', () => {
      const invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.private_key = '';
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Certificate object must contain a string "private_key" property');
    });

    it('should throw given an object without a "client_email" property', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'client_email');
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Certificate object must contain a string "client_email" property');
    });

    it('should throw given an object without an empty string "client_email" property', () => {
      const invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.client_email = '';
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Certificate object must contain a string "client_email" property');
    });

    it('should not throw given a valid certificate', () => {
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));
      }).not.to.throw();
    });

    it('should not throw given an object representing a certificate key', () => {
      expect(() => {
        return new FirebaseTokenGenerator(mocks.certificateObject);
      }).not.to.throw();
    });
  });


  describe('createCustomToken()', () => {
    it('should throw given no uid', () => {
      expect(() => {
        (tokenGenerator as any).createCustomToken();
      }).to.throw('First argument to createCustomToken() must be a non-empty string uid');
    });

    const invalidUids = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidUids.forEach((invalidUid) => {
      it('should throw given a non-string uid: ' + JSON.stringify(invalidUid), () => {
        expect(() => {
          tokenGenerator.createCustomToken(invalidUid as any);
        }).to.throw('First argument to createCustomToken() must be a non-empty string uid');
      });
    });

    it('should throw given an empty string uid', () => {
      expect(() => {
        tokenGenerator.createCustomToken('');
      }).to.throw('First argument to createCustomToken() must be a non-empty string uid');
    });

    it('should throw given a uid with a length greater than 128 characters', () => {
      // uid of length 128 should be allowed
      let uid = Array(129).join('a');
      expect(uid).to.have.length(128);
      expect(() => {
        tokenGenerator.createCustomToken(uid);
      }).not.to.throw();

      // uid of length 129 should throw
      uid = Array(130).join('a');
      expect(uid).to.have.length(129);
      expect(() => {
        tokenGenerator.createCustomToken(uid);
      }).to.throw('First argument to createCustomToken() must a uid with less than or equal to 128 characters');
    });

    it('should throw given a non-object developer claims', () => {
      const invalidDeveloperClaims = [null, NaN, [], true, false, '', 'a', 0, 1, Infinity, _.noop];
      invalidDeveloperClaims.forEach((invalidDevClaims: any) => {
        expect(() => {
          tokenGenerator.createCustomToken(mocks.uid, invalidDevClaims);
        }).to.throw('Second argument to createCustomToken() must be an object containing the developer claims');
      });
    });

    BLACKLISTED_CLAIMS.forEach((blacklistedClaim) => {
      it('should throw given a developer claims object with a blacklisted claim: ' + blacklistedClaim, () => {
        const blacklistedDeveloperClaims = _.clone(mocks.developerClaims);
        blacklistedDeveloperClaims[blacklistedClaim] = true;
        expect(() => {
          tokenGenerator.createCustomToken(mocks.uid, blacklistedDeveloperClaims);
        }).to.throw('Developer claim "' + blacklistedClaim + '" is reserved and cannot be specified');
      });
    });

    it('should throw if the token generator was initialized with no "private_key"', () => {
      const certificateObjectWithNoPrivateKey: any = _.omit(mocks.certificateObject, 'private_key');
      certificateObjectWithNoPrivateKey.clientEmail = certificateObjectWithNoPrivateKey.client_email;
      const tokenGeneratorWithNoPrivateKey = new FirebaseTokenGenerator(certificateObjectWithNoPrivateKey);

      expect(() => {
        tokenGeneratorWithNoPrivateKey.createCustomToken(mocks.uid);
      }).to.throw('createCustomToken() requires a certificate with "private_key" set');
    });

    it('should throw if the token generator was initialized with no "client_email"', () => {
      const certificateObjectWithNoClientEmail: any = _.omit(mocks.certificateObject, 'client_email');
      certificateObjectWithNoClientEmail.privateKey = certificateObjectWithNoClientEmail.private_key;
      const tokenGeneratorWithNoClientEmail = new FirebaseTokenGenerator(certificateObjectWithNoClientEmail);

      expect(() => {
        tokenGeneratorWithNoClientEmail.createCustomToken(mocks.uid);
      }).to.throw('createCustomToken() requires a certificate with "client_email" set');
    });

    it('should be fulfilled given a valid uid and no developer claims', () => {
      return tokenGenerator.createCustomToken(mocks.uid);
    });

    it('should be fulfilled given a valid uid and empty object developer claims', () => {
       return tokenGenerator.createCustomToken(mocks.uid, {});
    });

    it('should be fulfilled given a valid uid and valid developer claims', () => {
      return tokenGenerator.createCustomToken(mocks.uid, mocks.developerClaims);
    });

    it('should be fulfilled with a Firebase Custom JWT', () => {
      return tokenGenerator.createCustomToken(mocks.uid)
        .should.eventually.be.a('string').and.not.be.empty;
    });

    it('should be fulfilled with a JWT with the correct decoded payload', () => {
      clock = sinon.useFakeTimers(1000);

      return tokenGenerator.createCustomToken(mocks.uid)
        .then((token) => {
          const decoded = jwt.decode(token);

          expect(decoded).to.deep.equal({
            uid: mocks.uid,
            iat: 1,
            exp: ONE_HOUR_IN_SECONDS + 1,
            aud: FIREBASE_AUDIENCE,
            iss: mocks.certificateObject.client_email,
            sub: mocks.certificateObject.client_email,
          });
        });
    });

    it('should be fulfilled with a JWT with the developer claims in its decoded payload', () => {
      clock = sinon.useFakeTimers(1000);

      return tokenGenerator.createCustomToken(mocks.uid, mocks.developerClaims)
        .then((token) => {
          const decoded = jwt.decode(token);

          expect(decoded).to.deep.equal({
            uid: mocks.uid,
            iat: 1,
            exp: ONE_HOUR_IN_SECONDS + 1,
            aud: FIREBASE_AUDIENCE,
            iss: mocks.certificateObject.client_email,
            sub: mocks.certificateObject.client_email,
            claims: {
              one: 'uno',
              two: 'dos',
            },
          });
        });
    });

    it('should be fulfilled with a JWT with the correct header', () => {
      clock = sinon.useFakeTimers(1000);

      return tokenGenerator.createCustomToken(mocks.uid)
        .then((token) => {
          const decoded: any = jwt.decode(token, {
            complete: true,
          });

          expect(decoded.header).to.deep.equal({
            typ: 'JWT',
            alg: ALGORITHM,
          });
        });
    });

    it('should be fulfilled with a JWT which can be verified by the service account public key', () => {
      return tokenGenerator.createCustomToken(mocks.uid)
        .then((token) => {
          return verifyToken(token, mocks.keyPairs[0].public);
        });
    });

    it('should be fulfilled with a JWT which cannot be verified by a random public key', () => {
      return tokenGenerator.createCustomToken(mocks.uid)
        .then((token) => {
          return verifyToken(token, mocks.keyPairs[1].public)
            .should.eventually.be.rejectedWith('invalid signature');
        });
    });

    it('should be fulfilled with a JWT which expires after one hour', () => {
      clock = sinon.useFakeTimers(1000);

      let token;
      return tokenGenerator.createCustomToken(mocks.uid)
        .then((result) => {
          token = result;

          clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

          // Token should still be valid
          return verifyToken(token, mocks.keyPairs[0].public);
        })
        .then(() => {
          clock.tick(1);

          // Token should now be invalid
          return verifyToken(token, mocks.keyPairs[0].public)
            .should.eventually.be.rejectedWith('jwt expired');
        });
    });

    it('should not mutate the passed in developer claims', () => {
      const originalClaims = {
        foo: 'bar',
      };
      const clonedClaims = _.clone(originalClaims);
      return tokenGenerator.createCustomToken(mocks.uid, clonedClaims)
        .then(() => {
          expect(originalClaims).to.deep.equal(clonedClaims);
        });
    });
  });

  describe('verifySessionCookie()', () => {
    const sessionCookie = mocks.generateSessionCookie();
    const decodedSessionCookie = jwt.decode(sessionCookie);
    let stubs: sinon.SinonStub[] = [];
    let tokenVerifierConstructorStub: sinon.SinonStub;
    let sessionCookieVerifier: any;
    let idTokenVerifier: any;

    beforeEach(() => {
      // Create stub instances to be used for session cookie verifier and id token verifier.
      sessionCookieVerifier = sinon.createStubInstance(verifier.FirebaseTokenVerifier);
      idTokenVerifier = sinon.createStubInstance(verifier.FirebaseTokenVerifier);
      // Stub FirebaseTokenVerifier constructor to return stub instance above depending on
      // issuer.
      tokenVerifierConstructorStub = sinon.stub(verifier, 'FirebaseTokenVerifier')
        .callsFake((certUrl, algorithm, issuer, projectId, tokenInfo) => {
          // Return mock token verifier.
          if (issuer === 'https://session.firebase.google.com/') {
            return sessionCookieVerifier;
          } else {
            return idTokenVerifier;
          }
        });
      stubs.push(tokenVerifierConstructorStub);
    });

    after(() => {
      stubs = [];
    });

    afterEach(() => {
      // Confirm token verifiers initialized with expected arguments.
      expect(tokenVerifierConstructorStub).to.have.been.calledTwice.and.calledWith(
          'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys',
          ALGORITHM,
          'https://session.firebase.google.com/',
          'project_id',
          SESSION_COOKIE_INFO);
      expect(tokenVerifierConstructorStub).to.have.been.calledTwice.and.calledWith(
          'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
          ALGORITHM,
          'https://securetoken.google.com/',
          'project_id',
          ID_TOKEN_INFO);
      _.forEach(stubs, (stub) => stub.restore());
    });

    it('resolves when underlying sessionCookieVerifier.verifyJWT() resolves with expected result', () =>  {
      sessionCookieVerifier.verifyJWT.withArgs(sessionCookie).returns(Promise.resolve(decodedSessionCookie));

      tokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));

      return tokenGenerator.verifySessionCookie(sessionCookie)
        .then((result) => {
          expect(result).to.deep.equal(decodedSessionCookie);
        });
    });

    it('rejects when underlying sessionCookieVerifier.verifyJWT() rejects with expected error', () =>  {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT, 'Decoding Firebase session cookie failed');
      sessionCookieVerifier.verifyJWT.withArgs(sessionCookie).returns(Promise.reject(expectedError));

      tokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));

      return tokenGenerator.verifySessionCookie(sessionCookie)
        .should.eventually.be.rejectedWith('Decoding Firebase session cookie failed');
    });
  });

  describe('verifyIdToken()', () => {
    const idToken = mocks.generateIdToken();
    const decodedIdToken = jwt.decode(idToken);
    let stubs: sinon.SinonStub[] = [];
    let tokenVerifierConstructorStub: sinon.SinonStub;
    let sessionCookieVerifier: any;
    let idTokenVerifier: any;

    beforeEach(() => {
      // Create stub instances to be used for session cookie verifier and id token verifier.
      sessionCookieVerifier = sinon.createStubInstance(verifier.FirebaseTokenVerifier);
      idTokenVerifier = sinon.createStubInstance(verifier.FirebaseTokenVerifier);
      // Stub FirebaseTokenVerifier constructor to return stub instance above depending on
      // issuer.
      tokenVerifierConstructorStub = sinon.stub(verifier, 'FirebaseTokenVerifier')
        .callsFake((certUrl, algorithm, issuer, projectId, tokenInfo) => {
          // Return mock token verifier.
          if (issuer === 'https://session.firebase.google.com/') {
            return sessionCookieVerifier;
          } else {
            return idTokenVerifier;
          }
        });
      stubs.push(tokenVerifierConstructorStub);
    });

    after(() => {
      stubs = [];
    });

    afterEach(() => {
      // Confirm token verifiers initialized with expected arguments.
      expect(tokenVerifierConstructorStub).to.have.been.calledTwice.and.calledWith(
          'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys',
          ALGORITHM,
          'https://session.firebase.google.com/',
          'project_id',
          SESSION_COOKIE_INFO);
      expect(tokenVerifierConstructorStub).to.have.been.calledTwice.and.calledWith(
          'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
          ALGORITHM,
          'https://securetoken.google.com/',
          'project_id',
          ID_TOKEN_INFO);
      _.forEach(stubs, (stub) => stub.restore());
    });

    it('resolves when underlying idTokenVerifier.verifyJWT() resolves with expected result', () =>  {
      idTokenVerifier.verifyJWT.withArgs(idToken).returns(Promise.resolve(decodedIdToken));

      tokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));

      return tokenGenerator.verifyIdToken(idToken)
        .then((result) => {
          expect(result).to.deep.equal(decodedIdToken);
        });
    });

    it('rejects when underlying idTokenVerifier.verifyJWT() rejects with expected error', () =>  {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT, 'Decoding Firebase ID token failed');
      idTokenVerifier.verifyJWT.withArgs(idToken).returns(Promise.reject(expectedError));

      tokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));

      return tokenGenerator.verifyIdToken(idToken)
        .should.eventually.be.rejectedWith('Decoding Firebase ID token failed');
    });
  });
});


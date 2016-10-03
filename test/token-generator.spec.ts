'use strict';

// Use untyped import syntax for Node built-ins
import path = require('path');
import https = require('https');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as jwt from 'jsonwebtoken';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import LegacyFirebaseTokenGenerator = require('firebase-token-generator');

import * as mocks from './resources/mocks';
import {FirebaseTokenGenerator} from '../src/auth/token-generator';
import {CertCredential, Certificate} from '../src/auth/credential';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const ALGORITHM = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];


/**
 * Returns a mocked out success response from the URL containing the public keys for the Google certs.
 *
 * @return {Object} A nock response object.
 */
function mockFetchPublicKeys(): nock.Scope {
  const mockedResponse = {};
  mockedResponse[mocks.certificateObject.private_key_id] = mocks.keyPairs[0].public;
  return nock('https://www.googleapis.com')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
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
  const mockedResponse = {};
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
      error_description: 'description',
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


/**
 * Verifies a token is signed with the private key corresponding to the provided public key.
 *
 * @param {string} token The token to verify.
 * @param {Object} publicKey The public key to use to verify the token.
 * @return {Promise<Object>} A promise fulfilled with the decoded token if it is valid; otherwise, a rejected promise.
 */
function verifyToken(token, publicKey): Promise<Object> {
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
  let tokenGenerator;

  let clock;
  let httpsSpy;
  beforeEach(() => {
    tokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));
    httpsSpy = sinon.spy(https, 'get');
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
    httpsSpy.restore();
    process.env.GOOGLE_APPLICATION_CREDENTIALS = undefined;
  });

  after(() => {
    nock.restore();
  });

  describe('Constructor', () => {
    it('should throw given no service account', () => {
      expect(() => {
        // Need to overcome the type system to allow a call with no parameter
        const anyFirebaseTokenGenerator: any = FirebaseTokenGenerator;
        return new anyFirebaseTokenGenerator();
      }).to.throw('Must provide a service account to use FirebaseTokenGenerator');
    });

    const invalidCredentials = [null, NaN, 0, 1, true, false, '', 'a', [], {}, { a: 1 }, _.noop];
    invalidCredentials.forEach((invalidCredential) => {
      it('should throw given invalid Credential: ' + JSON.stringify(invalidCredential), () => {
        expect(() => {
          return new FirebaseTokenGenerator(new Certificate(invalidCredential as any));
        }).to.throw(Error);
      });
    });

    it('should throw given an object without a "private_key" field', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'private_key');
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Service account key must contain a string "private_key" field');
    });

    it('should throw given an object with an empty string "private_key" field', () => {
      let invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.private_key = '';
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Service account key must contain a string "private_key" field');
    });

    it('should throw given an object without a "client_email" field', () => {
      const invalidCertificate = _.omit(mocks.certificateObject, 'client_email');
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Service account key must contain a string "client_email" field');
    });

    it('should throw given an object without an empty string "client_email" field', () => {
      const invalidCertificate = _.clone(mocks.certificateObject);
      invalidCertificate.client_email = '';
      expect(() => {
        return new FirebaseTokenGenerator(new Certificate(invalidCertificate as any));
      }).to.throw('Service account key must contain a string "client_email" field');
    });

    it('should not throw given a valid certificate', () => {
      expect(() => {
        const pathToCertificate = path.resolve(__dirname, 'resources/mock.key.json');
        const certCredential = new CertCredential(Certificate.fromPath(pathToCertificate));
        return new FirebaseTokenGenerator(certCredential.getCertificate());
      }).not.to.throw();
    });

    it('should not throw given an object representing a service account key', () => {
      expect(() => {
        return new FirebaseTokenGenerator(mocks.certificateObject);
      }).not.to.throw();
    });
  });


  describe('createCustomToken()', () => {
    it('should throw given no uid', () => {
      expect(() => {
        tokenGenerator.createCustomToken();
      }).to.throw('First argument to createCustomToken() must be a non-empty string uid');
    });

    const invalidUids = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidUids.forEach((invalidUid) => {
      it('should throw given a non-string uid: ' + JSON.stringify(invalidUid), () => {
        expect(() => {
          tokenGenerator.createCustomToken(invalidUid);
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
      invalidDeveloperClaims.forEach((invalidDevClaims) => {
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

    it('should not throw given a valid uid and no developer claims', () => {
      expect(() => {
        tokenGenerator.createCustomToken(mocks.uid);
      }).not.to.throw();
    });

    it('should not throw given a valid uid and empty object developer claims', () => {
      expect(() => {
        tokenGenerator.createCustomToken(mocks.uid, {});
      }).not.to.throw();
    });

    it('should not throw given a valid uid and valid developer claims', () => {
      expect(() => {
        tokenGenerator.createCustomToken(mocks.uid, mocks.developerClaims);
      }).not.to.throw();
    });

    it('should return a Firebase Custom JWT', () => {
      const token = tokenGenerator.createCustomToken(mocks.uid);
      expect(token).to.be.a('string').and.to.not.be.empty;
    });

    it('should return a JWT with the correct decoded payload', () => {
      clock = sinon.useFakeTimers(1000);

      const token = tokenGenerator.createCustomToken(mocks.uid);
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

    it('should return a JWT with the developer claims in its decoded payload', () => {
      clock = sinon.useFakeTimers(1000);

      const token = tokenGenerator.createCustomToken(mocks.uid, mocks.developerClaims);
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

    it('should return a JWT with the correct header', () => {
      clock = sinon.useFakeTimers(1000);

      const token = tokenGenerator.createCustomToken(mocks.uid);
      const decoded = jwt.decode(token, {
        complete: true,
      });

      expect(decoded.header).to.deep.equal({
        typ: 'JWT',
        alg: ALGORITHM,
      });
    });

    it('should return a JWT which can be verified by the service account public key', () => {
      const token = tokenGenerator.createCustomToken(mocks.uid);
      return verifyToken(token, mocks.keyPairs[0].public);
    });

    it('should return a JWT which cannot be verified by a random public key', () => {
      const token = tokenGenerator.createCustomToken(mocks.uid);
      return verifyToken(token, mocks.keyPairs[1].public)
        .should.eventually.be.rejectedWith('invalid signature');
    });

    it('should return a JWT which expires after one hour', () => {
      clock = sinon.useFakeTimers(1000);

      const token = tokenGenerator.createCustomToken(mocks.uid);

      clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

      // Token should still be valid
      return verifyToken(token, mocks.keyPairs[0].public).then(() => {
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
      tokenGenerator.createCustomToken(mocks.uid, clonedClaims);
      expect(originalClaims).to.deep.equal(clonedClaims);
    });
  });


  describe('verifyIdToken()', () => {
    let mockedRequests = [];

    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];
    });

    it('should throw given no ID token', () => {
      expect(() => {
        tokenGenerator.verifyIdToken();
      }).to.throw('First argument to verifyIdToken() must be a Firebase ID token');
    });

    const invalidIdTokens = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidIdTokens.forEach((invalidIdToken) => {
      it('should throw given a non-string ID token: ' + JSON.stringify(invalidIdToken), () => {
        expect(() => {
          tokenGenerator.verifyIdToken(invalidIdToken);
        }).to.throw('First argument to verifyIdToken() must be a Firebase ID token');
      });
    });

    it('should throw given an empty string ID token', () => {
      return tokenGenerator.verifyIdToken('')
        .should.eventually.be.rejectedWith('Decoding Firebase ID token failed');
    });

    it('should be rejected given an invalid ID token', () => {
      return tokenGenerator.verifyIdToken('invalid-token')
        .should.eventually.be.rejectedWith('Decoding Firebase ID token failed');
    });

    it('should throw if the token generator was initialized with no project ID', () => {
      const certificateObjectWithNoProjectId = _.omit(mocks.certificateObject, 'project_id');
      const certificateWithNoProjectId = new Certificate(certificateObjectWithNoProjectId as any);
      const tokenGeneratorWithNoProjectId = new FirebaseTokenGenerator(certificateWithNoProjectId);

      const mockIdToken = mocks.generateIdToken();

      expect(() => {
        tokenGeneratorWithNoProjectId.verifyIdToken(mockIdToken);
      }).to.throw('verifyIdToken() requires a service account with "project_id" set');
    });

    it('should be rejected given an ID token with no kid', () => {
      const mockIdToken = mocks.generateIdToken({
        header: undefined,
      });
      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has no "kid" claim');
    });

    it('should be rejected given an ID token with a kid which does not match any of the actual public keys', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const mockIdToken = mocks.generateIdToken({
        header: {
          kid: 'wrongkid',
        },
      });

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has "kid" claim which does not ' +
          'correspond to a known public key');
    });

    it('should be rejected given an ID token with an incorrect algorithm', () => {
      const mockIdToken = mocks.generateIdToken({
        algorithm: 'HS256',
      });
      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect algorithm');
    });

    it('should be rejected given an ID token with an incorrect audience', () => {
      const mockIdToken = mocks.generateIdToken({
        audience: 'incorrectAudience',
      });

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect "aud" (audience) claim');
    });

    it('should be rejected given an ID token with an incorrect issuer', () => {
      const mockIdToken = mocks.generateIdToken({
        issuer: 'incorrectIssuer',
      });

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has incorrect "iss" (issuer) claim');
    });

    // TODO(jwenger): jsonwebtoken no longer allows the subject to be empty, so we need to find a
    // new way to test this
    xit('should be rejected given an ID token with an empty string subject', () => {
      const mockIdToken = mocks.generateIdToken({
        subject: '',
      });

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has an empty string "sub" (subject) claim');
    });

    // TODO(jwenger): jsonwebtoken no longer allows the subject to be a non-string, so we need to
    // find a new way to test this
    xit('should be rejected given an ID token with a non-string subject', () => {
      const mockIdToken = mocks.generateIdToken({
        subject: 100,
      });

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has no "sub" (subject) claim');
    });

    it('should be rejected given an ID token with a subject with greater than 128 characters', () => {
      mockedRequests.push(mockFetchPublicKeys());

      // uid of length 128 should be fulfilled
      let uid = Array(129).join('a');
      expect(uid).to.have.length(128);
      let mockIdToken = mocks.generateIdToken({
        subject: uid,
      });
      return tokenGenerator.verifyIdToken(mockIdToken).then(() => {
        // uid of length 129 should be rejected
        uid = Array(130).join('a');
        expect(uid).to.have.length(129);
        mockIdToken = mocks.generateIdToken({
          subject: uid,
        });

        return tokenGenerator.verifyIdToken(mockIdToken)
          .should.eventually.be.rejectedWith('Firebase ID token has "sub" (subject) claim longer than 128 characters');
      });
    });

    it('should be rejected given an expired ID token', () => {
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      clock.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

      // Token should still be valid
      return tokenGenerator.verifyIdToken(mockIdToken).then(() => {
        clock.tick(1);

        // Token should now be invalid
        return tokenGenerator.verifyIdToken(mockIdToken)
          .should.eventually.be.rejectedWith('Firebase ID token has expired');
      });
    });

    it('should be rejected given an ID token which was not signed with the kid it specifies', () => {
      mockedRequests.push(mockFetchWrongPublicKeys());

      const mockIdToken = mocks.generateIdToken();

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Firebase ID token has invalid signature');
    });

    it('should be rejected given a custom token', () => {
      const customToken = tokenGenerator.createCustomToken(mocks.uid);

      return tokenGenerator.verifyIdToken(customToken)
        .should.eventually.be.rejectedWith('verifyIdToken() expects an ID token, but was given a custom token');
    });

    it('should be rejected given a legacy custom token', () => {
      const legacyTokenGenerator = new LegacyFirebaseTokenGenerator('foo');
      const legacyCustomToken = legacyTokenGenerator.createToken({
        uid: mocks.uid,
      });

      return tokenGenerator.verifyIdToken(legacyCustomToken)
        .should.eventually.be.rejectedWith('verifyIdToken() expects an ID token, but was given a legacy custom token');
    });

    it('should be fulfilled with decoded claims given a valid ID token', () => {
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      return tokenGenerator.verifyIdToken(mockIdToken)
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

    it('should not fetch the Google cert public keys until the first time verifyIdToken() is called', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const anotherTokenGenerator = new FirebaseTokenGenerator(new Certificate(mocks.certificateObject));
      expect(https.get).not.to.have.been.called;

      const mockIdToken = mocks.generateIdToken();

      return anotherTokenGenerator.verifyIdToken(mockIdToken)
        .then(() => expect(https.get).to.have.been.calledOnce);
    });

    it('should not re-fetch the Google cert public keys every time verifyIdToken() is called', () => {
      mockedRequests.push(mockFetchPublicKeys());

      const mockIdToken = mocks.generateIdToken();

      return tokenGenerator.verifyIdToken(mockIdToken).then(() => {
        expect(https.get).to.have.been.calledOnce;
        return tokenGenerator.verifyIdToken(mockIdToken);
      }).then(() => expect(https.get).to.have.been.calledOnce);
    });

    it('should refresh the Google cert public keys after the "max-age" on the request expires', () => {
      mockedRequests.push(mockFetchPublicKeys());
      mockedRequests.push(mockFetchPublicKeys());
      mockedRequests.push(mockFetchPublicKeys());

      clock = sinon.useFakeTimers(1000);

      const mockIdToken = mocks.generateIdToken();

      return tokenGenerator.verifyIdToken(mockIdToken).then(() => {
        expect(https.get).to.have.been.calledOnce;
        clock.tick(999);
        return tokenGenerator.verifyIdToken(mockIdToken);
      }).then(() => {
        expect(https.get).to.have.been.calledOnce;
        clock.tick(1);
        return tokenGenerator.verifyIdToken(mockIdToken);
      }).then(() => {
        // One second has passed
        expect(https.get).to.have.been.calledTwice;
        clock.tick(999);
        return tokenGenerator.verifyIdToken(mockIdToken);
      }).then(() => {
        expect(https.get).to.have.been.calledTwice;
        clock.tick(1);
        return tokenGenerator.verifyIdToken(mockIdToken);
      }).then(() => {
        // Two seconds have passed
        expect(https.get).to.have.been.calledThrice;
      });
    });

    it('should be rejected if fetching the Google public keys fails', () => {
      mockedRequests.push(mockFailedFetchPublicKeys());

      const mockIdToken = mocks.generateIdToken();

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('message');
    });

    it('should be rejected if fetching the Google public keys returns a response with an error message', () => {
      mockedRequests.push(mockFetchPublicKeysWithErrorResponse());

      const mockIdToken = mocks.generateIdToken();

      return tokenGenerator.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Error fetching public keys for Google certs: message (description)');
    });
  });
});


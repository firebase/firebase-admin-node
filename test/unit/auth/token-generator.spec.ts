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
import * as nock from 'nock';

import * as mocks from '../../resources/mocks';
import {FirebaseTokenGenerator, ServiceAccountSigner, IAMSigner} from '../../../src/auth/token-generator';

import {Certificate} from '../../../src/auth/credential';
import { AuthorizedHttpClient, HttpClient } from '../../../src/utils/api-request';
import { FirebaseApp } from '../../../src/firebase-app';
import * as utils from '../utils';

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
        resolve(res as object);
      }
    });
  });
}

describe('CryptoSigner', () => {
  describe('ServiceAccountSigner', () => {
    it('should throw given no arguments', () => {
      expect(() => {
        const anyServiceAccountSigner: any = ServiceAccountSigner;
        return new anyServiceAccountSigner();
      }).to.throw('Must provide a certificate to initialize ServiceAccountSigner');
    });

    it('should not throw given a valid certificate', () => {
      expect(() => {
        return new ServiceAccountSigner(new Certificate(mocks.certificateObject));
      }).not.to.throw();
    });

    it('should sign using the private_key in the certificate', () => {
      const payload = Buffer.from('test');
      const cert = new Certificate(mocks.certificateObject);

      const crypto = require('crypto');
      const rsa = crypto.createSign('RSA-SHA256');
      rsa.update(payload);
      const result = rsa.sign(cert.privateKey, 'base64');

      const signer = new ServiceAccountSigner(cert);
      return signer.sign(payload).then((signature) => {
        expect(signature.toString('base64')).to.equal(result);
      });
    });

    it('should return the client_email from the certificate', () => {
      const cert = new Certificate(mocks.certificateObject);
      const signer = new ServiceAccountSigner(cert);
      return signer.getAccountId().should.eventually.equal(cert.clientEmail);
    });
  });

  describe('IAMSigner', () => {
    let mockApp: FirebaseApp;
    const mockAccessToken: string = utils.generateRandomAccessToken();

    before(() => {
      utils.mockFetchAccessTokenRequests(mockAccessToken);
    });

    after(() => nock.cleanAll());

    beforeEach(() => {
      mockApp = mocks.app();
      return mockApp.INTERNAL.getToken();
    });

    afterEach(() => {
      return mockApp.delete();
    });

    it('should throw given no arguments', () => {
      expect(() => {
        const anyIAMSigner: any = IAMSigner;
        return new anyIAMSigner();
      }).to.throw('Must provide a HTTP client to initialize IAMSigner');
    });

    describe('explicit service account ID', () => {
      const response = {signature: Buffer.from('testsignature').toString('base64')};
      const input = Buffer.from('input');
      const signRequest = {
        method: 'POST',
        url: `https://iam.googleapis.com/v1/projects/-/serviceAccounts/test-service-account:signBlob`,
        headers: {Authorization: `Bearer ${mockAccessToken}`},
        data: {bytesToSign: input.toString('base64')},
      };
      let stub: sinon.SinonStub;

      afterEach(() => {
        stub.restore();
      });

      it('should sign using the IAM service', () => {
        const expectedResult = utils.responseFrom(response);
        stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler, 'test-service-account');
        return signer.sign(input).then((signature) => {
          expect(signature.toString('base64')).to.equal(response.signature);
          expect(stub).to.have.been.calledOnce.and.calledWith(signRequest);
        });
      });

      it('should fail if the IAM service responds with an error', () => {
        const expectedResult = utils.errorFrom({
          error: {
            status: 'PROJECT_NOT_FOUND',
            message: 'test reason',
          },
        });
        stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler, 'test-service-account');
        return signer.sign(input).catch((err) => {
          const message = 'test reason; Please refer to ' +
            'https://firebase.google.com/docs/auth/admin/create-custom-tokens for more details on ' +
            'how to use and troubleshoot this feature.';
          expect(err.message).to.equal(message);
          expect(stub).to.have.been.calledOnce.and.calledWith(signRequest);
        });
      });

      it('should return the explicitly specified service account', () => {
        const signer = new IAMSigner(new AuthorizedHttpClient(mockApp), 'test-service-account');
        return signer.getAccountId().should.eventually.equal('test-service-account');
      });
    });

    describe('auto discovered service account', () => {
      const input = Buffer.from('input');
      const response = {signature: Buffer.from('testsignature').toString('base64')};
      const metadataRequest = {
        method: 'GET',
        url: `http://metadata/computeMetadata/v1/instance/service-accounts/default/email`,
        headers: {'Metadata-Flavor': 'Google'},
      };
      const signRequest = {
        method: 'POST',
        url: `https://iam.googleapis.com/v1/projects/-/serviceAccounts/discovered-service-account:signBlob`,
        headers: {Authorization: `Bearer ${mockAccessToken}`},
        data: {bytesToSign: input.toString('base64')},
      };
      let stub: sinon.SinonStub;

      afterEach(() => {
        stub.restore();
      });

      it('should sign using the IAM service', () => {
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).resolves(utils.responseFrom('discovered-service-account'));
        stub.onCall(1).resolves(utils.responseFrom(response));
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler);
        return signer.sign(input).then((signature) => {
          expect(signature.toString('base64')).to.equal(response.signature);
          expect(stub).to.have.been.calledTwice;
          expect(stub.getCall(0).args[0]).to.deep.equal(metadataRequest);
          expect(stub.getCall(1).args[0]).to.deep.equal(signRequest);
        });
      });

      it('should fail if the IAM service responds with an error', () => {
        const expectedResult = {
          error: {
            status: 'PROJECT_NOT_FOUND',
            message: 'test reason',
          },
        };
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).resolves(utils.responseFrom('discovered-service-account'));
        stub.onCall(1).rejects(utils.errorFrom(expectedResult));
        const requestHandler = new AuthorizedHttpClient(mockApp);
        const signer = new IAMSigner(requestHandler);
        return signer.sign(input).catch((err) => {
          const message = 'test reason; Please refer to ' +
            'https://firebase.google.com/docs/auth/admin/create-custom-tokens for more details on ' +
            'how to use and troubleshoot this feature.';
          expect(err.message).to.equal(message);
          expect(stub).to.have.been.calledTwice;
          expect(stub.getCall(0).args[0]).to.deep.equal(metadataRequest);
          expect(stub.getCall(1).args[0]).to.deep.equal(signRequest);
        });
      });

      it('should return the discovered service account', () => {
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).resolves(utils.responseFrom('discovered-service-account'));
        const signer = new IAMSigner(new AuthorizedHttpClient(mockApp));
        return signer.getAccountId().should.eventually.equal('discovered-service-account');
      });

      it('should return the expected error when failed to contact the Metadata server', () => {
        stub = sinon.stub(HttpClient.prototype, 'send');
        stub.onCall(0).rejects(utils.errorFrom('test error'));
        const signer = new IAMSigner(new AuthorizedHttpClient(mockApp));
        const expected = 'Failed to determine service account. Make sure to initialize the SDK with ' +
          'a service account credential. Alternatively specify a service account with ' +
          'iam.serviceAccounts.signBlob permission.';
        return signer.getAccountId().should.eventually.be.rejectedWith(expected);
      });
    });
  });
});

describe('FirebaseTokenGenerator', () => {
  let tokenGenerator: FirebaseTokenGenerator;

  let clock: sinon.SinonFakeTimers;
  beforeEach(() => {
    const cert = new Certificate(mocks.certificateObject);
    tokenGenerator = new FirebaseTokenGenerator(new ServiceAccountSigner(cert));
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
      clock = undefined;
    }
  });

  describe('Constructor', () => {
    it('should throw given no arguments', () => {
      expect(() => {
        // Need to overcome the type system to allow a call with no parameter
        const anyFirebaseTokenGenerator: any = FirebaseTokenGenerator;
        return new anyFirebaseTokenGenerator();
      }).to.throw('Must provide a CryptoSigner to use FirebaseTokenGenerator');
    });

    const invalidSigners: any[] = [null, NaN, 0, 1, true, false, '', 'a', [], _.noop];
    invalidSigners.forEach((invalidSigner) => {
      it('should throw given invalid signer: ' + JSON.stringify(invalidSigner), () => {
        expect(() => {
          return new FirebaseTokenGenerator(invalidSigner as any);
        }).to.throw('Must provide a CryptoSigner to use FirebaseTokenGenerator');
      });
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
      const invalidDeveloperClaims: any[] = [null, NaN, [], true, false, '', 'a', 0, 1, Infinity, _.noop];
      invalidDeveloperClaims.forEach((invalidDevClaims) => {
        expect(() => {
          tokenGenerator.createCustomToken(mocks.uid, invalidDevClaims);
        }).to.throw('Second argument to createCustomToken() must be an object containing the developer claims');
      });
    });

    BLACKLISTED_CLAIMS.forEach((blacklistedClaim) => {
      it('should throw given a developer claims object with a blacklisted claim: ' + blacklistedClaim, () => {
        const blacklistedDeveloperClaims: {[key: string]: any} = _.clone(mocks.developerClaims);
        blacklistedDeveloperClaims[blacklistedClaim] = true;
        expect(() => {
          tokenGenerator.createCustomToken(mocks.uid, blacklistedDeveloperClaims);
        }).to.throw('Developer claim "' + blacklistedClaim + '" is reserved and cannot be specified');
      });
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
            alg: ALGORITHM,
            typ: 'JWT',
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

      let token: string;
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
});

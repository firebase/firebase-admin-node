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

import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import {
  BLACKLISTED_CLAIMS, FirebaseTokenGenerator, EmulatedSigner, handleCryptoSignerError
} from '../../../src/auth/token-generator';
import { CryptoSignerError, CryptoSignerErrorCode, ServiceAccountSigner } from '../../../src/utils/crypto-signer';

import { ServiceAccountCredential } from '../../../src/credential/credential-internal';
import { FirebaseAuthError } from '../../../src/utils/error';
import * as utils from '../utils';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const ALGORITHM = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

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

describe('FirebaseTokenGenerator', () => {
  const tenantId = 'tenantId1';
  const cert = new ServiceAccountCredential(mocks.certificateObject);

  let clock: sinon.SinonFakeTimers | undefined;
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

    const invalidTenantIds = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidTenantIds.forEach((invalidTenantId) => {
      it('should throw given a non-string tenantId', () => {
        expect(() => {
          return new FirebaseTokenGenerator(new ServiceAccountSigner(cert), invalidTenantId as any);
        }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
      });
    });

    it('should throw given an empty string tenantId', () => {
      expect(() => {
        return new FirebaseTokenGenerator(new ServiceAccountSigner(cert), '');
      }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
    });
  });

  const tokenGeneratorConfigs = [{
    name: 'createCustomToken()',
    tokenGenerator: new FirebaseTokenGenerator(new ServiceAccountSigner(cert)),
  }, {
    name: 'createCustomToken() (tenant-aware)',
    tokenGenerator: new FirebaseTokenGenerator(new ServiceAccountSigner(cert), tenantId),
  }];

  describe('Emulator', () => {
    const signer = new EmulatedSigner();
    const tokenGenerator = new FirebaseTokenGenerator(signer);

    it('should generate a valid unsigned token', async () => {
      const uid = 'uid123';
      const claims = { foo: 'bar' };
      const token = await tokenGenerator.createCustomToken(uid, claims);

      // Check that verify doesn't throw
      // Note: the types for jsonwebtoken are wrong so we have to disguise the 'null'
      jwt.verify(token, '', { algorithms: ['none'] });

      // Decode and check all three segments
      const { header, payload, signature } = jwt.decode(token, { complete: true }) as { [key: string]: any };
      expect(header).to.deep.equal({ alg: 'none', typ: 'JWT' });
      expect(payload['uid']).to.equal(uid);
      expect(payload['claims']).to.deep.equal(claims);
      expect(signature).to.equal('');
    });

  });

  tokenGeneratorConfigs.forEach((tokenGeneratorConfig) => {
    describe(tokenGeneratorConfig.name, () => {
      const tokenGenerator = tokenGeneratorConfig.tokenGenerator;

      it('should throw given no uid', () => {
        expect(() => {
          (tokenGenerator as any).createCustomToken();
        }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
      });

      const invalidUids = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
      invalidUids.forEach((invalidUid) => {
        it('should throw given a non-string uid: ' + JSON.stringify(invalidUid), () => {
          expect(() => {
            tokenGenerator.createCustomToken(invalidUid as any);
          }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
        });
      });

      it('should throw given an empty string uid', () => {
        expect(() => {
          tokenGenerator.createCustomToken('');
        }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
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
        }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
      });

      it('should throw given a non-object developer claims', () => {
        const invalidDeveloperClaims: any[] = [null, NaN, [], true, false, '', 'a', 0, 1, Infinity, _.noop];
        invalidDeveloperClaims.forEach((invalidDevClaims) => {
          expect(() => {
            tokenGenerator.createCustomToken(mocks.uid, invalidDevClaims);
          }).to.throw(FirebaseAuthError).with.property('code', 'auth/argument-error');
        });
      });

      BLACKLISTED_CLAIMS.forEach((blacklistedClaim) => {
        it('should throw given a developer claims object with a blacklisted claim: ' + blacklistedClaim, () => {
          const blacklistedDeveloperClaims: { [key: string]: any } = _.clone(mocks.developerClaims);
          blacklistedDeveloperClaims[blacklistedClaim] = true;
          expect(() => {
            tokenGenerator.createCustomToken(mocks.uid, blacklistedDeveloperClaims);
          }).to.throw(FirebaseAuthError, blacklistedClaim).with.property('code', 'auth/argument-error');
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
            const expected: { [key: string]: any } = {
              uid: mocks.uid,
              iat: 1,
              exp: ONE_HOUR_IN_SECONDS + 1,
              aud: FIREBASE_AUDIENCE,
              iss: mocks.certificateObject.client_email,
              sub: mocks.certificateObject.client_email,
            };

            if (tokenGenerator.tenantId) {
              // eslint-disable-next-line @typescript-eslint/camelcase
              expected.tenant_id = tokenGenerator.tenantId;
            }

            expect(decoded).to.deep.equal(expected);
          });
      });

      it('should be fulfilled with a JWT with the developer claims in its decoded payload', () => {
        clock = sinon.useFakeTimers(1000);

        return tokenGenerator.createCustomToken(mocks.uid, mocks.developerClaims)
          .then((token) => {
            const decoded = jwt.decode(token);

            const expected: { [key: string]: any } = {
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
            };

            if (tokenGenerator.tenantId) {
              // eslint-disable-next-line @typescript-eslint/camelcase
              expected.tenant_id = tokenGenerator.tenantId;
            }

            expect(decoded).to.deep.equal(expected);
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

            clock!.tick((ONE_HOUR_IN_SECONDS * 1000) - 1);

            // Token should still be valid
            return verifyToken(token, mocks.keyPairs[0].public);
          })
          .then(() => {
            clock!.tick(1);

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

  describe('handleCryptoSignerError', () => {
    it('should convert CryptoSignerError to FirebaseAuthError', () => {
      const cryptoError = new CryptoSignerError({
        code: CryptoSignerErrorCode.INVALID_ARGUMENT,
        message: 'test error.',
      });
      const authError = handleCryptoSignerError(cryptoError);
      expect(authError).to.be.an.instanceof(FirebaseAuthError);
      expect(authError).to.have.property('code', 'auth/argument-error');
      expect(authError).to.have.property('message', 'test error.');
    });

    it('should convert CryptoSignerError HttpError to FirebaseAuthError', () => {
      const cryptoError = new CryptoSignerError({
        code: CryptoSignerErrorCode.SERVER_ERROR,
        message: 'test error.',
        cause: utils.errorFrom({
          error: {
            message: 'server error.',
          },
        })
      });
      const authError = handleCryptoSignerError(cryptoError);
      expect(authError).to.be.an.instanceof(FirebaseAuthError);
      expect(authError).to.have.property('code', 'auth/internal-error');
      expect(authError).to.have.property('message', 'server error.; Please refer to https://firebase.google.com/docs/auth/admin/create-custom-tokens for more details on how to use and troubleshoot this feature. Raw server response: "{"error":{"message":"server error."}}"');
    });

    it('should convert CryptoSignerError HttpError with no errorcode to FirebaseAuthError', () => {
      const cryptoError = new CryptoSignerError({
        code: CryptoSignerErrorCode.SERVER_ERROR,
        message: 'test error.',
        cause: utils.errorFrom('server error.')
      });
      const authError = handleCryptoSignerError(cryptoError);
      expect(authError).to.be.an.instanceof(FirebaseAuthError);
      expect(authError).to.have.property('code', 'auth/internal-error');
      expect(authError).to.have.property('message',
        'Error returned from server: null. Additionally, an internal error occurred ' +
        'while attempting to extract the errorcode from the error.');
    });
  });
});

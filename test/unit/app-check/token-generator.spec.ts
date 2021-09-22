/*!
 * @license
 * Copyright 2021 Google Inc.
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
  appCheckErrorFromCryptoSignerError,
  AppCheckTokenGenerator
} from '../../../src/app-check/token-generator';
import {
  CryptoSignerError, CryptoSignerErrorCode, ServiceAccountSigner
} from '../../../src/utils/crypto-signer';
import { ServiceAccountCredential } from '../../../src/credential/credential-internal';
import { FirebaseAppCheckError } from '../../../src/app-check/app-check-api-client-internal';
import * as utils from '../utils';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const ALGORITHM = 'RS256';
const FIVE_MIN_IN_SECONDS = 60 * 5;
const FIREBASE_APP_CHECK_AUDIENCE = 'https://firebaseappcheck.googleapis.com/google.firebase.appcheck.v1beta.TokenExchangeService';

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

describe('AppCheckTokenGenerator', () => {
  const cert = new ServiceAccountCredential(mocks.certificateObject);
  const APP_ID = 'test-app-id';

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
        const anyFirebaseAppCheckTokenGenerator: any = AppCheckTokenGenerator;
        return new anyFirebaseAppCheckTokenGenerator();
      }).to.throw('Must provide a CryptoSigner to use AppCheckTokenGenerator');
    });
  });

  const invalidSigners: any[] = [null, NaN, 0, 1, true, false, '', 'a', [], _.noop];
  invalidSigners.forEach((invalidSigner) => {
    it('should throw given invalid signer: ' + JSON.stringify(invalidSigner), () => {
      expect(() => {
        return new AppCheckTokenGenerator(invalidSigner as any);
      }).to.throw('Must provide a CryptoSigner to use AppCheckTokenGenerator');
    });
  });

  describe('createCustomToken()', () => {
    const tokenGenerator = new AppCheckTokenGenerator(new ServiceAccountSigner(cert));

    it('should throw given no appId', () => {
      expect(() => {
        (tokenGenerator as any).createCustomToken();
      }).to.throw(FirebaseAppCheckError).with.property('code', 'app-check/invalid-argument');
    });

    const invalidAppIds = [null, NaN, 0, 1, true, false, [], {}, { a: 1 }, _.noop];
    invalidAppIds.forEach((invalidAppId) => {
      it('should throw given a non-string appId: ' + JSON.stringify(invalidAppId), () => {
        expect(() => {
          tokenGenerator.createCustomToken(invalidAppId as any);
        }).to.throw(FirebaseAppCheckError).with.property('code', 'app-check/invalid-argument');
      });
    });

    it('should throw given an empty string appId', () => {
      expect(() => {
        tokenGenerator.createCustomToken('');
      }).to.throw(FirebaseAppCheckError).with.property('code', 'app-check/invalid-argument');
    });

    const invalidOptions = [null, NaN, 0, 1, true, false, [], _.noop];
    invalidOptions.forEach((invalidOption) => {
      it('should throw given an invalid options: ' + JSON.stringify(invalidOption), () => {
        expect(() => {
          tokenGenerator.createCustomToken(APP_ID, invalidOption as any);
        }).to.throw(FirebaseAppCheckError).with.property('message', 'AppCheckTokenOptions must be a non-null object.');
      });
    });

    const invalidTtls = [null, NaN, '0', 'abc', '', true, false, [], {}, { a: 1 }, _.noop];
    invalidTtls.forEach((invalidTtl) => {
      it('should throw given an options object with invalid ttl: ' + JSON.stringify(invalidTtl), () => {
        expect(() => {
          tokenGenerator.createCustomToken(APP_ID, { ttlMillis: invalidTtl as any });
        }).to.throw(FirebaseAppCheckError).with.property('message',
          'ttlMillis must be a duration in milliseconds.');
      });
    });

    const THIRTY_MIN_IN_MS = 1800000;
    const SEVEN_DAYS_IN_MS = 604800000;
    [-100, -1, 0, 10, THIRTY_MIN_IN_MS - 1, SEVEN_DAYS_IN_MS + 1, SEVEN_DAYS_IN_MS * 2].forEach((ttlMillis) => {
      it('should throw given options with ttl < 30 minutes or ttl > 7 days:' + JSON.stringify(ttlMillis), () => {
        expect(() => {
          tokenGenerator.createCustomToken(APP_ID, { ttlMillis });
        }).to.throw(FirebaseAppCheckError).with.property(
          'message', 'ttlMillis must be a duration in milliseconds between 30 minutes and 7 days (inclusive).');
      });
    });

    it('should be fulfilled with a Firebase Custom JWT with only an APP ID', () => {
      return tokenGenerator.createCustomToken(APP_ID)
        .should.eventually.be.a('string').and.not.be.empty;
    });

    [
      [THIRTY_MIN_IN_MS, '1800s'],
      [THIRTY_MIN_IN_MS + 1, '1800.001000000s'],
      [SEVEN_DAYS_IN_MS / 2, '302400s'],
      [SEVEN_DAYS_IN_MS - 1, '604799.999000000s'],
      [SEVEN_DAYS_IN_MS, '604800s']
    ].forEach((ttl) => {
      it('should be fulfilled with a Firebase Custom JWT with a valid custom ttl' + JSON.stringify(ttl[0]), () => {
        return tokenGenerator.createCustomToken(APP_ID, { ttlMillis: ttl[0] as number })
          .then((token) => {
            const decoded = jwt.decode(token) as { [key: string]: any };

            expect(decoded['ttl']).to.equal(ttl[1]);
          });
      });
    });

    it('should be fulfilled with a JWT with the correct decoded payload', () => {
      clock = sinon.useFakeTimers(1000);

      return tokenGenerator.createCustomToken(APP_ID)
        .then((token) => {
          const decoded = jwt.decode(token);
          const expected: { [key: string]: any } = {
            // eslint-disable-next-line @typescript-eslint/camelcase
            app_id: APP_ID,
            iat: 1,
            exp: FIVE_MIN_IN_SECONDS + 1,
            aud: FIREBASE_APP_CHECK_AUDIENCE,
            iss: mocks.certificateObject.client_email,
            sub: mocks.certificateObject.client_email,
          };

          expect(decoded).to.deep.equal(expected);
        });
    });

    [{}, { ttlMillis: undefined }, { a: 123 }].forEach((options) => {
      it('should be fulfilled with no ttl in the decoded payload when ttl is not provided in options', () => {
        clock = sinon.useFakeTimers(1000);

        return tokenGenerator.createCustomToken(APP_ID, options)
          .then((token) => {
            const decoded = jwt.decode(token);
            const expected: { [key: string]: any } = {
              // eslint-disable-next-line @typescript-eslint/camelcase
              app_id: APP_ID,
              iat: 1,
              exp: FIVE_MIN_IN_SECONDS + 1,
              aud: FIREBASE_APP_CHECK_AUDIENCE,
              iss: mocks.certificateObject.client_email,
              sub: mocks.certificateObject.client_email,
            };

            expect(decoded).to.deep.equal(expected);
          });
      });
    });

    [
      [1800000.000001, '1800.000000001s'],
      [1800000.001, '1800.000000999s'],
      [172800000, '172800s'],
      [604799999, '604799.999000000s'],
      [604800000, '604800s']
    ].forEach((ttl) => {
      it('should be fulfilled with a JWT with custom ttl in decoded payload', () => {
        clock = sinon.useFakeTimers(1000);

        return tokenGenerator.createCustomToken(APP_ID, { ttlMillis: ttl[0] as number })
          .then((token) => {
            const decoded = jwt.decode(token);
            const expected: { [key: string]: any } = {
              // eslint-disable-next-line @typescript-eslint/camelcase
              app_id: APP_ID,
              iat: 1,
              exp: FIVE_MIN_IN_SECONDS + 1,
              aud: FIREBASE_APP_CHECK_AUDIENCE,
              iss: mocks.certificateObject.client_email,
              sub: mocks.certificateObject.client_email,
              ttl: ttl[1],
            };

            expect(decoded).to.deep.equal(expected);
          });
      });
    });

    it('should be fulfilled with a JWT with the correct header', () => {
      clock = sinon.useFakeTimers(1000);

      return tokenGenerator.createCustomToken(APP_ID)
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
      return tokenGenerator.createCustomToken(APP_ID)
        .then((token) => {
          return verifyToken(token, mocks.keyPairs[0].public);
        });
    });

    it('should be fulfilled with a JWT which cannot be verified by a random public key', () => {
      return tokenGenerator.createCustomToken(APP_ID)
        .then((token) => {
          return verifyToken(token, mocks.keyPairs[1].public)
            .should.eventually.be.rejectedWith('invalid signature');
        });
    });

    it('should be fulfilled with a JWT which expires after five minutes', () => {
      clock = sinon.useFakeTimers(1000);

      let token: string;
      return tokenGenerator.createCustomToken(APP_ID)
        .then((result) => {
          token = result;

          clock!.tick((FIVE_MIN_IN_SECONDS * 1000) - 1);

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

    describe('appCheckErrorFromCryptoSignerError', () => {
      it('should convert CryptoSignerError to FirebaseAppCheckError', () => {
        const cryptoError = new CryptoSignerError({
          code: CryptoSignerErrorCode.INVALID_ARGUMENT,
          message: 'test error.',
        });
        const appCheckError = appCheckErrorFromCryptoSignerError(cryptoError);
        expect(appCheckError).to.be.an.instanceof(FirebaseAppCheckError);
        expect(appCheckError).to.have.property('code', 'app-check/invalid-argument');
        expect(appCheckError).to.have.property('message', 'test error.');
      });

      it('should convert CryptoSignerError HttpError to FirebaseAppCheckError', () => {
        const cryptoError = new CryptoSignerError({
          code: CryptoSignerErrorCode.SERVER_ERROR,
          message: 'test error.',
          cause: utils.errorFrom({
            error: {
              message: 'server error.',
            },
          })
        });
        const appCheckError = appCheckErrorFromCryptoSignerError(cryptoError);
        expect(appCheckError).to.be.an.instanceof(FirebaseAppCheckError);
        expect(appCheckError).to.have.property('code', 'app-check/unknown-error');
        expect(appCheckError).to.have.property('message',
          'Error returned from server while signing a custom token: server error.');
      });

      it('should convert CryptoSignerError HttpError with no error.message to FirebaseAppCheckError', () => {
        const cryptoError = new CryptoSignerError({
          code: CryptoSignerErrorCode.SERVER_ERROR,
          message: 'test error.',
          cause: utils.errorFrom({
            error: {},
          })
        });
        const appCheckError = appCheckErrorFromCryptoSignerError(cryptoError);
        expect(appCheckError).to.be.an.instanceof(FirebaseAppCheckError);
        expect(appCheckError).to.have.property('code', 'app-check/unknown-error');
        expect(appCheckError).to.have.property('message',
          'Error returned from server while signing a custom token: '+
          '{"status":500,"headers":{},"data":{"error":{}},"text":"{\\"error\\":{}}"}');
      });

      it('should convert CryptoSignerError HttpError with no errorcode to FirebaseAppCheckError', () => {
        const cryptoError = new CryptoSignerError({
          code: CryptoSignerErrorCode.SERVER_ERROR,
          message: 'test error.',
          cause: utils.errorFrom('server error.')
        });
        const appCheckError = appCheckErrorFromCryptoSignerError(cryptoError);
        expect(appCheckError).to.be.an.instanceof(FirebaseAppCheckError);
        expect(appCheckError).to.have.property('code', 'app-check/internal-error');
        expect(appCheckError).to.have.property('message',
          'Error returned from server: null.');
      });
    });
  });
});

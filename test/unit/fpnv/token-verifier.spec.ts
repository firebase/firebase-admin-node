/*!
 * @license
 * Copyright 2025 Google LLC
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

import { App } from '../../../src/app/index';
import * as jwt from '../../../src/utils/jwt';
import * as util from '../../../src/utils/index';
import { FirebasePhoneNumberTokenVerifier } from '../../../src/fpnv/token-verifier';
import { FirebasePhoneNumberTokenInfo, FPNV_ERROR_CODE_MAPPING } from '../../../src/fpnv/fpnv-api-client-internal';
import * as mocks from '../../resources/mocks';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('FirebasePhoneNumberTokenVerifier', () => {
  let verifier: FirebasePhoneNumberTokenVerifier;
  let mockApp: App;

  let findProjectIdStub: sinon.SinonStub;
  let decodeJwtStub: sinon.SinonStub;
  let signatureVerifierStub: { verify: sinon.SinonStub };
  let withJwksUrlStub: sinon.SinonStub;

  const MOCK_CERT_URL = 'https://fpnv.googleapis.com/v1-beta/jwks';
  const MOCK_ISSUER = 'https://fpnv.googleapis.com/projects/';
  const MOCK_PROJECT_NUMBER = '123456789012';
  const MOCK_PROJECT_ID = 'fpnv-team-test';
  const MOCK_FPNV_PREFIX = 'fpnv';


  const MOCK_TOKEN_INFO: FirebasePhoneNumberTokenInfo = {
    url: 'https://firebase.google.com/docs/phone-number-verification',
    verifyApiName: 'verifyToken()',
    jwtName: 'Firebase Phone Verification token',
    shortName: 'FPNV token',
    typ: 'JWT',
  };

  const VALID_HEADER = {
    kid: 'mock-key-id',
    alg: 'ES256',
    typ: 'JWT', // Matches MOCK_TOKEN_INFO.typ
  };

  const VALID_PAYLOAD = {
    iss: MOCK_ISSUER + MOCK_PROJECT_NUMBER,
    aud: [MOCK_ISSUER + MOCK_PROJECT_NUMBER, MOCK_ISSUER + MOCK_PROJECT_ID],
    sub: '+15555550100',
    exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    iat: Math.floor(Date.now() / 1000),        // Issued now
  };

  beforeEach(() => {
    mockApp = mocks.app();
    findProjectIdStub = sinon.stub(util, 'findProjectId').resolves(MOCK_PROJECT_ID);
    decodeJwtStub = sinon.stub(jwt, 'decodeJwt');
    signatureVerifierStub = { verify: sinon.stub().resolves() };
    withJwksUrlStub = sinon.stub(jwt.PublicKeySignatureVerifier, 'withJwksUrl')
      .returns(signatureVerifierStub as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  /**
   * Helper to instantiate the verifier with default valid args
   */
  function createVerifier(overrides: Partial<any> = {}): FirebasePhoneNumberTokenVerifier {
    return new FirebasePhoneNumberTokenVerifier(
      overrides.clientCertUrl || MOCK_CERT_URL,
      overrides.issuer || MOCK_ISSUER,
      overrides.tokenInfo || MOCK_TOKEN_INFO,
      mockApp
    );
  }

  describe('Constructor', () => {
    it('should instantiate successfully with valid arguments', () => {
      const v = createVerifier();
      expect(v).to.be.instanceOf(FirebasePhoneNumberTokenVerifier);
      expect(withJwksUrlStub.calledOnce).to.be.true;
    });

    it('should throw if clientCertUrl is invalid', () => {
      expect(() => createVerifier({ clientCertUrl: 'not-a-url' }))
        .to.throw('invalid URL');
    });

    it('should throw if issuer is invalid', () => {
      expect(() => createVerifier({ issuer: 'not-a-url' }))
        .to.throw('invalid URL');
    });

    it('should throw if tokenInfo is missing required fields', () => {
      const invalidInfo = { ...MOCK_TOKEN_INFO, verifyApiName: '' };
      expect(() => createVerifier({ tokenInfo: invalidInfo }))
        .to.throw('verify API name must be a non-empty string');
    });
  });

  describe('verifyJWT()', () => {
    beforeEach(() => {
      verifier = createVerifier();
    });

    it('should throw if jwtToken is not a string', async () => {
      await expect(verifier.verifyJWT(123 as any))
        .to.be.rejectedWith('First argument to verifyToken() must be a string.');
    });

    it('should throw if project ID cannot be determined', async () => {
      findProjectIdStub.resolves(null);
      await expect(verifier.verifyJWT('token'))
        .to.be.rejectedWith('Must initialize app with a cert credential or set your' +
          ' Firebase project ID as the GOOGLE_CLOUD_PROJECT environment variable to call verifyToken().');
    });

    describe('Token Decoding', () => {
      it('should throw if decodeJwt fails with invalid argument', async () => {
        const err = new Error('Invalid token');
        (err as any).code = jwt.JwtErrorCode.INVALID_ARGUMENT;
        decodeJwtStub.rejects(err);

        await expect(verifier.verifyJWT('bad-token'))
          .to.be.rejectedWith(/Decoding Firebase Phone Verification token failed/);
      });

      it('should rethrow unknown errors from decodeJwt', async () => {
        decodeJwtStub.rejects(new Error('Unknown error'));
        await expect(verifier.verifyJWT('token'))
          .to.be.rejectedWith('Unknown error');
      });
    });

    describe('Content Verification', () => {
      // Helper to setup a successful decode
      const setupDecode = (headerOverrides = {}, payloadOverrides = {}): void => {
        decodeJwtStub.resolves({
          header: { ...VALID_HEADER, ...headerOverrides },
          payload: { ...VALID_PAYLOAD, ...payloadOverrides },
        });
      };

      it('should throw if "kid" is missing', async () => {
        setupDecode({ kid: undefined });
        await expect(verifier.verifyJWT('token')).to.be.rejectedWith('has no "kid" claim');
      });

      it('should throw if algorithm is not ES256', async () => {
        setupDecode({ alg: 'RS256' });
        await expect(verifier.verifyJWT('token')).to.be.rejectedWith('incorrect algorithm');
      });

      it('should throw if "typ" is incorrect', async () => {
        setupDecode({ typ: 'WRONG' });
        await expect(verifier.verifyJWT('token')).to.be.rejectedWith('incorrect typ');
      });

      it('should throw if "aud" does not contain issuer+projectId', async () => {
        setupDecode({}, { aud: ['wrong-audience'] });
        await expect(verifier.verifyJWT('token')).to.be.rejectedWith('incorrect "aud"');
      });

      it('should throw if "sub" is missing', async () => {
        setupDecode({}, { sub: undefined });
        await expect(verifier.verifyJWT('token')).to.be.rejectedWith('no "sub"');
      });

      it('should throw if "sub" is empty', async () => {
        setupDecode({}, { sub: '' });
        await expect(verifier.verifyJWT('token')).to.be.rejectedWith('empty "sub"');
      });
    });

    describe('Signature Verification', () => {
      beforeEach(() => {
        // Assume decoding passes for these tests
        decodeJwtStub.resolves({ header: VALID_HEADER, payload: VALID_PAYLOAD });
      });

      it('should call signatureVerifier.verify with the token', async () => {
        const token = 'valid.jwt.string';
        await verifier.verifyJWT(token);
        expect(signatureVerifierStub.verify.calledWith(token)).to.be.true;
      });

      it('should throw EXPIRED_TOKEN if signature verifier throws TOKEN_EXPIRED', async () => {
        const error = new Error('Expired');
        (error as any).code = jwt.JwtErrorCode.TOKEN_EXPIRED;
        signatureVerifierStub.verify.rejects(error);

        await expect(verifier.verifyJWT('token'))
          .to.be.rejectedWith(/has expired/)
          .and.eventually.have.property('code', `${MOCK_FPNV_PREFIX}/${FPNV_ERROR_CODE_MAPPING.EXPIRED_TOKEN}`);
      });

      it('should throw INVALID_ARGUMENT if signature verifier throws INVALID_SIGNATURE', async () => {
        const error = new Error('Bad Sig');
        (error as any).code = jwt.JwtErrorCode.INVALID_SIGNATURE;
        signatureVerifierStub.verify.rejects(error);

        await expect(verifier.verifyJWT('token'))
          .to.be.rejectedWith(/invalid signature/)
          .and.eventually.have.property('code',`${MOCK_FPNV_PREFIX}/${FPNV_ERROR_CODE_MAPPING.INVALID_ARGUMENT}`);
      });

      it('should throw INVALID_ARGUMENT if signature verifier throws NO_MATCHING_KID', async () => {
        const error = new Error('No Key');
        (error as any).code = jwt.JwtErrorCode.NO_MATCHING_KID;
        signatureVerifierStub.verify.rejects(error);

        await expect(verifier.verifyJWT('token'))
          .to.be.rejectedWith(/does not correspond to a known public key/)
          .and.eventually.have.property('code',`${MOCK_FPNV_PREFIX}/${FPNV_ERROR_CODE_MAPPING.INVALID_ARGUMENT}`);
      });
    });

    describe('Success', () => {
      it('should return the token with getPhoneNumber() method appended', async () => {
        decodeJwtStub.resolves({ header: VALID_HEADER, payload: VALID_PAYLOAD });
        signatureVerifierStub.verify.resolves();

        const result = await verifier.verifyJWT('valid-token');

        // Check data integrity
        expect(result.sub).to.equal(VALID_PAYLOAD.sub);
        expect(result.aud).to.deep.equal(VALID_PAYLOAD.aud);

        // Check the dynamic method addition
        expect(result).to.have.property('getPhoneNumber');
        expect(result.getPhoneNumber()).to.equal(VALID_PAYLOAD.sub);
      });
    });
  });
});

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

import { expect } from 'chai';
import * as sinon from 'sinon';

import { App } from '../../../src/app/index';
import * as mocks from '../../resources/mocks';
import { PhoneNumberVerification } from '../../../src/phone-number-verification/phone-number-verification';
import { PhoneNumberTokenVerifier } from '../../../src/phone-number-verification/token-verifier';
import { PhoneNumberVerificationToken } from '../../../src/phone-number-verification/phone-number-verification-api';

describe('PhoneNumberVerification Service', () => {
  let phoneNumberVerificationService: PhoneNumberVerification;
  let mockApp: App;
  let verifyJwtStub: sinon.SinonStub;

  beforeEach(() => {
    mockApp = mocks.app();
    verifyJwtStub = sinon.stub(PhoneNumberTokenVerifier.prototype, 'verifyJWT');

    phoneNumberVerificationService = new PhoneNumberVerification(mockApp);
  });

  afterEach(() => {

    sinon.restore();
  });

  describe('Constructor', () => {
    it('should be an instance of PhoneNumberVerification', () => {
      expect(phoneNumberVerificationService).to.be.instanceOf(PhoneNumberVerification);
    });
  });

  describe('get app()', () => {
    it('should return the app instance provided in the constructor', () => {
      expect(phoneNumberVerificationService.app).to.equal(mockApp);
    });
  });

  describe('verifyToken()', () => {
    const mockTokenString = 'eyJh...mock.jwt...token';
    const mockDecodedToken: PhoneNumberVerificationToken = {
      iss: 'https://fpnv.googleapis.com/projects/1234567890',
      aud: ['1234567890', 'my-project-id'],
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      iat: Math.floor(Date.now() / 1000),        // Issued now
      sub: '+15555550100',                       // Phone number
      jti: 'unique-token-id-123',
      nonce: 'random-nonce-string',
      phoneNumber: '+15555550100',
    };

    it('should call the internal verifier with the provided JWT string', async () => {
      verifyJwtStub.resolves(mockDecodedToken);

      await phoneNumberVerificationService.verifyToken(mockTokenString);

      expect(verifyJwtStub.calledOnce).to.be.true;
      expect(verifyJwtStub.calledWith(mockTokenString)).to.be.true;
    });

    it('should return the decoded token object on success', async () => {
      verifyJwtStub.resolves(mockDecodedToken);

      const result = await phoneNumberVerificationService.verifyToken(mockTokenString);

      expect(result).to.equal(mockDecodedToken);
    });

    it('should bubble up errors if the verifier fails', async () => {
      const mockError = new Error('Token expired');
      verifyJwtStub.rejects(mockError);

      try {
        await phoneNumberVerificationService.verifyToken(mockTokenString);
        // If we reach here, the test failed
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(mockError);
      }
    });
  });

});

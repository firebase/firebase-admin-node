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
import {
  FirebaseFpnvError,
  CLIENT_CERT_URL,
  PN_TOKEN_INFO,
  FPNV_ERROR_CODE_MAPPING
} from '../../../src/fpnv/fpnv-api-client-internal';
import { PrefixedFirebaseError, FirebaseError } from '../../../src/utils/error';

const FPNV_PREFIX = 'fpnv';

describe('FPNV Constants and Error Class', () => {

  describe('Constants Integrity', () => {
    it('should have the correct CLIENT_CERT_URL', () => {
      expect(CLIENT_CERT_URL).to.equal('https://fpnv.googleapis.com/v1beta/jwks');
    });

    it('should have the correct structure and values for PN_TOKEN_INFO', () => {
      expect(PN_TOKEN_INFO).to.be.an('object');
      expect(PN_TOKEN_INFO).to.have.all.keys('url', 'verifyApiName', 'jwtName', 'shortName', 'typ');
      expect(PN_TOKEN_INFO.shortName).to.equal('FPNV token');
      expect(PN_TOKEN_INFO.typ).to.equal('JWT');
    });

    it('should have the correct structure and values for FPNV_ERROR_CODE_MAPPING', () => {
      expect(FPNV_ERROR_CODE_MAPPING).to.be.an('object');
      expect(FPNV_ERROR_CODE_MAPPING).to.deep.equal({
        INVALID_ARGUMENT: 'invalid-argument',
        INVALID_TOKEN: 'invalid-token',
        EXPIRED_TOKEN: 'expired-token',
      });
    });
  });

  describe('FirebaseFpnvError', () => {
    const testCode = FPNV_ERROR_CODE_MAPPING.INVALID_TOKEN;
    const testMessage = 'The provided token is malformed or invalid.';

    it('should correctly extend PrefixedFirebaseError', () => {
      const error = new FirebaseFpnvError(testCode, testMessage);

      expect(error).to.be.an.instanceOf(FirebaseFpnvError);
      expect(error).to.be.an.instanceOf(PrefixedFirebaseError);
      expect(error).to.be.an.instanceOf(FirebaseError);
      expect(error).to.be.an.instanceOf(Error);
    });


    it('should have the correct error properties on the instance', () => {
      const error = new FirebaseFpnvError(testCode, testMessage);

      expect(error.code).to.equal(`${FPNV_PREFIX}/${testCode}`);
      expect(error.message).to.equal(testMessage);
    });

    it('should handle all defined error codes', () => {
      const codes = Object.values(FPNV_ERROR_CODE_MAPPING);

      codes.forEach(code => {
        const error = new FirebaseFpnvError(code, `Test message for ${code}`);
        expect(error.code).to.equal(`${FPNV_PREFIX}/${code}`);
      });
    });
  });
});

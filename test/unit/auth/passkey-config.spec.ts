/*!
 * Copyright 2023 Google Inc.
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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
  PasskeyConfig, PasskeyConfigRequest, PasskeyConfigServerResponse, PasskeyConfigClientRequest
} from '../../../src/auth/passkey-config';
import { deepCopy } from '../../../src/utils/deep-copy';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('PasskeyConfig', () => {
  const serverResponse: PasskeyConfigServerResponse = {
    name: 'projects/project-id/passkeyConfig',
    rpId: 'project-id.firebaseapp.com',
    expectedOrigins: ['app1', 'example.com'],
  };
  const passkeyConfigRequest: PasskeyConfigRequest = {
    rpId: 'project-id.firebaseapp.com',
    expectedOrigins: ['app1', 'example.com'],
  };
  describe('buildServerRequest', () => {
    describe('for a create request', () => {
      it('should create a client request with valid params', () => {
        const expectedRequest: PasskeyConfigClientRequest = {
          rpId: passkeyConfigRequest.rpId,
          expectedOrigins: passkeyConfigRequest.expectedOrigins,
        };
        expect(PasskeyConfig.buildServerRequest(true, passkeyConfigRequest)).to.deep.equal(expectedRequest);
      });

      const invalidRpId = [null, NaN, 0, 1, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidRpId.forEach((rpId) => {
        it(`should throw on invalid rpId ${rpId}`, () => {
          const passkeyConfigRequestWithInvalidRpId: PasskeyConfigRequest = {
            rpId: rpId as any,
            expectedOrigins: passkeyConfigRequest.expectedOrigins,
          };
          expect(() => PasskeyConfig.buildServerRequest(true, passkeyConfigRequestWithInvalidRpId)).to.throw(
            '\'rpId\' must be a valid non-empty string');
        });
      });
    });

    describe('for update request', () => {
      it('should create a client request with valid params', () => {
        const expectedRequest: PasskeyConfigClientRequest = {
          rpId: passkeyConfigRequest.rpId,
          expectedOrigins: passkeyConfigRequest.expectedOrigins,
        };
        expect(PasskeyConfig.buildServerRequest(false, passkeyConfigRequest)).to.deep.equal(expectedRequest);
      });
    });

    describe('for passkey config request', () => {
      const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
      nonObjects.forEach((request) => {
        it('should throw on invalid PasskeyConfigRequest: ' + JSON.stringify(request), () => {
          expect(() => {
            PasskeyConfig.buildServerRequest(false, request as any);
          }).to.throw('\'passkeyConfigRequest\' must be a valid non-empty object.');
        });
      });

      it('should throw for invalid passkey config request attribute', () => {
        const invalidAttributeObject = deepCopy(passkeyConfigRequest) as any;
        invalidAttributeObject.invalidAttribute = 'invalid';
        expect(() => {
          PasskeyConfig.buildServerRequest(false, invalidAttributeObject);
        }).to.throw('\'invalidAttribute\' is not a valid PasskeyConfigRequest parameter.');
      });

      const invalidExpectedOriginsObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
      invalidExpectedOriginsObjects.forEach((expectedOriginsObject) => {
        it('should throw for invalid expected origins values', () => {
          const request = deepCopy(passkeyConfigRequest) as any;
          request.expectedOrigins = expectedOriginsObject;
          expect(() => {
            PasskeyConfig.buildServerRequest(false, request as any);
          }).to.throw('\'passkeyConfigRequest.expectedOrigins\' must be a valid non-empty array of strings.');
        });
      });
    });
  });

  describe('constructor', () => {
    const passkeyConfig = new PasskeyConfig(serverResponse);
    it('should not throw on valid initialization', () => {
      expect(() => new PasskeyConfig(serverResponse)).not.to.throw();
    });

    it('should set readonly properties', () => {
      const expectedServerResponse = {
        name: 'projects/project-id/passkeyConfig',
        rpId: 'project-id.firebaseapp.com',
        expectedOrigins: ['app1', 'example.com'],
      };
      expect(passkeyConfig.name).to.equal(expectedServerResponse.name);
      expect(passkeyConfig.rpId).to.equal(expectedServerResponse.rpId);
      expect(passkeyConfig.expectedOrigins).to.deep.equal(expectedServerResponse.expectedOrigins);
    });
  });

  describe('toJSON', () => {
    it('should return the expected object representation of passkey config', () => {
      expect(new PasskeyConfig(serverResponse).toJSON()).to.deep.equal({
        name: deepCopy(serverResponse.name),
        rpId: deepCopy(serverResponse).rpId,
        expectedOrigins: deepCopy(serverResponse.expectedOrigins),
      });
    });

    it('should not populate optional fields if not available', () => {
      const serverResponseOptionalCopy: PasskeyConfigServerResponse = deepCopy(serverResponse);
      delete serverResponseOptionalCopy.rpId;
      delete serverResponseOptionalCopy.expectedOrigins;
      expect(new PasskeyConfig(serverResponseOptionalCopy).toJSON()).to.deep.equal({
        name: deepCopy(serverResponse.name),
      });
    });
  });
});

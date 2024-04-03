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

'use strict';

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { FirebaseApp } from '../../../src/app/firebase-app';
import { AuthRequestHandler } from '../../../src/auth/auth-api-request';
import { AuthClientErrorCode, FirebaseAuthError } from '../../../src/utils/error';
import { PasskeyConfigManager } from '../../../src/auth/passkey-config-manager';
import {
  PasskeyConfig, PasskeyConfigServerResponse, PasskeyConfigRequest,
} from '../../../src/auth/passkey-config';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('PasskeyConfigManager', () => {
  let mockApp: FirebaseApp;
  let passkeyConfigManager: PasskeyConfigManager;
  let nullAccessTokenPasskeyConfigManager: PasskeyConfigManager;
  let malformedAccessTokenPasskeyConfigManager: PasskeyConfigManager;
  let rejectedPromiseAccessTokenPasskeyConfigManager: PasskeyConfigManager;
  const GET_CONFIG_RESPONSE: PasskeyConfigServerResponse = {
    name: 'projects/project-id/passkeyConfig',
    rpId: 'project-id.firebaseapp.com',
    expectedOrigins: ['app1', 'example.com'],
  };

  before(() => {
    mockApp = mocks.app();
    passkeyConfigManager = new PasskeyConfigManager(mockApp);
    nullAccessTokenPasskeyConfigManager = new PasskeyConfigManager(
      mocks.appReturningNullAccessToken());
    malformedAccessTokenPasskeyConfigManager = new PasskeyConfigManager(
      mocks.appReturningMalformedAccessToken());
    rejectedPromiseAccessTokenPasskeyConfigManager = new PasskeyConfigManager(
      mocks.appRejectedWhileFetchingAccessToken());
  });

  after(() => {
    return mockApp.delete();
  });

  describe('getPasskeyConfig()', () => {
    const expectedPasskeyConfig = new PasskeyConfig(GET_CONFIG_RESPONSE);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenPasskeyConfigManager.getPasskeyConfig()
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenPasskeyConfigManager.getPasskeyConfig()
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenPasskeyConfigManager.getPasskeyConfig()
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a Passkey Config on success', () => {
      // Stub getPasskeyConfig to return expected result.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'getPasskeyConfig')
        .returns(Promise.resolve(GET_CONFIG_RESPONSE));
      stubs.push(stub);
      return passkeyConfigManager.getPasskeyConfig()
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce;
          // Confirm expected project config returned.
          expect(result).to.deep.equal(expectedPasskeyConfig);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub getConfig to throw a backend error.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'getPasskeyConfig')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return passkeyConfigManager.getPasskeyConfig()
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce;
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('createPasskeyConfig()', () => {
    const rpId = 'project-id.firebaseapp.com';
    const expectedOrigins: string[] = ['app1', 'example.com']
    const passkeyConfigRequest: PasskeyConfigRequest = {
      rpId: rpId,
      expectedOrigins: expectedOrigins ,
    };
    const expectedPasskeyConfig = new PasskeyConfig(GET_CONFIG_RESPONSE);
    const expectedError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to create the config provided.');
    // Stubs used to simulate underlying API calls.
    const stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      sinon.restore();
    });

    it('should be rejected given no passkeyConfigOptions', () => {
      return (passkeyConfigManager as any).createPasskeyConfig(null as unknown as PasskeyConfigRequest)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenPasskeyConfigManager.createPasskeyConfig(passkeyConfigRequest)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenPasskeyConfigManager.createPasskeyConfig(passkeyConfigRequest)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenPasskeyConfigManager.createPasskeyConfig(passkeyConfigRequest)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a PasskeyConfig on createPasskeyConfig request success', () => {
      // Stub createPasskeyConfig to return expected result.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'updatePasskeyConfig')
        .returns(Promise.resolve(GET_CONFIG_RESPONSE));
      stubs.push(stub);
      return passkeyConfigManager.createPasskeyConfig(passkeyConfigRequest)
        .then((actualPasskeyConfig) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(true, undefined, passkeyConfigRequest);
          // Confirm expected Passkey Config object returned.
          expect(actualPasskeyConfig).to.deep.equal(expectedPasskeyConfig);
        });
    });

    it('should throw an error when createPasskeyConfig returns an error', () => {
      // Stub createPasskeyConfig to throw a backend error.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'updatePasskeyConfig')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return passkeyConfigManager.createPasskeyConfig(passkeyConfigRequest)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(true, undefined, passkeyConfigRequest);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('updatePasskeyConfig()', () => {
    const passkeyConfigOptions: PasskeyConfigRequest = {
      expectedOrigins: ['app1', 'example.com', 'app2'],
    };
    const expectedPasskeyConfig = new PasskeyConfig(GET_CONFIG_RESPONSE);
    const expectedError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to update the config provided.');
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no passkeyConfigOptions', () => {
      return (passkeyConfigManager as any).updatePasskeyConfig(null as unknown as PasskeyConfigRequest)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenPasskeyConfigManager.updatePasskeyConfig(passkeyConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenPasskeyConfigManager.updatePasskeyConfig(passkeyConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenPasskeyConfigManager.updatePasskeyConfig(passkeyConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a PasskeyConfig on updatePasskeyConfig request success', () => {
      // Stub updatePasskeyConfig to return expected result.
      const updateConfigStub = sinon.stub(AuthRequestHandler.prototype, 'updatePasskeyConfig')
        .returns(Promise.resolve(GET_CONFIG_RESPONSE));
      stubs.push(updateConfigStub);
      return passkeyConfigManager.updatePasskeyConfig(passkeyConfigOptions)
        .then((actualPasskeyConfig) => {
          // Confirm underlying API called with expected parameters.
          expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(false, undefined, passkeyConfigOptions);
          // Confirm expected Project Config object returned.
          expect(actualPasskeyConfig).to.deep.equal(expectedPasskeyConfig);
        });
    });

    it('should throw an error when updatePasskeyConfig returns an error', () => {
      // Stub updatePasskeyConfig to throw a backend error.
      const updateConfigStub = sinon.stub(AuthRequestHandler.prototype, 'updatePasskeyConfig')
        .returns(Promise.reject(expectedError));
      stubs.push(updateConfigStub);
      return passkeyConfigManager.updatePasskeyConfig(passkeyConfigOptions)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(false, undefined, passkeyConfigOptions);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });
});

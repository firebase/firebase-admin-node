/*!
 * Copyright 2022 Google Inc.
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
import { ProjectConfigManager } from '../../../src/auth/project-config-manager';
import {
  ProjectConfig,
  ProjectConfigServerResponse,
  UpdateProjectConfigRequest
} from '../../../src/auth/project-config';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('ProjectConfigManager', () => {
  let mockApp: FirebaseApp;
  let projectConfigManager: ProjectConfigManager;
  let nullAccessTokenProjectConfigManager: ProjectConfigManager;
  let malformedAccessTokenProjectConfigManager: ProjectConfigManager;
  let rejectedPromiseAccessTokenProjectConfigManager: ProjectConfigManager;
  const GET_CONFIG_RESPONSE: ProjectConfigServerResponse = {
    smsRegionConfig: {
      allowlistOnly: {
        allowedRegions: [ 'AC', 'AD' ],
      },
    },
    recaptchaConfig: {
      emailPasswordEnforcementState: 'AUDIT',
      managedRules: [ {
        endScore: 0.2,
        action: 'BLOCK'
      } ],
      recaptchaKeys: [ {
        type: 'WEB',
        key: 'test-key-1' }
      ],
    }
  };

  before(() => {
    mockApp = mocks.app();
    projectConfigManager = new ProjectConfigManager(mockApp);
    nullAccessTokenProjectConfigManager = new ProjectConfigManager(
      mocks.appReturningNullAccessToken());
    malformedAccessTokenProjectConfigManager = new ProjectConfigManager(
      mocks.appReturningMalformedAccessToken());
    rejectedPromiseAccessTokenProjectConfigManager = new ProjectConfigManager(
      mocks.appRejectedWhileFetchingAccessToken());
  });

  after(() => {
    return mockApp.delete();
  });

  describe('getProjectConfig()', () => {
    const expectedProjectConfig = new ProjectConfig(GET_CONFIG_RESPONSE);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenProjectConfigManager.getProjectConfig()
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenProjectConfigManager.getProjectConfig()
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenProjectConfigManager.getProjectConfig()
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a Project Config on success', () => {
      // Stub getProjectConfig to return expected result.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'getProjectConfig')
        .returns(Promise.resolve(GET_CONFIG_RESPONSE));
      stubs.push(stub);
      return projectConfigManager.getProjectConfig()
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce;
          // Confirm expected project config returned.
          expect(result).to.deep.equal(expectedProjectConfig);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub getConfig to throw a backend error.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'getProjectConfig')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return projectConfigManager.getProjectConfig()
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

  describe('updateProjectConfig()', () => {
    const projectConfigOptions: UpdateProjectConfigRequest = {
      smsRegionConfig: {
        allowByDefault: {
          disallowedRegions: [ 'AC', 'AD' ],
        },
      },
      recaptchaConfig: {
        emailPasswordEnforcementState: 'AUDIT',
        managedRules: [ {
          endScore: 0.2,
          action: 'BLOCK'
        } ],
      }
    };
    const expectedProjectConfig = new ProjectConfig(GET_CONFIG_RESPONSE);
    const expectedError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to update the config provided.');
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no projectConfigOptions', () => {
      return (projectConfigManager as any).updateProjectConfig(null as unknown as UpdateProjectConfigRequest)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenProjectConfigManager.updateProjectConfig(projectConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenProjectConfigManager.updateProjectConfig(projectConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenProjectConfigManager.updateProjectConfig(projectConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a ProjectConfig on updateProjectConfig request success', () => {
      // Stub updateProjectConfig to return expected result.
      const updateConfigStub = sinon.stub(AuthRequestHandler.prototype, 'updateProjectConfig')
        .returns(Promise.resolve(GET_CONFIG_RESPONSE));
      stubs.push(updateConfigStub);
      return projectConfigManager.updateProjectConfig(projectConfigOptions)
        .then((actualProjectConfig) => {
          // Confirm underlying API called with expected parameters.
          expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(projectConfigOptions);
          // Confirm expected Project Config object returned.
          expect(actualProjectConfig).to.deep.equal(expectedProjectConfig);
        });
    });

    it('should throw an error when updateProjectConfig returns an error', () => {
      // Stub updateProjectConfig to throw a backend error.
      const updateConfigStub = sinon.stub(AuthRequestHandler.prototype, 'updateProjectConfig')
        .returns(Promise.reject(expectedError));
      stubs.push(updateConfigStub);
      return projectConfigManager.updateProjectConfig(projectConfigOptions)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(projectConfigOptions);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });
});

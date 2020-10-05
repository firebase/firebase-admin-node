/*!
 * Copyright 2019 Google Inc.
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
import { FirebaseApp } from '../../../src/firebase-app';
import { AuthRequestHandler } from '../../../src/auth/auth-api-request';
import { Tenant, TenantServerResponse } from '../../../src/auth/tenant';
import { TenantManager } from '../../../src/auth/tenant-manager';
import { AuthClientErrorCode, FirebaseAuthError } from '../../../src/utils/error';
import { auth } from '../../../src/auth/index';

import CreateTenantRequest = auth.CreateTenantRequest;
import UpdateTenantRequest = auth.UpdateTenantRequest;
import ListTenantsResult = auth.ListTenantsResult;

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('TenantManager', () => {
  const TENANT_ID = 'tenant-id';
  let mockApp: FirebaseApp;
  let tenantManager: TenantManager;
  let nullAccessTokenTenantManager: TenantManager;
  let malformedAccessTokenTenantManager: TenantManager;
  let rejectedPromiseAccessTokenTenantManager: TenantManager;
  const GET_TENANT_RESPONSE: TenantServerResponse = {
    name: 'projects/project-id/tenants/tenant-id',
    displayName: 'TENANT-DISPLAY-NAME',
    allowPasswordSignup: true,
    enableEmailLinkSignin: false,
  };

  before(() => {
    mockApp = mocks.app();
    tenantManager = new TenantManager(mockApp);
    nullAccessTokenTenantManager = new TenantManager(
      mocks.appReturningNullAccessToken());
    malformedAccessTokenTenantManager = new TenantManager(
      mocks.appReturningMalformedAccessToken());
    rejectedPromiseAccessTokenTenantManager = new TenantManager(
      mocks.appRejectedWhileFetchingAccessToken());

  });

  after(() => {
    return mockApp.delete();
  });

  describe('authForTenant()', () => {
    const invalidTenantIds = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidTenantIds.forEach((invalidTenantId) => {
      it('should throw given invalid tenant ID: ' + JSON.stringify(invalidTenantId), () => {
        expect(() => {
          return tenantManager.authForTenant(invalidTenantId as any);
        }).to.throw('The tenant ID must be a valid non-empty string.');
      });
    });

    it('should return a TenantAwareAuth with the expected tenant ID', () => {
      expect(tenantManager.authForTenant(TENANT_ID).tenantId).to.equal(TENANT_ID);
    });

    it('should return a TenantAwareAuth with read-only tenant ID', () => {
      expect(() => {
        (tenantManager.authForTenant(TENANT_ID) as any).tenantId = 'OTHER-TENANT-ID';
      }).to.throw('Cannot assign to read only property \'tenantId\' of object \'#<TenantAwareAuth>\'');
    });

    it('should cache the returned TenantAwareAuth', () => {
      const tenantAwareAuth1 = tenantManager.authForTenant('tenantId1');
      const tenantAwareAuth2 = tenantManager.authForTenant('tenantId2');
      expect(tenantManager.authForTenant('tenantId1')).to.equal(tenantAwareAuth1);
      expect(tenantManager.authForTenant('tenantId2')).to.equal(tenantAwareAuth2);
      expect(tenantAwareAuth1).to.not.be.equal(tenantAwareAuth2);
      expect(tenantAwareAuth1.tenantId).to.equal('tenantId1');
      expect(tenantAwareAuth2.tenantId).to.equal('tenantId2');
    });
  });

  describe('getTenant()', () => {
    const tenantId = 'tenant-id';
    const expectedTenant = new Tenant(GET_TENANT_RESPONSE);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.TENANT_NOT_FOUND);
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no tenant ID', () => {
      return (tenantManager as any).getTenant()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-tenant-id');
    });

    it('should be rejected given an invalid tenant ID', () => {
      const invalidTenantId = '';
      return tenantManager.getTenant(invalidTenantId)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-tenant-id');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenTenantManager.getTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenTenantManager.getTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenTenantManager.getTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a Tenant on success', () => {
      // Stub getTenant to return expected result.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'getTenant')
        .returns(Promise.resolve(GET_TENANT_RESPONSE));
      stubs.push(stub);
      return tenantManager.getTenant(tenantId)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(tenantId);
          // Confirm expected tenant returned.
          expect(result).to.deep.equal(expectedTenant);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub getTenant to throw a backend error.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'getTenant')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return tenantManager.getTenant(tenantId)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(tenantId);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('listTenants()', () => {
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR);
    const pageToken = 'PAGE_TOKEN';
    const maxResult = 500;
    const listTenantsResponse: any = {
      tenants : [
        { name: 'projects/project-id/tenants/tenant-id1' },
        { name: 'projects/project-id/tenants/tenant-id2' },
      ],
      nextPageToken: 'NEXT_PAGE_TOKEN',
    };
    const expectedResult: ListTenantsResult = {
      tenants: [
        new Tenant({ name: 'projects/project-id/tenants/tenant-id1' }),
        new Tenant({ name: 'projects/project-id/tenants/tenant-id2' }),
      ],
      pageToken: 'NEXT_PAGE_TOKEN',
    };
    const emptyListTenantsResponse: any = {
      tenants: [],
    };
    const emptyExpectedResult: any = {
      tenants: [],
    };
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given an invalid page token', () => {
      const invalidToken = {};
      return tenantManager.listTenants(undefined, invalidToken as any)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-page-token');
        });
    });

    it('should be rejected given a maxResults greater than the allowed max', () => {
      const moreThanMax = 1000 + 1;
      return tenantManager.listTenants(moreThanMax)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenTenantManager.listTenants(maxResult)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenTenantManager.listTenants(maxResult)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenTenantManager.listTenants(maxResult)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve on listTenants request success with tenants in response', () => {
      // Stub listTenants to return expected response.
      const listTenantsStub = sinon
        .stub(AuthRequestHandler.prototype, 'listTenants')
        .returns(Promise.resolve(listTenantsResponse));
      stubs.push(listTenantsStub);
      return tenantManager.listTenants(maxResult, pageToken)
        .then((response) => {
          expect(response).to.deep.equal(expectedResult);
          // Confirm underlying API called with expected parameters.
          expect(listTenantsStub)
            .to.have.been.calledOnce.and.calledWith(maxResult, pageToken);
        });
    });

    it('should resolve on listTenants request success with default options', () => {
      // Stub listTenants to return expected response.
      const listTenantsStub = sinon
        .stub(AuthRequestHandler.prototype, 'listTenants')
        .returns(Promise.resolve(listTenantsResponse));
      stubs.push(listTenantsStub);
      return tenantManager.listTenants()
        .then((response) => {
          expect(response).to.deep.equal(expectedResult);
          // Confirm underlying API called with expected parameters.
          expect(listTenantsStub)
            .to.have.been.calledOnce.and.calledWith(undefined, undefined);
        });
    });

    it('should resolve on listTenants request success with no tenants in response', () => {
      // Stub listTenants to return expected response.
      const listTenantsStub = sinon
        .stub(AuthRequestHandler.prototype, 'listTenants')
        .returns(Promise.resolve(emptyListTenantsResponse));
      stubs.push(listTenantsStub);
      return tenantManager.listTenants(maxResult, pageToken)
        .then((response) => {
          expect(response).to.deep.equal(emptyExpectedResult);
          // Confirm underlying API called with expected parameters.
          expect(listTenantsStub)
            .to.have.been.calledOnce.and.calledWith(maxResult, pageToken);
        });
    });

    it('should throw an error when listTenants returns an error', () => {
      // Stub listTenants to throw a backend error.
      const listTenantsStub = sinon
        .stub(AuthRequestHandler.prototype, 'listTenants')
        .returns(Promise.reject(expectedError));
      stubs.push(listTenantsStub);
      return tenantManager.listTenants(maxResult, pageToken)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(listTenantsStub)
            .to.have.been.calledOnce.and.calledWith(maxResult, pageToken);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('deleteTenant()', () => {
    const tenantId = 'tenant-id';
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.TENANT_NOT_FOUND);
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no tenant ID', () => {
      return (tenantManager as any).deleteTenant()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-tenant-id');
    });

    const invalidTenantIds = [null, NaN, 0, 1, true, false, '', ['tenant-id'], [], {}, { a: 1 }, _.noop];
    invalidTenantIds.forEach((invalidTenantId) => {
      it('should be rejected given an invalid tenant ID:' + JSON.stringify(invalidTenantId), () => {
        return tenantManager.deleteTenant(invalidTenantId as any)
          .then(() => {
            throw new Error('Unexpected success');
          })
          .catch((error) => {
            expect(error).to.have.property('code', 'auth/invalid-tenant-id');
          });
      });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenTenantManager.deleteTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenTenantManager.deleteTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenTenantManager.deleteTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with void on success', () => {
      // Stub deleteTenant to return expected result.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'deleteTenant')
        .returns(Promise.resolve());
      stubs.push(stub);
      return tenantManager.deleteTenant(tenantId)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(tenantId);
          // Confirm expected result is undefined.
          expect(result).to.be.undefined;
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub deleteTenant to throw a backend error.
      const stub = sinon.stub(AuthRequestHandler.prototype, 'deleteTenant')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return tenantManager.deleteTenant(tenantId)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(tenantId);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('createTenant()', () => {
    const tenantOptions: CreateTenantRequest = {
      displayName: 'TENANT-DISPLAY-NAME',
      emailSignInConfig: {
        enabled: true,
        passwordRequired: true,
      },
    };
    const expectedTenant = new Tenant(GET_TENANT_RESPONSE);
    const expectedError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to create the tenant provided.');
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no properties', () => {
      return (tenantManager as any).createTenant()
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given invalid TenantOptions', () => {
      return tenantManager.createTenant(null as any)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
        });
    });

    it('should be rejected given TenantOptions with invalid type property', () => {
      // Create tenant using invalid type. This should throw an argument error.
      return tenantManager.createTenant({ type: 'invalid' } as any)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenTenantManager.createTenant(tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenTenantManager.createTenant(tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenTenantManager.createTenant(tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a Tenant on createTenant request success', () => {
      // Stub createTenant to return expected result.
      const createTenantStub = sinon.stub(AuthRequestHandler.prototype, 'createTenant')
        .returns(Promise.resolve(GET_TENANT_RESPONSE));
      stubs.push(createTenantStub);
      return tenantManager.createTenant(tenantOptions)
        .then((actualTenant) => {
          // Confirm underlying API called with expected parameters.
          expect(createTenantStub).to.have.been.calledOnce.and.calledWith(tenantOptions);
          // Confirm expected Tenant object returned.
          expect(actualTenant).to.deep.equal(expectedTenant);
        });
    });

    it('should throw an error when createTenant returns an error', () => {
      // Stub createTenant to throw a backend error.
      const createTenantStub = sinon.stub(AuthRequestHandler.prototype, 'createTenant')
        .returns(Promise.reject(expectedError));
      stubs.push(createTenantStub);
      return tenantManager.createTenant(tenantOptions)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(createTenantStub).to.have.been.calledOnce.and.calledWith(tenantOptions);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('updateTenant()', () => {
    const tenantId = 'tenant-id';
    const tenantOptions: UpdateTenantRequest = {
      displayName: 'TENANT-DISPLAY-NAME',
      emailSignInConfig: {
        enabled: true,
        passwordRequired: true,
      },
    };
    const expectedTenant = new Tenant(GET_TENANT_RESPONSE);
    const expectedError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to update the tenant provided.');
    // Stubs used to simulate underlying API calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no tenant ID', () => {
      return (tenantManager as any).updateTenant(undefined, tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-tenant-id');
    });

    it('should be rejected given an invalid tenant ID', () => {
      const invalidTenantId = '';
      return tenantManager.updateTenant(invalidTenantId, tenantOptions)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-tenant-id');
        });
    });

    it('should be rejected given no TenantOptions', () => {
      return (tenantManager as any).updateTenant(tenantId)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given invalid TenantOptions', () => {
      return tenantManager.updateTenant(tenantId, null as unknown as UpdateTenantRequest)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
        });
    });

    it('should be rejected given TenantOptions with invalid update property', () => {
      // Updating the tenantId of an existing tenant will throw an error as tenantId is
      // an immutable property.
      return tenantManager.updateTenant(tenantId, { tenantId: 'unmodifiable' } as any)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenTenantManager.updateTenant(tenantId, tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenTenantManager.updateTenant(tenantId, tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenTenantManager.updateTenant(tenantId, tenantOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a Tenant on updateTenant request success', () => {
      // Stub updateTenant to return expected result.
      const updateTenantStub = sinon.stub(AuthRequestHandler.prototype, 'updateTenant')
        .returns(Promise.resolve(GET_TENANT_RESPONSE));
      stubs.push(updateTenantStub);
      return tenantManager.updateTenant(tenantId, tenantOptions)
        .then((actualTenant) => {
          // Confirm underlying API called with expected parameters.
          expect(updateTenantStub).to.have.been.calledOnce.and.calledWith(tenantId, tenantOptions);
          // Confirm expected Tenant object returned.
          expect(actualTenant).to.deep.equal(expectedTenant);
        });
    });

    it('should throw an error when updateTenant returns an error', () => {
      // Stub updateTenant to throw a backend error.
      const updateTenantStub = sinon.stub(AuthRequestHandler.prototype, 'updateTenant')
        .returns(Promise.reject(expectedError));
      stubs.push(updateTenantStub);
      return tenantManager.updateTenant(tenantId, tenantOptions)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(updateTenantStub).to.have.been.calledOnce.and.calledWith(tenantId, tenantOptions);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });
});

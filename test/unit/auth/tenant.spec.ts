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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {deepCopy} from '../../../src/utils/deep-copy';
import {EmailSignInConfig} from '../../../src/auth/auth-config';
import {
  Tenant, TenantOptions, TenantServerResponse,
} from '../../../src/auth/tenant';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Tenant', () => {
  const serverRequest = {
    name: 'projects/project1/tenants/TENANT_ID',
    displayName: 'TENANT_DISPLAY_NAME',
    allowPasswordSignup: true,
    enableEmailLinkSignin: true,
  };

  const clientRequest = {
    displayName: 'TENANT_DISPLAY_NAME',
    emailSignInConfig: {
      enabled: true,
      passwordRequired: false,
    },
  };

  const tenantOptions: TenantOptions = {
    displayName: 'TENANT_DISPLAY_NAME',
    emailSignInConfig: {
      enabled: true,
      passwordRequired: false,
    },
  };

  describe('buildServerRequest()', () => {
    const createRequest = true;

    describe('for an update request', () => {
      it('should return the expected server request', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        const tenantOptionsServerRequest = deepCopy(serverRequest);
        delete tenantOptionsServerRequest.name;
        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on invalid EmailSignInConfig object', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        tenantOptionsClientRequest.emailSignInConfig = null;
        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest))
          .to.throw('"EmailSignInConfig" must be a non-null object.');
      });

      it('should throw on invalid EmailSignInConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.emailSignInConfig.enabled = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"EmailSignInConfig.enabled" must be a boolean.');
      });

      it('should not throw on valid client request object', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).not.to.throw;
      });

      const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
      nonObjects.forEach((request) => {
        it('should throw on invalid UpdateTenantRequest:' + JSON.stringify(request), () => {
          expect(() => {
            Tenant.buildServerRequest(request as any, !createRequest);
          }).to.throw('"UpdateTenantRequest" must be a valid non-null object.');
        });
      });

      it('should throw on unsupported attribute for update request', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.unsupported = 'value';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw(`"unsupported" is not a valid UpdateTenantRequest parameter.`);
      });

      const invalidTenantNames = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidTenantNames.forEach((displayName) => {
        it('should throw on invalid UpdateTenantRequest displayName:' + JSON.stringify(displayName), () => {
          const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
          tenantOptionsClientRequest.displayName = displayName;
          expect(() => {
            Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
          }).to.throw('"UpdateTenantRequest.displayName" must be a valid non-empty string.');
        });
      });
    });

    describe('for a create request', () => {
      it('should return the expected server request', () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(clientRequest);
        const tenantOptionsServerRequest: TenantServerResponse = deepCopy(serverRequest);
        delete tenantOptionsServerRequest.name;

        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on invalid EmailSignInConfig', () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(clientRequest);
        tenantOptionsClientRequest.emailSignInConfig = null;

        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest))
          .to.throw('"EmailSignInConfig" must be a non-null object.');
      });

      const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
      nonObjects.forEach((request) => {
        it('should throw on invalid CreateTenantRequest:' + JSON.stringify(request), () => {
          expect(() => {
            Tenant.buildServerRequest(request as any, createRequest);
          }).to.throw('"CreateTenantRequest" must be a valid non-null object.');
        });
      });

      it('should throw on unsupported attribute for create request', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.unsupported = 'value';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw(`"unsupported" is not a valid CreateTenantRequest parameter.`);
      });

      const invalidTenantNames = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidTenantNames.forEach((displayName) => {
        it('should throw on invalid CreateTenantRequest displayName:' + JSON.stringify(displayName), () => {
          const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
          tenantOptionsClientRequest.displayName = displayName;
          expect(() => {
            Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
          }).to.throw('"CreateTenantRequest.displayName" must be a valid non-empty string.');
        });
      });
    });
  });

  describe('getTenantIdFromResourceName()', () => {
    it('should return the expected tenant ID from resource name', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/project1/tenants/TENANT_ID'))
        .to.equal('TENANT_ID');
    });

    it('should return the expected tenant ID from resource name whose project ID contains "tenants" substring', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/projecttenants/tenants/TENANT_ID'))
        .to.equal('TENANT_ID');
    });

    it('should return null when no tenant ID is found', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/project1')).to.be.null;
    });
  });

  describe('constructor', () => {
    const serverRequestCopy: TenantServerResponse = deepCopy(serverRequest);
    const tenant = new Tenant(serverRequestCopy);
    it('should not throw on valid initialization', () => {
      expect(() => new Tenant(serverRequest)).not.to.throw();
    });

    it('should set readonly property tenantId', () => {
      expect(tenant.tenantId).to.equal('TENANT_ID');
    });

    it('should set readonly property displayName', () => {
      expect(tenant.displayName).to.equal('TENANT_DISPLAY_NAME');
    });

    it('should set readonly property emailSignInConfig', () => {
      const expectedEmailSignInConfig = new EmailSignInConfig({
        allowPasswordSignup: true,
        enableEmailLinkSignin: true,
      });
      expect(tenant.emailSignInConfig).to.deep.equal(expectedEmailSignInConfig);
    });

    it('should throw when no tenant ID is provided', () => {
      const invalidOptions = deepCopy(serverRequest);
      // Use resource name that does not include a tenant ID.
      invalidOptions.name = 'projects/project1';
      expect(() => new Tenant(invalidOptions))
        .to.throw('INTERNAL ASSERT FAILED: Invalid tenant response');
    });

    it('should set default EmailSignInConfig when allowPasswordSignup is undefined', () => {
      const serverResponse: TenantServerResponse = {
        name: 'projects/project1/tenants/TENANT_ID',
        displayName: 'TENANT_DISPLAY_NAME',
      };
      expect(() => {
        const tenantWithoutAllowPasswordSignup = new Tenant(serverResponse);

        expect(tenantWithoutAllowPasswordSignup.displayName).to.equal(serverResponse.displayName);
        expect(tenantWithoutAllowPasswordSignup.tenantId).to.equal('TENANT_ID');
        expect(tenantWithoutAllowPasswordSignup.emailSignInConfig.enabled).to.be.false;
        expect(tenantWithoutAllowPasswordSignup.emailSignInConfig.passwordRequired).to.be.true;
      }).not.to.throw();
    });
  });

  describe('toJSON()', () => {
    const serverRequestCopy: TenantServerResponse = deepCopy(serverRequest);
    it('should return the expected object representation of a tenant', () => {
      expect(new Tenant(serverRequestCopy).toJSON()).to.deep.equal({
        tenantId: 'TENANT_ID',
        displayName: 'TENANT_DISPLAY_NAME',
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false,
        },
      });
    });
  });
});

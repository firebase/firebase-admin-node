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
    describe('for update request', () => {
      it('should return the expected server request', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        const tenantOptionsServerRequest = deepCopy(serverRequest);
        delete tenantOptionsServerRequest.name;
        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, false))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on invalid input', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        tenantOptionsClientRequest.displayName = null;
        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, false))
          .to.throw('"UpdateTenantRequest.displayName" must be a valid non-empty string.');
      });

      it('should throw on invalid EmailSignInConfig', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        tenantOptionsClientRequest.emailSignInConfig = null;
        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, false))
          .to.throw('"EmailSignInConfig" must be a non-null object.');
      });

      it('should throw when type is specified', () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(tenantOptions);
        tenantOptionsClientRequest.type = 'lightweight';
        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, false))
          .to.throw('"Tenant.type" is an immutable property.');
      });
    });

    describe('for create request', () => {
      it('should return the expected server request', () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(clientRequest);
        tenantOptionsClientRequest.type = 'lightweight';
        const tenantOptionsServerRequest: TenantServerResponse = deepCopy(serverRequest);
        delete tenantOptionsServerRequest.name;
        tenantOptionsServerRequest.type = 'LIGHTWEIGHT';

        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, true))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on invalid input', () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(clientRequest);
        tenantOptionsClientRequest.displayName = null;
        tenantOptionsClientRequest.type = 'full_service';

        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, true))
          .to.throw('"CreateTenantRequest.displayName" must be a valid non-empty string.');
      });

      it('should throw on invalid EmailSignInConfig', () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(clientRequest);
        tenantOptionsClientRequest.emailSignInConfig = null;
        tenantOptionsClientRequest.type = 'full_service';

        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, true))
          .to.throw('"EmailSignInConfig" must be a non-null object.');
      });

      const invalidTypes = ['invalid', null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidTypes.forEach((invalidType) => {
        it('should throw on invalid type ' + JSON.stringify(invalidType), () => {
          const tenantOptionsClientRequest: TenantOptions = deepCopy(tenantOptions);
          tenantOptionsClientRequest.type = invalidType as any;
          expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, true))
            .to.throw(`"CreateTenantRequest.type" must be either "full_service" or "lightweight".`);
        });
      });
    });
  });

  describe('getTenantIdFromResourceName()', () => {
    it('should return the expected tenant ID from resource name', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/project1/tenants/TENANT_ID'))
        .to.equal('TENANT_ID');
    });

    it('should return the expected tenant ID from resource name with multiple tenants substring', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/projecttenants/tenants/TENANT_ID'))
        .to.equal('TENANT_ID');
    });

    it('should return null when no tenant ID is found', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/project1')).to.be.null;
    });
  });

  describe('validate()', () => {
    it('should not throw on valid client request object', () => {
      const tenantOptionsClientRequest = deepCopy(clientRequest);
      expect(() => {
        Tenant.validate(tenantOptionsClientRequest, false);
      }).not.to.throw;
    });

    const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
    nonObjects.forEach((request) => {
      it('should throw on non-null Tenant object:' + JSON.stringify(request), () => {
        expect(() => {
          Tenant.validate(request, false);
        }).to.throw('"UpdateTenantRequest" must be a valid non-null object.');
      });
    });

    it('should throw on unsupported attribute', () => {
      const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
      tenantOptionsClientRequest.unsupported = 'value';
      expect(() => {
        Tenant.validate(tenantOptionsClientRequest, false);
       }).to.throw(`"unsupported" is not a valid UpdateTenantRequest parameter.`);
    });

    const invalidTenantNames = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidTenantNames.forEach((displayName) => {
      it('should throw on invalid displayName:' + JSON.stringify(displayName), () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.displayName = displayName;
        expect(() => {
          Tenant.validate(tenantOptionsClientRequest, false);
        }).to.throw('"UpdateTenantRequest.displayName" must be a valid non-empty string.');
      });
    });

    it('should throw on invalid emailSignInConfig', () => {
      const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
      tenantOptionsClientRequest.emailSignInConfig.enabled = 'invalid';
      expect(() => {
        Tenant.validate(tenantOptionsClientRequest, false);
      }).to.throw('"EmailSignInConfig.enabled" must be a boolean.');
    });

    const invalidTypes = ['invalid', null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidTypes.forEach((invalidType) => {
      it('should throw on creation with invalid type ' + JSON.stringify(invalidType), () => {
        const tenantOptionsClientRequest: TenantOptions = deepCopy(tenantOptions);
        tenantOptionsClientRequest.type = invalidType as any;
        expect(() => Tenant.validate(tenantOptionsClientRequest, true))
          .to.throw(`"CreateTenantRequest.type" must be either "full_service" or "lightweight".`);
      });
    });

    it('should throw on update with specified type', () => {
      const tenantOptionsClientRequest: TenantOptions = deepCopy(tenantOptions);
      tenantOptionsClientRequest.type = 'lightweight';
      expect(() => Tenant.validate(tenantOptionsClientRequest, false))
        .to.throw('"Tenant.type" is an immutable property.');
    });
  });

  describe('constructor', () => {
    const serverRequestCopy: TenantServerResponse = deepCopy(serverRequest);
    serverRequestCopy.type = 'LIGHTWEIGHT';
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

    it('should set readonly property type', () => {
      expect(tenant.type).to.equal('lightweight');
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
  });

  describe('toJSON()', () => {
    const serverRequestCopy: TenantServerResponse = deepCopy(serverRequest);
    serverRequestCopy.type = 'LIGHTWEIGHT';
    it('should return the expected object representation of a tenant', () => {
      expect(new Tenant(serverRequestCopy).toJSON()).to.deep.equal({
        tenantId: 'TENANT_ID',
        type: 'lightweight',
        displayName: 'TENANT_DISPLAY_NAME',
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false,
        },
      });
    });
  });
});

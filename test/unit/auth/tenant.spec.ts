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

import { deepCopy } from '../../../src/utils/deep-copy';
import { EmailSignInConfig, MultiFactorAuthConfig, RecaptchaAuthConfig } from '../../../src/auth/auth-config';
import { TenantServerResponse } from '../../../src/auth/tenant';
import {
  CreateTenantRequest, UpdateTenantRequest, EmailSignInProviderConfig, Tenant,
} from '../../../src/auth/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Tenant', () => {
  const smsAllowByDefault = {
    allowByDefault: {
      disallowedRegions: [ 'AC', 'AD' ],
    },
  };

  const smsAllowlistOnly = {
    allowlistOnly: {
      allowedRegions: [ 'AC', 'AD' ],
    },
  };

  const serverRequest: TenantServerResponse = {
    name: 'projects/project1/tenants/TENANT-ID',
    displayName: 'TENANT-DISPLAY-NAME',
    allowPasswordSignup: true,
    enableEmailLinkSignin: true,
    mfaConfig: {
      state: 'ENABLED',
      enabledProviders: ['PHONE_SMS'],
      providerConfigs: [
        {
          state: 'ENABLED',
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    },
    testPhoneNumbers: {
      '+16505551234': '019287',
      '+16505550676': '985235',
    },
    smsRegionConfig: smsAllowByDefault,
  };

  const clientRequest: UpdateTenantRequest = {
    displayName: 'TENANT-DISPLAY-NAME',
    emailSignInConfig: {
      enabled: true,
      passwordRequired: false,
    },
    multiFactorConfig: {
      state: 'ENABLED',
      factorIds: ['phone'],
      providerConfigs: [
        {
          state: 'ENABLED',
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    },
    testPhoneNumbers: {
      '+16505551234': '019287',
      '+16505550676': '985235',
    },
    smsRegionConfig: smsAllowByDefault,
  };

  const serverRequestWithoutMfa: TenantServerResponse = {
    name: 'projects/project1/tenants/TENANT-ID',
    displayName: 'TENANT-DISPLAY-NAME',
    allowPasswordSignup: true,
    enableEmailLinkSignin: true,
  };

  const clientRequestWithoutMfa: UpdateTenantRequest = {
    displayName: 'TENANT-DISPLAY-NAME',
    emailSignInConfig: {
      enabled: true,
      passwordRequired: false,
    },
  };

  const serverResponseWithRecaptcha: TenantServerResponse = {
    name: 'projects/project1/tenants/TENANT-ID',
    displayName: 'TENANT-DISPLAY-NAME',
    allowPasswordSignup: true,
    enableEmailLinkSignin: true,
    mfaConfig: {
      state: 'ENABLED',
      enabledProviders: ['PHONE_SMS'],
      providerConfigs: [
        {
          state: 'ENABLED',
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    },
    testPhoneNumbers: {
      '+16505551234': '019287',
      '+16505550676': '985235',
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
      useAccountDefender: true,
    },
    smsRegionConfig: smsAllowByDefault,
  };

  const clientRequestWithRecaptcha: UpdateTenantRequest = {
    displayName: 'TENANT-DISPLAY-NAME',
    emailSignInConfig: {
      enabled: true,
      passwordRequired: false,
    },
    multiFactorConfig: {
      state: 'ENABLED',
      factorIds: ['phone'],
    },
    testPhoneNumbers: {
      '+16505551234': '019287',
      '+16505550676': '985235',
    },
    recaptchaConfig: {
      managedRules: [{
        endScore: 0.2,
        action: 'BLOCK'
      }],
      emailPasswordEnforcementState: 'AUDIT',
      useAccountDefender: true,
    },
  };

  describe('buildServerRequest()', () => {
    const createRequest = true;

    describe('for an update request', () => {
      it('should return the expected server request without multi-factor and phone config', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithoutMfa);
        const tenantOptionsServerRequest = deepCopy(serverRequestWithoutMfa);
        delete (tenantOptionsServerRequest as any).name;
        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should return the expected server request with multi-factor (SMS, TOTP) and testPhoneNumber config', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        const tenantOptionsServerRequest = deepCopy(serverRequest);
        delete (tenantOptionsServerRequest as any).name;
        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on invalid EmailSignInConfig object', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        tenantOptionsClientRequest.emailSignInConfig = null as unknown as EmailSignInProviderConfig;
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

      it('should throw on invalid MultiFactorConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.multiFactorConfig.state = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"MultiFactorConfig.state" must be either "ENABLED" or "DISABLED".');
      });

      it('should throw on null RecaptchaConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig = null;
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"RecaptchaConfig" must be a non-null object.');
      });

      it('should throw on invalid RecaptchaConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.invalidParameter = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"invalidParameter" is not a valid RecaptchaConfig parameter.');
      });

      it('should throw on null emailPasswordEnforcementState attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.emailPasswordEnforcementState = null;
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be a valid non-empty string.');
      });

      it('should throw on invalid emailPasswordEnforcementState attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig
          .emailPasswordEnforcementState = 'INVALID';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be either "OFF", "AUDIT" or "ENFORCE".');
      });

      it('should throw on non-array managedRules attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.managedRules = 'non-array';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"RecaptchaConfig.managedRules" must be an array of valid "RecaptchaManagedRule".');
      });

      it('should throw on non-boolean useAccountDefender attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.useAccountDefender = 'yes';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"RecaptchaConfig.useAccountDefender" must be a boolean value".');
      });

      it('should throw on invalid managedRules attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'score': 0.1, 'action': 'BLOCK' }];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"score" is not a valid RecaptchaManagedRule parameter.');
      });

      it('should throw on invalid RecaptchaManagedRule.action attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'endScore': 0.1, 'action': 'ALLOW' }];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"RecaptchaManagedRule.action" must be "BLOCK".');
      });

      it('should throw on invalid testPhoneNumbers attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.testPhoneNumbers = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"testPhoneNumbers" must be a map of phone number / code pairs.');
      });

      it('should not throw on null testPhoneNumbers attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        const tenantOptionsServerRequest = deepCopy(serverRequest);
        tenantOptionsClientRequest.testPhoneNumbers = null;
        delete (tenantOptionsServerRequest as any).name;
        tenantOptionsServerRequest.testPhoneNumbers = {};

        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on null SmsRegionConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = null;
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"SmsRegionConfig" must be a non-null object.');
      });

      it('should throw on invalid SmsRegionConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig.invalidParameter = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"invalidParameter" is not a valid SmsRegionConfig parameter.');
      });

      it('should throw on invalid allowlistOnly attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = deepCopy(smsAllowlistOnly);
        tenantOptionsClientRequest.smsRegionConfig.allowlistOnly.disallowedRegions = [ 'AC', 'AD' ];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"disallowedRegions" is not a valid SmsRegionConfig.allowlistOnly parameter.');
      });

      it('should throw on invalid allowByDefault attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig.allowByDefault.allowedRegions = [ 'AC', 'AD' ];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"allowedRegions" is not a valid SmsRegionConfig.allowByDefault parameter.');
      });

      it('should throw on non-array disallowedRegions attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig.allowByDefault.disallowedRegions = 'non-array'; 
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"SmsRegionConfig.allowByDefault.disallowedRegions" must be a valid string array.');
      });

      it('should throw on non-array allowedRegions attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = deepCopy(smsAllowlistOnly);
        tenantOptionsClientRequest.smsRegionConfig.allowlistOnly.allowedRegions = 'non-array';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('"SmsRegionConfig.allowlistOnly.allowedRegions" must be a valid string array.');
      });

      it('should throw when both allowlistOnly and allowByDefault attributes are presented', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = { ...smsAllowByDefault, ...smsAllowlistOnly };
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, !createRequest);
        }).to.throw('SmsRegionConfig cannot have both "allowByDefault" and "allowlistOnly" parameters.');
      });

      it('should not throw on valid client request object', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha);
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
        }).to.throw('"unsupported" is not a valid UpdateTenantRequest parameter.');
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
      it('should return the expected server request without multi-factor and phone config', () => {
        const tenantOptionsClientRequest: CreateTenantRequest = deepCopy(clientRequestWithoutMfa);
        const tenantOptionsServerRequest: TenantServerResponse = deepCopy(serverRequestWithoutMfa);
        delete (tenantOptionsServerRequest as any).name;

        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should return the expected server request with multi-factor and phone config', () => {
        const tenantOptionsClientRequest: CreateTenantRequest = deepCopy(clientRequest);
        const tenantOptionsServerRequest: TenantServerResponse = deepCopy(serverRequest);
        delete (tenantOptionsServerRequest as any).name;

        expect(Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest))
          .to.deep.equal(tenantOptionsServerRequest);
      });

      it('should throw on invalid EmailSignInConfig', () => {
        const tenantOptionsClientRequest: CreateTenantRequest = deepCopy(clientRequest);
        tenantOptionsClientRequest.emailSignInConfig = null as unknown as EmailSignInProviderConfig;

        expect(() => Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest))
          .to.throw('"EmailSignInConfig" must be a non-null object.');
      });

      it('should throw on invalid MultiFactorConfig.factorIds attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.multiFactorConfig.factorIds = ['invalid'];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"invalid" is not a valid "AuthFactorType".',);
      });

      it('should throw on null RecaptchaConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig = null;
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"RecaptchaConfig" must be a non-null object.');
      });

      it('should throw on invalid RecaptchaConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.invalidParameter = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"invalidParameter" is not a valid RecaptchaConfig parameter.');
      });

      it('should throw on null emailPasswordEnforcementState attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.emailPasswordEnforcementState = null;
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be a valid non-empty string.');
      });

      it('should throw on invalid emailPasswordEnforcementState attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig
          .emailPasswordEnforcementState = 'INVALID';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be either "OFF", "AUDIT" or "ENFORCE".');
      });

      it('should throw on non-array managedRules attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.managedRules = 'non-array';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"RecaptchaConfig.managedRules" must be an array of valid "RecaptchaManagedRule".');
      });

      const invalidUseAccountDefender = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidUseAccountDefender.forEach((useAccountDefender) => {
        it('should throw on non-boolean useAccountDefender attribute', () => {
          const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
          tenantOptionsClientRequest.recaptchaConfig.useAccountDefender = useAccountDefender;
          expect(() => {
            Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
          }).to.throw('"RecaptchaConfig.useAccountDefender" must be a boolean value".');
        });
      });

      it('should throw on invalid managedRules attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'score': 0.1, 'action': 'BLOCK' }];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"score" is not a valid RecaptchaManagedRule parameter.');
      });

      it('should throw on invalid RecaptchaManagedRule.action attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequestWithRecaptcha) as any;
        tenantOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'endScore': 0.1, 'action': 'ALLOW' }];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"RecaptchaManagedRule.action" must be "BLOCK".');
      });

      it('should throw on invalid testPhoneNumbers attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.testPhoneNumbers = { 'invalid': '123456' };
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"invalid" is not a valid E.164 standard compliant phone number.');
      });

      it('should throw on null testPhoneNumbers attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest);
        const tenantOptionsServerRequest = deepCopy(serverRequest);
        tenantOptionsClientRequest.testPhoneNumbers = null;
        delete (tenantOptionsServerRequest as any).name;
        tenantOptionsServerRequest.testPhoneNumbers = {};

        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"CreateTenantRequest.testPhoneNumbers" must be a non-null object.');
      });

      it('should throw on null SmsRegionConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = null;
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"SmsRegionConfig" must be a non-null object.');
      });

      it('should throw on invalid SmsRegionConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig.invalidParameter = 'invalid';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"invalidParameter" is not a valid SmsRegionConfig parameter.');
      });

      it('should throw on invalid allowlistOnly attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = deepCopy(smsAllowlistOnly);
        tenantOptionsClientRequest.smsRegionConfig.allowlistOnly.disallowedRegions = [ 'AC', 'AD' ];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"disallowedRegions" is not a valid SmsRegionConfig.allowlistOnly parameter.');
      });

      it('should throw on invalid allowByDefault attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig.allowByDefault.allowedRegions = [ 'AC', 'AD' ];
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"allowedRegions" is not a valid SmsRegionConfig.allowByDefault parameter.');
      });

      it('should throw on non-array disallowedRegions attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig.allowByDefault.disallowedRegions = 'non-array'; 
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"SmsRegionConfig.allowByDefault.disallowedRegions" must be a valid string array.');
      });

      it('should throw on non-array allowedRegions attribute', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = deepCopy(smsAllowlistOnly);
        tenantOptionsClientRequest.smsRegionConfig.allowlistOnly.allowedRegions = 'non-array';
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('"SmsRegionConfig.allowlistOnly.allowedRegions" must be a valid string array.');
      });

      it('should throw when both allowlistOnly and allowByDefault attributes are presented', () => {
        const tenantOptionsClientRequest = deepCopy(clientRequest) as any;
        tenantOptionsClientRequest.smsRegionConfig = { ...smsAllowByDefault, ...smsAllowlistOnly };
        expect(() => {
          Tenant.buildServerRequest(tenantOptionsClientRequest, createRequest);
        }).to.throw('SmsRegionConfig cannot have both "allowByDefault" and "allowlistOnly" parameters.');
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
        }).to.throw('"unsupported" is not a valid CreateTenantRequest parameter.');
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
      expect(Tenant.getTenantIdFromResourceName('projects/project1/tenants/TENANT-ID'))
        .to.equal('TENANT-ID');
    });

    it('should return the expected tenant ID from resource name whose project ID contains "tenants" substring', () => {
      expect(Tenant.getTenantIdFromResourceName('projects/projecttenants/tenants/TENANT-ID'))
        .to.equal('TENANT-ID');
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
      expect(tenant.tenantId).to.equal('TENANT-ID');
    });

    it('should set readonly property displayName', () => {
      expect(tenant.displayName).to.equal('TENANT-DISPLAY-NAME');
    });

    it('should set readonly property emailSignInConfig', () => {
      const expectedEmailSignInConfig = new EmailSignInConfig({
        allowPasswordSignup: true,
        enableEmailLinkSignin: true,
      });
      expect(tenant.emailSignInConfig).to.deep.equal(expectedEmailSignInConfig);
    });

    it('should set readonly property multiFactorConfig', () => {
      const expectedMultiFactorConfig = new MultiFactorAuthConfig({
        state: 'ENABLED',
        enabledProviders: ['PHONE_SMS'],
        providerConfigs: [
          {
            state: 'ENABLED',
            totpProviderConfig: {
              adjacentIntervals: 5,
            },
          },
        ],
      });
      expect(tenant.multiFactorConfig).to.deep.equal(expectedMultiFactorConfig);
    });

    it('should set readonly property recaptchaConfig', () => {
      const serverRequestWithRecaptchaCopy: TenantServerResponse =
       deepCopy(serverResponseWithRecaptcha);
      const tenantWithRecaptcha = new Tenant(serverRequestWithRecaptchaCopy);
      const expectedRecaptchaConfig = new RecaptchaAuthConfig({
        emailPasswordEnforcementState: 'AUDIT',
        managedRules: [{
          endScore: 0.2,
          action: 'BLOCK'
        }],
        recaptchaKeys: [ {
          type: 'WEB',
          key: 'test-key-1' }
        ],
        useAccountDefender: true,
      });
      expect(tenantWithRecaptcha.recaptchaConfig).to.deep.equal(expectedRecaptchaConfig);
    });

    it('should set readonly property testPhoneNumbers', () => {
      expect(tenant.testPhoneNumbers).to.deep.equal(
        deepCopy(clientRequest.testPhoneNumbers));
    });

    it('should set readonly property smsRegionConfig', () => {
      expect(tenant.smsRegionConfig).to.deep.equal(
        deepCopy(clientRequest.smsRegionConfig));
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
        name: 'projects/project1/tenants/TENANT-ID',
        displayName: 'TENANT-DISPLAY-NAME',
      };
      expect(() => {
        const tenantWithoutAllowPasswordSignup = new Tenant(serverResponse);

        expect(tenantWithoutAllowPasswordSignup.displayName).to.equal(serverResponse.displayName);
        expect(tenantWithoutAllowPasswordSignup.tenantId).to.equal('TENANT-ID');
        expect(tenantWithoutAllowPasswordSignup.emailSignInConfig).to.exist;
        expect(tenantWithoutAllowPasswordSignup.emailSignInConfig!.enabled).to.be.false;
        expect(tenantWithoutAllowPasswordSignup.emailSignInConfig!.passwordRequired).to.be.true;
      }).not.to.throw();
    });
  });

  describe('toJSON()', () => {
    const serverRequestCopy: TenantServerResponse = deepCopy(serverResponseWithRecaptcha);
    it('should return the expected object representation of a tenant', () => {
      expect(new Tenant(serverRequestCopy).toJSON()).to.deep.equal({
        tenantId: 'TENANT-ID',
        displayName: 'TENANT-DISPLAY-NAME',
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false,
        },
        anonymousSignInEnabled: false,
        multiFactorConfig: deepCopy(clientRequest.multiFactorConfig),
        testPhoneNumbers: deepCopy(clientRequest.testPhoneNumbers),
        smsRegionConfig: deepCopy(clientRequest.smsRegionConfig),
        recaptchaConfig: deepCopy(serverResponseWithRecaptcha.recaptchaConfig),
      });
    });

    it('should not populate optional fields if not available', () => {
      const serverRequestCopyWithoutMfa: TenantServerResponse = deepCopy(serverResponseWithRecaptcha);
      delete serverRequestCopyWithoutMfa.mfaConfig;
      delete serverRequestCopyWithoutMfa.testPhoneNumbers;
      delete serverRequestCopyWithoutMfa.smsRegionConfig;
      delete serverRequestCopyWithoutMfa.recaptchaConfig;

      expect(new Tenant(serverRequestCopyWithoutMfa).toJSON()).to.deep.equal({
        tenantId: 'TENANT-ID',
        displayName: 'TENANT-DISPLAY-NAME',
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false,
        },
        anonymousSignInEnabled: false,
      });
    });
  });
});

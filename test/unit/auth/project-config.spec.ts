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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import { deepCopy } from '../../../src/utils/deep-copy';
import { RecaptchaAuthConfig } from '../../../src/auth/auth-config';
import {
  ProjectConfig,
  ProjectConfigServerResponse,
  UpdateProjectConfigRequest,
} from '../../../src/auth/project-config';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('ProjectConfig', () => {
  const serverResponse: ProjectConfigServerResponse = {
    smsRegionConfig: {
      allowByDefault: {
        disallowedRegions: [ 'AC', 'AD' ],
      },
    },
    mfa: {
      state: 'DISABLED',
      providerConfigs: [
        {
          state: 'ENABLED',
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    },
    passwordPolicyConfig: {
      passwordPolicyEnforcementState: 'ENFORCE',
      forceUpgradeOnSignin: true,
      passwordPolicyVersions: [
        {
          customStrengthOptions: {
            containsLowercaseCharacter: true,
            containsNonAlphanumericCharacter: true,
            containsNumericCharacter: true,
            containsUppercaseCharacter: true,
            minPasswordLength: 8,
            maxPasswordLength: 30,
          },
        },
      ],
    },
  };

  const updateProjectConfigRequest1: UpdateProjectConfigRequest = {
    smsRegionConfig: {
      allowByDefault: {
        disallowedRegions: [ 'AC', 'AD' ],
      },
    },
    passwordPolicyConfig: {
      enforcementState: 'ENFORCE',
      forceUpgradeOnSignin: true,
      constraints: {
        requireLowercase: true,
        requireNonAlphanumeric: true,
        requireNumeric: true,
        requireUppercase: true,
        minLength: 8,
        maxLength: 30,
      },
    },
  };

  const updateProjectConfigRequest2: UpdateProjectConfigRequest = {
    smsRegionConfig: {
      allowlistOnly: {
        allowedRegions: [ 'AC', 'AD' ],
      },
    },
  };

  const updateProjectConfigRequest3: any = {
    smsRegionConfig: {
      allowlistOnly: {
        allowedRegions: [ 'AC', 'AD' ],
      },
      allowByDefault: {
        disallowedRegions: ['AC', 'AD'],
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
      useAccountDefender: true,
    }
  };

  const updateProjectConfigRequest: UpdateProjectConfigRequest = {
    recaptchaConfig: {
      emailPasswordEnforcementState: 'AUDIT',
      managedRules: [ {
        endScore: 0.2,
        action: 'BLOCK'
      } ],
      useAccountDefender: true,
    }
  };

  describe('buildServerRequest()', () => {

    describe('for an update request', () => {
      it('should throw on null SmsRegionConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.smsRegionConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"SmsRegionConfig" must be a non-null object.');
      });

      it('should throw on invalid SmsRegionConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.smsRegionConfig.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid SmsRegionConfig parameter.');
      });

      it('should throw on invalid allowlistOnly attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest2) as any;
        configOptionsClientRequest.smsRegionConfig.allowlistOnly.disallowedRegions = [ 'AC', 'AD' ];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"disallowedRegions" is not a valid SmsRegionConfig.allowlistOnly parameter.');
      });

      it('should throw on invalid allowByDefault attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.smsRegionConfig.allowByDefault.allowedRegions = [ 'AC', 'AD' ];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"allowedRegions" is not a valid SmsRegionConfig.allowByDefault parameter.');
      });

      it('should throw on non-array disallowedRegions attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.smsRegionConfig.allowByDefault.disallowedRegions = 'non-array';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"SmsRegionConfig.allowByDefault.disallowedRegions" must be a valid string array.');
      });

      it('should throw on non-array allowedRegions attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest2) as any;
        configOptionsClientRequest.smsRegionConfig.allowlistOnly.allowedRegions = 'non-array';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"SmsRegionConfig.allowlistOnly.allowedRegions" must be a valid string array.');
      });

      it('should throw when both allowlistOnly and allowByDefault attributes are presented', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest3) as any;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('SmsRegionConfig cannot have both "allowByDefault" and "allowlistOnly" parameters.');
      });

      it('should not throw on valid client request object', () => {
        const configOptionsClientRequest1 = deepCopy(updateProjectConfigRequest1);
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest1);
        }).not.to.throw;
        const configOptionsClientRequest2 = deepCopy(updateProjectConfigRequest2);
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest2);
        }).not.to.throw;
      });
      it('should throw on null RecaptchaConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig" must be a non-null object.');
      });

      it('should throw on invalid RecaptchaConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid RecaptchaConfig parameter.');
      });

      it('should throw on null emailPasswordEnforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.emailPasswordEnforcementState = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be a valid non-empty string.');
      });

      it('should throw on invalid emailPasswordEnforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig
          .emailPasswordEnforcementState = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be either "OFF", "AUDIT" or "ENFORCE".');
      });

      const invalidUseAccountDefender = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidUseAccountDefender.forEach((useAccountDefender) => {
        it(`should throw given invalid useAccountDefender parameter: ${JSON.stringify(useAccountDefender)}`, () => {
          const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
          configOptionsClientRequest.recaptchaConfig.useAccountDefender = useAccountDefender;
          expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"RecaptchaConfig.useAccountDefender" must be a boolean value".');
        });
      });

      it('should throw on non-array managedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.managedRules = 'non-array';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.managedRules" must be an array of valid "RecaptchaManagedRule".');
      });

      it('should throw on invalid managedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'score': 0.1, 'action': 'BLOCK' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"score" is not a valid RecaptchaManagedRule parameter.');
      });

      it('should throw on invalid RecaptchaManagedRule.action attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'endScore': 0.1, 'action': 'ALLOW' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaManagedRule.action" must be "BLOCK".');
      });

      it('should throw on null PasswordPolicyConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig" must be a non-null object.');
      });

      it('should throw on invalid PasswordPolicyConfig attribute', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.invalidParameter = 'invalid',
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid PasswordPolicyConfig parameter.');
      });

      it('should throw on missing enforcementState', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        delete tenantOptionsClientRequest.passwordPolicyConfig.enforcementState;
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.enforcementState" must be either "ENFORCE" or "OFF".');
      });

      it('should throw on invalid enforcementState', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.enforcementState = 'INVALID_STATE';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.enforcementState" must be either "ENFORCE" or "OFF".');
      });

      it('should throw on invalid forceUpgradeOnSignin', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.forceUpgradeOnSignin = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.forceUpgradeOnSignin" must be a boolean.');
      });

      it('should throw on undefined constraints when state is enforced', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        delete tenantOptionsClientRequest.passwordPolicyConfig.constraints;
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints" must be defined.');
      });
      
      it('should throw on invalid constraints attribute', ()=> {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid PasswordPolicyConfig.constraints parameter.');
      });

      it('should throw on null constraints object', ()=> {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints = null;
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints" must be a non-empty object.');
      });

      it('should throw on invalid constraints object', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints" must be a non-empty object.');
      });

      it('should throw on invalid uppercase type', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.requireUppercase = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireUppercase"' +
         ' must be a boolean.');
      });

      it('should throw on invalid lowercase type', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.requireLowercase = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireLowercase"' +
        ' must be a boolean.');
      });

      it('should throw on invalid numeric type', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.requireNumeric = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireNumeric"' +
        ' must be a boolean.');
      });

      it('should throw on invalid non-alphanumeric type', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.requireNonAlphanumeric = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireNonAlphanumeric"' +
        ' must be a boolean.');
      });

      it('should throw on invalid minLength type', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.minLength = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.minLength" must be a number.');
      });

      it('should throw on invalid maxLength type', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.maxLength = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.maxLength" must be a number.');
      });

      it('should throw on invalid minLength range', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.minLength = 45;
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.minLength"' + 
        ' must be an integer between 6 and 30, inclusive.');
      });

      it('should throw on invalid maxLength range', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.maxLength = 5000;
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.maxLength"' +
        ' must be greater than or equal to minLength and at max 4096.');
      });

      it('should throw if minLength is greater than maxLength', () => {
        const tenantOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.minLength = 20;
        tenantOptionsClientRequest.passwordPolicyConfig.constraints.maxLength = 7;
        expect(() => {
          ProjectConfig.buildServerRequest(tenantOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.maxLength"' +
        ' must be greater than or equal to minLength and at max 4096.');
      });

      const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
      nonObjects.forEach((request) => {
        it('should throw on invalid UpdateProjectConfigRequest:' + JSON.stringify(request), () => {
          expect(() => {
            ProjectConfig.buildServerRequest(request as any);
          }).to.throw('"UpdateProjectConfigRequest" must be a valid non-null object.');
        });
      });

      it('should throw on unsupported attribute for update request', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.unsupported = 'value';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"unsupported" is not a valid UpdateProjectConfigRequest parameter.');
      });
    });
  });

  describe('constructor', () => {
    const serverResponseCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
    const projectConfig = new ProjectConfig(serverResponseCopy);

    it('should not throw on valid initialization', () => {
      expect(() => new ProjectConfig(serverResponse)).not.to.throw();
    });

    it('should set readonly property smsRegionConfig', () => {
      const expectedSmsRegionConfig = {
        allowByDefault: {
          disallowedRegions: [ 'AC', 'AD' ],
        },
      };
      expect(projectConfig.smsRegionConfig).to.deep.equal(expectedSmsRegionConfig);
    });

    it('should set readonly property multiFactorConfig', () => {
      const expectedMultiFactorConfig = {
        state: 'DISABLED',
        providerConfigs: [
          {
            state: 'ENABLED',
            totpProviderConfig: {
              adjacentIntervals: 5,
            },
          },
        ],
      };
      expect(projectConfig.multiFactorConfig).to.deep.equal(expectedMultiFactorConfig);
    });

    it('should set readonly property recaptchaConfig', () => {
      const expectedRecaptchaConfig = new RecaptchaAuthConfig(
        {
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
        }
      );
      expect(projectConfig.recaptchaConfig).to.deep.equal(expectedRecaptchaConfig);
    });

    it('should set readonly property passwordPolicyConfig', () => {
      const expectedPasswordPolicyConfig = {
        enforcementState: 'ENFORCE',
        forceUpgradeOnSignin: true,
        constraints: {
          requireLowercase: true,
          requireNonAlphanumeric: true,
          requireNumeric: true,
          requireUppercase: true,
          minLength: 8,
          maxLength: 30,
        },
      };
      expect(projectConfig.passwordPolicyConfig).to.deep.equal(expectedPasswordPolicyConfig);
    });
  });

  describe('toJSON()', () => {
    const serverResponseCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
    it('should return the expected object representation of project config', () => {
      expect(new ProjectConfig(serverResponseCopy).toJSON()).to.deep.equal({
        smsRegionConfig: deepCopy(serverResponse.smsRegionConfig),
        multiFactorConfig: deepCopy(serverResponse.mfa),
        recaptchaConfig: deepCopy(serverResponse.recaptchaConfig),
        passwordPolicyConfig: deepCopy(serverResponse.passwordPolicyConfig),
      });
    });

    it('should not populate optional fields if not available', () => {
      const serverResponseOptionalCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
      delete serverResponseOptionalCopy.smsRegionConfig;
      delete serverResponseOptionalCopy.mfa;
      delete serverResponseOptionalCopy.recaptchaConfig?.emailPasswordEnforcementState;
      delete serverResponseOptionalCopy.recaptchaConfig?.managedRules;
      delete serverResponseOptionalCopy.recaptchaConfig?.useAccountDefender;
      delete serverResponseOptionalCopy.passwordPolicyConfig;
      expect(new ProjectConfig(serverResponseOptionalCopy).toJSON()).to.deep.equal({
        recaptchaConfig: {
          recaptchaKeys: deepCopy(serverResponse.recaptchaConfig?.recaptchaKeys),
        }
      });
    });
  });
});

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
    emailPrivacyConfig: {
      enableImprovedEmailPrivacy: true,
    },
    recaptchaConfig: {
      emailPasswordEnforcementState: 'AUDIT',
      phoneEnforcementState: 'AUDIT',
      managedRules: [ {
        endScore: 0.2,
        action: 'BLOCK'
      } ],
      tollFraudManagedRules: [ {
        startScore: 0.1,
        action: 'BLOCK'
      } ],
      recaptchaKeys: [ {
        type: 'WEB',
        key: 'test-key-1' }
      ],
      useAccountDefender: true,
      useSmsBotScore: true,
      useSmsTollFraudProtection: true,
    },
    mobileLinksConfig: {
      domain: 'FIREBASE_DYNAMIC_LINK_DOMAIN',
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
    emailPrivacyConfig: {
      enableImprovedEmailPrivacy: false,
    },
    mobileLinksConfig: {
      domain: 'HOSTING_DOMAIN'
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
      phoneEnforcementState: 'AUDIT',
      managedRules: [ {
        endScore: 0.2,
        action: 'BLOCK'
      } ],
      tollFraudManagedRules: [ {
        startScore: 0.1,
        action: 'BLOCK'
      } ],
      recaptchaKeys: [ {
        type: 'WEB',
        key: 'test-key-1' }
      ],
      useAccountDefender: true,
      useSmsBotScore: true,
      useSmsTollFraudProtection: true,
    }
  };

  const updateProjectConfigRequest4: UpdateProjectConfigRequest = {
    recaptchaConfig: {
      emailPasswordEnforcementState: 'AUDIT',
      phoneEnforcementState: 'AUDIT',
      managedRules: [ {
        endScore: 0.2,
        action: 'BLOCK'
      } ],
      smsTollFraudManagedRules: [ {
        startScore: 0.1,
        action: 'BLOCK'
      } ],
      useAccountDefender: true,
      useSmsBotScore: true,
      useSmsTollFraudProtection: true,
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
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig" must be a non-null object.');
      });

      it('should throw on invalid RecaptchaConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid RecaptchaConfig parameter.');
      });

      it('should throw on null phoneEnforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.phoneEnforcementState = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.phoneEnforcementState" must be a valid non-empty string.');
      });

      it('should throw on invalid phoneEnforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig
          .phoneEnforcementState = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.phoneEnforcementState" must be either "OFF", "AUDIT" or "ENFORCE".');
      });
      
      it('should throw on null emailPasswordEnforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.emailPasswordEnforcementState = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be a valid non-empty string.');
      });

      it('should throw on invalid emailPasswordEnforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig
          .emailPasswordEnforcementState = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.emailPasswordEnforcementState" must be either "OFF", "AUDIT" or "ENFORCE".');
      });

      const invalidUseAccountDefender = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidUseAccountDefender.forEach((useAccountDefender) => {
        it(`should throw given invalid useAccountDefender parameter: ${JSON.stringify(useAccountDefender)}`, () => {
          const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
          configOptionsClientRequest.recaptchaConfig.useAccountDefender = useAccountDefender;
          expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"RecaptchaConfig.useAccountDefender" must be a boolean value".');
        });
      });
      
      const invalidUseSmsBotScore = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidUseSmsBotScore.forEach((useSmsBotScore) => {
        it(`should throw given invalid useSmsBotScore parameter: ${JSON.stringify(useSmsBotScore)}`, () => {
          const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
          configOptionsClientRequest.recaptchaConfig.useSmsBotScore = useSmsBotScore;
          expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"RecaptchaConfig.useSmsBotScore" must be a boolean value".');
        });
      });
      
      const invalidUseSmsTollFraudProtection = [null, NaN, 0, 1, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
      invalidUseSmsTollFraudProtection.forEach((useSmsTollFraudProtection) => {
        it(`should throw given invalid useSmsTollFraudProtection parameter: ' + 
          '${JSON.stringify(useSmsTollFraudProtection)}`, () => {
          const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
          configOptionsClientRequest.recaptchaConfig.useSmsTollFraudProtection = useSmsTollFraudProtection;
          expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"RecaptchaConfig.useSmsTollFraudProtection" must be a boolean value".');
        });
      });

      it('should throw on non-array managedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.managedRules = 'non-array';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.managedRules" must be an array of valid "RecaptchaManagedRule".');
      });

      it('should throw on invalid managedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'score': 0.1, 'action': 'BLOCK' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"score" is not a valid RecaptchaManagedRule parameter.');
      });

      it('should throw on invalid RecaptchaManagedRule.action attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.managedRules =
        [{ 'endScore': 0.1, 'action': 'ALLOW' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaManagedRule.action" must be "BLOCK".');
      });
      
      it('should throw on non-array smsTollFraudManagedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.smsTollFraudManagedRules = 'non-array';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaConfig.smsTollFraudManagedRules" must be an array of valid ' + 
          '"RecaptchaTollFraudManagedRule".');
      });

      it('should throw on invalid smsTollFraudManagedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.smsTollFraudManagedRules =
        [{ 'score': 0.1, 'action': 'BLOCK' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"score" is not a valid RecaptchaTollFraudManagedRule parameter.');
      });

      it('should throw on invalid RecaptchaManagedRule.action attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
        configOptionsClientRequest.recaptchaConfig.smsTollFraudManagedRules =
        [{ 'startScore': 0.1, 'action': 'ALLOW' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaTollFraudManagedRule.action" must be "BLOCK".');
      });

      it('should throw on null PasswordPolicyConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig" must be a non-null object.');
      });

      it('should throw on invalid PasswordPolicyConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.invalidParameter = 'invalid',
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid PasswordPolicyConfig parameter.');
      });

      it('should throw on missing enforcementState', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        delete configOptionsClientRequest.passwordPolicyConfig.enforcementState;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.enforcementState" must be either "ENFORCE" or "OFF".');
      });

      it('should throw on invalid enforcementState', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.enforcementState = 'INVALID_STATE';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.enforcementState" must be either "ENFORCE" or "OFF".');
      });

      it('should throw on invalid forceUpgradeOnSignin', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.forceUpgradeOnSignin = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.forceUpgradeOnSignin" must be a boolean.');
      });

      it('should throw on undefined constraints when state is enforced', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        delete configOptionsClientRequest.passwordPolicyConfig.constraints;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints" must be defined.');
      });
      
      it('should throw on invalid constraints attribute', ()=> {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid PasswordPolicyConfig.constraints parameter.');
      });

      it('should throw on null constraints object', ()=> {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints" must be a non-empty object.');
      });

      it('should throw on invalid constraints object', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints" must be a non-empty object.');
      });

      it('should throw on invalid uppercase type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.requireUppercase = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireUppercase"' +
         ' must be a boolean.');
      });

      it('should throw on invalid lowercase type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.requireLowercase = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireLowercase"' +
        ' must be a boolean.');
      });

      it('should throw on invalid numeric type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.requireNumeric = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireNumeric"' +
        ' must be a boolean.');
      });

      it('should throw on invalid non-alphanumeric type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.requireNonAlphanumeric = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requireNonAlphanumeric"' +
        ' must be a boolean.');
      });

      it('should throw on invalid minLength type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.minLength = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.minLength" must be a number.');
      });

      it('should throw on invalid maxLength type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.maxLength = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.maxLength" must be a number.');
      });

      it('should throw on invalid minLength range', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.minLength = 45;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.minLength"' + 
        ' must be an integer between 6 and 30, inclusive.');
      });

      it('should throw on invalid maxLength range', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.maxLength = 5000;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.maxLength"' +
        ' must be greater than or equal to minLength and at max 4096.');
      });

      it('should throw if minLength is greater than maxLength', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.constraints.minLength = 20;
        configOptionsClientRequest.passwordPolicyConfig.constraints.maxLength = 7;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.maxLength"' +
        ' must be greater than or equal to minLength and at max 4096.');
      });

      it('should throw on null EmailPrivacyConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.emailPrivacyConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"EmailPrivacyConfig" must be a non-null object.');
      });

      it('should throw on invalid EmailPrivacyConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.emailPrivacyConfig.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid "EmailPrivacyConfig" parameter.');
      });

      it('should throw on invalid enableImprovedEmailPrivacy attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.emailPrivacyConfig.enableImprovedEmailPrivacy = [];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"EmailPrivacyConfig.enableImprovedEmailPrivacy" must be a valid boolean value.');
      });

      it('should throw on invalid MobileLinksConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.mobileLinksConfig.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid "MobileLinksConfig" parameter.');
      });

      it('should throw on invalid domain attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.mobileLinksConfig.domain = 'random domain';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"MobileLinksConfig.domain" must be either "HOSTING_DOMAIN" or "FIREBASE_DYNAMIC_LINK_DOMAIN".');
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
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest4) as any;
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
        factorIds: [],
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
      const expectedRecaptchaConfig = {
        emailPasswordEnforcementState: 'AUDIT',
        phoneEnforcementState: 'AUDIT',
        managedRules: [ {
          endScore: 0.2,
          action: 'BLOCK'
        } ],
        smsTollFraudManagedRules: [ {
          startScore: 0.1,
          action: 'BLOCK'
        } ],
        recaptchaKeys: [ {
          type: 'WEB',
          key: 'test-key-1' }
        ],
        useAccountDefender: true,
        useSmsBotScore: true,
        useSmsTollFraudProtection: true,
      };
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

    it('should set readonly property emailPrivacyConfig', () => {
      const expectedEmailPrivacyConfig = {
        enableImprovedEmailPrivacy: true,
      };
      expect(projectConfig.emailPrivacyConfig).to.deep.equal(expectedEmailPrivacyConfig);
    });

    it('should set readonly property mobileLinksConfig', () => {
      const expectedMobileLinksConfig = {
        domain: 'FIREBASE_DYNAMIC_LINK_DOMAIN',
      };
      expect(projectConfig.mobileLinksConfig).to.deep.equal(expectedMobileLinksConfig);
    });
  });

  describe('toJSON()', () => {
    const serverResponseCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
    it('should return the expected object representation of project config', () => {
      expect(new ProjectConfig(serverResponseCopy).toJSON()).to.deep.equal({
        smsRegionConfig: {
          allowByDefault: {
            disallowedRegions: [ 'AC', 'AD' ],
          },
        },
        multiFactorConfig: {
          state: 'DISABLED',
          factorIds: [],
          providerConfigs: [
            {
              state: 'ENABLED',
              totpProviderConfig: {
                adjacentIntervals: 5,
              },
            },
          ],
        },
        recaptchaConfig: {
          emailPasswordEnforcementState: 'AUDIT',
          phoneEnforcementState: 'AUDIT',
          managedRules: [ {
            endScore: 0.2,
            action: 'BLOCK'
          } ],
          smsTollFraudManagedRules: [ {
            startScore: 0.1,
            action: 'BLOCK'
          } ],
          recaptchaKeys: [ {
            type: 'WEB',
            key: 'test-key-1' }
          ],
          useAccountDefender: true,
          useSmsBotScore: true,
          useSmsTollFraudProtection: true,
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
        emailPrivacyConfig: {
          enableImprovedEmailPrivacy: true,
        },
        mobileLinksConfig: deepCopy(serverResponse.mobileLinksConfig),
      });
    });

    it('should not populate optional fields if not available', () => {
      const serverResponseOptionalCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
      delete serverResponseOptionalCopy.smsRegionConfig;
      delete serverResponseOptionalCopy.mfa;
      delete serverResponseOptionalCopy.recaptchaConfig?.emailPasswordEnforcementState;
      delete serverResponseOptionalCopy.recaptchaConfig?.managedRules;
      delete serverResponseOptionalCopy.recaptchaConfig?.useAccountDefender;
      delete serverResponseOptionalCopy.recaptchaConfig?.useSmsBotScore;
      delete serverResponseOptionalCopy.recaptchaConfig?.phoneEnforcementState;
      delete serverResponseOptionalCopy.recaptchaConfig?.tollFraudManagedRules;
      delete serverResponseOptionalCopy.recaptchaConfig?.useSmsTollFraudProtection
      delete serverResponseOptionalCopy.passwordPolicyConfig;
      delete serverResponseOptionalCopy.emailPrivacyConfig;
      delete serverResponseOptionalCopy.mobileLinksConfig;
      expect(new ProjectConfig(serverResponseOptionalCopy).toJSON()).to.deep.equal({
        recaptchaConfig: {
          recaptchaKeys: deepCopy(serverResponse.recaptchaConfig?.recaptchaKeys),
        }
      });
    });
  });
});

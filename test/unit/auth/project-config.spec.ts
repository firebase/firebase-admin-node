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
      passwordPolicyVersions: [
        {
          constraints: {
            requiredCharacters: {
              lowercase: true,
              nonAlphanumeric: true,
              numeric: true,
              uppercase: true,
            },
            minLength: 8,
            maxLength: 30,
          },
        },
      ],
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

      it('should throw on invalid passwordPolicyVersions', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PassworPolicyConfig.passwordPolicyVersions" must be a non-empty array.');
      });

      it('should throw on empty passwordPolicyVersions when state is enforced', () => {
          const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
          configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions = [];
          expect(() => {
              ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"PassworPolicyConfig.passwordPolicyVersions" must be a non-empty array.');
      });

      it('should throw on null passwordPolicyVersion object', ()=> {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
          configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0] = null;
          expect(() => {
              ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"Constraints" must be specified.');
      });
      
      it('should throw on invalid passwordPolicyVersion attribute', ()=> {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
          configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].invalidParameter = 'invalid';
          expect(() => {
              ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"invalidParameter" is not a valid PasswordPolicyConfig.PasswordPolicyVersions parameter.');
      });

      it('should throw on null constraints object', ()=> {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
          configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints = null;
          expect(() => {
              ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"PasswordPolicyConfig.constraints" must be a non-null object.');
      });

      it('should throw on invalid constraints object', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
          configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints = 'invalid';
          expect(() => {
              ProjectConfig.buildServerRequest(configOptionsClientRequest);
          }).to.throw('"PasswordPolicyConfig.constraints" must be a non-null object.');
      });

      it('should throw on invalid constraints attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.invalidParameter = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid PasswordPolicyConfig.passwordPolicyVersions.constraints parameter.');
      });

      it('should throw on invalid minLength type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.minLength = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.minLength" must be a number.');
      });

      it('should throw on invalid maxLength type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.maxLength = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.maxLength" must be a number.');
      });

      it('should throw on invalid minLength range', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.minLength = 45;
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.minLength" must be an integer between 6 and 30, inclusive.');
      });

      it('should throw on invalid maxLength range', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.maxLength = 5000;
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.maxLength" must be greater than or equal to minLength and at max 4096.');
      });

      it('should throw if minLength is greater than maxLength', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.minLength = 20;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.maxLength = 7;
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.maxLength" must be greater than or equal to minLength and at max 4096.');
      });

      it('should throw on invalid requiredCharacters attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.requiredCharacters.invalidParameter = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid RequiredCharacters parameter.');
      });

      it('should throw on invalid requiredCharacters object', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.requiredCharacters = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.constraints.requiredCharacters" must be a valid object.');
      });

      it('should throw on invalid uppercase type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.requiredCharacters.uppercase = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.requiredCharacters.uppercase" must be a boolean.');
      });

      it('should throw on invalid lowercase type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.requiredCharacters.lowercase = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.requiredCharacters.lowercase" must be a boolean.');
      });

      it('should throw on invalid numeric type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.requiredCharacters.numeric = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.requiredCharacters.numeric" must be a boolean.');
      });

      it('should throw on invalid non-alphanumeric type', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
        configOptionsClientRequest.passwordPolicyConfig.passwordPolicyVersions[0].constraints.requiredCharacters.nonAlphanumeric = 'invalid';
        expect(() => {
            ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"PasswordPolicyConfig.passwordPolicyVersions.constraints.requiredCharacters.nonAlphanumeric" must be a boolean.');
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
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest1) as any;
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

    it('should set readonly property passwordPolicyConfig', () => {
      const expectedPasswordPolicyConfig = {
        enforcementState: 'ENFORCE',
        forceUpgradeOnSignin: true,
        passwordPolicyVersions: [
          {
            constraints: {
              requiredCharacters: {
                lowercase: true,
                nonAlphanumeric: true,
                numeric: true,
                uppercase: true,
              },
              minLength: 8,
              maxLength: 30,
            },
          },
        ],
      };
      expect(projectConfig.passwordPolicyConfig).to.deep.equal(expectedPasswordPolicyConfig);
    });
  });

  describe('toJSON()', () => {
    const serverResponseCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
    it('should return the expected object representation of project config', () => {
      expect(new ProjectConfig(serverResponseCopy).toJSON()).to.deep.equal({
        smsRegionConfig: deepCopy(serverResponse.smsRegionConfig),
        passwordPolicyConfig: {
          enforcementState: 'ENFORCE',
          forceUpgradeOnSignin: true,
          passwordPolicyVersions: [
            {
              constraints: {
                requiredCharacters: {
                  lowercase: true,
                  nonAlphanumeric: true,
                  numeric: true,
                  uppercase: true,
                },
                minLength: 8,
                maxLength: 30,
              },
            },
          ],
        },
      });
    });

    it('should not populate optional fields if not available', () => {
      const serverResponseOptionalCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
      delete serverResponseOptionalCopy.smsRegionConfig;
      delete serverResponseOptionalCopy.passwordPolicyConfig;
      expect(new ProjectConfig(serverResponseOptionalCopy).toJSON()).to.deep.equal({});
    });
  });
});
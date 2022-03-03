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
import { RecaptchaConfigAuth } from '../../../src/auth/auth-config';
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
    emailPasswordRecaptchaConfig: {
      enforcementState: 'OFF'
    },
    recaptchaManagedRules: {
      ruleConfigs: [{
        endScore: 0.2,
        action: 'BLOCK'
      }] },
    recaptchaKeyConfig: [ {
      clientType: 'WEB',
      recaptchaKey: 'test-key-1' }
    ],
  };

  const updateProjectConfigRequest: UpdateProjectConfigRequest = {
    recaptchaConfig: {
      recaptchaManagedRules: {
        ruleConfigs: [{
          endScore: 0.2,
          action: 'BLOCK'
        }] },
      emailPasswordRecaptchaConfig: {
        enforcementState: 'OFF'
      },
    }
  };

  describe('buildServerRequest()', () => {

    describe('for an update request', () => {
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

      it('should throw on null ProviderRecaptchaConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.emailPasswordRecaptchaConfig = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"ProviderRecaptchaConfig" must be a non-null object.');
      });

      it('should throw on invalid ProviderRecaptchaConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig
          .emailPasswordRecaptchaConfig.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid ProviderRecaptchaConfig parameter.');
      });

      it('should throw on invalid ProviderRecaptchaConfig.enforcementState attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig
          .emailPasswordRecaptchaConfig.enforcementState = 'INVALID';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"ProviderRecaptchaAuthConfig.enforcementState" must be either "OFF", "AUDIT" or "ENFORCE".');
      });

      it('should throw on null RuleConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.recaptchaManagedRules = null;
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RuleConfig" must be a non-null object.');
      });

      it('should throw on invalid RecaptchaManagedRules attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.recaptchaManagedRules.invalidParameter = 'invalid';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"invalidParameter" is not a valid RecaptchaManagedRules parameter.');
      });

      it('should throw on non-array RuleConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.recaptchaManagedRules.ruleConfigs = 'non-array';
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RecaptchaManagedRules.ruleConfigs" must be an array of valid "RuleConfig".');
      });

      it('should throw on invalid RuleConfig attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.recaptchaManagedRules.ruleConfigs =
        [{ 'score': 0.1, 'action': 'BLOCK' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"score" is not a valid RuleConfig parameter.');
      });

      it('should throw on invalid RuleConfig.action attribute', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest) as any;
        configOptionsClientRequest.recaptchaConfig.recaptchaManagedRules.ruleConfigs =
        [{ 'endScore': 0.1, 'action': 'ALLOW' }];
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).to.throw('"RuleConfig.action" must be "BLOCK".');
      });

      it('should not throw on valid client request object', () => {
        const configOptionsClientRequest = deepCopy(updateProjectConfigRequest);
        expect(() => {
          ProjectConfig.buildServerRequest(configOptionsClientRequest);
        }).not.to.throw;
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

    it('should set readonly property recaptchaConfig', () => {
      const expectedRecaptchaConfig = new RecaptchaConfigAuth(
        { enforcementState: 'OFF' },
        {
          ruleConfigs: [{
            endScore: 0.2,
            action: 'BLOCK'
          }] },
        [{
          clientType: 'WEB',
          recaptchaKey: 'test-key-1' }
        ],
      );
      expect(projectConfig.recaptchaConfig).to.deep.equal(expectedRecaptchaConfig);
    });
  });

  describe('toJSON()', () => {
    const serverResponseCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
    it('should return the expected object representation of project config', () => {
      expect(new ProjectConfig(serverResponseCopy).toJSON()).to.deep.equal({
        recaptchaConfig: {
          emailPasswordRecaptchaConfig: deepCopy(serverResponse.emailPasswordRecaptchaConfig),
          recaptchaKeyConfig: deepCopy(serverResponse.recaptchaKeyConfig),
          recaptchaManagedRules: deepCopy(serverResponse.recaptchaManagedRules),
        }
      });
    });

    it('should not populate optional fields if not available', () => {
      const serverResponseOptionalCopy: ProjectConfigServerResponse = deepCopy(serverResponse);
      delete serverResponseOptionalCopy.emailPasswordRecaptchaConfig;
      delete serverResponseOptionalCopy.recaptchaManagedRules;

      expect(new ProjectConfig(serverResponseOptionalCopy).toJSON()).to.deep.equal({
        recaptchaConfig: {
          recaptchaKeyConfig: deepCopy(serverResponse.recaptchaKeyConfig),
        }
      });
    });
  });
});

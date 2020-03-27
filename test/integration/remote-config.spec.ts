/*!
 * Copyright 2020 Google Inc.
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

import * as admin from '../../lib/index';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

const VALID_PARAMETERS: { [key: string]: admin.remoteConfig.RemoteConfigParameter } = {
  // eslint-disable-next-line @typescript-eslint/camelcase
  holiday_promo_enabled: {
    defaultValue: { useInAppDefault: true },
    description: 'promo indicator'
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  welcome_message: {
    defaultValue: { value: 'welcome text' },
    conditionalValues: {
      ios: { value: 'welcome ios text' },
      andriod: { value: 'welcome andriod text' },
    },
  }
};

const VALID_CONDITIONS: admin.remoteConfig.RemoteConfigCondition[] = [{
  name: 'ios',
  expression: 'device.os == \'ios\'',
  tagColor: 'BLUE'
},
{
  name: 'andriod',
  expression: 'device.os == \'android\'',
  tagColor: 'GREEN'
}];

const INVALID_PARAMETERS: any[] = [null, '', 'abc', 1, true, []];
const INVALID_CONDITIONS: any[] = [null, '', 'abc', 1, true, {}];
const INVALID_TEMPLATES: any[] = [{ parameters: {}, conditions: [], etag: '' }, Object(), null];

let currentTemplate: admin.remoteConfig.RemoteConfigTemplate;

describe('admin.remoteConfig', () => {
  before(async () => {
    // obtain the most recent template (etag) to perform operations
    currentTemplate = await admin.remoteConfig().getTemplate();
  });

  it('verify that the etag is read-only', () => {
    expect(() => {
      (currentTemplate as any).etag = "new-etag";
    }).to.throw('Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter');
  });

  it('verfy that getTemplate() returns a template with a valid etag format', () => {
    return admin.remoteConfig().getTemplate()
      .then((template) => {
        expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
      });
  });

  describe('validateTemplate', () => {
    it('should succeed with a vaild template', () => {
      // set parameters and conditions
      currentTemplate.conditions = VALID_CONDITIONS;
      currentTemplate.parameters = VALID_PARAMETERS;
      return admin.remoteConfig().validateTemplate(currentTemplate)
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.conditions.length).to.equal(2);
          expect(template.conditions).to.deep.equal(VALID_CONDITIONS);
          expect(template.parameters).to.deep.equal(VALID_PARAMETERS);
        });
    });

    INVALID_PARAMETERS.forEach((invalidParameter) => {
      it(`should throw if the parameters is ${JSON.stringify(invalidParameter)}`, () => {
        (currentTemplate as any).parameters = invalidParameter;
        currentTemplate.conditions = VALID_CONDITIONS;
        expect(() => admin.remoteConfig().validateTemplate(currentTemplate))
          .to.throw('Remote Config parameters must be a non-null object');
      });
    });

    INVALID_CONDITIONS.forEach((invalidConditions) => {
      it(`should throw if the parameters is ${JSON.stringify(invalidConditions)}`, () => {
        (currentTemplate as any).conditions = invalidConditions;
        currentTemplate.parameters = VALID_PARAMETERS;
        expect(() => admin.remoteConfig().validateTemplate(currentTemplate))
          .to.throw('Remote Config conditions must be an array');
      });
    });

    INVALID_TEMPLATES.forEach((invalidTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidTemplate)}`, () => {
        expect(() => admin.remoteConfig().validateTemplate(invalidTemplate))
          .to.throw(`Invalid Remote Config template: ${JSON.stringify(invalidTemplate)}`);
      });
    });

    it('rejects with invalid-argument when conditions used in parameters do not exist', () => {
      currentTemplate.conditions = [];
      currentTemplate.parameters = VALID_PARAMETERS;
      return admin.remoteConfig().validateTemplate(currentTemplate).should.eventually.be.rejected.and.have.property('code', 'remote-config/invalid-argument');
    });
  });

  describe('publishTemplate', () => {
    /*
    it('should succeed with a vaild template', () => {
      // set parameters and conditions
      currentTemplate.conditions = VALID_CONDITIONS;
      currentTemplate.parameters = VALID_PARAMETERS;
      return admin.remoteConfig().publishTemplate(currentTemplate)
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.conditions.length).to.equal(2);
          expect(template.conditions).to.deep.equal(VALID_CONDITIONS);
          expect(template.parameters).to.deep.equal(VALID_PARAMETERS);
        });
    });*/

    INVALID_PARAMETERS.forEach((invalidParameter) => {
      it(`should throw if the parameters is ${JSON.stringify(invalidParameter)}`, () => {
        (currentTemplate as any).parameters = invalidParameter;
        currentTemplate.conditions = VALID_CONDITIONS;
        expect(() => admin.remoteConfig().publishTemplate(currentTemplate))
          .to.throw('Remote Config parameters must be a non-null object');
      });
    });

    INVALID_CONDITIONS.forEach((invalidConditions) => {
      it(`should throw if the parameters is ${JSON.stringify(invalidConditions)}`, () => {
        (currentTemplate as any).conditions = invalidConditions;
        currentTemplate.parameters = VALID_PARAMETERS;
        expect(() => admin.remoteConfig().publishTemplate(currentTemplate))
          .to.throw('Remote Config conditions must be an array');
      });
    });

    INVALID_TEMPLATES.forEach((invalidTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidTemplate)}`, () => {
        expect(() => admin.remoteConfig().publishTemplate(invalidTemplate))
          .to.throw(`Invalid Remote Config template: ${JSON.stringify(invalidTemplate)}`);
      });
    });
  });
});

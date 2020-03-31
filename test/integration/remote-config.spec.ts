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
import { deepCopy } from '../../src/utils/deep-copy';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

const VALID_PARAMETERS = {
  // eslint-disable-next-line @typescript-eslint/camelcase
  holiday_promo_enabled: {
    defaultValue: { useInAppDefault: true },
    description: 'promo indicator'
  },
  // eslint-disable-next-line @typescript-eslint/camelcase
  welcome_message: {
    defaultValue: { value: 'welcome text' + Date.now() },
    conditionalValues: {
      ios: { value: 'welcome ios text' },
      andriod: { value: 'welcome andriod text' },
    },
  }
};

const VALID_CONDITIONS = [{
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
const INVALID_ETAG_TEMPLATES: any[] = [{ parameters: {}, conditions: [], etag: '' }, Object()];
const INVALID_TEMPLATES: any[] = [null, 'abc', 123];

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

    INVALID_ETAG_TEMPLATES.forEach((invalidEtagTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidEtagTemplate)}`, () => {
        expect(() => admin.remoteConfig().validateTemplate(invalidEtagTemplate))
          .to.throw('ETag must be a non-empty string.');
      });
    });

    INVALID_TEMPLATES.forEach((invalidTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidTemplate)}`, () => {
        expect(() => admin.remoteConfig().validateTemplate(invalidTemplate))
          .to.throw(`Invalid Remote Config template: ${JSON.stringify(invalidTemplate)}`);
      });
    });

    it('should propagate API errors', () => {
      // rejects with invalid-argument when conditions used in parameters do not exist
      currentTemplate.conditions = [];
      currentTemplate.parameters = VALID_PARAMETERS;
      return admin.remoteConfig().validateTemplate(currentTemplate)
        .should.eventually.be.rejected.and.have.property('code', 'remote-config/invalid-argument');
    });
  });

  describe('publishTemplate', () => {
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
    });

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

    INVALID_ETAG_TEMPLATES.forEach((invalidTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidTemplate)}`, () => {
        expect(() => admin.remoteConfig().publishTemplate(invalidTemplate))
          .to.throw('ETag must be a non-empty string.');
      });
    });

    INVALID_TEMPLATES.forEach((invalidTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidTemplate)}`, () => {
        expect(() => admin.remoteConfig().publishTemplate(invalidTemplate))
          .to.throw(`Invalid Remote Config template: ${JSON.stringify(invalidTemplate)}`);
      });
    });

    it(`should throw if the template is null`, () => {
      expect(() => admin.remoteConfig().publishTemplate(null as any))
        .to.throw(`Invalid Remote Config template: null`);
    });

    it('should propagate API errors', () => {
      // rejects with invalid-argument when conditions used in parameters do not exist
      currentTemplate.conditions = [];
      currentTemplate.parameters = VALID_PARAMETERS;
      return admin.remoteConfig().publishTemplate(currentTemplate)
        .should.eventually.be.rejected.and.have.property('code', 'remote-config/invalid-argument');
    });
  });

  describe('getTemplate', () => {
    it('verfy that getTemplate() returns the most recently published template', () => {
      return admin.remoteConfig().getTemplate()
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.conditions.length).to.equal(2);
          expect(template.conditions).to.deep.equal(VALID_CONDITIONS);
          expect(template.parameters).to.deep.equal(VALID_PARAMETERS);
        });
    });
  });

  describe('createTemplateFromJSON', () => {
    const INVALID_STRINGS: any[] = [null, undefined, '', 1, true, {}, []];
    const INVALID_JSON_STRINGS: any[] = ['abc', 'foo', 'a:a', '1:1'];

    INVALID_STRINGS.forEach((invalidJson) => {
      it(`should throw if the json string is ${JSON.stringify(invalidJson)}`, () => {
        expect(() => admin.remoteConfig().createTemplateFromJSON(invalidJson))
          .to.throw('JSON string must be a valid non-empty string');
      });
    });

    INVALID_JSON_STRINGS.forEach((invalidJson) => {
      it(`should throw if the json string is ${JSON.stringify(invalidJson)}`, () => {
        expect(() => admin.remoteConfig().createTemplateFromJSON(invalidJson))
          .to.throw(/^Failed to parse the JSON string: ([\D\w]*)\. SyntaxError: Unexpected token ([\D\w]*) in JSON at position ([0-9]*)$/);
      });
    });

    const invalidEtags = [...INVALID_STRINGS];
    const sourceTemplate = {
      parameters: VALID_PARAMETERS,
      conditions: VALID_CONDITIONS,
      etag: 'etag-1234-1',
    };

    const invalidEtagTemplate = deepCopy(sourceTemplate)
    invalidEtags.forEach((invalidEtag) => {
      invalidEtagTemplate.etag = invalidEtag;
      const jsonString = JSON.stringify(invalidEtagTemplate);
      it(`should throw if the ETag is ${JSON.stringify(invalidEtag)}`, () => {
        expect(() => admin.remoteConfig().createTemplateFromJSON(jsonString))
          .to.throw(`Invalid Remote Config template response: ${jsonString}`);
      });
    });

    const invalidParamsTemplate = deepCopy(sourceTemplate)
    INVALID_PARAMETERS.forEach((invalidParameter) => {
      invalidParamsTemplate.parameters = invalidParameter;
      const jsonString = JSON.stringify(invalidParamsTemplate);
      it(`should throw if the parameters is ${JSON.stringify(invalidParameter)}`, () => {
        expect(() => admin.remoteConfig().createTemplateFromJSON(jsonString))
          .to.throw('Remote Config parameters must be a non-null object');
      });
    });

    const invalidConditionsTemplate = deepCopy(sourceTemplate)
    INVALID_CONDITIONS.forEach((invalidConditions) => {
      invalidConditionsTemplate.conditions = invalidConditions;
      const jsonString = JSON.stringify(invalidConditionsTemplate);
      it(`should throw if the conditions is ${JSON.stringify(invalidConditions)}`, () => {
        expect(() => admin.remoteConfig().createTemplateFromJSON(jsonString))
          .to.throw('Remote Config conditions must be an array');
      });
    });

    it('should succeed when a valid json string is provided', () => {
      const jsonString = JSON.stringify(sourceTemplate);
      const newTemplate = admin.remoteConfig().createTemplateFromJSON(jsonString);
      expect(newTemplate.etag).to.equal(sourceTemplate.etag);
      expect(() => {
        (currentTemplate as any).etag = "new-etag";
      }).to.throw(
        'Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter'
      );
      expect(newTemplate.conditions.length).to.equal(2);
      expect(newTemplate.conditions).to.deep.equal(VALID_CONDITIONS);
      expect(newTemplate.parameters).to.deep.equal(VALID_PARAMETERS);
    });
  });
});

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
    defaultValue: { value: `welcome text ${Date.now()}` },
    conditionalValues: {
      ios: { value: 'welcome ios text' },
      android: { value: 'welcome android text' },
    },
  }
};

const VALID_PARAMETER_GROUPS = {
  // eslint-disable-next-line @typescript-eslint/camelcase
  new_menu: {
    description: 'Description of the group.',
    parameters: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      pumpkin_spice_season: {
        defaultValue: { value: 'A Gryffindor must love a pumpkin spice latte.' },
        conditionalValues: {
          'android': { value: 'A Droid must love a pumpkin spice latte.' },
        },
        description: 'Description of the parameter.',
      },
    },
  },
};

const VALID_CONDITIONS: admin.remoteConfig.RemoteConfigCondition[] = [
  {
    name: 'ios',
    expression: 'device.os == \'ios\'',
    tagColor: 'INDIGO',
  },
  {
    name: 'android',
    expression: 'device.os == \'android\'',
    tagColor: 'GREEN',
  },
];

const VALID_VERSION = {
  description: `template description ${Date.now()}`,
}

let currentTemplate: admin.remoteConfig.RemoteConfigTemplate;

describe('admin.remoteConfig', () => {
  before(async () => {
    // obtain the most recent template (etag) to perform operations
    currentTemplate = await admin.remoteConfig().getTemplate();
  });

  it('verify that the etag is read-only', () => {
    expect(() => {
      (currentTemplate as any).etag = 'new-etag';
    }).to.throw('Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter');
  });

  describe('validateTemplate', () => {
    it('should succeed with a vaild template', () => {
      // set parameters, groups, and conditions
      currentTemplate.conditions = VALID_CONDITIONS;
      currentTemplate.parameters = VALID_PARAMETERS;
      currentTemplate.parameterGroups = VALID_PARAMETER_GROUPS;
      currentTemplate.version = VALID_VERSION;
      return admin.remoteConfig().validateTemplate(currentTemplate)
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.conditions.length).to.equal(2);
          expect(template.conditions).to.deep.equal(VALID_CONDITIONS);
          expect(template.parameters).to.deep.equal(VALID_PARAMETERS);
          expect(template.parameterGroups).to.deep.equal(VALID_PARAMETER_GROUPS);
          expect(template.version).to.be.not.undefined;
          expect(template.version!.description).equals(VALID_VERSION.description);
        });
    });

    it('should propagate API errors', () => {
      // rejects with invalid-argument when conditions used in parameters do not exist
      currentTemplate.conditions = [];
      currentTemplate.parameters = VALID_PARAMETERS;
      currentTemplate.parameterGroups = VALID_PARAMETER_GROUPS;
      currentTemplate.version = VALID_VERSION;
      return admin.remoteConfig().validateTemplate(currentTemplate)
        .should.eventually.be.rejected.and.have.property('code', 'remote-config/invalid-argument');
    });
  });

  describe('publishTemplate', () => {
    it('should succeed with a vaild template', () => {
      // set parameters and conditions
      currentTemplate.conditions = VALID_CONDITIONS;
      currentTemplate.parameters = VALID_PARAMETERS;
      currentTemplate.parameterGroups = VALID_PARAMETER_GROUPS;
      currentTemplate.version = VALID_VERSION;
      return admin.remoteConfig().publishTemplate(currentTemplate)
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.conditions.length).to.equal(2);
          expect(template.conditions).to.deep.equal(VALID_CONDITIONS);
          expect(template.parameters).to.deep.equal(VALID_PARAMETERS);
          expect(template.parameterGroups).to.deep.equal(VALID_PARAMETER_GROUPS);
          expect(template.version).to.be.not.undefined;
          expect(template.version!.description).equals(VALID_VERSION.description);
        });
    });

    it('should propagate API errors', () => {
      // rejects with invalid-argument when conditions used in parameters do not exist
      currentTemplate.conditions = [];
      currentTemplate.parameters = VALID_PARAMETERS;
      currentTemplate.parameterGroups = VALID_PARAMETER_GROUPS;
      currentTemplate.version = VALID_VERSION;
      return admin.remoteConfig().publishTemplate(currentTemplate)
        .should.eventually.be.rejected.and.have.property('code', 'remote-config/invalid-argument');
    });
  });

  describe('getTemplate', () => {
    it('should return the most recently published template', () => {
      return admin.remoteConfig().getTemplate()
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.conditions.length).to.equal(2);
          expect(template.conditions).to.deep.equal(VALID_CONDITIONS);
          expect(template.parameters).to.deep.equal(VALID_PARAMETERS);
          expect(template.parameterGroups).to.deep.equal(VALID_PARAMETER_GROUPS);
          expect(template.version).to.be.not.undefined;
          expect(template.version!.description).equals(VALID_VERSION.description);
        });
    });
  });

  let versionOneNumber: string;
  let versionTwoNumber: string;
  const versionOneDescription = `getTemplateAtVersion test v1 ${Date.now()}`;
  const versionTwoDescription = `getTemplateAtVersion test v2 ${Date.now()}`;

  describe('getTemplateAtVersion', () => {
    before(async () => {
      // obtain the current active template
      let activeTemplate = await admin.remoteConfig().getTemplate();

      // publish a new template to create a new version number
      activeTemplate.version = { description: versionOneDescription };
      activeTemplate = await admin.remoteConfig().publishTemplate(activeTemplate)
      expect(activeTemplate.version).to.be.not.undefined;
      versionOneNumber = activeTemplate.version!.versionNumber!;

      // publish another template to create a second version number
      activeTemplate.version = { description: versionTwoDescription };
      activeTemplate = await admin.remoteConfig().publishTemplate(activeTemplate)
      expect(activeTemplate.version).to.be.not.undefined;
      versionTwoNumber = activeTemplate.version!.versionNumber!;
    });

    it('should return the requested template version v1', () => {
      return admin.remoteConfig().getTemplateAtVersion(versionOneNumber)
        .then((template) => {
          expect(template.etag).matches(/^etag-[0-9]*-[0-9]*$/);
          expect(template.version).to.be.not.undefined;
          expect(template.version!.versionNumber).equals(versionOneNumber);
          expect(template.version!.description).equals(versionOneDescription);
        });
    });
  });

  describe('listVersions', () => {
    it('should return the most recently published 2 versions', () => {
      return admin.remoteConfig().listVersions({
        pageSize: 2,
      })
        .then((response) => {
          expect(response.versions.length).to.equal(2);
          // versions should be in reverse chronological order
          expect(response.versions[0].description).equals(versionTwoDescription);
          expect(response.versions[0].versionNumber).equals(versionTwoNumber);
          expect(response.versions[1].description).equals(versionOneDescription);
          expect(response.versions[1].versionNumber).equals(versionOneNumber);
        });
    });
  });

  describe('rollback', () => {
    it('verify the most recent template version before rollback to the one prior', () => {
      return admin.remoteConfig().getTemplate()
        .then((template) => {
          expect(template.version).to.be.not.undefined;
          expect(template.version!.versionNumber).equals(versionTwoNumber);
        });
    });

    it('should rollback to the requested version', () => {
      return admin.remoteConfig().rollback(versionOneNumber)
        .then((template) => {
          expect(template.version).to.be.not.undefined;
          expect(template.version!.updateType).equals('ROLLBACK');
          expect(template.version!.description).equals(`Rollback to version ${versionOneNumber}`);
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
          .to.throw(/Failed to parse the JSON string/);
      });
    });

    const invalidEtags = [...INVALID_STRINGS];
    const sourceTemplate = {
      parameters: VALID_PARAMETERS,
      parameterGroups: VALID_PARAMETER_GROUPS,
      conditions: VALID_CONDITIONS,
      etag: 'etag-1234-1',
    };

    const invalidEtagTemplate = deepCopy(sourceTemplate)
    invalidEtags.forEach((invalidEtag) => {
      invalidEtagTemplate.etag = invalidEtag;
      const jsonString = JSON.stringify(invalidEtagTemplate);
      it(`should throw if the ETag is ${JSON.stringify(invalidEtag)}`, () => {
        expect(() => admin.remoteConfig().createTemplateFromJSON(jsonString))
          .to.throw(`Invalid Remote Config template: ${jsonString}`);
      });
    });

    it('should succeed when a valid json string is provided', () => {
      const jsonString = JSON.stringify(sourceTemplate);
      const newTemplate = admin.remoteConfig().createTemplateFromJSON(jsonString);
      expect(newTemplate.etag).to.equal(sourceTemplate.etag);
      expect(() => {
        (currentTemplate as any).etag = 'new-etag';
      }).to.throw(
        'Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter'
      );
      expect(newTemplate.conditions.length).to.equal(2);
      expect(newTemplate.conditions).to.deep.equal(VALID_CONDITIONS);
      expect(newTemplate.parameters).to.deep.equal(VALID_PARAMETERS);
      expect(newTemplate.parameterGroups).to.deep.equal(VALID_PARAMETER_GROUPS);
    });
  });
});

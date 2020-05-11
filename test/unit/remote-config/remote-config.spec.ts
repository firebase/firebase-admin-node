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

'use strict';

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { RemoteConfig } from '../../../src/remote-config/remote-config';
import { FirebaseApp } from '../../../src/firebase-app';
import * as mocks from '../../resources/mocks';
import {
  RemoteConfigApiClient,
  RemoteConfigTemplate,
  RemoteConfigCondition,
  TagColor,
} from '../../../src/remote-config/remote-config-api-client';
import { FirebaseRemoteConfigError } from '../../../src/remote-config/remote-config-utils';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('RemoteConfig', () => {

  const INTERNAL_ERROR = new FirebaseRemoteConfigError('internal-error', 'message');
  const PARAMETER_GROUPS = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    new_menu: {
      description: 'Description of the group.',
      parameters: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        pumpkin_spice_season: {
          defaultValue: { value: 'A Gryffindor must love a pumpkin spice latte.' },
          conditionalValues: {
            'android_en': { value: 'A Droid must love a pumpkin spice latte.' },
          },
          description: 'Description of the parameter.',
        },
      },
    },
  };

  const REMOTE_CONFIG_RESPONSE: {
    // This type is effectively a RemoteConfigTemplate, but with non-readonly fields
    // to allow easier use from within the tests. An improvement would be to
    // alter this into a helper that creates customized RemoteConfigTemplateContent based
    // on the needs of the test, as that would ensure type-safety.
    conditions?: Array<{ name: string; expression: string; tagColor: TagColor }>;
    parameters?: object | null;
    parameterGroups?: object | null;
    etag: string;
  } = {
    conditions: [{
      name: 'ios',
      expression: 'device.os == \'ios\'',
      tagColor: TagColor.BLUE,
    }],
    parameters: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      holiday_promo_enabled: {
        defaultValue: { value: 'true' },
        conditionalValues: { ios: { useInAppDefault: true } },
        description: 'this is a promo',
      },
    },
    parameterGroups: PARAMETER_GROUPS,
    etag: 'etag-123456789012-5',
  };

  const REMOTE_CONFIG_TEMPLATE: RemoteConfigTemplate = {
    conditions: [{
      name: 'ios',
      expression: 'device.os == \'ios\'',
      tagColor: TagColor.PINK,
    }],
    parameters: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      holiday_promo_enabled: {
        defaultValue: { value: 'true' },
        conditionalValues: { ios: { useInAppDefault: true } },
        description: 'this is a promo',
      },
    },
    parameterGroups: PARAMETER_GROUPS,
    etag: 'etag-123456789012-6',
  };

  let remoteConfig: RemoteConfig;

  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    remoteConfig = new RemoteConfig(mockApp);
  });

  after(() => {
    return mockApp.delete();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const remoteConfigAny: any = RemoteConfig;
          return new remoteConfigAny(invalidApp);
        }).to.throw(
          'First argument passed to admin.remoteConfig() must be a valid Firebase app '
          + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const remoteConfigAny: any = RemoteConfig;
        return new remoteConfigAny();
      }).to.throw(
        'First argument passed to admin.remoteConfig() must be a valid Firebase app '
        + 'instance.');
    });

    it('should reject when initialized without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials, or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      const remoteConfigWithoutProjectId = new RemoteConfig(mockCredentialApp);
      return remoteConfigWithoutProjectId.getTemplate()
        .should.eventually.rejectedWith(noProjectId);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new RemoteConfig(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(remoteConfig.app).to.equal(mockApp);
    });
  });

  describe('getTemplate', () => {
    runInvalidResponseTests(() => remoteConfig.getTemplate(), 'getTemplate');
    runValidResponseTests(() => remoteConfig.getTemplate(), 'getTemplate');
  });

  describe('validateTemplate', () => {
    runInvalidResponseTests(() => remoteConfig.validateTemplate(REMOTE_CONFIG_TEMPLATE),
      'validateTemplate');
    runValidResponseTests(() => remoteConfig.validateTemplate(REMOTE_CONFIG_TEMPLATE),
      'validateTemplate');
  });

  describe('publishTemplate', () => {
    runInvalidResponseTests(() => remoteConfig.publishTemplate(REMOTE_CONFIG_TEMPLATE),
      'publishTemplate');
    runValidResponseTests(() => remoteConfig.publishTemplate(REMOTE_CONFIG_TEMPLATE),
      'publishTemplate');
  });

  describe('rollback', () => {
    runInvalidResponseTests(() => remoteConfig.rollback('5'), 'rollback');
    runValidResponseTests(() => remoteConfig.rollback('5'), 'rollback');
  });

  const INVALID_PARAMETERS: any[] = [null, '', 'abc', 1, true, []];
  const INVALID_PARAMETER_GROUPS: any[] = [null, '', 'abc', 1, true, []];
  const INVALID_CONDITIONS: any[] = [null, '', 'abc', 1, true, {}];

  describe('createTemplateFromJSON', () => {
    const INVALID_STRINGS: any[] = [null, undefined, '', 1, true, {}, []];
    const INVALID_JSON_STRINGS: any[] = ['abc', 'foo', 'a:a', '1:1'];

    INVALID_STRINGS.forEach((invalidJson) => {
      it(`should throw if the json string is ${JSON.stringify(invalidJson)}`, () => {
        expect(() => remoteConfig.createTemplateFromJSON(invalidJson))
          .to.throw('JSON string must be a valid non-empty string');
      });
    });

    INVALID_JSON_STRINGS.forEach((invalidJson) => {
      it(`should throw if the json string is ${JSON.stringify(invalidJson)}`, () => {
        expect(() => remoteConfig.createTemplateFromJSON(invalidJson))
          .to.throw(/^Failed to parse the JSON string: ([\D\w]*)\. SyntaxError: Unexpected token ([\D\w]*) in JSON at position ([0-9]*)$/);
      });
    });

    let sourceTemplate = deepCopy(REMOTE_CONFIG_RESPONSE);
    INVALID_STRINGS.forEach((invalidEtag) => {
      sourceTemplate.etag = invalidEtag;
      const jsonString = JSON.stringify(sourceTemplate);
      it(`should throw if the ETag is ${JSON.stringify(invalidEtag)}`, () => {
        expect(() => remoteConfig.createTemplateFromJSON(jsonString))
          .to.throw(`Invalid Remote Config template: ${jsonString}`);
      });
    });

    sourceTemplate = deepCopy(REMOTE_CONFIG_RESPONSE);
    INVALID_PARAMETERS.forEach((invalidParameter) => {
      sourceTemplate.parameters = invalidParameter;
      const jsonString = JSON.stringify(sourceTemplate);
      it(`should throw if the parameters is ${JSON.stringify(invalidParameter)}`, () => {
        expect(() => remoteConfig.createTemplateFromJSON(jsonString))
          .to.throw('Remote Config parameters must be a non-null object');
      });
    });

    sourceTemplate = deepCopy(REMOTE_CONFIG_RESPONSE);
    INVALID_PARAMETER_GROUPS.forEach((invalidParameterGroup) => {
      sourceTemplate.parameterGroups = invalidParameterGroup;
      const jsonString = JSON.stringify(sourceTemplate);
      it(`should throw if the parameter groups are ${JSON.stringify(invalidParameterGroup)}`,
        () => {
          expect(() => remoteConfig.createTemplateFromJSON(jsonString))
            .to.throw('Remote Config parameter groups must be a non-null object');
        });
    });

    sourceTemplate = deepCopy(REMOTE_CONFIG_RESPONSE);
    INVALID_CONDITIONS.forEach((invalidConditions) => {
      sourceTemplate.conditions = invalidConditions;
      const jsonString = JSON.stringify(sourceTemplate);
      it(`should throw if the conditions is ${JSON.stringify(invalidConditions)}`, () => {
        expect(() => remoteConfig.createTemplateFromJSON(jsonString))
          .to.throw('Remote Config conditions must be an array');
      });
    });

    it('should succeed when a valid json string is provided', () => {
      const jsonString = JSON.stringify(REMOTE_CONFIG_RESPONSE);
      const newTemplate = remoteConfig.createTemplateFromJSON(jsonString);
      expect(newTemplate.conditions.length).to.equal(1);
      expect(newTemplate.conditions[0].name).to.equal('ios');
      expect(newTemplate.conditions[0].expression).to.equal('device.os == \'ios\'');
      expect(newTemplate.conditions[0].tagColor).to.equal(TagColor.BLUE);
      // verify that the etag is unchanged
      expect(newTemplate.etag).to.equal('etag-123456789012-5');
      // verify that the etag is read-only
      expect(() => {
        (newTemplate as any).etag = "new-etag";
      }).to.throw(
        'Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter');

      const key = 'holiday_promo_enabled';
      const p1 = newTemplate.parameters[key];
      expect(p1.defaultValue).deep.equals({ value: 'true' });
      expect(p1.conditionalValues).deep.equals({ ios: { useInAppDefault: true } });
      expect(p1.description).equals('this is a promo');

      expect(newTemplate.parameterGroups).deep.equals(PARAMETER_GROUPS);

      const c = newTemplate.conditions.find((c) => c.name === 'ios');
      expect(c).to.be.not.undefined;
      const cond = c as RemoteConfigCondition;
      expect(cond.name).to.equal('ios');
      expect(cond.expression).to.equal('device.os == \'ios\'');
      expect(cond.tagColor).to.equal(TagColor.BLUE);
    });
  });

  function runInvalidResponseTests(rcOperation: () => Promise<RemoteConfigTemplate>,
    operationName: any): void {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(null);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Remote Config template: null');
    });

    it('should reject when API response does not contain an ETag', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.etag = '';
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Remote Config template: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain valid parameters', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.parameters = null;
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.have.property(
          'message', `Remote Config parameters must be a non-null object`);
    });

    it('should reject when API response does not contain valid parameter groups', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.parameterGroups = null;
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.have.property(
          'message', `Remote Config parameter groups must be a non-null object`);
    });

    it('should reject when API response does not contain valid conditions', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      response.conditions = Object();
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.have.property(
          'message', `Remote Config conditions must be an array`);
    });
  }

  function runValidResponseTests(rcOperation: () => Promise<RemoteConfigTemplate>,
    operationName: any): void {
    it('should resolve with parameters:{} when no parameters present in the response', () => {
      const response = deepCopy({ conditions: [], parameterGroups: {}, etag: '0-1010-2' });
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);
      return rcOperation()
        .then((template) => {
          expect(template.conditions).deep.equals([]);
          // if parameters are not present in the response, we set it to an empty object.
          expect(template.parameters).deep.equals({});
          expect(template.parameterGroups).deep.equals({});
        });
    });

    it('should resolve with parameterGroups:{} when no parameter groups present in the response',
      () => {
        const response = deepCopy({ conditions: [], parameters: {}, etag: '0-1010-2' });
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, operationName)
          .resolves(response);
        stubs.push(stub);
        return rcOperation()
          .then((template) => {
            expect(template.conditions).deep.equals([]);
            expect(template.parameters).deep.equals({});
            // if parameter groups are not present in the response, we set it to an empty object.
            expect(template.parameterGroups).deep.equals({});
          });
      });

    it('should resolve with conditions:[] when no conditions present in the response', () => {
      const response = deepCopy({ parameters: {}, parameterGroups: {}, etag: '0-1010-2' });
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);
      return rcOperation()
        .then((template) => {
          // if conditions are not present in the response, we set it to an empty array.
          expect(template.conditions).deep.equals([]);
          expect(template.parameters).deep.equals({});
          expect(template.parameterGroups).deep.equals({});
        });
    });

    it('should resolve with Remote Config template on success', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(REMOTE_CONFIG_RESPONSE);
      stubs.push(stub);

      return rcOperation()
        .then((template) => {
          expect(template.conditions.length).to.equal(1);
          expect(template.conditions[0].name).to.equal('ios');
          expect(template.conditions[0].expression).to.equal('device.os == \'ios\'');
          expect(template.conditions[0].tagColor).to.equal(TagColor.BLUE);
          expect(template.etag).to.equal('etag-123456789012-5');
          // verify that etag is read-only
          expect(() => {
            (template as any).etag = "new-etag";
          }).to.throw(
            'Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter');

          const key = 'holiday_promo_enabled';
          const p1 = template.parameters[key];
          expect(p1.defaultValue).deep.equals({ value: 'true' });
          expect(p1.conditionalValues).deep.equals({ ios: { useInAppDefault: true } });
          expect(p1.description).equals('this is a promo');

          expect(template.parameterGroups).deep.equals(PARAMETER_GROUPS);

          const c = template.conditions.find((c) => c.name === 'ios');
          expect(c).to.be.not.undefined;
          const cond = c as RemoteConfigCondition;
          expect(cond.name).to.equal('ios');
          expect(cond.expression).to.equal('device.os == \'ios\'');
          expect(cond.tagColor).to.equal(TagColor.BLUE);

          const parsed = JSON.parse(JSON.stringify(template));
          expect(parsed).deep.equals(REMOTE_CONFIG_RESPONSE);
        });
    });
  }
});

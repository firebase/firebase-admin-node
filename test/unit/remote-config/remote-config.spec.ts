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
import { remoteConfig } from '../../../src/remote-config/index';
import {
  FirebaseRemoteConfigError,
  RemoteConfigApiClient
} from '../../../src/remote-config/remote-config-api-client-internal';
import { deepCopy } from '../../../src/utils/deep-copy';

import RemoteConfigTemplate = remoteConfig.RemoteConfigTemplate;
import RemoteConfigCondition = remoteConfig.RemoteConfigCondition;
import TagColor = remoteConfig.TagColor;
import ListVersionsResult = remoteConfig.ListVersionsResult;

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

  const VERSION_INFO = {
    versionNumber: '86',
    updateOrigin: 'ADMIN_SDK_NODE',
    updateType: 'INCREMENTAL_UPDATE',
    updateUser: {
      email: 'firebase-adminsdk@gserviceaccount.com'
    },
    description: 'production version',
    updateTime: '2020-06-15T16:45:03.541527Z'
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
    version?: object;
  } = {
    conditions: [
      {
        name: 'ios',
        expression: 'device.os == \'ios\'',
        tagColor: 'BLUE',
      },
    ],
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
    version: VERSION_INFO,
  };

  const REMOTE_CONFIG_TEMPLATE: RemoteConfigTemplate = {
    conditions: [{
      name: 'ios',
      expression: 'device.os == \'ios\'',
      tagColor: 'PINK',
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
    version: {
      description: 'production version',
    }
  };

  const REMOTE_CONFIG_LIST_VERSIONS_RESULT: ListVersionsResult = {
    versions: [
      {
        versionNumber: '78',
        updateTime: '2020-05-07T18:46:09.495234Z',
        updateUser: {
          email: 'user@gmail.com',
          imageUrl: 'https://photo.jpg'
        },
        description: 'Rollback to version 76',
        updateOrigin: 'REST_API',
        updateType: 'ROLLBACK',
        rollbackSource: '76'
      },
      {
        versionNumber: '77',
        updateTime: '2020-05-07T18:44:41.555Z',
        updateUser: {
          email: 'user@gmail.com',
          imageUrl: 'https://photo.jpg'
        },
        updateOrigin: 'REST_API',
        updateType: 'INCREMENTAL_UPDATE',
      },
    ],
    nextPageToken: '76'
  }

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

  describe('getTemplateAtVersion', () => {
    runInvalidResponseTests(() => remoteConfig.getTemplateAtVersion(65), 'getTemplateAtVersion');
    runValidResponseTests(() => remoteConfig.getTemplateAtVersion(65), 'getTemplateAtVersion');
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

  describe('listVersions', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'listVersions')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return remoteConfig.listVersions()
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    ['', null, NaN, true, [], {}].forEach((invalidVersion) => {
      it(`should reject if the versionNumber is: ${invalidVersion}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].versionNumber = invalidVersion as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected
          .and.to.match(/^Error: Version number must be a non-empty string in int64 format or a number$/);
      });
    });

    ['abc', 'a123b', 'a123', '123a', 1.2, '70.2'].forEach((invalidVersion) => {
      it(`should reject if the versionNumber is: ${invalidVersion}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].versionNumber = invalidVersion as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected
          .and.to.match(/^Error: Version number must be an integer or a string in int64 format$/);
      });
    });

    ['', 123, 1.2, null, NaN, true, [], {}].forEach((invalidUpdateOrigin) => {
      it(`should reject if the updateOrigin is: ${invalidUpdateOrigin}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].updateOrigin = invalidUpdateOrigin as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version update origin must be a non-empty string');
      });
    });

    ['', 123, 1.2, null, NaN, true, [], {}].forEach((invalidUpdateType) => {
      it(`should reject if the updateType is: ${invalidUpdateType}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].updateType = invalidUpdateType as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version update type must be a non-empty string');
      });
    });

    ['', 'abc', 1.2, 123, null, NaN, true, []].forEach((invalidUpdateUser) => {
      it(`should reject if the updateUser is: ${invalidUpdateUser}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].updateUser = invalidUpdateUser as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version update user must be a non-null object');
      });
    });

    ['', 123, 1.2, null, NaN, true, [], {}].forEach((invalidDescription) => {
      it(`should reject if the description is: ${invalidDescription}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].description = invalidDescription as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version description must be a non-empty string');
      });
    });

    ['', 123, 1.2, null, NaN, true, [], {}].forEach((invalidRollbackSource) => {
      it(`should reject if the rollbackSource is: ${invalidRollbackSource}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].rollbackSource = invalidRollbackSource as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version rollback source must be a non-empty string');
      });
    });

    ['', 'abc', 123, 1.2, null, NaN, [], {}].forEach((invalidIsLegacy) => {
      it(`should reject if the isLegacy is: ${invalidIsLegacy}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].isLegacy = invalidIsLegacy as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version.isLegacy must be a boolean');
      });
    });

    ['', 'abc', 123, 1.2, null, NaN, [], {}].forEach((invalidUpdateTime) => {
      it(`should reject if the updateTime is: ${invalidUpdateTime}`, () => {
        const response = deepCopy(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
        response.versions[0].updateTime = invalidUpdateTime as any;
        const stub = sinon
          .stub(RemoteConfigApiClient.prototype, 'listVersions')
          .resolves(response);
        stubs.push(stub);
        return remoteConfig.listVersions()
          .should.eventually.be.rejected.and.have.property('message',
            'Version update time must be a valid date string');
      });
    });

    it('should resolve with an empty versions list if the no results are availble for requested list options', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'listVersions')
        .resolves({} as any);
      stubs.push(stub);
      return remoteConfig.listVersions({
        pageSize: 2,
        endVersionNumber: 10,
      })
        .then((response) => {
          expect(response.versions.length).to.equal(0);
          expect(response.nextPageToken).to.be.undefined;
        });
    });

    it('should resolve with template versions list on success', () => {
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, 'listVersions')
        .resolves(REMOTE_CONFIG_LIST_VERSIONS_RESULT);
      stubs.push(stub);
      return remoteConfig.listVersions({
        pageSize: 2
      })
        .then((response) => {
          expect(response.versions.length).to.equal(2);
          expect(response.versions[0].updateTime).equals('Thu, 07 May 2020 18:46:09 GMT');
          expect(response.versions[1].updateTime).equals('Thu, 07 May 2020 18:44:41 GMT');
          expect(response.nextPageToken).to.equal('76');
        });
    });
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
          .to.throw(/Failed to parse the JSON string: ([\D\w]*)\./);
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
      expect(newTemplate.conditions[0].tagColor).to.equal('BLUE');
      // verify that the etag is unchanged
      expect(newTemplate.etag).to.equal('etag-123456789012-5');
      // verify that the etag is read-only
      expect(() => {
        (newTemplate as any).etag = 'new-etag';
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
      expect(cond.tagColor).to.equal('BLUE');
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
          'message', 'Remote Config parameters must be a non-null object');
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
          'message', 'Remote Config parameter groups must be a non-null object');
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
          'message', 'Remote Config conditions must be an array');
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
          expect(template.conditions[0].tagColor).to.equal('BLUE');
          expect(template.etag).to.equal('etag-123456789012-5');
          // verify that etag is read-only
          expect(() => {
            (template as any).etag = 'new-etag';
          }).to.throw(
            'Cannot set property etag of #<RemoteConfigTemplateImpl> which has only a getter');

          const version = template.version!;
          expect(version.versionNumber).to.equal('86');
          expect(version.updateOrigin).to.equal('ADMIN_SDK_NODE');
          expect(version.updateType).to.equal('INCREMENTAL_UPDATE');
          expect(version.updateUser).to.deep.equal({
            email: 'firebase-adminsdk@gserviceaccount.com'
          });
          expect(version.description).to.equal('production version');
          expect(version.updateTime).to.equal('Mon, 15 Jun 2020 16:45:03 GMT');

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
          expect(cond.tagColor).to.equal('BLUE');

          const parsed = JSON.parse(JSON.stringify(template));
          const expectedTemplate = deepCopy(REMOTE_CONFIG_RESPONSE);
          const expectedVersion = deepCopy(VERSION_INFO);
          expectedVersion.updateTime = new Date(expectedVersion.updateTime).toUTCString();
          expectedTemplate.version = expectedVersion;
          expect(parsed).deep.equals(expectedTemplate);
        });
    });

    it('should resolve with template when Version updateTime contains only 3 ms places', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      const versionInfo = deepCopy(VERSION_INFO);
      versionInfo.updateTime = '2020-11-03T20:24:15.203Z';
      response.version = versionInfo;
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);

      return rcOperation()
        .then((template) => {
          expect(template.etag).to.equal('etag-123456789012-5');

          const version = template.version!;
          expect(version.versionNumber).to.equal('86');
          expect(version.updateOrigin).to.equal('ADMIN_SDK_NODE');
          expect(version.updateType).to.equal('INCREMENTAL_UPDATE');
          expect(version.updateUser).to.deep.equal({
            email: 'firebase-adminsdk@gserviceaccount.com'
          });
          expect(version.description).to.equal('production version');
          expect(version.updateTime).to.equal('Tue, 03 Nov 2020 20:24:15 GMT');
        });
    });

    it('should resolve with template when Version updateTime contains 6 ms places', () => {
      const response = deepCopy(REMOTE_CONFIG_RESPONSE);
      const versionInfo = deepCopy(VERSION_INFO);
      versionInfo.updateTime = '2020-11-13T17:01:36.541527Z';
      response.version = versionInfo;
      const stub = sinon
        .stub(RemoteConfigApiClient.prototype, operationName)
        .resolves(response);
      stubs.push(stub);

      return rcOperation()
        .then((template) => {
          expect(template.etag).to.equal('etag-123456789012-5');

          const version = template.version!;
          expect(version.versionNumber).to.equal('86');
          expect(version.updateOrigin).to.equal('ADMIN_SDK_NODE');
          expect(version.updateType).to.equal('INCREMENTAL_UPDATE');
          expect(version.updateUser).to.deep.equal({
            email: 'firebase-adminsdk@gserviceaccount.com'
          });
          expect(version.description).to.equal('production version');
          expect(version.updateTime).to.equal('Fri, 13 Nov 2020 17:01:36 GMT');
        });
    });
  }
});

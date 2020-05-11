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
import {
  RemoteConfigApiClient,
  RemoteConfigTemplate,
  TagColor,
} from '../../../src/remote-config/remote-config-api-client';
import { FirebaseRemoteConfigError } from '../../../src/remote-config/remote-config-utils';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('RemoteConfigApiClient', () => {

  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };

  const VALIDATION_ERROR_MESSAGES = [
    "[VALIDATION_ERROR]: [foo] are not valid condition names. All keys in all conditional value maps must be valid condition names.",
    "[VERSION_MISMATCH]: Expected version 6, found 8 for project: 123456789012"
  ];

  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': 'fire-admin-node/<XXX_SDK_VERSION_XXX>',
    'Accept-Encoding': 'gzip',
  };

  const TEST_RESPONSE = {
    conditions: [{ name: 'ios', expression: 'exp' }],
    parameters: { param: { defaultValue: { value: 'true' } } },
    parameterGroups: { group: { parameters: { paramabc: { defaultValue: { value: 'true' } } }, } },
    version: {},
  };

  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials, or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  const clientWithoutProjectId = new RemoteConfigApiClient(
    mocks.mockCredentialApp());

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
    parameterGroups: {
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
    },
    etag: 'etag-123456789012-6',
  };

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let app: FirebaseApp;
  let apiClient: RemoteConfigApiClient;

  beforeEach(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new RemoteConfigApiClient(app);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return app.delete();
  });

  describe('Constructor', () => {
    it('should reject when the app is null', () => {
      expect(() => new RemoteConfigApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to admin.remoteConfig() must be a valid Firebase app instance.');
    });
  });

  describe('getTemplate', () => {
    it(`should reject when project id is not available`, () => {
      return clientWithoutProjectId.getTemplate()
        .should.eventually.be.rejectedWith(noProjectId);
    });

    ['', 'abc', 'a123b', 'a123', '123a', 1.2, '70.2', null, NaN, true, [], {}].forEach((invalidVersion) => {
      it(`should reject if the versionNumber is: ${invalidVersion}`, () => {
        expect(() => apiClient.getTemplate(invalidVersion as any))
          .to.throw(/^versionNumber must be (a non-empty string in int64 format or a number|an integer or a string in int64 format)$/);
      });
    });

    // tests for api response validations
    runErrorResponseTests(() => apiClient.getTemplate());

    it('should resolve with the latest template on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-1' }));
      stubs.push(stub);
      return apiClient.getTemplate()
        .then((resp) => {
          expect(resp.conditions).to.deep.equal(TEST_RESPONSE.conditions);
          expect(resp.parameters).to.deep.equal(TEST_RESPONSE.parameters);
          expect(resp.parameterGroups).to.deep.equal(TEST_RESPONSE.parameterGroups);
          expect(resp.etag).to.equal('etag-123456789012-1');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
            headers: EXPECTED_HEADERS,
            data: {},
          });
        });
    });

    it('should resolve with the requested template version on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-60' }));
      stubs.push(stub);
      return apiClient.getTemplate('60')
        .then((resp) => {
          expect(resp.conditions).to.deep.equal(TEST_RESPONSE.conditions);
          expect(resp.parameters).to.deep.equal(TEST_RESPONSE.parameters);
          expect(resp.parameterGroups).to.deep.equal(TEST_RESPONSE.parameterGroups);
          expect(resp.etag).to.equal('etag-123456789012-60');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
            headers: EXPECTED_HEADERS,
            data: { versionNumber: '60' },
          });
        });
    });
  });

  describe('validateTemplate', () => {
    it(`should reject when project id is not available`, () => {
      return clientWithoutProjectId.validateTemplate(REMOTE_CONFIG_TEMPLATE)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // tests for input template validations
    testInvalidInputTemplates((t: RemoteConfigTemplate) => apiClient.validateTemplate(t));

    // tests for api response validations
    runErrorResponseTests(() => apiClient.validateTemplate(REMOTE_CONFIG_TEMPLATE));

    it('should resolve with the requested template on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-0' }));
      stubs.push(stub);
      return apiClient.validateTemplate(REMOTE_CONFIG_TEMPLATE)
        .then((resp) => {
          expect(resp.conditions).to.deep.equal(TEST_RESPONSE.conditions);
          expect(resp.parameters).to.deep.equal(TEST_RESPONSE.parameters);
          expect(resp.parameterGroups).to.deep.equal(TEST_RESPONSE.parameterGroups);
          // validate template returns an etag with the suffix -0 when successful.
          // verify that the etag matches the original template etag.
          expect(resp.etag).to.equal('etag-123456789012-6');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PUT',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig?validate_only=true',
            headers: { ...EXPECTED_HEADERS, 'If-Match': REMOTE_CONFIG_TEMPLATE.etag },
            data: {
              conditions: REMOTE_CONFIG_TEMPLATE.conditions,
              parameters: REMOTE_CONFIG_TEMPLATE.parameters,
              parameterGroups: REMOTE_CONFIG_TEMPLATE.parameterGroups,
            }
          });
        });
    });

    [null, undefined, ''].forEach((etag) => {
      it('should reject when the etag in template is null, undefined, or an empty string', () => {
        expect(() => apiClient.validateTemplate({
          conditions: [], parameters: {}, parameterGroups: {}, etag: etag as any
        })).to.throw('ETag must be a non-empty string.');
      });
    });

    VALIDATION_ERROR_MESSAGES.forEach((message) => {
      it('should reject with failed-precondition when a validation error occurres', () => {
        const stub = sinon
          .stub(HttpClient.prototype, 'send')
          .rejects(utils.errorFrom({
            error: {
              code: 400,
              message: message,
              status: "FAILED_PRECONDITION"
            }
          }, 400));
        stubs.push(stub);
        const expected = new FirebaseRemoteConfigError('failed-precondition', message);
        return apiClient.validateTemplate(REMOTE_CONFIG_TEMPLATE)
          .should.eventually.be.rejected.and.deep.equal(expected);
      });
    });
  });

  describe('publishTemplate', () => {
    it(`should reject when project id is not available`, () => {
      return clientWithoutProjectId.publishTemplate(REMOTE_CONFIG_TEMPLATE)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // tests for input template validations
    testInvalidInputTemplates((t: RemoteConfigTemplate) => apiClient.publishTemplate(t));

    // tests for api response validations
    runErrorResponseTests(() => apiClient.publishTemplate(REMOTE_CONFIG_TEMPLATE));

    const testOptions = [
      { options: undefined, etag: 'etag-123456789012-6' },
      { options: { force: true }, etag: '*' }
    ];
    testOptions.forEach((option) => {
      it('should resolve with the published template on success', () => {
        const stub = sinon
          .stub(HttpClient.prototype, 'send')
          .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-6' }));
        stubs.push(stub);
        return apiClient.publishTemplate(REMOTE_CONFIG_TEMPLATE, option.options)
          .then((resp) => {
            expect(resp.conditions).to.deep.equal(TEST_RESPONSE.conditions);
            expect(resp.parameters).to.deep.equal(TEST_RESPONSE.parameters);
            expect(resp.parameterGroups).to.deep.equal(TEST_RESPONSE.parameterGroups);
            expect(resp.etag).to.equal('etag-123456789012-6');
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'PUT',
              url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
              headers: { ...EXPECTED_HEADERS, 'If-Match': option.etag },
              data: {
                conditions: REMOTE_CONFIG_TEMPLATE.conditions,
                parameters: REMOTE_CONFIG_TEMPLATE.parameters,
                parameterGroups: REMOTE_CONFIG_TEMPLATE.parameterGroups,
              }
            });
          });
      });
    });

    [null, undefined, ''].forEach((etag) => {
      it('should reject when the etag in template is null, undefined, or an empty string', () => {
        expect(() => apiClient.publishTemplate({
          conditions: [], parameters: {}, parameterGroups: {}, etag: etag as any
        })).to.throw('ETag must be a non-empty string.');
      });
    });

    VALIDATION_ERROR_MESSAGES.forEach((message) => {
      it('should reject with failed-precondition when a validation error occurres', () => {
        const stub = sinon
          .stub(HttpClient.prototype, 'send')
          .rejects(utils.errorFrom({
            error: {
              code: 400,
              message: message,
              status: "FAILED_PRECONDITION"
            }
          }, 400));
        stubs.push(stub);
        const expected = new FirebaseRemoteConfigError('failed-precondition', message);
        return apiClient.publishTemplate(REMOTE_CONFIG_TEMPLATE)
          .should.eventually.be.rejected.and.deep.equal(expected);
      });
    });
  });

  function runErrorResponseTests(rcOperation: () => Promise<RemoteConfigTemplate>): void {
    it('should reject when the etag is not present in the response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('invalid-argument',
        'ETag header is not present in the server response.');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('not-found', 'Requested entity not found');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('unknown-error', 'Unknown server error: {}');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should reject when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  }

  function testInvalidInputTemplates(rcOperation: Function): void {
    const INVALID_PARAMETERS: any[] = [null, '', 'abc', 1, true, []];
    const INVALID_PARAMETER_GROUPS: any[] = [null, '', 'abc', 1, true, []];
    const INVALID_CONDITIONS: any[] = [null, '', 'abc', 1, true, {}];
    const INVALID_ETAG_TEMPLATES: any[] = [
      { parameters: {}, parameterGroups: {}, conditions: [], etag: '' },
      Object()
    ];
    const INVALID_TEMPLATES: any[] = [null, 'abc', 123];
    const inputTemplate = deepCopy(REMOTE_CONFIG_TEMPLATE);

    INVALID_PARAMETERS.forEach((invalidParameter) => {
      it(`should throw if the parameters is ${JSON.stringify(invalidParameter)}`, () => {
        (inputTemplate as any).parameters = invalidParameter;
        inputTemplate.conditions = [];
        expect(() => rcOperation(inputTemplate))
          .to.throw('Remote Config parameters must be a non-null object');
      });
    });

    INVALID_PARAMETER_GROUPS.forEach((invalidParameterGroup) => {
      it(`should throw if the parameter groups is ${JSON.stringify(invalidParameterGroup)}`, () => {
        (inputTemplate as any).parameterGroups = invalidParameterGroup;
        inputTemplate.conditions = [];
        inputTemplate.parameters = {};
        expect(() => rcOperation(inputTemplate))
          .to.throw('Remote Config parameter groups must be a non-null object');
      });
    });

    INVALID_CONDITIONS.forEach((invalidConditions) => {
      it(`should throw if the conditions is ${JSON.stringify(invalidConditions)}`, () => {
        (inputTemplate as any).conditions = invalidConditions;
        inputTemplate.parameters = {};
        inputTemplate.parameterGroups = {};
        expect(() => rcOperation(inputTemplate))
          .to.throw('Remote Config conditions must be an array');
      });
    });

    INVALID_ETAG_TEMPLATES.forEach((invalidEtagTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidEtagTemplate)}`, () => {
        expect(() => rcOperation(invalidEtagTemplate))
          .to.throw('ETag must be a non-empty string.');
      });
    });

    INVALID_TEMPLATES.forEach((invalidTemplate) => {
      it(`should throw if the template is ${JSON.stringify(invalidTemplate)}`, () => {
        expect(() => rcOperation(invalidTemplate))
          .to.throw(`Invalid Remote Config template: ${JSON.stringify(invalidTemplate)}`);
      });
    });
  }
});

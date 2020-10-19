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
import { remoteConfig } from '../../../src/remote-config/index';
import {
  FirebaseRemoteConfigError,
  RemoteConfigApiClient
} from '../../../src/remote-config/remote-config-api-client-internal';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';
import { deepCopy } from '../../../src/utils/deep-copy';
import { getSdkVersion } from '../../../src/utils/index';

import RemoteConfigTemplate = remoteConfig.RemoteConfigTemplate;
import Version = remoteConfig.Version;
import ListVersionsResult = remoteConfig.ListVersionsResult;

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
    '[VALIDATION_ERROR]: [foo] are not valid condition names. All keys in all conditional value' +
    ' maps must be valid condition names.',
    '[VERSION_MISMATCH]: Expected version 6, found 8 for project: 123456789012'
  ];

  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
    'Accept-Encoding': 'gzip',
  };

  const VERSION_INFO: Version = {
    versionNumber: '86',
    updateOrigin: 'ADMIN_SDK_NODE',
    updateType: 'INCREMENTAL_UPDATE',
    updateUser: {
      email: 'firebase-adminsdk@gserviceaccount.com'
    },
    description: 'production version',
    updateTime: '2020-06-15T16:45:03.000Z',
  }

  const TEST_RESPONSE = {
    conditions: [{ name: 'ios', expression: 'exp' }],
    parameters: { param: { defaultValue: { value: 'true' } } },
    parameterGroups: { group: { parameters: { paramabc: { defaultValue: { value: 'true' } } }, } },
    version: VERSION_INFO,
  };

  const TEST_VERSIONS_RESULT: ListVersionsResult = {
    versions: [
      {
        versionNumber: '78',
        updateTime: '2020-05-07T18:46:09.495Z',
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
    conditions: [
      {
        name: 'ios',
        expression: 'device.os == \'ios\'',
        tagColor: 'PINK',
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
    version: {
      description: 'production version'
    }
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
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.getTemplate()
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // tests for api response validations
    runEtagHeaderTests(() => apiClient.getTemplate());
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
          expect(resp.version).to.deep.equal(TEST_RESPONSE.version);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
            headers: EXPECTED_HEADERS,
          });
        });
    });
  });

  describe('getTemplateAtVersion', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.getTemplateAtVersion(65)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // test for version number validations
    runTemplateVersionNumberTests((v: string | number) => { apiClient.getTemplateAtVersion(v); });

    // tests for api response validations
    runEtagHeaderTests(() => apiClient.getTemplateAtVersion(65));
    runErrorResponseTests(() => apiClient.getTemplateAtVersion(65));

    it('should convert version number to string', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-60' }));
      stubs.push(stub);
      return apiClient.getTemplateAtVersion(60)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
            headers: EXPECTED_HEADERS,
            data: { versionNumber: '60' },
          });
        });
    });

    it('should resolve with the requested template version on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-60' }));
      stubs.push(stub);
      return apiClient.getTemplateAtVersion('60')
        .then((resp) => {
          expect(resp.conditions).to.deep.equal(TEST_RESPONSE.conditions);
          expect(resp.parameters).to.deep.equal(TEST_RESPONSE.parameters);
          expect(resp.parameterGroups).to.deep.equal(TEST_RESPONSE.parameterGroups);
          expect(resp.etag).to.equal('etag-123456789012-60');
          expect(resp.version).to.deep.equal(TEST_RESPONSE.version);
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
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.validateTemplate(REMOTE_CONFIG_TEMPLATE)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // tests for input template validations
    testInvalidInputTemplates((t: RemoteConfigTemplate) => apiClient.validateTemplate(t));

    // tests for api response validations
    runEtagHeaderTests(() => apiClient.validateTemplate(REMOTE_CONFIG_TEMPLATE));
    runErrorResponseTests(() => apiClient.validateTemplate(REMOTE_CONFIG_TEMPLATE));

    it('should exclude output only parameters from version metadata', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-0' }));
      stubs.push(stub);
      const templateCopy = deepCopy(REMOTE_CONFIG_TEMPLATE);
      templateCopy.version = VERSION_INFO;
      return apiClient.validateTemplate(templateCopy)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PUT',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig?validate_only=true',
            headers: { ...EXPECTED_HEADERS, 'If-Match': REMOTE_CONFIG_TEMPLATE.etag },
            data: {
              conditions: REMOTE_CONFIG_TEMPLATE.conditions,
              parameters: REMOTE_CONFIG_TEMPLATE.parameters,
              parameterGroups: REMOTE_CONFIG_TEMPLATE.parameterGroups,
              version: { description: VERSION_INFO.description },
            }
          });
        });
    });

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
          expect(resp.version).to.deep.equal(TEST_RESPONSE.version);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PUT',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig?validate_only=true',
            headers: { ...EXPECTED_HEADERS, 'If-Match': REMOTE_CONFIG_TEMPLATE.etag },
            data: {
              conditions: REMOTE_CONFIG_TEMPLATE.conditions,
              parameters: REMOTE_CONFIG_TEMPLATE.parameters,
              parameterGroups: REMOTE_CONFIG_TEMPLATE.parameterGroups,
              version: REMOTE_CONFIG_TEMPLATE.version,
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
              status: 'FAILED_PRECONDITION'
            }
          }, 400));
        stubs.push(stub);
        const expected = new FirebaseRemoteConfigError('failed-precondition', message);
        return apiClient.validateTemplate(REMOTE_CONFIG_TEMPLATE)
          .should.eventually.be.rejected.and.deep.include(expected);
      });
    });
  });

  describe('publishTemplate', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.publishTemplate(REMOTE_CONFIG_TEMPLATE)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // tests for input template validations
    testInvalidInputTemplates((t: RemoteConfigTemplate) => apiClient.publishTemplate(t));

    // tests for api response validations
    runEtagHeaderTests(() => apiClient.publishTemplate(REMOTE_CONFIG_TEMPLATE));
    runErrorResponseTests(() => apiClient.publishTemplate(REMOTE_CONFIG_TEMPLATE));

    it('should exclude output only parameters from version metadata', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-6' }));
      stubs.push(stub);
      const templateCopy = deepCopy(REMOTE_CONFIG_TEMPLATE);
      templateCopy.version = VERSION_INFO;
      return apiClient.publishTemplate(templateCopy)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PUT',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
            headers: { ...EXPECTED_HEADERS, 'If-Match': REMOTE_CONFIG_TEMPLATE.etag },
            data: {
              conditions: REMOTE_CONFIG_TEMPLATE.conditions,
              parameters: REMOTE_CONFIG_TEMPLATE.parameters,
              parameterGroups: REMOTE_CONFIG_TEMPLATE.parameterGroups,
              version: { description: VERSION_INFO.description },
            }
          });
        });
    });

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
            expect(resp.version).to.deep.equal(TEST_RESPONSE.version);
            expect(stub).to.have.been.calledOnce.and.calledWith({
              method: 'PUT',
              url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig',
              headers: { ...EXPECTED_HEADERS, 'If-Match': option.etag },
              data: {
                conditions: REMOTE_CONFIG_TEMPLATE.conditions,
                parameters: REMOTE_CONFIG_TEMPLATE.parameters,
                parameterGroups: REMOTE_CONFIG_TEMPLATE.parameterGroups,
                version: REMOTE_CONFIG_TEMPLATE.version,
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
              status: 'FAILED_PRECONDITION'
            }
          }, 400));
        stubs.push(stub);
        const expected = new FirebaseRemoteConfigError('failed-precondition', message);
        return apiClient.publishTemplate(REMOTE_CONFIG_TEMPLATE)
          .should.eventually.be.rejected.and.deep.include(expected);
      });
    });
  });

  describe('rollback', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.rollback('60')
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // test for version number validations
    runTemplateVersionNumberTests((v: string | number) => { apiClient.rollback(v); });

    // tests for api response validations
    runEtagHeaderTests(() => apiClient.rollback(60));
    runErrorResponseTests(() => apiClient.rollback(60));

    it('should convert version number to string', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-55' }));
      stubs.push(stub);
      return apiClient.rollback(55)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig:rollback',
            headers: EXPECTED_HEADERS,
            data: {
              versionNumber: '55',
            }
          });
        });
    });

    it('should resolve with the rollbacked template on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE, 200, { etag: 'etag-123456789012-60' }));
      stubs.push(stub);
      return apiClient.rollback('60')
        .then((resp) => {
          expect(resp.conditions).to.deep.equal(TEST_RESPONSE.conditions);
          expect(resp.parameters).to.deep.equal(TEST_RESPONSE.parameters);
          expect(resp.parameterGroups).to.deep.equal(TEST_RESPONSE.parameterGroups);
          expect(resp.etag).to.equal('etag-123456789012-60');
          expect(resp.version).to.deep.equal(TEST_RESPONSE.version);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig:rollback',
            headers: EXPECTED_HEADERS,
            data: {
              versionNumber: '60',
            }
          });
        });
    });
  });

  describe('listVersions', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.listVersions()
        .should.eventually.be.rejectedWith(noProjectId);
    });

    // tests for api response validations
    runErrorResponseTests(() => apiClient.listVersions());

    [null, 'abc', '', [], true, 102, 1.2].forEach((invalidOption) => {
      it(`should throw if options is ${invalidOption}`, () => {
        expect(() => apiClient.listVersions(invalidOption as any))
          .to.throw('ListVersionsOptions must be a non-null object');
      });
    });

    [null, 'abc', '', [], {}, true, NaN, 0, -100, 301, 450].forEach((invalidPageSize) => {
      it(`should throw if pageSize is ${invalidPageSize}`, () => {
        expect(() => apiClient.listVersions({ pageSize: invalidPageSize } as any))
          .to.throw(/^pageSize must be a (number.|number between 1 and 300 \(inclusive\).)$/);
      });
    });

    [null, '', 102, 1.2, [], {}, true, NaN].forEach((invalidPageToken) => {
      it(`should throw if pageToken is ${invalidPageToken}`, () => {
        expect(() => apiClient.listVersions({ pageToken: invalidPageToken } as any))
          .to.throw('pageToken must be a string value');
      });
    });

    ['', null, NaN, true, [], {}].forEach(
      (invalidVersion) => {
        it(`should throw if the endVersionNumber is: ${invalidVersion}`, () => {
          expect(() => apiClient.listVersions({ endVersionNumber: invalidVersion } as any))
            .to.throw(/^endVersionNumber must be a non-empty string in int64 format or a number$/);
        });
      });

    ['abc', 'a123b', 'a123', '123a', 1.2, '70.2'].forEach(
      (invalidVersion) => {
        it(`should throw if the endVersionNumber is: ${invalidVersion}`, () => {
          expect(() => apiClient.listVersions({ endVersionNumber: invalidVersion } as any))
            .to.throw(/^endVersionNumber must be an integer or a string in int64 format$/);
        });
      });

    [null, '', 'abc', '2020-05-07T18:44:41.555Z', 102, 1.2, [], {}, true, NaN].forEach(
      (invalidStartTime) => {
        it(`should throw if startTime is ${invalidStartTime}`, () => {
          expect(() => apiClient.listVersions({ startTime: invalidStartTime } as any))
            .to.throw('startTime must be a valid Date object or a UTC date string.');
        });
      });

    [null, '', 'abc', '2020-05-07T18:44:41.555Z', 102, 1.2, [], {}, true, NaN].forEach(
      (invalidEndTime) => {
        it(`should throw if endTime is ${invalidEndTime}`, () => {
          expect(() => apiClient.listVersions({ endTime: invalidEndTime } as any))
            .to.throw('endTime must be a valid Date object or a UTC date string.');
        });
      });

    it('should convert input timestamps to ISO strings', () => {
      const startTime = new Date(2020, 4, 2);
      const endTime = 'Thu, 07 May 2020 18:44:41 GMT';
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_VERSIONS_RESULT, 200));
      stubs.push(stub);
      return apiClient.listVersions({
        startTime,
        endTime,
      })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig:listVersions',
            headers: EXPECTED_HEADERS,
            data: {
              // timestamps should be converted to ISO strings
              startTime: startTime.toISOString(),
              endTime: new Date(endTime).toISOString(),
            }
          });
        });
    });

    it('should convert endVersionNumber to string', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_VERSIONS_RESULT, 200));
      stubs.push(stub);
      return apiClient.listVersions({
        endVersionNumber: 70
      })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig:listVersions',
            headers: EXPECTED_HEADERS,
            data: {
              // endVersionNumber should be converted to string
              endVersionNumber: '70'
            }
          });
        });
    });

    it('should remove undefined fields from options', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_VERSIONS_RESULT, 200));
      stubs.push(stub);
      return apiClient.listVersions({
        pageSize: undefined,
        pageToken: undefined,
        endVersionNumber: 70,
      })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig:listVersions',
            headers: EXPECTED_HEADERS,
            data: {
              endVersionNumber: '70'
            }
          });
        });
    });

    it('should resolve with a list of template versions on success', () => {
      const startTime = new Date(2020, 4, 2);
      const endTime = 'Thu, 07 May 2020 18:44:41 GMT';
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_VERSIONS_RESULT, 200));
      stubs.push(stub);
      return apiClient.listVersions({
        pageSize: 2,
        pageToken: '70',
        endVersionNumber: '78',
        startTime: startTime,
        endTime: endTime,
      })
        .then((resp) => {
          expect(resp.versions).to.deep.equal(TEST_VERSIONS_RESULT.versions);
          expect(resp.nextPageToken).to.equal(TEST_VERSIONS_RESULT.nextPageToken);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/test-project/remoteConfig:listVersions',
            headers: EXPECTED_HEADERS,
            data: {
              pageSize: 2,
              pageToken: '70',
              endVersionNumber: '78',
              startTime: startTime.toISOString(),
              endTime: new Date(endTime).toISOString(),
            }
          });
        });
    });
  });

  function runTemplateVersionNumberTests(rcOperation: Function): void {
    ['', null, NaN, true, [], {}].forEach((invalidVersion) => {
      it(`should reject if the versionNumber is: ${invalidVersion}`, () => {
        expect(() => rcOperation(invalidVersion as any))
          .to.throw(/^versionNumber must be a non-empty string in int64 format or a number$/);
      });
    });

    ['abc', 'a123b', 'a123', '123a', 1.2, '70.2'].forEach((invalidVersion) => {
      it(`should reject if the versionNumber is: ${invalidVersion}`, () => {
        expect(() => rcOperation(invalidVersion as any))
          .to.throw(/^versionNumber must be an integer or a string in int64 format$/);
      });
    });
  }

  function runEtagHeaderTests(rcOperation: () => Promise<RemoteConfigTemplate>): void {
    it('should reject when the etag is not present in the response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(TEST_RESPONSE));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('invalid-argument',
        'ETag header is not present in the server response.');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  }

  function runErrorResponseTests(rcOperation: () => Promise<RemoteConfigTemplate | ListVersionsResult>): void {
    it('should reject when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('not-found', 'Requested entity not found');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError('unknown-error', 'Unknown server error: {}');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject with unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseRemoteConfigError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return rcOperation()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should reject when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return rcOperation()
        .should.eventually.be.rejected.and.deep.include(expected);
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

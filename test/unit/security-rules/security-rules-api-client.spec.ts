/*!
 * Copyright 2019 Google Inc.
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
import { SecurityRulesApiClient, RulesetContent } from '../../../src/security-rules/security-rules-api-client-internal';
import { FirebaseSecurityRulesError } from '../../../src/security-rules/security-rules-internal';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import * as mocks from '../../resources/mocks';
import { FirebaseAppError } from '../../../src/utils/error';
import { FirebaseApp } from '../../../src/firebase-app';
import { getSdkVersion } from '../../../src/utils/index';

const expect = chai.expect;

describe('SecurityRulesApiClient', () => {

  const RULESET_NAME = 'ruleset-id';
  const RELEASE_NAME = 'test.service';
  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };
  const EXPECTED_HEADERS = {
    'Authorization': 'Bearer mock-token',
    'X-Firebase-Client': `fire-admin-node/${getSdkVersion()}`,
  };
  const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials, or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';

  const mockOptions = {
    credential: new mocks.MockCredential(),
    projectId: 'test-project',
  };

  const clientWithoutProjectId = new SecurityRulesApiClient(
    mocks.mockCredentialApp());

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];
  let app: FirebaseApp;
  let apiClient: SecurityRulesApiClient;

  beforeEach(() => {
    app = mocks.appWithOptions(mockOptions);
    apiClient = new SecurityRulesApiClient(app);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return app.delete();
  });

  describe('Constructor', () => {
    it('should throw when the app is null', () => {
      expect(() => new SecurityRulesApiClient(null as unknown as FirebaseApp))
        .to.throw('First argument passed to admin.securityRules() must be a valid Firebase app');
    });
  });

  describe('getRuleset', () => {
    const INVALID_NAMES: any[] = [null, undefined, '', 1, true, {}, []];
    INVALID_NAMES.forEach((invalidName) => {
      it(`should reject when called with: ${JSON.stringify(invalidName)}`, () => {
        return apiClient.getRuleset(invalidName)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Ruleset name must be a non-empty string.');
      });
    });

    it('should reject when called with prefixed name', () => {
      return apiClient.getRuleset('projects/foo/rulesets/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name must not contain any "/" characters.');
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.getRuleset(RULESET_NAME)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve with the requested ruleset on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({ name: 'bar' }));
      stubs.push(stub);
      return apiClient.getRuleset(RULESET_NAME)
        .then((resp) => {
          expect(resp.name).to.equal('bar');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets/ruleset-id',
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.getRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.getRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('createRuleset', () => {
    const RULES_FILE = {
      name: 'test.rules',
      content: 'test source {}',
    };

    const RULES_CONTENT: RulesetContent = {
      source: {
        files: [RULES_FILE],
      },
    };

    const invalidContent: any[] = [null, undefined, {}, { source: {} }];
    invalidContent.forEach((content) => {
      it(`should reject when called with: ${JSON.stringify(content)}`, () => {
        return apiClient.createRuleset(content)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid rules content.');
      });
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.createRuleset({
        source: {
          files: [RULES_FILE],
        },
      }).should.eventually.be.rejectedWith(noProjectId);
    });

    const invalidFiles: any[] = [null, undefined, 'test', {}, { name: 'test' }, { content: 'test' }];
    invalidFiles.forEach((file) => {
      it(`should reject when called with: ${JSON.stringify(file)}`, () => {
        const ruleset: RulesetContent = {
          source: {
            files: [file],
          },
        };
        return apiClient.createRuleset(ruleset)
          .should.eventually.be.rejected.and.have.property(
            'message', `Invalid rules file argument: ${JSON.stringify(file)}`);
      });

      it(`should reject when called with extra argument: ${JSON.stringify(file)}`, () => {
        const ruleset: RulesetContent = {
          source: {
            files: [RULES_FILE, file],
          },
        };
        return apiClient.createRuleset(ruleset)
          .should.eventually.be.rejected.and.have.property(
            'message', `Invalid rules file argument: ${JSON.stringify(file)}`);
      });
    });

    it('should resolve with the created resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({ name: 'some-name', ...RULES_CONTENT }));
      stubs.push(stub);
      return apiClient.createRuleset(RULES_CONTENT)
        .then((resp) => {
          expect(resp.name).to.equal('some-name');
          expect(resp.source).to.not.be.undefined;
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets',
            data: RULES_CONTENT,
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.createRuleset(RULES_CONTENT)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when the rulesets limit reached', () => {
      const resourceExhaustedError = {
        error: {
          code: 429,
          message: 'The maximum number of Rulesets (2500) have already been created for the project.',
          status: 'RESOURCE_EXHAUSTED',
        },
      };
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(resourceExhaustedError, 429));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('resource-exhausted', resourceExhaustedError.error.message);
      return apiClient.createRuleset(RULES_CONTENT)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.createRuleset(RULES_CONTENT)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.createRuleset(RULES_CONTENT)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.createRuleset(RULES_CONTENT)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('listRulesets', () => {
    const LIST_RESPONSE = {
      rulesets: [
        {
          name: 'rs1',
          createTime: 'date1',
        },
      ],
      nextPageToken: 'next',
    };

    const invalidPageSizes: any[] = [null, '', '10', true, {}, []];
    invalidPageSizes.forEach((invalidPageSize) => {
      it(`should reject when called with invalid page size: ${JSON.stringify(invalidPageSize)}`, () => {
        return apiClient.listRulesets(invalidPageSize)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Invalid page size.');
      });
    });

    const outOfRangePageSizes: number[] = [-1, 0, 101];
    outOfRangePageSizes.forEach((invalidPageSize) => {
      it(`should reject when called with invalid page size: ${invalidPageSize}`, () => {
        return apiClient.listRulesets(invalidPageSize)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Page size must be between 1 and 100.');
      });
    });

    const invalidPageTokens: any[] = [null, 0, '', true, {}, []];
    invalidPageTokens.forEach((invalidPageToken) => {
      it(`should reject when called with invalid page token: ${JSON.stringify(invalidPageToken)}`, () => {
        return apiClient.listRulesets(10, invalidPageToken)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Next page token must be a non-empty string.');
      });
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.listRulesets()
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve on success when called without any arguments', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(LIST_RESPONSE));
      stubs.push(stub);
      return apiClient.listRulesets()
        .then((resp) => {
          expect(resp).to.deep.equal(LIST_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets',
            data: { pageSize: 100 },
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should resolve on success when called with a page size', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(LIST_RESPONSE));
      stubs.push(stub);
      return apiClient.listRulesets(50)
        .then((resp) => {
          expect(resp).to.deep.equal(LIST_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets',
            data: { pageSize: 50 },
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should resolve on success when called with a page token', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(LIST_RESPONSE));
      stubs.push(stub);
      return apiClient.listRulesets(50, 'next')
        .then((resp) => {
          expect(resp).to.deep.equal(LIST_RESPONSE);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets',
            data: { pageSize: 50, pageToken: 'next' },
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.listRulesets()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.listRulesets()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.listRulesets()
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.listRulesets()
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('getRelease', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.getRelease(RELEASE_NAME)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve with the requested release on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({ name: 'bar' }));
      stubs.push(stub);
      return apiClient.getRelease(RELEASE_NAME)
        .then((resp) => {
          expect(resp.name).to.equal('bar');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/releases/test.service',
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.getRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.getRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('updateRelease', () => {
    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.updateRelease(RELEASE_NAME, RULESET_NAME)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve with the updated release on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({ name: 'bar' }));
      stubs.push(stub);
      return apiClient.updateRelease(RELEASE_NAME, RULESET_NAME)
        .then((resp) => {
          expect(resp.name).to.equal('bar');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'PATCH',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/releases/test.service',
            data: {
              release: {
                name: 'projects/test-project/releases/test.service',
                rulesetName: 'projects/test-project/rulesets/ruleset-id',
              },
            },
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.updateRelease(RELEASE_NAME, RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.updateRelease(RELEASE_NAME, RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.updateRelease(RELEASE_NAME, RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.updateRelease(RELEASE_NAME, RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });

  describe('deleteRuleset', () => {
    const INVALID_NAMES: any[] = [null, undefined, '', 1, true, {}, []];
    INVALID_NAMES.forEach((invalidName) => {
      it(`should reject when called with: ${JSON.stringify(invalidName)}`, () => {
        return apiClient.deleteRuleset(invalidName)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Ruleset name must be a non-empty string.');
      });
    });

    it('should reject when called with prefixed name', () => {
      return apiClient.deleteRuleset('projects/foo/rulesets/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name must not contain any "/" characters.');
    });

    it('should reject when project id is not available', () => {
      return clientWithoutProjectId.deleteRuleset(RULESET_NAME)
        .should.eventually.be.rejectedWith(noProjectId);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));
      stubs.push(stub);
      return apiClient.deleteRuleset(RULESET_NAME)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'DELETE',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets/ruleset-id',
            headers: EXPECTED_HEADERS,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.deleteRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.deleteRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.deleteRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.deleteRuleset(RULESET_NAME)
        .should.eventually.be.rejected.and.deep.include(expected);
    });
  });
});

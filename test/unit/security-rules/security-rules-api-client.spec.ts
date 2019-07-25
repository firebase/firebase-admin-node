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
import { SecurityRulesApiClient } from '../../../src/security-rules/security-rules-api-client';
import { FirebaseSecurityRulesError } from '../../../src/security-rules/security-rules-utils';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import { FirebaseAppError } from '../../../src/utils/error';

const expect = chai.expect;

describe('SecurityRulesApiClient', () => {

  const NO_PROJECT_ID = 'Failed to determine project ID. Initialize the SDK with service '
    + 'account credentials, or set project ID as an app option. Alternatively, set the '
    + 'GOOGLE_CLOUD_PROJECT environment variable.';
  const RESOURCE_ID = 'rulesets/ruleset-id';
  const ERROR_RESPONSE = {
    error: {
      code: 404,
      message: 'Requested entity not found',
      status: 'NOT_FOUND',
    },
  };

  const apiClient: SecurityRulesApiClient = new SecurityRulesApiClient(
    new HttpClient(), 'test-project');

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
  });

  describe('Constructor', () => {
    it('should throw when the HttpClient is null', () => {
      expect(() => new SecurityRulesApiClient(null, 'test'))
        .to.throw('HttpClient must be a non-null object.');
    });

    const invalidProjectIds: any[] = [null, undefined, '', {}, [], true, 1];
    invalidProjectIds.forEach((invalidProjectId) => {
      it(`should throw when the projectId is: ${invalidProjectId}`, () => {
        expect(() => new SecurityRulesApiClient(new HttpClient(), invalidProjectId))
          .to.throw(NO_PROJECT_ID);
      });
    });
  });

  describe('getResource', () => {
    it('should resolve with the requested resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({foo: 'bar'}));
      stubs.push(stub);
      return apiClient.getResource<{foo: string}>(RESOURCE_ID)
        .then((resp) => {
          expect(resp.foo).to.equal('bar');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'GET',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets/ruleset-id',
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.getResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.getResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.getResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.getResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });

  describe('createResource', () => {
    const data = {foo: 'bar'};

    it('should resolve with the created resource on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({name: 'some-name', ...data}));
      stubs.push(stub);
      return apiClient.createResource<{name: string, foo: string}>('rulesets', data)
        .then((resp) => {
          expect(resp.name).to.equal('some-name');
          expect(resp.foo).to.equal('bar');
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'POST',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets',
            data,
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.createResource(RESOURCE_ID, data)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.createResource(RESOURCE_ID, data)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.createResource(RESOURCE_ID, data)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.createResource(RESOURCE_ID, data)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });

  describe('deleteResource', () => {
    it('should resolve on success', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({}));
      stubs.push(stub);
      return apiClient.deleteResource(RESOURCE_ID)
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: 'DELETE',
            url: 'https://firebaserules.googleapis.com/v1/projects/test-project/rulesets/ruleset-id',
          });
        });
    });

    it('should throw when a full platform error response is received', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(ERROR_RESPONSE, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('not-found', 'Requested entity not found');
      return apiClient.deleteResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error when error code is not present', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError('unknown-error', 'Unknown server error: {}');
      return apiClient.deleteResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw unknown-error for non-json response', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom('not json', 404));
      stubs.push(stub);
      const expected = new FirebaseSecurityRulesError(
        'unknown-error', 'Unexpected response with status: 404 and body: not json');
      return apiClient.deleteResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });

    it('should throw when rejected with a FirebaseAppError', () => {
      const expected = new FirebaseAppError('network-error', 'socket hang up');
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(expected);
      stubs.push(stub);
      return apiClient.deleteResource(RESOURCE_ID)
        .should.eventually.be.rejected.and.deep.equal(expected);
    });
  });
});

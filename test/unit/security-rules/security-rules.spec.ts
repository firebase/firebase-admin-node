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
import { SecurityRules } from '../../../src/security-rules/security-rules';
import { FirebaseApp } from '../../../src/firebase-app';
import * as mocks from '../../resources/mocks';
import { SecurityRulesApiClient, RulesetContent } from '../../../src/security-rules/security-rules-api-client';
import { FirebaseSecurityRulesError } from '../../../src/security-rules/security-rules-utils';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('SecurityRules', () => {

  const EXPECTED_ERROR = new FirebaseSecurityRulesError('internal-error', 'message');
  const FIRESTORE_RULESET_RESPONSE = {
    name: 'projects/test-project/rulesets/foo',
    createTime: '2019-03-08T23:45:23.288047Z',
    source: {
      files: [
        {
          name: 'firestore.rules',
          content: 'service cloud.firestore{\n}\n',
        },
      ],
    },
  };
  const CREATE_TIME_UTC = 'Fri, 08 Mar 2019 23:45:23 GMT';

  let securityRules: SecurityRules;
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    securityRules = new SecurityRules(mockApp);
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
          const securityRulesAny: any = SecurityRules;
          return new securityRulesAny(invalidApp);
        }).to.throw(
            'First argument passed to admin.securityRules() must be a valid Firebase app '
                + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const securityRulesAny: any = SecurityRules;
        return new securityRulesAny();
      }).to.throw(
          'First argument passed to admin.securityRules() must be a valid Firebase app '
              + 'instance.');
    });

    it('should throw when initialized without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials, or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      expect(() => {
        return new SecurityRules(mockCredentialApp);
      }).to.throw(noProjectId);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new SecurityRules(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(securityRules.app).to.equal(mockApp);
    });
  });

  describe('getRuleset', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(null);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Ruleset response: null');
    });

    it('should reject when API response does not contain a name', () => {
      const response = deepCopy(FIRESTORE_RULESET_RESPONSE);
      response.name = '';
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(response);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Ruleset response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const response = deepCopy(FIRESTORE_RULESET_RESPONSE);
      response.createTime = '';
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(response);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Ruleset response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain a source', () => {
      const response = deepCopy(FIRESTORE_RULESET_RESPONSE);
      response.source = null;
      const stub = sinon
          .stub(SecurityRulesApiClient.prototype, 'getRuleset')
          .resolves(response);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Ruleset response: ${JSON.stringify(response)}`);
    });

    it('should resolve with Ruleset on success', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(stub);

      return securityRules.getRuleset('foo')
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
          expect(ruleset.source.length).to.equal(1);

          const file = ruleset.source[0];
          expect(file.name).equals('firestore.rules');
          expect(file.content).equals('service cloud.firestore{\n}\n');
        });
    });
  });

  describe('getFirestoreRuleset', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.getFirestoreRuleset()
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when getRelease response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves({});
      stubs.push(stub);

      return securityRules.getFirestoreRuleset()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name not found for cloud.firestore.');
    });

    it('should resolve with Ruleset on success', () => {
      const getRelease = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves({
          rulesetName: 'projects/test-project/rulesets/foo',
        });
      const getRuleset = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(getRelease, getRuleset);

      return securityRules.getFirestoreRuleset()
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
          expect(ruleset.source.length).to.equal(1);

          const file = ruleset.source[0];
          expect(file.name).equals('firestore.rules');
          expect(file.content).equals('service cloud.firestore{\n}\n');
        });
    });
  });

  describe('releaseFirestoreRuleset', () => {
    const invalidRulesetError = new FirebaseSecurityRulesError(
      'invalid-argument',
      'ruleset must be a non-empty name or a RulesetMetadata object.',
    );
    const invalidRulesets: any[] = [null, undefined, '', 1, true, {}, [], {name: ''}];
    invalidRulesets.forEach((invalidRuleset) => {
      it(`should reject when called with: ${JSON.stringify(invalidRuleset)}`, () => {
        return securityRules.releaseFirestoreRuleset(invalidRuleset)
          .should.eventually.be.rejected.and.deep.equal(invalidRulesetError);
      });
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.releaseFirestoreRuleset('foo')
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should resolve on success when the ruleset specified by name', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves({
          rulesetName: 'projects/test-project/rulesets/foo',
        });
      stubs.push(stub);

      return securityRules.releaseFirestoreRuleset('foo')
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith('cloud.firestore', 'foo');
        });
    });

    it('should resolve on success when the ruleset specified as an object', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves({
          rulesetName: 'projects/test-project/rulesets/foo',
        });
      stubs.push(stub);

      return securityRules.releaseFirestoreRuleset({name: 'foo', createTime: 'time'})
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith('cloud.firestore', 'foo');
        });
    });
  });

  describe('createRulesFileFromSource', () => {
    const INVALID_STRINGS: any[] = [null, undefined, '', 1, true, {}, []];

    INVALID_STRINGS.forEach((invalidName) => {
      it(`should throw if the name is ${JSON.stringify(invalidName)}`, () => {
        expect(() => securityRules.createRulesFileFromSource(invalidName, 'test'))
          .to.throw('Name must be a non-empty string.');
      });
    });

    const invalidSources = [...INVALID_STRINGS];
    invalidSources.forEach((invalidSource) => {
      it(`should throw if the source is ${JSON.stringify(invalidSource)}`, () => {
        expect(() => securityRules.createRulesFileFromSource('test.rules', invalidSource))
          .to.throw('Source must be a non-empty string or a Buffer.');
      });
    });

    it('should succeed when source specified as a string', () => {
      const file = securityRules.createRulesFileFromSource('test.rules', 'test source {}');
      expect(file.name).to.equal('test.rules');
      expect(file.content).to.equal('test source {}');
    });

    it('should succeed when source specified as a Buffer', () => {
      const file = securityRules.createRulesFileFromSource('test.rules', Buffer.from('test source {}'));
      expect(file.name).to.equal('test.rules');
      expect(file.content).to.equal('test source {}');
    });
  });

  describe('createRuleset', () => {
    const RULES_FILE = {
      name: 'test.rules',
      content: 'test source {}',
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.createRuleset(RULES_FILE)
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .resolves(null);
      stubs.push(stub);
      return securityRules.createRuleset(RULES_FILE)
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid Ruleset response: null');
    });

    it('should reject when API response does not contain a name', () => {
      const response = deepCopy(FIRESTORE_RULESET_RESPONSE);
      response.name = '';
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .resolves(response);
      stubs.push(stub);
      return securityRules.createRuleset(RULES_FILE)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Ruleset response: ${JSON.stringify(response)}`);
    });

    it('should reject when API response does not contain a createTime', () => {
      const response = deepCopy(FIRESTORE_RULESET_RESPONSE);
      response.createTime = '';
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .resolves(response);
      stubs.push(stub);
      return securityRules.createRuleset(RULES_FILE)
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Ruleset response: ${JSON.stringify(response)}`);
    });

    it('should resolve with Ruleset on success', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(stub);

      return securityRules.createRuleset(RULES_FILE)
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
          expect(ruleset.source.length).to.equal(1);

          const file = ruleset.source[0];
          expect(file.name).equals('firestore.rules');
          expect(file.content).equals('service cloud.firestore{\n}\n');

          const request: RulesetContent = {
            source: {
              files: [
                RULES_FILE,
              ],
            },
          };
          expect(stub).to.have.been.called.calledOnce.and.calledWith(request);
        });
    });
  });

  describe('deleteRuleset', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'deleteRuleset')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.deleteRuleset('foo')
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'deleteRuleset')
        .resolves({});
      stubs.push(stub);

      return securityRules.deleteRuleset('foo');
    });
  });
});

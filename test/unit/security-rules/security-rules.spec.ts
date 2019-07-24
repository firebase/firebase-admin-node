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
import { SecurityRulesApiClient } from '../../../src/security-rules/security-rules-api-client';
import { FirebaseSecurityRulesError } from '../../../src/security-rules/security-rules-utils';
import { deepCopy } from '../../../src/utils/deep-copy';

const expect = chai.expect;

describe('SecurityRules', () => {

  const NO_PROJECT_ID = 'Failed to determine project ID. Initialize the SDK with service '
      + 'account credentials, or set project ID as an app option. Alternatively, set the '
      + 'GOOGLE_CLOUD_PROJECT environment variable.';
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
      expect(() => {
        return new SecurityRules(mockCredentialApp);
      }).to.throw(NO_PROJECT_ID);
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
    const invalidNames: any[] = [null, '', 1, true, {}, []];
    invalidNames.forEach((invalidName) => {
      it(`should reject when called with: ${JSON.stringify(invalidName)}`, () => {
        return securityRules.getRuleset(invalidName)
          .should.eventually.be.rejected.and.have.property(
            'message', 'Ruleset name must be a non-empty string.');
      });
    });

    it(`should reject when called with prefixed name`, () => {
      return securityRules.getRuleset('projects/foo/rulesets/bar')
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name must not contain any "/" characters.');
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getResource')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getResource')
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
        .stub(SecurityRulesApiClient.prototype, 'getResource')
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
        .stub(SecurityRulesApiClient.prototype, 'getResource')
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
          .stub(SecurityRulesApiClient.prototype, 'getResource')
          .resolves(response);
      stubs.push(stub);
      return securityRules.getRuleset('foo')
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid Ruleset response: ${JSON.stringify(response)}`);
    });

    it('should resolve with Ruleset on success', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getResource')
        .resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(stub);

      return securityRules.getRuleset('foo')
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal('Fri, 08 Mar 2019 23:45:23 GMT');
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
        .stub(SecurityRulesApiClient.prototype, 'getResource')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.getFirestoreRuleset()
        .should.eventually.be.rejected.and.deep.equal(EXPECTED_ERROR);
    });

    it('should reject when getRelease response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getResource')
        .resolves({});
      stubs.push(stub);

      return securityRules.getFirestoreRuleset()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name not found for cloud.firestore.');
    });

    it('should resolve with Ruleset on success', () => {
      const stub = sinon.stub(SecurityRulesApiClient.prototype, 'getResource');
      stub.onCall(0).resolves({
        rulesetName: 'projects/test-project/rulesets/foo',
      });
      stub.onCall(1).resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(stub);

      return securityRules.getFirestoreRuleset()
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal('Fri, 08 Mar 2019 23:45:23 GMT');
          expect(ruleset.source.length).to.equal(1);

          const file = ruleset.source[0];
          expect(file.name).equals('firestore.rules');
          expect(file.content).equals('service cloud.firestore{\n}\n');
        });
    });
  });
});

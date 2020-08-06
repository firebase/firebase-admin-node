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
import { SecurityRulesApiClient, RulesetContent } from '../../../src/security-rules/security-rules-api-client-internal';
import { FirebaseSecurityRulesError } from '../../../src/security-rules/security-rules-internal';
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
  const FIRESTORE_RULESET_RELEASE = {
    name: 'projects/test-project/releases/firestore.release',
    rulesetName: 'projects/test-project/rulesets/foo',
  };
  const CREATE_TIME_UTC = 'Fri, 08 Mar 2019 23:45:23 GMT';

  const INVALID_RULESET_ERROR = new FirebaseSecurityRulesError(
    'invalid-argument',
    'ruleset must be a non-empty name or a RulesetMetadata object.',
  );
  const INVALID_RULESETS: any[] = [null, undefined, '', 1, true, {}, [], { name: '' }];

  const INVALID_BUCKET_ERROR = new FirebaseSecurityRulesError(
    'invalid-argument',
    'Bucket name not specified or invalid. Specify a default bucket name via the ' +
    'storageBucket option when initializing the app, or specify the bucket name ' +
    'explicitly when calling the rules API.',
  );
  const INVALID_BUCKET_NAMES: any[] = [null, '', true, false, 1, 0, {}, []];

  const INVALID_SOURCES: any[] = [null, undefined, '', 1, true, {}, []];
  const INVALID_SOURCE_ERROR = new FirebaseSecurityRulesError(
    'invalid-argument', 'Source must be a non-empty string or a Buffer.');

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

  function stubReleaseFromSource(): [sinon.SinonStub, sinon.SinonStub] {
    const createRuleset = sinon
      .stub(SecurityRulesApiClient.prototype, 'createRuleset')
      .resolves(FIRESTORE_RULESET_RESPONSE);
    const updateRelease = sinon
      .stub(SecurityRulesApiClient.prototype, 'updateRelease')
      .resolves(FIRESTORE_RULESET_RELEASE);
    stubs.push(createRuleset, updateRelease);
    return [createRuleset, updateRelease];
  }

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

    it('should reject when initialized without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials, or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      const rulesWithoutProjectId = new SecurityRules(mockCredentialApp);
      return rulesWithoutProjectId.getRuleset('test')
        .should.eventually.rejectedWith(noProjectId);
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
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(null as any);
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
      response.source = null as any;
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
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should reject when getRelease response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves({} as any);
      stubs.push(stub);

      return securityRules.getFirestoreRuleset()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name not found for cloud.firestore.');
    });

    it('should resolve with Ruleset on success', () => {
      const getRelease = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
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

          expect(getRelease).to.have.been.calledOnce.and.calledWith(
            'cloud.firestore');
        });
    });
  });

  describe('getStorageRuleset', () => {
    INVALID_BUCKET_NAMES.forEach((bucketName) => {
      it(`should reject when called with: ${JSON.stringify(bucketName)}`, () => {
        return securityRules.getStorageRuleset(bucketName)
          .should.eventually.be.rejected.and.deep.include(INVALID_BUCKET_ERROR);
      });
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.getStorageRuleset()
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should reject when getRelease response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves({} as any);
      stubs.push(stub);

      return securityRules.getStorageRuleset()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Ruleset name not found for firebase.storage/bucketName.appspot.com.');
    });

    it('should resolve with Ruleset for the default bucket on success', () => {
      const getRelease = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      const getRuleset = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(getRelease, getRuleset);

      return securityRules.getStorageRuleset()
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
          expect(ruleset.source.length).to.equal(1);

          const file = ruleset.source[0];
          expect(file.name).equals('firestore.rules');
          expect(file.content).equals('service cloud.firestore{\n}\n');

          expect(getRelease).to.have.been.calledOnce.and.calledWith(
            'firebase.storage/bucketName.appspot.com');
        });
    });

    it('should resolve with Ruleset for the specified bucket on success', () => {
      const getRelease = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      const getRuleset = sinon
        .stub(SecurityRulesApiClient.prototype, 'getRuleset')
        .resolves(FIRESTORE_RULESET_RESPONSE);
      stubs.push(getRelease, getRuleset);

      return securityRules.getStorageRuleset('other.appspot.com')
        .then((ruleset) => {
          expect(ruleset.name).to.equal('foo');
          expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
          expect(ruleset.source.length).to.equal(1);

          const file = ruleset.source[0];
          expect(file.name).equals('firestore.rules');
          expect(file.content).equals('service cloud.firestore{\n}\n');

          expect(getRelease).to.have.been.calledOnce.and.calledWith(
            'firebase.storage/other.appspot.com');
        });
    });
  });

  describe('releaseFirestoreRuleset', () => {
    INVALID_RULESETS.forEach((invalidRuleset) => {
      it(`should reject when called with: ${JSON.stringify(invalidRuleset)}`, () => {
        return securityRules.releaseFirestoreRuleset(invalidRuleset)
          .should.eventually.be.rejected.and.deep.include(INVALID_RULESET_ERROR);
      });
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.releaseFirestoreRuleset('foo')
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should resolve on success when the ruleset specified by name', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      stubs.push(stub);

      return securityRules.releaseFirestoreRuleset('foo')
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith('cloud.firestore', 'foo');
        });
    });

    it('should resolve on success when the ruleset specified as an object', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      stubs.push(stub);

      return securityRules.releaseFirestoreRuleset({ name: 'foo', createTime: 'time' })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith('cloud.firestore', 'foo');
        });
    });
  });

  describe('releaseFirestoreRulesetFromSource', () => {
    const RULES_FILE = {
      name: 'firestore.rules',
      content: 'test source {}',
    };

    INVALID_SOURCES.forEach((invalidSource) => {
      it(`should reject when called with: ${JSON.stringify(invalidSource)}`, () => {
        return securityRules.releaseFirestoreRulesetFromSource(invalidSource)
          .should.eventually.be.rejected.and.deep.include(INVALID_SOURCE_ERROR);
      });
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.releaseFirestoreRulesetFromSource('foo')
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    const sources: {[key: string]: string | Buffer} = {
      string: RULES_FILE.content,
      buffer: Buffer.from(RULES_FILE.content),
    };
    Object.keys(sources).forEach((key) => {
      it(`should resolve on success when source specified as a ${key}`, () => {
        const [createRuleset, updateRelease] = stubReleaseFromSource();

        return securityRules.releaseFirestoreRulesetFromSource(sources[key])
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
            expect(createRuleset).to.have.been.called.calledOnce.and.calledWith(request);
            expect(updateRelease).to.have.been.calledOnce.and.calledWith('cloud.firestore', ruleset.name);
          });
      });
    });
  });

  describe('releaseStorageRuleset', () => {
    INVALID_RULESETS.forEach((invalidRuleset) => {
      it(`should reject when called with: ${JSON.stringify(invalidRuleset)}`, () => {
        return securityRules.releaseStorageRuleset(invalidRuleset)
          .should.eventually.be.rejected.and.deep.include(INVALID_RULESET_ERROR);
      });
    });

    INVALID_BUCKET_NAMES.forEach((bucketName) => {
      it(`should reject when called with: ${JSON.stringify(bucketName)}`, () => {
        return securityRules.releaseStorageRuleset('foo', bucketName)
          .should.eventually.be.rejected.and.deep.include(INVALID_BUCKET_ERROR);
      });
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.releaseStorageRuleset('foo')
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should resolve on success when the ruleset specified by name', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      stubs.push(stub);

      return securityRules.releaseStorageRuleset('foo')
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith(
            'firebase.storage/bucketName.appspot.com', 'foo');
        });
    });

    it('should resolve on success when a custom bucket name is specified', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      stubs.push(stub);

      return securityRules.releaseStorageRuleset('foo', 'other.appspot.com')
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith(
            'firebase.storage/other.appspot.com', 'foo');
        });
    });

    it('should resolve on success when the ruleset specified as an object', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'updateRelease')
        .resolves(FIRESTORE_RULESET_RELEASE);
      stubs.push(stub);

      return securityRules.releaseStorageRuleset({ name: 'foo', createTime: 'time' })
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith(
            'firebase.storage/bucketName.appspot.com', 'foo');
        });
    });
  });

  describe('releaseStorageRulesetFromSource', () => {
    const RULES_FILE = {
      name: 'storage.rules',
      content: 'test source {}',
    };
    const RULES_CONTENT: RulesetContent = {
      source: {
        files: [
          RULES_FILE,
        ],
      },
    };

    INVALID_SOURCES.forEach((invalidSource) => {
      it(`should reject when called with source: ${JSON.stringify(invalidSource)}`, () => {
        return securityRules.releaseStorageRulesetFromSource(invalidSource)
          .should.eventually.be.rejected.and.deep.include(INVALID_SOURCE_ERROR);
      });
    });

    INVALID_BUCKET_NAMES.forEach((invalidBucket) => {
      it(`should reject when called with bucket: ${JSON.stringify(invalidBucket)}`, () => {
        return securityRules.releaseStorageRulesetFromSource(RULES_FILE.content, invalidBucket)
          .should.eventually.be.rejected.and.deep.include(INVALID_BUCKET_ERROR);
      });
    });

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.releaseStorageRulesetFromSource('foo')
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    const sources: {[key: string]: string | Buffer} = {
      string: RULES_FILE.content,
      buffer: Buffer.from(RULES_FILE.content),
    };
    Object.keys(sources).forEach((key) => {
      it(`should resolve on success when source specified as a ${key} for default bucket`, () => {
        const [createRuleset, updateRelease] = stubReleaseFromSource();

        return securityRules.releaseStorageRulesetFromSource(sources[key])
          .then((ruleset) => {
            expect(ruleset.name).to.equal('foo');
            expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
            expect(ruleset.source.length).to.equal(1);

            const file = ruleset.source[0];
            expect(file.name).equals('firestore.rules');
            expect(file.content).equals('service cloud.firestore{\n}\n');

            expect(createRuleset).to.have.been.called.calledOnce.and.calledWith(RULES_CONTENT);
            expect(updateRelease).to.have.been.calledOnce.and.calledWith(
              'firebase.storage/bucketName.appspot.com', ruleset.name);
          });
      });
    });

    Object.keys(sources).forEach((key) => {
      it(`should resolve on success when source specified as a ${key} for a custom bucket`, () => {
        const [createRuleset, updateRelease] = stubReleaseFromSource();

        return securityRules.releaseStorageRulesetFromSource(sources[key], 'other.appspot.com')
          .then((ruleset) => {
            expect(ruleset.name).to.equal('foo');
            expect(ruleset.createTime).to.equal(CREATE_TIME_UTC);
            expect(ruleset.source.length).to.equal(1);

            const file = ruleset.source[0];
            expect(file.name).equals('firestore.rules');
            expect(file.content).equals('service cloud.firestore{\n}\n');

            expect(createRuleset).to.have.been.called.calledOnce.and.calledWith(RULES_CONTENT);
            expect(updateRelease).to.have.been.calledOnce.and.calledWith(
              'firebase.storage/other.appspot.com', ruleset.name);
          });
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
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'createRuleset')
        .resolves(null as any);
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
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should resolve on success', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'deleteRuleset')
        .resolves();
      stubs.push(stub);

      return securityRules.deleteRuleset('foo');
    });
  });

  describe('listRulesetMetadata', () => {
    const LIST_RULESETS_RESPONSE = {
      rulesets: [
        {
          name: 'projects/test-project/rulesets/rs1',
          createTime: '2019-03-08T23:45:23.288047Z',
        },
        {
          name: 'projects/test-project/rulesets/rs2',
          createTime: '2019-03-08T23:45:23.288047Z',
        },
      ],
      nextPageToken: 'next',
    };

    it('should propagate API errors', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .rejects(EXPECTED_ERROR);
      stubs.push(stub);
      return securityRules.listRulesetMetadata()
        .should.eventually.be.rejected.and.deep.include(EXPECTED_ERROR);
    });

    it('should reject when API response is invalid', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .resolves(null as any);
      stubs.push(stub);
      return securityRules.listRulesetMetadata()
        .should.eventually.be.rejected.and.have.property(
          'message', 'Invalid ListRulesets response: null');
    });

    it('should reject when API response does not contain rulesets', () => {
      const response: any = deepCopy(LIST_RULESETS_RESPONSE);
      response.rulesets = '';
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .resolves(response);
      stubs.push(stub);
      return securityRules.listRulesetMetadata()
        .should.eventually.be.rejected.and.have.property(
          'message', `Invalid ListRulesets response: ${JSON.stringify(response)}`);
    });

    it('should resolve with RulesetMetadataList on success', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .resolves(LIST_RULESETS_RESPONSE);
      stubs.push(stub);

      return securityRules.listRulesetMetadata()
        .then((result) => {
          expect(result.rulesets.length).equals(2);
          expect(result.rulesets[0].name).equals('rs1');
          expect(result.rulesets[0].createTime).equals(CREATE_TIME_UTC);
          expect(result.rulesets[1].name).equals('rs2');
          expect(result.rulesets[1].createTime).equals(CREATE_TIME_UTC);

          expect(result.nextPageToken).equals('next');

          expect(stub).to.have.been.calledOnce.and.calledWith(100);
        });
    });

    it('should resolve with RulesetMetadataList on success when called with page size', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .resolves(LIST_RULESETS_RESPONSE);
      stubs.push(stub);

      return securityRules.listRulesetMetadata(10)
        .then((result) => {
          expect(result.rulesets.length).equals(2);
          expect(result.rulesets[0].name).equals('rs1');
          expect(result.rulesets[0].createTime).equals(CREATE_TIME_UTC);
          expect(result.rulesets[1].name).equals('rs2');
          expect(result.rulesets[1].createTime).equals(CREATE_TIME_UTC);

          expect(result.nextPageToken).equals('next');

          expect(stub).to.have.been.calledOnce.and.calledWith(10);
        });
    });

    it('should resolve with RulesetMetadataList on success when called with page token', () => {
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .resolves(LIST_RULESETS_RESPONSE);
      stubs.push(stub);

      return securityRules.listRulesetMetadata(10, 'next')
        .then((result) => {
          expect(result.rulesets.length).equals(2);
          expect(result.rulesets[0].name).equals('rs1');
          expect(result.rulesets[0].createTime).equals(CREATE_TIME_UTC);
          expect(result.rulesets[1].name).equals('rs2');
          expect(result.rulesets[1].createTime).equals(CREATE_TIME_UTC);

          expect(result.nextPageToken).equals('next');

          expect(stub).to.have.been.calledOnce.and.calledWith(10, 'next');
        });
    });

    it('should resolve with RulesetMetadataList when the response contains no page token', () => {
      const response = deepCopy(LIST_RULESETS_RESPONSE);
      delete response.nextPageToken;
      const stub = sinon
        .stub(SecurityRulesApiClient.prototype, 'listRulesets')
        .resolves(response);
      stubs.push(stub);

      return securityRules.listRulesetMetadata(10, 'next')
        .then((result) => {
          expect(result.rulesets.length).equals(2);
          expect(result.rulesets[0].name).equals('rs1');
          expect(result.rulesets[0].createTime).equals(CREATE_TIME_UTC);
          expect(result.rulesets[1].name).equals('rs2');
          expect(result.rulesets[1].createTime).equals(CREATE_TIME_UTC);

          expect(result.nextPageToken).to.be.undefined;

          expect(stub).to.have.been.calledOnce.and.calledWith(10, 'next');
        });
    });
  });
});

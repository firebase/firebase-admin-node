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

import * as chai from 'chai';

import * as admin from '../../lib/index';

const expect = chai.expect;

const RULES_FILE_NAME = 'firestore.rules';

const SAMPLE_FIRESTORE_RULES = `service cloud.firestore {
  // Admin Node.js integration test run at ${new Date().toUTCString()}
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

const SAMPLE_STORAGE_RULES = `service firebase.storage {
  // Admin Node.js integration test run at ${new Date().toUTCString()}
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

const RULESET_NAME_PATTERN = /[0-9a-zA-Z-]+/;


describe('admin.securityRules', () => {

  const rulesetsToDelete: string[] = [];

  function scheduleForDelete(ruleset: admin.securityRules.Ruleset): void {
    rulesetsToDelete.push(ruleset.name);
  }

  function unscheduleForDelete(ruleset: admin.securityRules.Ruleset): void {
    rulesetsToDelete.splice(rulesetsToDelete.indexOf(ruleset.name), 1);
  }

  function deleteTempRulesets(): Promise<void[]> {
    const promises: Array<Promise<void>> = [];
    rulesetsToDelete.forEach((rs) => {
      promises.push(admin.securityRules().deleteRuleset(rs));
    });
    rulesetsToDelete.splice(0, rulesetsToDelete.length); // Clear out the array.
    return Promise.all(promises);
  }

  function createTemporaryRuleset(): Promise<admin.securityRules.Ruleset> {
    const name = 'firestore.rules';
    const rulesFile = admin.securityRules().createRulesFileFromSource(name, SAMPLE_FIRESTORE_RULES);
    return admin.securityRules().createRuleset(rulesFile)
      .then((ruleset) => {
        scheduleForDelete(ruleset);
        return ruleset;
      });
  }

  afterEach(() => {
    return deleteTempRulesets();
  });

  describe('createRulesFileFromSource()', () => {
    it('creates a RulesFile from the source string', () => {
      const rulesFile = admin.securityRules().createRulesFileFromSource(
        RULES_FILE_NAME, SAMPLE_FIRESTORE_RULES);
      expect(rulesFile.name).to.equal(RULES_FILE_NAME);
      expect(rulesFile.content).to.equal(SAMPLE_FIRESTORE_RULES);
    });

    it('creates a RulesFile from the source Buffer', () => {
      const rulesFile = admin.securityRules().createRulesFileFromSource(
        'firestore.rules', Buffer.from(SAMPLE_FIRESTORE_RULES, 'utf-8'));
      expect(rulesFile.name).to.equal(RULES_FILE_NAME);
      expect(rulesFile.content).to.equal(SAMPLE_FIRESTORE_RULES);
    });
  });

  describe('createRuleset()', () => {
    it('creates a new Ruleset from a given RulesFile', () => {
      const rulesFile = admin.securityRules().createRulesFileFromSource(
        RULES_FILE_NAME, SAMPLE_FIRESTORE_RULES);
      return admin.securityRules().createRuleset(rulesFile)
        .then((ruleset) => {
          scheduleForDelete(ruleset);
          verifyFirestoreRuleset(ruleset);
        });
    });

    it('rejects with invalid-argument when the source is invalid', () => {
      const rulesFile = admin.securityRules().createRulesFileFromSource(
        RULES_FILE_NAME, 'invalid syntax');
      return admin.securityRules().createRuleset(rulesFile)
        .should.eventually.be.rejected.and.have.property('code', 'security-rules/invalid-argument');
    });
  });

  describe('getRuleset()', () => {
    it('rejects with not-found when the Ruleset does not exist', () => {
      const nonExistingName = '00000000-1111-2222-3333-444444444444';
      return admin.securityRules().getRuleset(nonExistingName)
        .should.eventually.be.rejected.and.have.property('code', 'security-rules/not-found');
    });

    it('rejects with invalid-argument when the Ruleset name is invalid', () => {
      return admin.securityRules().getRuleset('invalid uuid')
        .should.eventually.be.rejected.and.have.property('code', 'security-rules/invalid-argument');
    });

    it('resolves with existing Ruleset', () => {
      return createTemporaryRuleset()
        .then((expectedRuleset) =>
          admin.securityRules().getRuleset(expectedRuleset.name)
            .then((actualRuleset) => {
              expect(actualRuleset).to.deep.equal(expectedRuleset);
            }),
        );
    });
  });

  describe('Cloud Firestore', () => {
    let oldRuleset: admin.securityRules.Ruleset | null = null;
    let newRuleset: admin.securityRules.Ruleset | null = null;

    function revertFirestoreRulesetIfModified(): Promise<void> {
      if (!newRuleset || !oldRuleset) {
        return Promise.resolve();
      }

      return admin.securityRules().releaseFirestoreRuleset(oldRuleset);
    }

    afterEach(() => {
      return revertFirestoreRulesetIfModified();
    });

    it('getFirestoreRuleset() returns the Ruleset currently in effect', () => {
      return admin.securityRules().getFirestoreRuleset()
        .then((ruleset) => {
          expect(ruleset.name).to.match(RULESET_NAME_PATTERN);
          const createTime = new Date(ruleset.createTime);
          expect(ruleset.createTime).equals(createTime.toUTCString());

          expect(ruleset.source.length).to.equal(1);
        });
    });

    it('releaseFirestoreRulesetFromSource() applies the specified Ruleset to Firestore', () => {
      return admin.securityRules().getFirestoreRuleset()
        .then((ruleset) => {
          oldRuleset = ruleset;
          return admin.securityRules().releaseFirestoreRulesetFromSource(SAMPLE_FIRESTORE_RULES);
        })
        .then((ruleset) => {
          scheduleForDelete(ruleset);
          newRuleset = ruleset;

          expect(ruleset.name).to.not.equal(oldRuleset!.name);
          verifyFirestoreRuleset(ruleset);
          return admin.securityRules().getFirestoreRuleset();
        })
        .then((ruleset) => {
          expect(ruleset.name).to.equal(newRuleset!.name);
          verifyFirestoreRuleset(ruleset);
        });
    });
  });

  describe('Cloud Storage', () => {
    let oldRuleset: admin.securityRules.Ruleset | null = null;
    let newRuleset: admin.securityRules.Ruleset | null = null;

    function revertStorageRulesetIfModified(): Promise<void> {
      if (!newRuleset || !oldRuleset) {
        return Promise.resolve();
      }

      return admin.securityRules().releaseStorageRuleset(oldRuleset);
    }

    afterEach(() => {
      return revertStorageRulesetIfModified();
    });

    it('getStorageRuleset() returns the currently applied Storage rules', () => {
      return admin.securityRules().getStorageRuleset()
        .then((ruleset) => {
          expect(ruleset.name).to.match(RULESET_NAME_PATTERN);
          const createTime = new Date(ruleset.createTime);
          expect(ruleset.createTime).equals(createTime.toUTCString());

          expect(ruleset.source.length).to.equal(1);
        });
    });

    it('releaseStorageRulesetFromSource() applies the specified Ruleset to Storage', () => {
      return admin.securityRules().getStorageRuleset()
        .then((ruleset) => {
          oldRuleset = ruleset;
          return admin.securityRules().releaseStorageRulesetFromSource(SAMPLE_STORAGE_RULES);
        })
        .then((ruleset) => {
          scheduleForDelete(ruleset);
          newRuleset = ruleset;

          expect(ruleset.name).to.not.equal(oldRuleset!.name);
          expect(ruleset.name).to.match(RULESET_NAME_PATTERN);
          const createTime = new Date(ruleset.createTime);
          expect(ruleset.createTime).equals(createTime.toUTCString());
          return admin.securityRules().getStorageRuleset();
        })
        .then((ruleset) => {
          expect(ruleset.name).to.equal(newRuleset!.name);
        });
    });
  });

  describe('listRulesetMetadata()', () => {
    it('lists all available Rulesets in pages', () => {
      type RulesetMetadata = admin.securityRules.RulesetMetadata;

      function listAllRulesets(
        pageToken?: string, results: RulesetMetadata[] = []): Promise<RulesetMetadata[]> {

        return admin.securityRules().listRulesetMetadata(100, pageToken)
          .then((page) => {
            results.push(...page.rulesets);
            if (page.nextPageToken) {
              return listAllRulesets(page.nextPageToken, results);
            }

            return results;
          });
      }

      return Promise.all([createTemporaryRuleset(), createTemporaryRuleset()])
        .then((expectedRulesets) => {
          return listAllRulesets().then((actualRulesets) => {
            expectedRulesets.forEach((expectedRuleset) => {
              expect(actualRulesets.map((r) => r.name)).to.deep.include(expectedRuleset.name);
            });
          });
        });
    });

    it('lists the specified number of Rulesets', () => {
      return admin.securityRules().listRulesetMetadata(2)
        .then((page) => {
          expect(page.rulesets.length).to.be.at.most(2);
          expect(page.rulesets.length).to.be.at.least(1);
        });
    });
  });

  describe('deleteRuleset()', () => {
    it('rejects with not-found when the Ruleset does not exist', () => {
      const nonExistingName = '00000000-1111-2222-3333-444444444444';
      return admin.securityRules().deleteRuleset(nonExistingName)
        .should.eventually.be.rejected.and.have.property('code', 'security-rules/not-found');
    });

    it('rejects with invalid-argument when the Ruleset name is invalid', () => {
      return admin.securityRules().deleteRuleset('invalid uuid')
        .should.eventually.be.rejected.and.have.property('code', 'security-rules/invalid-argument');
    });

    it('deletes existing Ruleset', () => {
      return createTemporaryRuleset().then((ruleset) => {
        return admin.securityRules().deleteRuleset(ruleset.name)
          .then(() => {
            return admin.securityRules().getRuleset(ruleset.name)
              .should.eventually.be.rejected.and.have.property('code', 'security-rules/not-found');
          })
          .then(() => {
            unscheduleForDelete(ruleset); // Already deleted.
          });
      });
    });
  });

  function verifyFirestoreRuleset(ruleset: admin.securityRules.Ruleset): void {
    expect(ruleset.name).to.match(RULESET_NAME_PATTERN);
    const createTime = new Date(ruleset.createTime);
    expect(ruleset.createTime).equals(createTime.toUTCString());

    expect(ruleset.source.length).to.equal(1);
    expect(ruleset.source[0].name).to.equal(RULES_FILE_NAME);
    expect(ruleset.source[0].content).to.equal(SAMPLE_FIRESTORE_RULES);
  }
});

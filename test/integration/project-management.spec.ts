/*!
 * Copyright 2018 Google Inc.
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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as admin from '../../';
import { projectId, cmdArgs } from './setup';
import {
  Ruleset,
  RulesRelease,
} from '../../src/project-management/rules';

/* tslint:disable:no-var-requires */
const chalk = require('chalk');
/* tslint:enable:no-var-requires */

const APP_NAMESPACE_PREFIX = 'com.adminsdkintegrationtest.a';
const APP_NAMESPACE_SUFFIX_LENGTH = 15;

const APP_DISPLAY_NAME_PREFIX = 'Created By Firebase AdminSDK Nodejs Integration Testing ';
const APP_DISPLAY_NAME_SUFFIX_LENGTH = 15;

const SHA_256_HASH = 'aaaaccccaaaaccccaaaaccccaaaaccccaaaaccccaaaaccccaaaaccccaaaacccc';

const RULESET_ID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
let RELEASE_NAME_REGEX: RegExp;
let RULESET_NAME_REGEX: RegExp;

const DEFAULT_DATABASE_RULES = `
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
`.trim();

const DEFAULT_FIRESTORE_RULES = `
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`.trim();

const DEFAULT_STORAGE_RULES = `
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`.trim();

const TEST_DATABASE_RULES = `
{
  "rules": {
    // These rules are like the default ones
    ".read": "auth != null",
    // But with some comments added
    ".write": "auth != null"
  }
}
`.trim();

const TEST_FIRESTORE_RULES = `
service cloud.firestore {
  // These rules are like the default ones
  match /databases/{database}/documents {
    // But with some comments added
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`.trim();

const TEST_STORAGE_RULES = `
service firebase.storage {
  // These rules are like the default ones
  match /b/{bucket}/o {
    // But with some comments added
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`.trim();

const expect = chai.expect;

describe('admin.projectManagement', () => {

  let androidApp: admin.projectManagement.AndroidApp;
  let iosApp: admin.projectManagement.IosApp;

  before(() => {
    const androidPromise = ensureAndroidApp()
        .then((app) => {
          androidApp = app;
          return deleteAllShaCertificates(androidApp);
        });
    const iosPromise = ensureIosApp().then((app) => {
      iosApp = app;
    });

    let rulesPromise: Promise<any>;

    if (cmdArgs.updateRules) {
      rulesPromise = deleteUnusedRulesets();
    } else {
      /* tslint:disable:no-console */
      console.log(chalk.yellow('    Not updating security rules. Some tests may fail.'));
      console.log(chalk.yellow('    Set the --updateRules flag to force update rules.'));
      rulesPromise = Promise.resolve();
    }

    RELEASE_NAME_REGEX = new RegExp(`^projects/${projectId}/releases/(.+)$`);
    RULESET_NAME_REGEX = new RegExp(`^projects/${projectId}/rulesets/(.+)$`);

    return Promise.all([androidPromise, iosPromise, rulesPromise]);
  });

  describe('listAndroidApps()', () => {
    it('successfully lists Android apps', () => {
      return admin.projectManagement().listAndroidApps()
          .then((apps) => Promise.all(apps.map((app) => app.getMetadata())))
          .then((metadatas) => {
            expect(metadatas.length).to.be.at.least(1);
            const metadataOwnedByTest =
                metadatas.find((metadata) => isIntegrationTestApp(metadata.packageName));
            expect(metadataOwnedByTest).to.exist;
            expect(metadataOwnedByTest.appId).to.equal(androidApp.appId);
          });
    });
  });

  describe('listIosApps()', () => {
    it('successfully lists iOS apps', () => {
      return admin.projectManagement().listIosApps()
          .then((apps) => Promise.all(apps.map((app) => app.getMetadata())))
          .then((metadatas) => {
            expect(metadatas.length).to.be.at.least(1);
            const metadataOwnedByTest =
                metadatas.find((metadata) => isIntegrationTestApp(metadata.bundleId));
            expect(metadataOwnedByTest).to.exist;
            expect(metadataOwnedByTest.appId).to.equal(iosApp.appId);
          });
    });
  });

  describe('androidApp.getMetadata()', () => {
    it('successfully sets Android app\'s display name', () => {
      return androidApp.getMetadata().then((appMetadata) => {
        expect(appMetadata.displayName).to.include(APP_DISPLAY_NAME_PREFIX);
        expect(appMetadata.projectId).to.equal(projectId);
        expect(appMetadata.packageName).to.include(APP_NAMESPACE_PREFIX);
      });
    });
  });

  describe('iosApp.getMetadata()', () => {
    it('successfully sets iOS app\'s display name', () => {
      return iosApp.getMetadata().then((appMetadata) => {
        expect(appMetadata.displayName).to.include(APP_DISPLAY_NAME_PREFIX);
        expect(appMetadata.projectId).to.equal(projectId);
        expect(appMetadata.bundleId).to.include(APP_NAMESPACE_PREFIX);
      });
    });
  });

  describe('androidApp.setDisplayName()', () => {
    it('successfully sets Android app\'s display name', () => {
      const newDisplayName = generateUniqueAppDisplayName();
      return androidApp.setDisplayName(newDisplayName)
          .then(() => androidApp.getMetadata())
          .then((appMetadata) => {
            expect(appMetadata.displayName).to.equal(newDisplayName);
          });
    });
  });

  describe('iosApp.setDisplayName()', () => {
    it('successfully sets iOS app\'s display name', () => {
      const newDisplayName = generateUniqueAppDisplayName();
      return iosApp.setDisplayName(newDisplayName)
          .then(() => iosApp.getMetadata())
          .then((appMetadata) => {
            expect(appMetadata.displayName).to.equal(newDisplayName);
          });
    });
  });

  describe('androidApp.{get,add,delete}ShaCertificate()', () => {
    it('successfully gets, adds, and deletes SHA certificates', () => {
      // Steps:
      //   1. Check that this app has no certs.
      //   2. Add a cert to this app.
      //   3. Check that the cert was added successfully.
      //   4. Delete the cert we just created.
      //   5. Check that this app has no certs.
      return androidApp.getShaCertificates()
          .then((certs) => {
            expect(certs.length).to.equal(0);

            const shaCertificate = admin.projectManagement().shaCertificate(SHA_256_HASH);
            return androidApp.addShaCertificate(shaCertificate);
          })
          .then(() => androidApp.getShaCertificates())
          .then((certs) => {
            expect(certs.length).to.equal(1);
            expect(certs[0].shaHash).to.equal(SHA_256_HASH);
            expect(certs[0].certType).to.equal('sha256');
            expect(certs[0].resourceName).to.not.be.empty;

            return androidApp.deleteShaCertificate(certs[0]);
          })
          .then(() => androidApp.getShaCertificates())
          .then((certs) => {
            expect(certs.length).to.equal(0);
          });
    });
  });

  describe('androidApp.getConfig()', () => {
    it('successfully gets the Android app\'s config', () => {
      return androidApp.getConfig().then((config) => {
        expect(config).is.not.empty;
        expect(config).includes(androidApp.appId);
      });
    });
  });

  describe('iosApp.getConfig()', () => {
    it('successfully gets the iOS app\'s config', () => {
      return iosApp.getConfig().then((config) => {
        expect(config).is.not.empty;
        expect(config).includes(iosApp.appId);
      });
    });
  });

  describe('getRules()', () => {
    it('successfully gets the database rules', async () => {
      const rules = await admin.projectManagement().getRules('database');
      expect(rules).to.be.a('string');
      expect(rules[0]).to.equal('{');
      expect(rules.length).to.be.at.least('{"rules":{}}'.length);
    });

    it('successfully gets the Firestore rules', async () => {
      const rules = await admin.projectManagement().getRules('firestore');
      expect(rules).to.be.a('string');
      expect(rules).to.match(/^service cloud\.firestore \{/);
    });

    it('successfully gets the Storage rules', async () => {
      const rules = await admin.projectManagement().getRules('storage');
      expect(rules).to.be.a('string');
      expect(rules).to.match(/^service firebase\.storage \{/);
    });
  });

  describe('setRules()', () => {
    it('successfully sets the database rules', async () => {
      if (!cmdArgs.updateRules) {
        expect.fail(
          null,
          null,
          "Won't set RTDB rules without --updateRules arg.",
        );
      } else {
        // We set and get the rules twice, with different values each time
        // to check that they actually change.

        await admin
          .projectManagement()
          .setRules('database', TEST_DATABASE_RULES);
        const testRules = await admin
          .projectManagement()
          .getRules('database');
        expect(testRules).to.equal(TEST_DATABASE_RULES);

        await admin
          .projectManagement()
          .setRules('database', DEFAULT_DATABASE_RULES);
        const defaultRules = await admin
          .projectManagement()
          .getRules('database');
        expect(defaultRules).to.equal(DEFAULT_DATABASE_RULES);
      }
    });

    it('successfully sets the Firestore rules', async () => {
      if (!cmdArgs.updateRules) {
        expect.fail(
          null,
          null,
          "Won't set Firestore rules without --updateRules arg.",
        );
      } else {
        // We set and get the rules twice, with different values each time
        // to check that they actually change.

        await admin
          .projectManagement()
          .setRules('firestore', TEST_FIRESTORE_RULES);
        const testRules = await admin
          .projectManagement()
          .getRules('firestore');
        expect(testRules).to.equal(TEST_FIRESTORE_RULES);

        await admin
          .projectManagement()
          .setRules('firestore', DEFAULT_FIRESTORE_RULES);
        const defaultRules = await admin
          .projectManagement()
          .getRules('firestore');
        expect(defaultRules).to.equal(DEFAULT_FIRESTORE_RULES);
      }
    });

    it('successfully sets the Storage rules', async () => {
      if (!cmdArgs.updateRules) {
        expect.fail(
          null,
          null,
          "Won't set Storage rules without --updateRules arg.",
        );
      } else {
        // We set and get the rules twice, with different values each time
        // to check that they actually change.

        await admin
          .projectManagement()
          .setRules('storage', TEST_STORAGE_RULES);
        const testRules = await admin
          .projectManagement()
          .getRules('storage');
        expect(testRules).to.equal(TEST_STORAGE_RULES);

        await admin
          .projectManagement()
          .setRules('storage', DEFAULT_STORAGE_RULES);
        const defaultRules = await admin
          .projectManagement()
          .getRules('storage');
        expect(defaultRules).to.equal(DEFAULT_STORAGE_RULES);
      }
    });
  });

  describe('listRulesReleases()', () => {
    it('successfully lists the rules releases', async () => {
      const result = await admin.projectManagement().listRulesReleases();
      // tslint:disable-next-line: no-unused-expression
      expect(result).to.exist;
      expect(result.releases).to.be.an('array');
      result.releases.forEach((release) => {
        expect(release.name).to.be.a('string');
        expect(release.rulesetName).to.be.a('string');
        expect(release.createTime).to.be.a('string');
      });
    });

    it('successfully lists the rules releases with pageSize argument', async () => {
      const pageSize = 1;
      const result = await admin.projectManagement().listRulesReleases(null, pageSize);
      // tslint:disable-next-line: no-unused-expression
      expect(result).to.exist;
      expect(result.releases).to.be.an('array');
      expect(result.releases.length).to.be.at.most(pageSize);
      expect(result.pageToken).to.be.a('string');
    });

  });

  describe('getRulesRelease()', () => {
    it('successfully gets a rules release', async () => {
      // First we need to get the name of 1 ruleset from the list
      const releasesResult = await admin
        .projectManagement()
        .listRulesReleases(null, 1);
      // tslint:disable-next-line: no-unused-expression
      expect(releasesResult).to.exist;
      expect(releasesResult.releases).to.have.lengthOf(
        1,
        "Couldn't find any releases",
      );

      // Get the ruleset data
      const releaseName = releasesResult.releases[0].name;
      const release = await admin
        .projectManagement()
        .getRulesRelease(releaseName);
      expect(release.name).to.be.a('string');
      expect(release.name).to.equal(releaseName);
      expect(release.rulesetName).to.be.a('string');
      expect(release.createTime).to.be.a('string');
    });
  });

  // describe('createRulesRelease()', () => {
  // });

  // describe('updateRulesRelease()', () => {
  // });

  // describe('deleteRulesRelease()', () => {
  // });

  describe('listRulesets()', () => {
    it('successfully lists the rulesets', async () => {
      const result = await admin.projectManagement().listRulesets();
      // tslint:disable-next-line: no-unused-expression
      expect(result).to.exist;
      expect(result.rulesets).to.be.an('array');
      result.rulesets.forEach((ruleset) => {
        expect(ruleset.id).to.match(RULESET_ID_REGEX);
        expect(ruleset.createTime).to.be.a('string');
      });
    });

    it('successfully lists the rulesets with pageSize argument', async () => {
      const pageSize = 1;
      const result = await admin.projectManagement().listRulesets(pageSize);
      // tslint:disable-next-line: no-unused-expression
      expect(result).to.exist;
      expect(result.rulesets).to.be.an('array');
      expect(result.rulesets.length).to.be.at.most(pageSize);
      expect(result.pageToken).to.be.a('string');
    });
  });

  describe('getRuleset()', () => {
    it('successfully gets a rules release', async () => {
      // First we need to get the name of 1 ruleset from the list
      const rulesetsResult = await admin
        .projectManagement()
        .listRulesets(1);
      // tslint:disable-next-line: no-unused-expression
      expect(rulesetsResult).to.exist;
      expect(rulesetsResult.rulesets).to.have.lengthOf(
        1,
        "Couldn't find any rulesets",
      );

      // Get the ruleset data
      const rulesetId = rulesetsResult.rulesets[0].id;
      const ruleset = await admin.projectManagement().getRuleset(rulesetId);
      expect(ruleset.id).to.equal(rulesetId);
      expect(ruleset.createTime).to.be.a('string');
      expect(ruleset.files).to.be.an('array');
      ruleset.files.forEach((file) => {
        expect(file.name).to.be.a('string');
        expect(file.content).to.be.a('string');
        expect(file.content).to.be.a('string');
      });
    });
  });

  // describe('createRuleset()', () => {
  // });

  // describe('deleteRuleset()', () => {
  // });
});

/**
 * Ensures that an Android app owned by these integration tests exist. If not one will be created.
 *
 * @return {Promise<AndroidApp>} Android app owned by these integration tests.
 */
function ensureAndroidApp(): Promise<admin.projectManagement.AndroidApp> {
  return admin.projectManagement().listAndroidApps()
      .then((apps) => Promise.all(apps.map((app) => app.getMetadata())))
      .then((metadatas) => {
        const metadataOwnedByTest =
            metadatas.find((metadata) => isIntegrationTestApp(metadata.packageName));
        if (metadataOwnedByTest) {
          return admin.projectManagement().androidApp(metadataOwnedByTest.appId);
        }

        // If no Android app owned by these integration tests was found, then create one.
        return admin.projectManagement()
            .createAndroidApp(generateUniqueAppNamespace(), generateUniqueAppDisplayName());
      });
}

/**
 * Ensures that an iOS app owned by these integration tests exist. If not one will be created.
 *
 * @return {Promise<IosApp>} iOS app owned by these integration tests.
 */
function ensureIosApp(): Promise<admin.projectManagement.IosApp> {
  return admin.projectManagement().listIosApps()
      .then((apps) => Promise.all(apps.map((app) => app.getMetadata())))
      .then((metadatas) => {
        const metadataOwnedByTest =
            metadatas.find((metadata) => isIntegrationTestApp(metadata.bundleId));
        if (metadataOwnedByTest) {
          return admin.projectManagement().iosApp(metadataOwnedByTest.appId);
        }

        // If no iOS app owned by these integration tests was found, then create one.
        return admin.projectManagement()
            .createIosApp(generateUniqueAppNamespace(), generateUniqueAppDisplayName());
      });
}

/**
 * Deletes all SHA certificates from the specified Android app.
 */
function deleteAllShaCertificates(androidApp: admin.projectManagement.AndroidApp): Promise<void> {
  return androidApp.getShaCertificates()
      .then((shaCertificates: admin.projectManagement.ShaCertificate[]) => {
        return Promise.all(shaCertificates.map((cert) => androidApp.deleteShaCertificate(cert)));
      })
      .then(() => null);
}

/**
 * @return {string} Dot-separated string that can be used as a unique package name or bundle ID.
 */
function generateUniqueAppNamespace() {
  return APP_NAMESPACE_PREFIX + generateRandomString(APP_NAMESPACE_SUFFIX_LENGTH);
}

/**
 * @return {string} Dot-separated string that can be used as a unique app display name.
 */
function generateUniqueAppDisplayName() {
  return APP_DISPLAY_NAME_PREFIX + generateRandomString(APP_DISPLAY_NAME_SUFFIX_LENGTH);
}

/**
 * @return {boolean} True if the specified appNamespace belongs to these integration tests.
 */
function isIntegrationTestApp(appNamespace: string): boolean {
  return (appNamespace.indexOf(APP_NAMESPACE_PREFIX) > -1);
}

/**
 * @return {string} A randomly generated alphanumeric string, of the specified length.
 */
function generateRandomString(stringLength: number): string {
  return _.times(stringLength, () => _.random(35).toString(36)).join('');
}

/**
 * Deletes unused rulesets to ensure we don't
 * hit the quota limit while running tests.
 */
async function deleteUnusedRulesets(maxToDelete = 10) {
  const releases = await listAllReleases();
  const usedRulesets = new Set<string>();
  releases.forEach((release) => {
    const rulesetId = release.rulesetName.match(RULESET_NAME_REGEX);
    if (rulesetId) {
      usedRulesets.add(rulesetId[1]);
    }
  });

  const rulesets = await listAllRulesets();
  const promises: Array<Promise<any>> = [];
  const length = rulesets.length;
  let deletedCount = 0;

  for (let i = 0; i < length && deletedCount < maxToDelete; i++) {
    const ruleset = rulesets[i];
    if (!usedRulesets.has(ruleset.id)) {
      promises.push(admin.projectManagement().deleteRuleset(ruleset.id));
      deletedCount += 1;
    }
  }

  await Promise.all(promises);
}

/**
 * Lists all releases and returns them in ascending order by createTime.
 */
async function listAllReleases(): Promise<RulesRelease[]> {
  let pageToken: string | undefined;
  let releases: RulesRelease[] = [];

  do {
    const result = await admin
      .projectManagement()
      .listRulesReleases(null, 100, pageToken);

    if (result.releases) {
      releases = releases.concat(result.releases);
    }

    pageToken = result.pageToken;
  } while (pageToken);

  return releases.sort((releaseA, releaseB) =>
    releaseA.createTime > releaseB.createTime ? 1 : -1,
  );
}

/**
 * Lists all rulesets and returns them in ascending order by createTime.
 */
async function listAllRulesets(): Promise<Ruleset[]> {
  let pageToken: string | undefined;
  let rulesets: Ruleset[] = [];

  do {
    const result = await admin
      .projectManagement()
      .listRulesets(100, pageToken);

    if (result.rulesets) {
      rulesets = rulesets.concat(result.rulesets);
    }

    pageToken = result.pageToken;
  } while (pageToken);

  return rulesets.sort((rulesetA, rulesetB) =>
    rulesetA.createTime > rulesetB.createTime ? 1 : -1,
  );
}

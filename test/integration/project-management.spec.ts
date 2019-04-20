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
import * as admin from '../../lib/index';
import { projectId, cmdArgs } from './setup';

/* tslint:disable:no-var-requires */
const chalk = require('chalk');
/* tslint:enable:no-var-requires */

const APP_NAMESPACE_PREFIX = 'com.adminsdkintegrationtest.a';
const APP_NAMESPACE_SUFFIX_LENGTH = 15;

const APP_DISPLAY_NAME_PREFIX = 'Created By Firebase AdminSDK Nodejs Integration Testing ';
const APP_DISPLAY_NAME_SUFFIX_LENGTH = 15;

const SHA_256_HASH = 'aaaaccccaaaaccccaaaaccccaaaaccccaaaaccccaaaaccccaaaaccccaaaacccc';

const DEFAULT_DATABASE_RULES = `{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}`;

// Equivalent to the default rules but with some added comments
const TEST_DATABASE_RULES = `{
  "rules": {
    // Only allow authenticated users to read
    ".read": "auth != null",
    // Only allow authenticated users to write
    ".write": "auth != null"
  }
}`;

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

    /* tslint:disable:no-console */
    if (!cmdArgs.updateRules) {
      console.log(chalk.yellow('    Not updating security rules. Some tests may fail.'));
      console.log(chalk.yellow('    Set the --updateRules flag to force update rules.'));
    }

    return Promise.all([androidPromise, iosPromise]);
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

  // describe('getDatabaseRules()', () => {
  //   it('successfully gets the database rules', () => {
  //     return admin.projectManagement().getDatabaseRules().then((rules: string) => {
  //       expect(rules).to.be.a('string');
  //       expect(rules[0]).to.equal('{');
  //       expect(rules.length).to.be.at.least('{"rules":{}}'.length);
  //     });
  //   });
  // });

  // describe('setDatabaseRules()', () => {
  //   it('successfully sets the database rules', async () => {
  //     if (cmdArgs.updateRules) {
  //       // We set and get the rules twice with different values each time
  //       // to check that they actually change.

  //       await admin.projectManagement().setDatabaseRules(TEST_DATABASE_RULES);
  //       const testRules = await admin.projectManagement().getDatabaseRules();
  //       expect(testRules).to.equal(TEST_DATABASE_RULES);

  //       await admin.projectManagement().setDatabaseRules(DEFAULT_DATABASE_RULES);
  //       const defaultRules = await admin.projectManagement().getDatabaseRules();
  //       expect(defaultRules).to.equal(DEFAULT_DATABASE_RULES);
  //       } else {
  //         expect.fail(null, null, "Won't set database rules without --updateRules arg.");
  //       }
  //   });
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

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

'use strict';

import * as fs from 'fs';
import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { FirebaseApp } from '../../../src/firebase-app';
import { AndroidApp } from '../../../src/project-management/android-app';
import { ProjectManagement } from '../../../src/project-management/project-management';
import { ProjectManagementRequestHandler } from '../../../src/project-management/project-management-api-request';
import { FirebaseProjectManagementError } from '../../../src/utils/error';
import * as mocks from '../../resources/mocks';
import { IosApp } from '../../../src/project-management/ios-app';
import { DatabaseRequestHandler } from '../../../src/project-management/database-api-request';
import {
  FirebaseRulesRequestHandler,
  RulesReleaseResponse,
  RulesetResponse,
  RulesetWithFilesResponse,
  ListRulesReleasesResponse,
  ListRulesetsResponse,
} from '../../../src/project-management/firebase-rules-api-request';
import {
  RulesetFile,
  RulesService,
  ListRulesReleasesResult,
  RulesRelease,
  ListRulesetsResult,
  Ruleset,
  RulesetWithFiles,
} from '../../../src/project-management/rules';

const expect = chai.expect;

const APP_ID = 'test-app-id';
const PACKAGE_NAME = 'test-package-name';
const BUNDLE_ID = 'test-bundle-id';
const EXPECTED_ERROR = new FirebaseProjectManagementError('internal-error', 'message');

const VALID_SHA_256_HASH = '0123456789abcdefABCDEF01234567890123456701234567890123456789abcd';

const PROJECT_RESOURCE_NAME = 'projects/test-project-id';
const RELEASE_NAME = 'cloud.firestore';
const RULESET_UUID = '00000000-0000-0000-0000-000000000000';
const RULESET_NAME = `${PROJECT_RESOURCE_NAME}/rulesets/${RULESET_UUID}`;
const PAGE_TOKEN = 'PAGE_TOKEN';
const NEXT_PAGE_TOKEN = 'NEXT_PAGE_TOKEN';
const TIMESTAMP_CREATE = '2012-04-13T02:00:00.000000Z';
const TIMESTAMP_UPDATE = '2014-10-21T16:00:00.000000Z';

const VALID_DATABASE_RULES = `{
  "rules": {
    // My rules
    "foo": {
      ".read": true,
      ".write": false,
    },
  },
}`;

const VALID_RULES_CONTENT = 'Ruleset file content';

const VALID_RULESET_FILES: RulesetFile[] = [
  {
    name: 'ruleset.file',
    content: VALID_RULES_CONTENT,
  },
];

const VALID_RELEASE_RESPONSE: RulesReleaseResponse = {
  name: `${PROJECT_RESOURCE_NAME}/releases/${RELEASE_NAME}`,
  rulesetName: RULESET_NAME,
  createTime: TIMESTAMP_CREATE,
};

const VALID_RULESET_RESPONSE: RulesetResponse = {
  name: RULESET_NAME,
  createTime: TIMESTAMP_CREATE,
};

const VALID_RULESET: Ruleset = {
  id: RULESET_UUID,
  createTime: VALID_RULESET_RESPONSE.createTime,
};

const VALID_RULESET_WITH_FILES_RESPONSE: RulesetWithFilesResponse = {
  name: RULESET_NAME,
  createTime: TIMESTAMP_CREATE,
  source: {
    files: VALID_RULESET_FILES,
  },
};

const VALID_RULESET_WITH_FILES: RulesetWithFiles = {
  id: RULESET_UUID,
  createTime: VALID_RULESET_RESPONSE.createTime,
  files: VALID_RULESET_FILES,
};

const VALID_RELEASE: RulesRelease = {
  ...VALID_RELEASE_RESPONSE,
  name: RELEASE_NAME,
};

describe('ProjectManagement', () => {
  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  let projectManagement: ProjectManagement;
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  const noProjectIdErrorMessage = 'Failed to determine project ID. Initialize the SDK with service '
      + 'account credentials, or set project ID as an app option. Alternatively, set the '
      + 'GOOGLE_CLOUD_PROJECT environment variable.';

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    projectManagement = new ProjectManagement(mockApp);
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
    return mockApp.delete();
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const projectManagementAny: any = ProjectManagement;
          return new projectManagementAny(invalidApp);
        }).to.throw(
            'First argument passed to admin.projectManagement() must be a valid Firebase app '
                + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const projectManagementAny: any = ProjectManagement;
        return new projectManagementAny();
      }).to.throw(
          'First argument passed to admin.projectManagement() must be a valid Firebase app '
              + 'instance.');
    });

    it('should throw given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      expect(() => {
        return new ProjectManagement(mockCredentialApp);
      }).to.throw(noProjectIdErrorMessage);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new ProjectManagement(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(projectManagement.app).to.equal(mockApp);
    });
  });

  describe('listAndroidApps', () => {
    it('should propagate API errors', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
          .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
          .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when null API response', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
          .returns(Promise.resolve(null));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              'listAndroidApps()\'s responseData must be a non-null object. Response data: null');
    });

    it('should return empty array when API response missing "apps" field', () => {
      const partialApiResponse = {};

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
          .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
          .should.eventually.deep.equal([]);
    });

    it('should throw when API response has non-array "apps" field', () => {
      const partialApiResponse = { apps: 'none' };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
          .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              '"apps" field must be present in the listAndroidApps() response data. Response data: '
                  + JSON.stringify(partialApiResponse, null, 2));
    });

    it('should throw with API response missing "apps[].appId" field', () => {
      const partialApiResponse = {
        apps: [{}],
      };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
          .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              '"apps[].appId" field must be present in the listAndroidApps() response data. '
                  + `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`);
    });

    it('should resolve with list of Android apps on success', () => {
      const validAndroidApps: AndroidApp[] = [projectManagement.androidApp(APP_ID)];
      const validListAndroidAppsApiResponse = {
        apps: [{ appId: APP_ID }],
      };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listAndroidApps')
          .returns(Promise.resolve(validListAndroidAppsApiResponse));
      stubs.push(stub);
      return projectManagement.listAndroidApps()
          .should.eventually.deep.equal(validAndroidApps);
    });
  });

  describe('listIosApps', () => {
    const VALID_LIST_IOS_APPS_API_RESPONSE = {
      apps: [{ appId: APP_ID }],
    };

    it('should propagate API errors', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
          .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.listIosApps()
          .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when null API response', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
          .returns(Promise.resolve(null));
      stubs.push(stub);
      return projectManagement.listIosApps()
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              'listIosApps()\'s responseData must be a non-null object. Response data: null');
    });

    it('should return empty array when API response missing "apps" field', () => {
      const partialApiResponse = {};

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
          .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listIosApps()
          .should.eventually.deep.equal([]);
    });

    it('should throw when API response has non-array "apps" field', () => {
      const partialApiResponse = { apps: 'none' };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
          .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listIosApps()
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              '"apps" field must be present in the listIosApps() response data. Response data: '
                  + JSON.stringify(partialApiResponse, null, 2));
    });

    it('should throw with API response missing "apps[].appId" field', () => {
      const partialApiResponse = {
        apps: [{}],
      };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
          .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);
      return projectManagement.listIosApps()
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              '"apps[].appId" field must be present in the listIosApps() response data. '
                  + `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`);
    });

    it('should resolve with list of Ios apps on success', () => {
      const validIosApps: IosApp[] = [projectManagement.iosApp(APP_ID)];

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'listIosApps')
          .returns(Promise.resolve(VALID_LIST_IOS_APPS_API_RESPONSE));
      stubs.push(stub);
      return projectManagement.listIosApps()
          .should.eventually.deep.equal(validIosApps);
    });
  });

  describe('androidApp', () => {
    it('should successfully return an AndroidApp', () => {
      return projectManagement.androidApp(APP_ID).appId.should.equal(APP_ID);
    });
  });

  describe('iosApp', () => {
    it('should successfully return an IosApp', () => {
      return projectManagement.iosApp(APP_ID).appId.should.equal(APP_ID);
    });
  });

  describe('shaCertificate', () => {
    it('should successfully return a ShaCertificate', () => {
      const shaCertificate = projectManagement.shaCertificate(VALID_SHA_256_HASH);
      shaCertificate.shaHash.should.equal(VALID_SHA_256_HASH);
      shaCertificate.certType.should.equal('sha256');
    });
  });

  describe('createAndroidApp', () => {
    it('should propagate intial API response errors', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
          .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
          .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when initial API response is null', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
          .returns(Promise.resolve(null));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              'createAndroidApp()\'s responseData must be a non-null object. Response data: null');
    });

    it('should throw when initial API response.appId is undefined', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
          .returns(Promise.resolve({}));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              '"responseData.appId" field must be present in createAndroidApp()\'s response data. '
                  + 'Response data: {}');
    });

    it('should resolve with AndroidApp on success', () => {
      const createdAndroidApp: AndroidApp = projectManagement.androidApp(APP_ID);
      const validCreateAppResponse = { appId: APP_ID };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createAndroidApp')
          .returns(Promise.resolve(validCreateAppResponse));
      stubs.push(stub);
      return projectManagement.createAndroidApp(PACKAGE_NAME)
          .should.eventually.deep.equal(createdAndroidApp);
    });
  });

  describe('createIosApp', () => {
    it('should propagate intial API response errors', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
          .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
          .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when initial API response is null', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
          .returns(Promise.resolve(null));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              'createIosApp()\'s responseData must be a non-null object. Response data: null');
    });

    it('should throw when initial API response.appId is undefined', () => {
      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
          .returns(Promise.resolve({}));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
          .should.eventually.be.rejected
          .and.have.property(
              'message',
              '"responseData.appId" field must be present in createIosApp()\'s response data. '
                  + 'Response data: {}');
    });

    it('should resolve with IosApp on success', () => {
      const createdIosApp: IosApp = projectManagement.iosApp(APP_ID);
      const validCreateAppResponse = { appId: APP_ID };

      const stub = sinon
          .stub(ProjectManagementRequestHandler.prototype, 'createIosApp')
          .returns(Promise.resolve(validCreateAppResponse));
      stubs.push(stub);
      return projectManagement.createIosApp(BUNDLE_ID)
          .should.eventually.deep.equal(createdIosApp);
    });
  });

  describe('getRules', () => {
    it('should throw with invalid service name', () => {
      return projectManagement
        .getRules('invalid' as any)
        .should.eventually.be.rejected.and.have.property('message')
        .and.match(
          /^The service name passed to getRules\(\) must be one of /,
        );
    });

    it('should propagate RTDB API errors', () => {
      const stub = sinon
        .stub(DatabaseRequestHandler.prototype, 'getRules')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement
        .getRules('database')
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should propagate Rules API errors', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement
        .getRules('firestore')
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should resolve with RTDB rules string on success', () => {
      const stub = sinon
        .stub(DatabaseRequestHandler.prototype, 'getRules')
        .returns(Promise.resolve(VALID_DATABASE_RULES));
      stubs.push(stub);
      return projectManagement
        .getRules('database')
        .should.eventually.equal(VALID_DATABASE_RULES);
    });

    const successfulRules = (service: RulesService) => {
      const stub1 = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stub1);

      const stub2 = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stub2);

      return projectManagement
        .getRules(service)
        .should.eventually.equal(VALID_RULES_CONTENT);
    };

    it('should resolve with Firestore rules string on success', () =>
      successfulRules('firestore'));

    it('should resolve with Storage rules string on success', () =>
      successfulRules('storage'));
  });

  describe('setRules', () => {
    it('should throw with invalid service name', () => {
      return projectManagement
        .setRules('invalid' as any, '')
        .should.eventually.be.rejected.and.have.property('message')
        .and.match(
          /^The service name passed to setRules\(\) must be one of /,
        );
    });

    it('should propagate RTDB API errors', () => {
      const stub = sinon
        .stub(DatabaseRequestHandler.prototype, 'setRules')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement
        .setRules('database', '')
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should propagate Rules API errors', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRuleset')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);
      return projectManagement
        .setRules('firestore', '')
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it("should create a release if one doesn't exist", () => {
      const stubRuleset = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stubRuleset);

      const stubUpdate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'updateRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stubUpdate);

      const stubCreate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stubCreate);

      return projectManagement.setRules('firestore', '').then(() => {
        // tslint:disable-next-line: no-unused-expression
        expect(stubCreate).to.have.been.calledOnce;
      });
    });

    it('should resolve with void on success for RTDB rules', () => {
      const stub = sinon
        .stub(DatabaseRequestHandler.prototype, 'setRules')
        .returns(Promise.resolve(undefined));
      stubs.push(stub);
      return projectManagement.setRules('database', VALID_DATABASE_RULES)
        .should.eventually.equal(undefined);
    });

    it('should resolve with void on success for Firestore rules', () => {
      const stubRuleset = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stubRuleset);

      const stubUpdate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'updateRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stubUpdate);

      const stubCreate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stubCreate);

      return projectManagement
        .setRules('firestore', VALID_RULES_CONTENT)
        .should.eventually.equal(undefined);
    });

    it('should resolve with void on success for Storage rules', () => {
      const stubRuleset = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stubRuleset);

      const stubUpdate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'updateRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stubUpdate);

      const stubCreate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stubCreate);

      return projectManagement
        .setRules('storage', VALID_RULES_CONTENT)
        .should.eventually.equal(undefined);
    });
  });

  describe('setRulesFromFile', () => {
    const stubReadFileSync = () => {
      const stub = sinon.stub(fs, 'readFileSync').returns('file content');
      stubs.push(stub);
    };

    it('should resolve with void on success for RTDB rules', () => {
      stubReadFileSync();

      const stub = sinon
        .stub(DatabaseRequestHandler.prototype, 'setRules')
        .returns(Promise.resolve(undefined));
      stubs.push(stub);

      return projectManagement
        .setRulesFromFile('database', 'file.rules')
        .should.eventually.equal(undefined);
    });

    it('should resolve with void on success for Firestore rules', () => {
      stubReadFileSync();

      const stubRuleset = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stubRuleset);

      const stubUpdate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'updateRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stubUpdate);

      const stubCreate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stubCreate);

      return projectManagement
        .setRulesFromFile('firestore', 'file.rules')
        .should.eventually.equal(undefined);
    });

    it('should resolve with void on success for Storage rules', () => {
      stubReadFileSync();

      const stubRuleset = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stubRuleset);

      const stubUpdate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'updateRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stubUpdate);

      const stubCreate = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'createRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stubCreate);

      return projectManagement
        .setRulesFromFile('storage', 'file.rules')
        .should.eventually.equal(undefined);
    });
  });

  describe('listRulesReleases', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesReleases')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);

      return projectManagement
        .listRulesReleases()
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when null API response', () => {
      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(null));
      stubs.push(stub);

      return projectManagement
        .listRulesReleases()
        .should.eventually.be.rejected.and.have.property(
          'message',
          "listRulesReleases()'s responseData must be a non-null object. Response data: null",
        );
    });

    it('should throw when API response has non-array "releases" field', () => {
      const partialApiResponse = { releases: 'none' };

      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesReleases()
        .should.eventually.be.rejected.and.have.property(
          'message',
          `"releases" field must be an array in listRulesReleases()'s response data. Response data: ` +
            JSON.stringify(partialApiResponse, null, 2),
        );
    });

    it('should throw with API response missing "releases[].rulesetName" field', () => {
      const partialApiResponse = {
        releases: [{}],
      };

      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesReleases')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesReleases()
        .should.eventually.be.rejected.and.have.property(
          'message',
          '"releases[].rulesetName" field must be present in the listRulesReleases() response data. ' +
            `Response data: ${JSON.stringify(partialApiResponse, null, 2)}`,
        );
    });

    it('should resolve with list of releases on success without arguments', () => {
      const validReleaseListResponse: ListRulesReleasesResponse = {
        releases: [VALID_RELEASE_RESPONSE],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const validReleaseListResult: ListRulesReleasesResult = {
        releases: [VALID_RELEASE],
        pageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesReleases')
        .returns(Promise.resolve(validReleaseListResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesReleases()
        .should.eventually.deep.equal(validReleaseListResult);
    });

    it('should resolve with list of releases on success with arguments', () => {
      const filter = { releaseName: 'prod*' };
      const maxResults = 20;
      const nextPageToken = PAGE_TOKEN;

      const validReleaseListResponse: ListRulesReleasesResponse = {
        releases: [VALID_RELEASE_RESPONSE],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const validReleaseListResult: ListRulesReleasesResult = {
        releases: [VALID_RELEASE],
        pageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesReleases')
        .returns(Promise.resolve(validReleaseListResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesReleases(filter, maxResults, nextPageToken)
        .should.eventually.deep.equal(validReleaseListResult);
    });
  });

  describe('getRulesRelease', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRulesRelease')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);

      return projectManagement
        .getRulesRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when null API response', () => {
      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(null));
      stubs.push(stub);

      return projectManagement
        .getRulesRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.have.property(
          'message',
          "getRulesRelease()'s responseData must be a non-null object. Response data: null",
        );
    });

    it('should throw when API response missing "rulesetName" field', () => {
      const partialApiResponse: any = {
        name: RELEASE_NAME,
        rulesetName: null,
      };

      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);

      return projectManagement
        .getRulesRelease(RELEASE_NAME)
        .should.eventually.be.rejected.and.have.property(
          'message',
          `"rulesetName" field must be a non-empty string in getRulesRelease()'s response data. Response data: ` +
            JSON.stringify(partialApiResponse, null, 2),
        );
    });

    it('should resolve with release object on successs', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRulesRelease')
        .returns(Promise.resolve(VALID_RELEASE_RESPONSE));
      stubs.push(stub);

      return projectManagement
        .getRulesRelease(RELEASE_NAME)
        .should.eventually.deep.equal(VALID_RELEASE);
    });
  });

  // describe('createRulesRelease', () => {

  // });

  // describe('updateRulesRelease', () => {

  // });

  // describe('deleteRulesRelease', () => {

  // });

  describe('listRulesets', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesets')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);

      return projectManagement
        .listRulesets()
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when null API response', () => {
      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(null));
      stubs.push(stub);

      return projectManagement
        .listRulesets()
        .should.eventually.be.rejected.and.have.property(
          'message',
          "listRulesets()'s responseData must be a non-null object. Response data: null",
        );
    });

    it('should throw when API response has non-array "rulesets" field', () => {
      const partialApiResponse = { rulesets: 'none' };

      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesets()
        .should.eventually.be.rejected.and.have.property(
          'message',
          `"rulesets" field must be an array in listRulesets()'s response data. Response data: ` +
            JSON.stringify(partialApiResponse, null, 2),
        );
    });

    it('should throw with API response missing "rulesets[].name" field', () => {
      const partialApiResponse = {
        rulesets: [{}],
      };

      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesets')
        .returns(Promise.resolve(partialApiResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesets()
        .should.eventually.be.rejected.and.have.property(
          'message',
          '"ruleset[].name" field must be present in the listRulesets() response data. ' +
            `Response data: ${JSON.stringify(
              partialApiResponse,
              null,
              2,
            )}`,
        );
    });

    it('should resolve with list of rulesets on success without arguments', () => {
      const validRulesetListResponse: ListRulesetsResponse = {
        rulesets: [VALID_RULESET_RESPONSE],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const validRulesetListResult: ListRulesetsResult = {
        rulesets: [VALID_RULESET],
        pageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesets')
        .returns(Promise.resolve(validRulesetListResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesets()
        .should.eventually.deep.equal(validRulesetListResult);
    });

    it('should resolve with list of rulesets on success with arguments', () => {
      const maxResults = 20;
      const nextPageToken = PAGE_TOKEN;

      const validRulesetListResponse: ListRulesetsResponse = {
        rulesets: [VALID_RULESET_RESPONSE],
        nextPageToken: NEXT_PAGE_TOKEN,
      };

      const validRulesetListResult: ListRulesetsResult = {
        rulesets: [VALID_RULESET],
        pageToken: NEXT_PAGE_TOKEN,
      };

      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'listRulesets')
        .returns(Promise.resolve(validRulesetListResponse));
      stubs.push(stub);

      return projectManagement
        .listRulesets(maxResults, nextPageToken)
        .should.eventually.deep.equal(validRulesetListResult);
    });
  });

  describe('getRuleset', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRuleset')
        .returns(Promise.reject(EXPECTED_ERROR));
      stubs.push(stub);

      return projectManagement
        .getRuleset(RULESET_UUID)
        .should.eventually.be.rejected.and.equal(EXPECTED_ERROR);
    });

    it('should throw when null API response', () => {
      const stub = sinon
        .stub(
          FirebaseRulesRequestHandler.prototype as any,
          'invokeRequestHandler',
        )
        .returns(Promise.resolve(null));
      stubs.push(stub);

      return projectManagement
        .getRuleset(RULESET_UUID)
        .should.eventually.be.rejected.and.have.property(
          'message',
          "getRuleset()'s responseData must be a non-null object. Response data: null",
        );
    });

    it('should resolve with ruleset object on successs', () => {
      const stub = sinon
        .stub(FirebaseRulesRequestHandler.prototype, 'getRuleset')
        .returns(Promise.resolve(VALID_RULESET_WITH_FILES_RESPONSE));
      stubs.push(stub);

      return projectManagement
        .getRuleset(RULESET_UUID)
        .should.eventually.deep.equal(VALID_RULESET_WITH_FILES);
    });
  });

  // describe('createRuleset', () => {

  // });

  // describe('deleteRuleset', () => {

  // });

});

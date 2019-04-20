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

import fs = require('fs');
import { FirebaseApp } from '../firebase-app';
import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { FirebaseProjectManagementError } from '../utils/error';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { AndroidApp, ShaCertificate } from './android-app';
import { IosApp } from './ios-app';
import { ProjectManagementRequestHandler } from './project-management-api-request';
import { DatabaseRequestHandler } from './database-api-request';
import { FirebaseRulesRequestHandler } from './firebase-rules-api-request';
import { assertServerResponse } from './request-handler-base';
import {
  assertValidRulesService,
  RulesService,
  ListRulesReleasesFilter,
  ListRulesReleasesResult,
  RulesRelease,
  ListRulesetsResult,
  RulesetWithFiles,
  RulesetFile,
  processRulesetResponse,
  processReleaseResponse,
  RULES_RELEASE_NAME_FOR_SERVICE,
} from './rules';

/**
 * Internals of a Project Management instance.
 */
class ProjectManagementInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<void>} An empty Promise that will be resolved when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up.
    return Promise.resolve();
  }
}

/**
 * ProjectManagement service bound to the provided app.
 */
export class ProjectManagement implements FirebaseServiceInterface {
  public readonly INTERNAL: ProjectManagementInternals = new ProjectManagementInternals();

  private readonly resourceName: string;
  private readonly projectId: string;
  private readonly requestHandler: ProjectManagementRequestHandler;
  private readonly databaseRequestHandler: DatabaseRequestHandler;
  private readonly rulesRequestHandler: FirebaseRulesRequestHandler;

  /**
   * @param {object} app The app for this ProjectManagement service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseProjectManagementError(
          'invalid-argument',
          'First argument passed to admin.projectManagement() must be a valid Firebase app '
              + 'instance.');
    }

    // Assert that a specific project ID was provided within the app.
    this.projectId = utils.getProjectId(app);
    if (!validator.isNonEmptyString(this.projectId)) {
      throw new FirebaseProjectManagementError(
          'invalid-project-id',
          'Failed to determine project ID. Initialize the SDK with service account credentials, or '
              + 'set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT '
              + 'environment variable.');
    }
    this.resourceName = `projects/${this.projectId}`;

    this.requestHandler = new ProjectManagementRequestHandler(app);
    this.databaseRequestHandler = new DatabaseRequestHandler(app);
    this.rulesRequestHandler = new FirebaseRulesRequestHandler(app, this.resourceName);
  }

  /**
   * Lists up to 100 Firebase Android apps associated with this Firebase project.
   */
  public listAndroidApps(): Promise<AndroidApp[]> {
    return this.listPlatformApps<AndroidApp>('android', 'listAndroidApps()');
  }

  /**
   * Lists up to 100 Firebase iOS apps associated with this Firebase project.
   */
  public listIosApps(): Promise<IosApp[]> {
    return this.listPlatformApps<IosApp>('ios', 'listIosApps()');
  }

  /**
   * Returns an AndroidApp object for the given appId. No RPC is made.
   */
  public androidApp(appId: string): AndroidApp {
    return new AndroidApp(appId, this.requestHandler);
  }

  /**
   * Returns an IosApp object for the given appId. No RPC is made.
   */
  public iosApp(appId: string): IosApp {
    return new IosApp(appId, this.requestHandler);
  }

  /**
   * Returns a ShaCertificate object for the given shaHash. No RPC is made.
   */
  public shaCertificate(shaHash: string): ShaCertificate {
    return new ShaCertificate(shaHash);
  }

  /**
   * Creates a new Firebase Android app, associated with this Firebase project.
   */
  public createAndroidApp(packageName: string, displayName?: string): Promise<AndroidApp> {
    return this.requestHandler.createAndroidApp(this.resourceName, packageName, displayName)
        .then((responseData: any) => {
          assertServerResponse(
              validator.isNonNullObject(responseData),
              responseData,
              'createAndroidApp()\'s responseData must be a non-null object.');

          assertServerResponse(
              validator.isNonEmptyString(responseData.appId),
              responseData,
              `"responseData.appId" field must be present in createAndroidApp()'s response data.`);
          return new AndroidApp(responseData.appId, this.requestHandler);
        });
  }

  /**
   * Creates a new Firebase iOS app, associated with this Firebase project.
   */
  public createIosApp(bundleId: string, displayName?: string): Promise<IosApp> {
    return this.requestHandler.createIosApp(this.resourceName, bundleId, displayName)
        .then((responseData: any) => {
          assertServerResponse(
              validator.isNonNullObject(responseData),
              responseData,
              'createIosApp()\'s responseData must be a non-null object.');

          assertServerResponse(
              validator.isNonEmptyString(responseData.appId),
              responseData,
              `"responseData.appId" field must be present in createIosApp()'s response data.`);
          return new IosApp(responseData.appId, this.requestHandler);
        });
  }

  /**
   * Gets the current rules for the service:
   *   - For RTDB that's whatever `.settings/rules.json` returns.
   *   - For Firestore/Storage it's the contents of the ruleset for the release
   *     associated with that service.
   */
  public getRules(service: RulesService): Promise<string> {
    try {
      assertValidRulesService(service, 'getRules');
    } catch (err) {
      return Promise.reject(err);
    }

    if (service === 'database') {
      return this.databaseRequestHandler.getRules();
    } else {
      const releaseName = RULES_RELEASE_NAME_FOR_SERVICE[service];
      return this.rulesRequestHandler
        .getRulesRelease(releaseName)
        .then((release) =>
          this.rulesRequestHandler.getRuleset(release.rulesetName, {
            isFullName: true,
          }),
        )
        .then((response) => {
          assertServerResponse(
            response.source.files.length >= 1,
            response,
            `The current rules release for service "${service}" has no source files.`,
          );

          const file = response.source.files[0];

          assertServerResponse(
            validator.isNonNullObject(file) &&
              validator.isNonEmptyString(file.content),
            response,
            'ruleset.files[].content must be a non-empty string in getRules() response data',
          );

          return file.content;
        });
    }
  }

  /**
   * Sets the new rules to be used with the service:
   *   - For RTDB it PUTs them to `.settings/rules.json`.
   *   - For Firestore/Storage it creates a new ruleset with the specified
   *     content and updates/creates the appropriate release for the
   *     service with that ruleset.
   */
  public setRules(service: RulesService, content: string): Promise<void> {
    try {
      assertValidRulesService(service, 'setRules');
    } catch (err) {
      return Promise.reject(err);
    }

    if (service === 'database') {
      return this.databaseRequestHandler.setRules(content);
    } else {
      const files: RulesetFile[] = [
        {
          name: service + '.rules',
          content,
        },
      ];

      return this.rulesRequestHandler
        .createRuleset(files)
        .then((rulesetResponse) => {
          const releaseName = RULES_RELEASE_NAME_FOR_SERVICE[service];
          return this.rulesRequestHandler
            .updateRulesRelease(releaseName, rulesetResponse.name, {
              isFullRulesetName: true,
            })
            .catch(() => {
              // Updating the release fails if it doesn't exist. In that case we
              // create a new one.
              return this.rulesRequestHandler
                .createRulesRelease(releaseName, rulesetResponse.name, {
                  isFullRulesetName: true,
                })
                .then((response) => processReleaseResponse(response));
            })
            .catch((err) => {
              // Creating the release also failed, so let's delete the
              // ruleset that we just created.
              return this.rulesRequestHandler
                .deleteRuleset(rulesetResponse.name)
                .catch(() => {
                  // Deleting the ruleset failed. Since this is not relevant to
                  // the original operation, let's hide this error from the user.
                  return;
                })
                .then(() => {
                  throw err;
                });
            });
        })
        .then(() => undefined);
    }
  }

  /**
   * Like `setRules()` but reads the rules content from a file.
   */
  public setRulesFromFile(service: RulesService, filePath: string): Promise<void> {
    let content: string;

    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new FirebaseProjectManagementError(
        'invalid-argument',
        'Failed to read rules file: ' + filePath,
      );
    }

    return this.setRules(service, content).then(() => undefined);
  }

  /**
   * Gets the list of rules releases for the project.
   *
   * It optionally accepts an object specifying filters to use.
   *
   * The maximum number of rulesets to return is determined by the optional
   * `maxResults` argument. Defaults to 10, maximum is 100 (according to API docs).
   */
  public listRulesReleases(
    filter: ListRulesReleasesFilter = {},
    maxResults?: number,
    pageToken?: string,
  ): Promise<ListRulesReleasesResult> {
    const filters: string[] = [];

    if (validator.isNonEmptyString(filter.releaseName)) {
      filters.push('name=' + filter.releaseName);
    }

    if (validator.isNonEmptyString(filter.rulesetName)) {
      filters.push('ruleset_name=' + filter.rulesetName);
    }

    if (validator.isNonEmptyString(filter.testSuiteName)) {
      filters.push('test_suite_name=' + filter.testSuiteName);
    }

    // TODO: check how the filters are supposed to be concatenated
    const requestFilter =
      filters.length > 0 ? filters.join('; ') : undefined;

    return this.rulesRequestHandler
      .listRulesReleases(requestFilter, maxResults, pageToken)
      .then((response) => {
        return {
          releases: response.releases.map((release) =>
            processReleaseResponse(release),
          ),
          pageToken: response.nextPageToken,
        };
      });
  }

  /**
   * Gets the named rules release.
   */
  public getRulesRelease(name: string): Promise<RulesRelease> {
    return this.rulesRequestHandler
      .getRulesRelease(name)
      .then((release) => processReleaseResponse(release));
  }

  /**
   * Creates a new rules release with the given name and associated to
   * the given ruleset name.
   */
  public createRulesRelease(
    name: string,
    rulesetId: string,
  ): Promise<RulesRelease> {
    return this.rulesRequestHandler
      .createRulesRelease(name, rulesetId)
      .then((release) => processReleaseResponse(release));
  }

  /**
   * Updates the ruleset name associated with an existing rules release.
   */
  public updateRulesRelease(
    name: string,
    rulesetName: string,
  ): Promise<RulesRelease> {
    return this.rulesRequestHandler
      .updateRulesRelease(name, rulesetName)
      .then((release) => processReleaseResponse(release));
  }

  /**
   * Deletes the named rules release.
   * TODO: I'm not sure what happens when you do this. For example, if you
   * delete the release for Firestore rules, does Firestore stop working?
   * This method's behavior should be properly documented if it's included.
   */
  public deleteRulesRelease(name: string): Promise<void> {
    return this.rulesRequestHandler
      .deleteRulesRelease(name)
      .then(() => undefined);
  }

  /**
   * Gets the list of rulesets for the project. The Rulesets only contain
   * metadata (`name` and `createTime`), not the actual files.
   *
   * The maximum number of rulesets to return is determined by the optional
   * `maxResults` argument. Defaults to 10, maximum is 100 (according to API docs).
   *
   * It optionally accepts a pageToken returned from a previous call, in order
   * to get the next set of results if there's more.
   */
  public listRulesets(
    maxResults?: number,
    pageToken?: string,
  ): Promise<ListRulesetsResult> {
    return this.rulesRequestHandler
      .listRulesets(maxResults, pageToken)
      .then((response) => {
        return {
          rulesets: response.rulesets.map((ruleset) =>
            processRulesetResponse(ruleset),
          ),
          pageToken: response.nextPageToken,
        };
      });
  }

  /**
   * Gets the ruleset by its id. The returned Ruleset contains its files.
   */
  public getRuleset(id: string): Promise<RulesetWithFiles> {
    return this.rulesRequestHandler.getRuleset(id).then((response) => {
      return processRulesetResponse(response, true);
    });
  }

  /**
   * Creates a new ruleset with the given files.
   */
  public createRuleset(files: RulesetFile[]): Promise<RulesetWithFiles> {
    if (!Array.isArray(files) || files.length === 0) {
      throw new FirebaseProjectManagementError(
        'invalid-argument',
        'First argument passed to createRuleset() must be a non-empty array',
      );
    }
    return this.rulesRequestHandler.createRuleset(files).then((response) => {
      return processRulesetResponse(response, true);
    });
  }

  /**
   * Deletes the named rules ruleset.
   * TODO: I'm not sure what happens when you do this. For example, if you
   * delete the ruleset currently associated with the release for Firestore
   * rules, does Firestore stop working? Is the release automatically
   * associated with the most recent previous ruleset? No idea.
   * This method's behavior should be properly documented if it's included.
   */
  public deleteRuleset(name: string): Promise<void> {
    return this.rulesRequestHandler
      .deleteRuleset(name)
      .then(() => undefined);
  }

  /**
   * Lists up to 100 Firebase apps for a specified platform, associated with this Firebase project.
   */
  private listPlatformApps<T>(platform: 'android' | 'ios', callerName: string): Promise<T[]> {
    const listPromise: Promise<object> = (platform === 'android') ?
        this.requestHandler.listAndroidApps(this.resourceName)
        : this.requestHandler.listIosApps(this.resourceName);

    return listPromise
        .then((responseData: any) => {
          assertServerResponse(
              validator.isNonNullObject(responseData),
              responseData,
              `${callerName}\'s responseData must be a non-null object.`);

          if (!responseData.apps) {
            return [];
          }

          assertServerResponse(
              validator.isArray(responseData.apps),
              responseData,
              `"apps" field must be present in the ${callerName} response data.`);

          return responseData.apps.map((appJson: any) => {
            assertServerResponse(
                validator.isNonEmptyString(appJson.appId),
                responseData,
                `"apps[].appId" field must be present in the ${callerName} response data.`);
            if (platform === 'android') {
              return new AndroidApp(appJson.appId, this.requestHandler);
            } else {
              return new IosApp(appJson.appId, this.requestHandler);
            }
          });
        });
  }
}

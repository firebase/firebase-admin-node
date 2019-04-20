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

import { FirebaseApp } from '../firebase-app';
import * as validator from '../utils/validator';
import {
  RequestHandlerBase,
  assertServerResponse,
} from './request-handler-base';
import {
  RulesRelease,
  shortenReleaseName,
  ListRulesReleasesResult,
  Ruleset,
  shortenRulesetName,
  ListRulesetsResult,
  RulesetWithFiles,
  RulesetFile,
} from './rules';

/** Project management backend host and port. */
const FIREBASE_RULES_HOST_AND_PORT = 'firebaserules.googleapis.com:443';
/** Project management backend path. */
const FIREBASE_RULES_PATH = '/v1/';

/**
 * Class that provides a mechanism to send requests to the Firebase Rules backend
 * endpoints.
 *
 * @private
 */
export class FirebaseRulesRequestHandler extends RequestHandlerBase {
  protected readonly baseUrl: string = `https://${FIREBASE_RULES_HOST_AND_PORT}${FIREBASE_RULES_PATH}`;

  /**
   * @param app The app used to fetch access tokens to sign API requests.
   * @param resourceName Fully-qualified resource name of the project.
   * @constructor
   */
  constructor(app: FirebaseApp, private resourceName: string) {
    super(app);
  }

  public listRulesReleases(
    filter?: string,
    maxResults?: number,
    nextPageToken?: string,
  ): Promise<ListRulesReleasesResult> {
    return this.invokeRequestHandler('GET', `${this.resourceName}/releases`, {
      filter,
      maxResults,
      nextPageToken,
    }).then(
      (responseData: { releases: RulesRelease[]; nextPageToken?: string }) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          "listRulesReleases()'s responseData must be a non-null object.",
        );

        // TODO: when there are no releases, is this an empty array or is the field missing?
        assertServerResponse(
          validator.isArray(responseData.releases),
          responseData,
          `"responseData.releases" field must be an array in listRulesReleases()'s response data.`,
        );

        return {
          releases: responseData.releases.map(shortenReleaseName),
          pageToken: responseData.nextPageToken,
        };
      },
    );
  }

  public getRulesRelease(name: string): Promise<RulesRelease> {
    return this.invokeRequestHandler(
      'GET',
      `${this.resourceName}/releases/${name}`,
    ).then((responseData: RulesRelease) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "getRulesRelease()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in getRulesRelease()'s response data.`,
      );

      return shortenReleaseName(responseData);
    });
  }

  public createRulesRelease(
    name: string,
    rulesetName: string,
  ): Promise<RulesRelease> {
    return this.invokeRequestHandler('POST', `${this.resourceName}/releases`, {
      name: `${this.resourceName}/releases/${name}`,
      rulesetName,
    }).then((responseData: RulesRelease) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "createRulesRelease()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in createRulesRelease()'s response data.`,
      );

      return shortenReleaseName(responseData);
    });
  }

  public deleteRulesRelease(name: string): Promise<void> {
    return this.invokeRequestHandler(
      'DELETE',
      `${this.resourceName}/releases/${name}`,
    ).then(() => undefined);
  }

  public listRulesets(
    maxResults?: number,
    nextPageToken?: string,
  ): Promise<ListRulesetsResult> {
    return this.invokeRequestHandler('GET', `${this.resourceName}/rulesets`, {
      maxResults,
      nextPageToken,
    }).then((responseData: { rulesets: Ruleset[]; nextPageToken?: string }) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "listRulesets()'s responseData must be a non-null object.",
      );

      // TODO: when there are no rulesets, is this an empty array or is the field missing?
      assertServerResponse(
        validator.isArray(responseData.rulesets),
        responseData,
        `"responseData.rulesets" field must be an array in listRulesets()'s response data.`,
      );

      return {
        rulesets: responseData.rulesets.map(shortenRulesetName),
        pageToken: responseData.nextPageToken,
      };
    });
  }

  public getRuleset(name: string): Promise<RulesetWithFiles> {
    return this.invokeRequestHandler(
      'GET',
      `${this.resourceName}/rulesets/${name}`,
    ).then((responseData: RulesetWithFiles) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "getRuleset()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in getRuleset()'s response data.`,
      );

      return shortenRulesetName(responseData);
    });
  }

  public createRuleset(files: RulesetFile[]): Promise<RulesetWithFiles> {
    return this.invokeRequestHandler('POST', `${this.resourceName}/rulesets`, {
      source: { files },
    }).then((responseData: any) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "createRulesRelease()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in createRuleset()'s response data.`,
      );

      assertServerResponse(
        validator.isNonNullObject(responseData.source),
        responseData,
        `"responseData.source" field  must be a non-null object in createRuleset()'s response data.`,
      );

      assertServerResponse(
        validator.isArray(responseData.source.files),
        responseData,
        `"responseData.source.files" field  must be an array in createRuleset()'s response data.`,
      );

      return shortenRulesetName(responseData);
    });
  }

  public deleteRuleset(name: string): Promise<void> {
    return this.invokeRequestHandler(
      'DELETE',
      `${this.resourceName}/rulesets/${name}`,
    ).then(() => undefined);
  }

  // **************************************************** //

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project whose iOS apps
   *     you want to list.
   */
  public listIosApps(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      `${parentResourceName}/iosApps?page_size=123`,
      /* requestData */ null,
      { useBetaUrl: true },
    );
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project that you want
   *     to create the Android app within.
   */
  public createAndroidApp(
    parentResourceName: string,
    packageName: string,
    displayName?: string,
  ): Promise<object> {
    const requestData: any = {
      packageName,
    };
    if (validator.isNonEmptyString(displayName)) {
      requestData.displayName = displayName;
    }
    return this.invokeRequestHandler(
      'POST',
      `${parentResourceName}/androidApps`,
      requestData,
      { useBetaUrl: true },
    ).then((responseData: any) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        `createAndroidApp's responseData must be a non-null object.`,
      );
      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `createAndroidApp's responseData.name must be a non-empty string.`,
      );
      return this.pollRemoteOperationWithExponentialBackoff(responseData.name);
    });
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the project that you want
   *     to create the iOS app within.
   */
  public createIosApp(
    parentResourceName: string,
    bundleId: string,
    displayName?: string,
  ): Promise<object> {
    const requestData: any = {
      bundleId,
    };
    if (validator.isNonEmptyString(displayName)) {
      requestData.displayName = displayName;
    }
    return this.invokeRequestHandler(
      'POST',
      `${parentResourceName}/iosApps`,
      requestData,
      { useBetaUrl: true },
    ).then((responseData: any) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        `createIosApp's responseData must be a non-null object.`,
      );
      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `createIosApp's responseData.name must be a non-empty string.`,
      );
      return this.pollRemoteOperationWithExponentialBackoff(responseData.name);
    });
  }

  /**
   * @param {string} resourceName Fully-qualified resource name of the entity whose display name you
   *     want to set.
   */
  public setDisplayName(
    resourceName: string,
    newDisplayName: string,
  ): Promise<void> {
    const requestData = {
      displayName: newDisplayName,
    };
    return this.invokeRequestHandler(
      'PATCH',
      `${resourceName}?update_mask=display_name`,
      requestData,
      { useBetaUrl: true },
    ).then(() => null);
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the Android app whose SHA
   *     certificates you want to get.
   */
  public getAndroidShaCertificates(
    parentResourceName: string,
  ): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      `${parentResourceName}/sha`,
      /* requestData */ null,
      { useBetaUrl: true },
    );
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the app whose config you
   *     want to get.
   */
  public getConfig(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      `${parentResourceName}/config`,
      /* requestData */ null,
      { useBetaUrl: true },
    );
  }

  /**
   * @param {string} parentResourceName Fully-qualified resource name of the entity that you want to
   *     get.
   */
  public getResource(parentResourceName: string): Promise<object> {
    return this.invokeRequestHandler(
      'GET',
      parentResourceName,
      /* requestData */ null,
      { useBetaUrl: true },
    );
  }

  /**
   * @param {string} resourceName Fully-qualified resource name of the entity that you want to
   *     delete.
   */
  public deleteResource(resourceName: string): Promise<void> {
    return this.invokeRequestHandler(
      'DELETE',
      resourceName,
      /* requestData */ null,
      { useBetaUrl: true },
    ).then(() => null);
  }
}

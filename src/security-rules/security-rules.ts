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

import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { FirebaseApp } from '../firebase-app';
import * as validator from '../utils/validator';
import {
  SecurityRulesApiClient, RulesetResponse, RulesetContent, ListRulesetsResponse,
} from './security-rules-api-client-internal';
import { FirebaseSecurityRulesError } from './security-rules-internal';
import { securityRules } from './index';

import RulesFile = securityRules.RulesFile;
import RulesetMetadata = securityRules.RulesetMetadata;
import RulesetMetadataList = securityRules.RulesetMetadataList;
import RulesetInterface = securityRules.Ruleset;
import SecurityRulesInterface = securityRules.SecurityRules;

class RulesetMetadataListImpl implements RulesetMetadataList {

  public readonly rulesets: RulesetMetadata[];
  public readonly nextPageToken?: string;

  constructor(response: ListRulesetsResponse) {
    if (!validator.isNonNullObject(response) || !validator.isArray(response.rulesets)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument',
        `Invalid ListRulesets response: ${JSON.stringify(response)}`);
    }

    this.rulesets = response.rulesets.map((rs) => {
      return {
        name: stripProjectIdPrefix(rs.name),
        createTime: new Date(rs.createTime).toUTCString(),
      };
    });

    if (response.nextPageToken) {
      this.nextPageToken = response.nextPageToken;
    }
  }
}

/**
 * Represents a set of Firebase security rules.
 */
export class Ruleset implements RulesetInterface {

  public readonly name: string;
  public readonly createTime: string;
  public readonly source: RulesFile[];

  constructor(ruleset: RulesetResponse) {
    if (!validator.isNonNullObject(ruleset) ||
      !validator.isNonEmptyString(ruleset.name) ||
      !validator.isNonEmptyString(ruleset.createTime) ||
      !validator.isNonNullObject(ruleset.source)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument',
        `Invalid Ruleset response: ${JSON.stringify(ruleset)}`);
    }

    this.name = stripProjectIdPrefix(ruleset.name);
    this.createTime = new Date(ruleset.createTime).toUTCString();
    this.source = ruleset.source.files || [];
  }
}

/**
 * The Firebase `SecurityRules` service interface.
 *
 * Do not call this constructor directly. Instead, use
 * [`admin.securityRules()`](securityRules#securityRules).
 */
export class SecurityRules implements FirebaseServiceInterface, SecurityRulesInterface {

  private static readonly CLOUD_FIRESTORE = 'cloud.firestore';
  private static readonly FIREBASE_STORAGE = 'firebase.storage';

  public readonly INTERNAL = new SecurityRulesInternals();

  private readonly client: SecurityRulesApiClient;

  /**
   * @param {object} app The app for this SecurityRules service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    this.client = new SecurityRulesApiClient(app);
  }

  /**
   * Gets the Ruleset identified by the given name. The input name should be the short name string without
   * the project ID prefix. For example, to retrieve the `projects/project-id/rulesets/my-ruleset`, pass the
   * short name "my-ruleset". Rejects with a `not-found` error if the specified Ruleset cannot be found.
   *
   * @param {string} name Name of the Ruleset to retrieve.
   * @returns {Promise<Ruleset>} A promise that fulfills with the specified Ruleset.
   */
  public getRuleset(name: string): Promise<Ruleset> {
    return this.client.getRuleset(name)
      .then((rulesetResponse) => {
        return new Ruleset(rulesetResponse);
      });
  }

  /**
   * Gets the Ruleset currently applied to Cloud Firestore. Rejects with a `not-found` error if no Ruleset is
   * applied on Firestore.
   *
   * @returns {Promise<Ruleset>} A promise that fulfills with the Firestore Ruleset.
   */
  public getFirestoreRuleset(): Promise<Ruleset> {
    return this.getRulesetForRelease(SecurityRules.CLOUD_FIRESTORE);
  }

  /**
   * Creates a new ruleset from the given source, and applies it to Cloud Firestore.
   *
   * @param {string|Buffer} source Rules source to apply.
   * @returns {Promise<Ruleset>} A promise that fulfills when the ruleset is created and released.
   */
  public releaseFirestoreRulesetFromSource(source: string | Buffer): Promise<Ruleset> {
    return Promise.resolve()
      .then(() => {
        const rulesFile = this.createRulesFileFromSource('firestore.rules', source);
        return this.createRuleset(rulesFile);
      })
      .then((ruleset) => {
        return this.releaseFirestoreRuleset(ruleset)
          .then(() => {
            return ruleset;
          });
      });
  }

  /**
   * Makes the specified ruleset the currently applied ruleset for Cloud Firestore.
   *
   * @param {string|RulesetMetadata} ruleset Name of the ruleset to apply or a RulesetMetadata object containing
   *   the name.
   * @returns {Promise<void>} A promise that fulfills when the ruleset is released.
   */
  public releaseFirestoreRuleset(ruleset: string | RulesetMetadata): Promise<void> {
    return this.releaseRuleset(ruleset, SecurityRules.CLOUD_FIRESTORE);
  }

  /**
   * Gets the Ruleset currently applied to a Cloud Storage bucket. Rejects with a `not-found` error if no Ruleset is
   * applied on the bucket.
   *
   * @param {string=} bucket Optional name of the Cloud Storage bucket to be retrieved. If not specified,
   *   retrieves the ruleset applied on the default bucket configured via `AppOptions`.
   * @returns {Promise<Ruleset>} A promise that fulfills with the Cloud Storage Ruleset.
   */
  public getStorageRuleset(bucket?: string): Promise<Ruleset> {
    return Promise.resolve()
      .then(() => {
        return this.getBucketName(bucket);
      })
      .then((bucketName) => {
        return this.getRulesetForRelease(`${SecurityRules.FIREBASE_STORAGE}/${bucketName}`);
      });
  }

  /**
   * Creates a new ruleset from the given source, and applies it to a Cloud Storage bucket.
   *
   * @param {string|Buffer} source Rules source to apply.
   * @param {string=} bucket Optional name of the Cloud Storage bucket to apply the rules on. If not specified,
   *   applies the ruleset on the default bucket configured via `AppOptions`.
   * @returns {Promise<Ruleset>} A promise that fulfills when the ruleset is created and released.
   */
  public releaseStorageRulesetFromSource(source: string | Buffer, bucket?: string): Promise<Ruleset> {
    return Promise.resolve()
      .then(() => {
        // Bucket name is not required until the last step. But since there's a createRuleset step
        // before then, make sure to run this check and fail early if the bucket name is invalid.
        this.getBucketName(bucket);
        const rulesFile = this.createRulesFileFromSource('storage.rules', source);
        return this.createRuleset(rulesFile);
      })
      .then((ruleset) => {
        return this.releaseStorageRuleset(ruleset, bucket)
          .then(() => {
            return ruleset;
          });
      });
  }

  /**
   * Makes the specified ruleset the currently applied ruleset for a Cloud Storage bucket.
   *
   * @param {string|RulesetMetadata} ruleset Name of the ruleset to apply or a RulesetMetadata object containing
   *   the name.
   * @param {string=} bucket Optional name of the Cloud Storage bucket to apply the rules on. If not specified,
   *   applies the ruleset on the default bucket configured via `AppOptions`.
   * @returns {Promise<void>} A promise that fulfills when the ruleset is released.
   */
  public releaseStorageRuleset(ruleset: string | RulesetMetadata, bucket?: string): Promise<void> {
    return Promise.resolve()
      .then(() => {
        return this.getBucketName(bucket);
      })
      .then((bucketName) => {
        return this.releaseRuleset(ruleset, `${SecurityRules.FIREBASE_STORAGE}/${bucketName}`);
      });
  }

  /**
   * Creates a {@link securityRules.RulesFile `RuleFile`} with the given name
   * and source. Throws an error if any of the arguments are invalid. This is a local
   * operation, and does not involve any network API calls.
   *
   * @example
   * ```javascript
   * const source = '// Some rules source';
   * const rulesFile = admin.securityRules().createRulesFileFromSource(
   *   'firestore.rules', source);
   * ```
   *
   * @param name Name to assign to the rules file. This is usually a short file name that
   *   helps identify the file in a ruleset.
   * @param source Contents of the rules file.
   * @return A new rules file instance.
   */
  public createRulesFileFromSource(name: string, source: string | Buffer): RulesFile {
    if (!validator.isNonEmptyString(name)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument', 'Name must be a non-empty string.');
    }

    let content: string;
    if (validator.isNonEmptyString(source)) {
      content = source;
    } else if (validator.isBuffer(source)) {
      content = source.toString('utf-8');
    } else {
      throw new FirebaseSecurityRulesError(
        'invalid-argument', 'Source must be a non-empty string or a Buffer.');
    }

    return {
      name,
      content,
    };
  }

  /**
   * Creates a new {@link securityRules.Ruleset `Ruleset`} from the given
   * {@link securityRules.RulesFile `RuleFile`}.
   *
   * @param file Rules file to include in the new `Ruleset`.
   * @returns A promise that fulfills with the newly created `Ruleset`.
   */
  public createRuleset(file: RulesFile): Promise<Ruleset> {
    const ruleset: RulesetContent = {
      source: {
        files: [ file ],
      },
    };

    return this.client.createRuleset(ruleset)
      .then((rulesetResponse) => {
        return new Ruleset(rulesetResponse);
      });
  }

  /**
   * Deletes the {@link securityRules.Ruleset `Ruleset`} identified by the given
   * name. The input name should be the short name string without the project ID
   * prefix. For example, to delete the `projects/project-id/rulesets/my-ruleset`,
   * pass the  short name "my-ruleset". Rejects with a `not-found` error if the
   * specified `Ruleset` cannot be found.
   *
   * @param name Name of the `Ruleset` to delete.
   * @return A promise that fulfills when the `Ruleset` is deleted.
   */
  public deleteRuleset(name: string): Promise<void> {
    return this.client.deleteRuleset(name);
  }

  /**
   * Retrieves a page of ruleset metadata.
   *
   * @param pageSize The page size, 100 if undefined. This is also the maximum allowed
   *   limit.
   * @param nextPageToken The next page token. If not specified, returns rulesets
   *   starting without any offset.
   * @return A promise that fulfills with a page of rulesets.
   */
  public listRulesetMetadata(pageSize = 100, nextPageToken?: string): Promise<RulesetMetadataList> {
    return this.client.listRulesets(pageSize, nextPageToken)
      .then((response) => {
        return new RulesetMetadataListImpl(response);
      });
  }

  private getRulesetForRelease(releaseName: string): Promise<Ruleset> {
    return this.client.getRelease(releaseName)
      .then((release) => {
        const rulesetName = release.rulesetName;
        if (!validator.isNonEmptyString(rulesetName)) {
          throw new FirebaseSecurityRulesError(
            'not-found', `Ruleset name not found for ${releaseName}.`);
        }

        return this.getRuleset(stripProjectIdPrefix(rulesetName));
      });
  }

  private releaseRuleset(ruleset: string | RulesetMetadata, releaseName: string): Promise<void> {
    if (!validator.isNonEmptyString(ruleset) &&
      (!validator.isNonNullObject(ruleset) || !validator.isNonEmptyString(ruleset.name))) {
      const err = new FirebaseSecurityRulesError(
        'invalid-argument', 'ruleset must be a non-empty name or a RulesetMetadata object.');
      return Promise.reject(err);
    }

    const rulesetName = validator.isString(ruleset) ? ruleset : ruleset.name;
    return this.client.updateRelease(releaseName, rulesetName)
      .then(() => {
        return;
      });
  }

  private getBucketName(bucket?: string): string {
    const bucketName = (typeof bucket !== 'undefined') ? bucket :  this.app.options.storageBucket;
    if (!validator.isNonEmptyString(bucketName)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument',
        'Bucket name not specified or invalid. Specify a default bucket name via the ' +
        'storageBucket option when initializing the app, or specify the bucket name ' +
        'explicitly when calling the rules API.',
      );
    }

    return bucketName;
  }
}

class SecurityRulesInternals implements FirebaseServiceInternalsInterface {
  public delete(): Promise<void> {
    return Promise.resolve();
  }
}

function stripProjectIdPrefix(name: string): string {
  return name.split('/').pop()!;
}

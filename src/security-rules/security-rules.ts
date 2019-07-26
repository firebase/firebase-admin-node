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
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { SecurityRulesApiClient, RulesetResponse, RulesetContent } from './security-rules-api-client';
import { AuthorizedHttpClient } from '../utils/api-request';
import { FirebaseSecurityRulesError } from './security-rules-utils';

/**
 * A source file containing some Firebase security rules.
 */
export interface RulesFile {
  readonly name: string;
  readonly content: string;
}

/**
 * Additional metadata associated with a Ruleset.
 */
export interface RulesetMetadata {
  readonly name: string;
  readonly createTime: string;
}

/**
 * Representa a set of Firebase security rules.
 */
export class Ruleset implements RulesetMetadata {

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
 * SecurityRules service bound to the provided app.
 */
export class SecurityRules implements FirebaseServiceInterface {

  private static readonly CLOUD_FIRESTORE = 'cloud.firestore';

  public readonly INTERNAL = new SecurityRulesInternals();

  private readonly client: SecurityRulesApiClient;

  /**
   * @param {object} app The app for this SecurityRules service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument',
        'First argument passed to admin.securityRules() must be a valid Firebase app '
          + 'instance.');
    }

    const projectId = utils.getProjectId(app);
    this.client = new SecurityRulesApiClient(new AuthorizedHttpClient(app), projectId);
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

  public createRuleset(file: RulesFile, ...additionalFiles: RulesFile[]): Promise<Ruleset> {
    const files = [file, ...additionalFiles];
    const ruleset: RulesetContent = {
      source: {
        files,
      },
    };

    return this.client.createRuleset(ruleset)
      .then((rulesetResponse) => {
        return new Ruleset(rulesetResponse);
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
}

class SecurityRulesInternals implements FirebaseServiceInternalsInterface {
  public delete(): Promise<void> {
    return Promise.resolve();
  }
}

function stripProjectIdPrefix(name: string): string {
  return name.split('/').pop();
}

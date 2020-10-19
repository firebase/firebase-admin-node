/*!
 * Copyright 2020 Google Inc.
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

import { app } from '../firebase-namespace-api';

/**
 * Gets the {@link securityRules.SecurityRules
 * `SecurityRules`} service for the default app or a given app.
 *
 * `admin.securityRules()` can be called with no arguments to access the
 * default app's {@link securityRules.SecurityRules
 * `SecurityRules`} service, or as `admin.securityRules(app)` to access
 * the {@link securityRules.SecurityRules `SecurityRules`}
 * service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the SecurityRules service for the default app
 * var defaultSecurityRules = admin.securityRules();
 * ```
 *
 * @example
 *  ```javascript
 * // Get the SecurityRules service for a given app
 * var otherSecurityRules = admin.securityRules(otherApp);
 * ```
 *
 * @param app Optional app to return the `SecurityRules` service
 *     for. If not provided, the default `SecurityRules` service
 *     is returned.
 * @return The default `SecurityRules` service if no app is provided, or the
 *   `SecurityRules` service associated with the provided app.
 */
export declare function securityRules(app?: app.App): securityRules.SecurityRules;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace securityRules {
  /**
   * A source file containing some Firebase security rules. The content includes raw
   * source code including text formatting, indentation and comments. Use the
   * [`securityRules.createRulesFileFromSource()`](securityRules.SecurityRules#createRulesFileFromSource)
   * method to create new instances of this type.
   */
  export interface RulesFile {
    readonly name: string;
    readonly content: string;
  }

  /**
   * Required metadata associated with a ruleset.
   */
  export interface RulesetMetadata {
    /**
     * Name of the `Ruleset` as a short string. This can be directly passed into APIs
     * like {@link securityRules.SecurityRules.getRuleset `securityRules.getRuleset()`}
     * and {@link securityRules.SecurityRules.deleteRuleset `securityRules.deleteRuleset()`}.
     */
    readonly name: string;
    /**
     * Creation time of the `Ruleset` as a UTC timestamp string.
     */
    readonly createTime: string;
  }

  /**
   * A page of ruleset metadata.
   */
  export interface RulesetMetadataList {
    /**
     * A batch of ruleset metadata.
     */
    readonly rulesets: RulesetMetadata[];
    /**
     * The next page token if available. This is needed to retrieve the next batch.
     */
    readonly nextPageToken?: string;
  }

  /**
   * A set of Firebase security rules.
   */
  export interface Ruleset extends RulesetMetadata {
    readonly source: RulesFile[];
  }

  /**
   * The Firebase `SecurityRules` service interface.
   */
  export interface SecurityRules {
    app: app.App;

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
    createRulesFileFromSource(name: string, source: string | Buffer): RulesFile;

    /**
     * Creates a new {@link securityRules.Ruleset `Ruleset`} from the given
     * {@link securityRules.RulesFile `RuleFile`}.
     *
     * @param file Rules file to include in the new `Ruleset`.
     * @returns A promise that fulfills with the newly created `Ruleset`.
     */
    createRuleset(file: RulesFile): Promise<Ruleset>;

    /**
     * Gets the {@link securityRules.Ruleset `Ruleset`} identified by the given
     * name. The input name should be the short name string without the project ID
     * prefix. For example, to retrieve the `projects/project-id/rulesets/my-ruleset`,
     * pass the short name "my-ruleset". Rejects with a `not-found` error if the
     * specified `Ruleset` cannot be found.
     *
     * @param name Name of the `Ruleset` to retrieve.
     * @return A promise that fulfills with the specified `Ruleset`.
     */
    getRuleset(name: string): Promise<Ruleset>;

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
    deleteRuleset(name: string): Promise<void>;

    /**
     * Retrieves a page of ruleset metadata.
     *
     * @param pageSize The page size, 100 if undefined. This is also the maximum allowed
     *   limit.
     * @param nextPageToken The next page token. If not specified, returns rulesets
     *   starting without any offset.
     * @return A promise that fulfills with a page of rulesets.
     */
    listRulesetMetadata(
      pageSize?: number, nextPageToken?: string): Promise<RulesetMetadataList>;

    /**
     * Gets the {@link securityRules.Ruleset `Ruleset`} currently applied to
     * Cloud Firestore. Rejects with a `not-found` error if no ruleset is applied
     * on Firestore.
     *
     * @return A promise that fulfills with the Firestore ruleset.
     */
    getFirestoreRuleset(): Promise<Ruleset>;

    /**
     * Creates a new {@link securityRules.Ruleset `Ruleset`} from the given
     * source, and applies it to Cloud Firestore.
     *
     * @param source Rules source to apply.
     * @return A promise that fulfills when the ruleset is created and released.
     */
    releaseFirestoreRulesetFromSource(source: string | Buffer): Promise<Ruleset>;

    /**
     * Applies the specified {@link securityRules.Ruleset `Ruleset`} ruleset
     * to Cloud Firestore.
     *
     * @param ruleset Name of the ruleset to apply or a `RulesetMetadata` object
     *   containing the name.
     * @return A promise that fulfills when the ruleset is released.
     */
    releaseFirestoreRuleset(ruleset: string | RulesetMetadata): Promise<void>;

    /**
     * Gets the {@link securityRules.Ruleset `Ruleset`} currently applied to a
     * Cloud Storage bucket. Rejects with a `not-found` error if no ruleset is applied
     * on the bucket.
     *
     * @param bucket Optional name of the Cloud Storage bucket to be retrieved. If not
     *   specified, retrieves the ruleset applied on the default bucket configured via
     *   `AppOptions`.
     * @return A promise that fulfills with the Cloud Storage ruleset.
     */
    getStorageRuleset(bucket?: string): Promise<Ruleset>;

    /**
     * Creates a new {@link securityRules.Ruleset `Ruleset`} from the given
     * source, and applies it to a Cloud Storage bucket.
     *
     * @param source Rules source to apply.
     * @param bucket Optional name of the Cloud Storage bucket to apply the rules on. If
     *   not specified, applies the ruleset on the default bucket configured via
     *   {@link AppOptions `AppOptions`}.
     * @return A promise that fulfills when the ruleset is created and released.
     */
    releaseStorageRulesetFromSource(
      source: string | Buffer, bucket?: string): Promise<Ruleset>;

    /**
     * Applies the specified {@link securityRules.Ruleset `Ruleset`} ruleset
     * to a Cloud Storage bucket.
     *
     * @param ruleset Name of the ruleset to apply or a `RulesetMetadata` object
     *   containing the name.
     * @param bucket Optional name of the Cloud Storage bucket to apply the rules on. If
     *   not specified, applies the ruleset on the default bucket configured via
     *   {@link AppOptions `AppOptions`}.
     * @return A promise that fulfills when the ruleset is released.
     */
    releaseStorageRuleset(
      ruleset: string | RulesetMetadata, bucket?: string): Promise<void>;
  }
}

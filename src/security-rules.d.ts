import * as _admin from './index.d';

export namespace admin.securityRules {
  /**
   * A source file containing some Firebase security rules. The content includes raw
   * source code including text formatting, indentation and comments. Use the
   * [`securityRules.createRulesFileFromSource()`](admin.securityRules.SecurityRules#createRulesFileFromSource)
   * method to create new instances of this type.
   */
  interface RulesFile {
    readonly name: string;
    readonly content: string;
  }

  /**
   * Required metadata associated with a ruleset.
   */
  interface RulesetMetadata {
    /**
     * Name of the `Ruleset` as a short string. This can be directly passed into APIs
     * like [`securityRules.getRuleset()`](admin.securityRules.SecurityRules#getRuleset)
     * and [`securityRules.deleteRuleset()`](admin.securityRules.SecurityRules#deleteRuleset).
     */
    readonly name: string;

    /**
     * Creation time of the `Ruleset` as a UTC timestamp string.
     */
    readonly createTime: string;
  }

  /**
   * A set of Firebase security rules.
   */
  interface Ruleset extends RulesetMetadata {
    readonly source: admin.securityRules.RulesFile[];
  }

  interface RulesetMetadataList {
    /**
     * A batch of ruleset metadata.
     */
    readonly rulesets: admin.securityRules.RulesetMetadata[];

    /**
     * The next page token if available. This is needed to retrieve the next batch.
     */
    readonly nextPageToken?: string;
  }

  /**
   * The Firebase `SecurityRules` service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.securityRules()`](admin.securityRules#securityRules).
   */
  interface SecurityRules {
    app: _admin.app.App;

    /**
     * Creates a {@link admin.securityRules.RulesFile `RuleFile`} with the given name
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
    createRulesFileFromSource(name: string, source: string | Buffer): admin.securityRules.RulesFile;

    /**
     * Creates a new {@link admin.securityRules.Ruleset `Ruleset`} from the given
     * {@link admin.securityRules.RulesFile `RuleFile`}.
     *
     * @param file Rules file to include in the new `Ruleset`.
     * @returns A promise that fulfills with the newly created `Ruleset`.
     */
    createRuleset(file: admin.securityRules.RulesFile): Promise<admin.securityRules.Ruleset>;

    /**
     * Gets the {@link admin.securityRules.Ruleset `Ruleset`} identified by the given
     * name. The input name should be the short name string without the project ID
     * prefix. For example, to retrieve the `projects/project-id/rulesets/my-ruleset`,
     * pass the short name "my-ruleset". Rejects with a `not-found` error if the
     * specified `Ruleset` cannot be found.
     *
     * @param name Name of the `Ruleset` to retrieve.
     * @return A promise that fulfills with the specified `Ruleset`.
     */
    getRuleset(name: string): Promise<admin.securityRules.Ruleset>;

    /**
     * Deletes the {@link admin.securityRules.Ruleset `Ruleset`} identified by the given
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
      pageSize?: number, nextPageToken?: string): Promise<admin.securityRules.RulesetMetadataList>;

    /**
     * Gets the {@link admin.securityRules.Ruleset `Ruleset`} currently applied to
     * Cloud Firestore. Rejects with a `not-found` error if no ruleset is applied
     * on Firestore.
     *
     * @return A promise that fulfills with the Firestore ruleset.
     */
    getFirestoreRuleset(): Promise<admin.securityRules.Ruleset>;

    /**
     * Creates a new {@link admin.securityRules.Ruleset `Ruleset`} from the given
     * source, and applies it to Cloud Firestore.
     *
     * @param source Rules source to apply.
     * @return A promise that fulfills when the ruleset is created and released.
     */
    releaseFirestoreRulesetFromSource(source: string | Buffer): Promise<admin.securityRules.Ruleset>;

    /**
     * Applies the specified {@link admin.securityRules.Ruleset `Ruleset`} ruleset
     * to Cloud Firestore.
     *
     * @param ruleset Name of the ruleset to apply or a `RulesetMetadata` object
     *   containing the name.
     * @return A promise that fulfills when the ruleset is released.
     */
    releaseFirestoreRuleset(ruleset: string | admin.securityRules.RulesetMetadata): Promise<void>;

    /**
     * Gets the {@link admin.securityRules.Ruleset `Ruleset`} currently applied to a
     * Cloud Storage bucket. Rejects with a `not-found` error if no ruleset is applied
     * on the bucket.
     *
     * @param bucket Optional name of the Cloud Storage bucket to be retrieved. If not
     *   specified, retrieves the ruleset applied on the default bucket configured via
     *   `AppOptions`.
     * @return A promise that fulfills with the Cloud Storage ruleset.
     */
    getStorageRuleset(bucket?: string): Promise<admin.securityRules.Ruleset>;

    /**
     * Creates a new {@link admin.securityRules.Ruleset `Ruleset`} from the given
     * source, and applies it to a Cloud Storage bucket.
     *
     * @param source Rules source to apply.
     * @param bucket Optional name of the Cloud Storage bucket to apply the rules on. If
     *   not specified, applies the ruleset on the default bucket configured via
     *   {@link admin.AppOptions `AppOptions`}.
     * @return A promise that fulfills when the ruleset is created and released.
     */
    releaseStorageRulesetFromSource(
      source: string | Buffer, bucket?: string): Promise<admin.securityRules.Ruleset>;

    /**
     * Applies the specified {@link admin.securityRules.Ruleset `Ruleset`} ruleset
     * to a Cloud Storage bucket.
     *
     * @param ruleset Name of the ruleset to apply or a `RulesetMetadata` object
     *   containing the name.
     * @param bucket Optional name of the Cloud Storage bucket to apply the rules on. If
     *   not specified, applies the ruleset on the default bucket configured via
     *   {@link admin.AppOptions `AppOptions`}.
     * @return A promise that fulfills when the ruleset is released.
     */
    releaseStorageRuleset(
      ruleset: string | admin.securityRules.RulesetMetadata, bucket?: string): Promise<void>;
  }
}

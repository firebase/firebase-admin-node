
export type Service = 'firestore' | 'storage' | 'database';

export interface Ruleset {
  /**
   * The name of the ruleset.
   * Format: `projects/{projectId}/rulesets/{uuid}`
   */
  name: string;

  /**
   * Timestamp in ISO 8601 format.
   */
  createTime: string;
}

export interface RulesetWithFiles extends Ruleset {
  /**
   * Array of ruleset files.
   * This is only present when getting a specific Ruleset, but not when
   * listing them with `listRulesets()`.
   */
  files: RulesetFile[];
}

export interface RulesetFile {
  /**
   * Name of the file.
   */
  name: string;

  /**
   * The content of the file (the actual rules).
   */
  content: string;
}

/**
 * Possible filters when listing releases. All optional and can be combined.
 */
export interface ListRulesReleasesFilter {
  releaseName?: string;
  rulesetName?: string;
  testSuiteName?: string; // Maybe not? Totally undocumented AFAIK.
}

/**
 * The result of listing rules releases.
 */
export interface ListRulesReleasesResult {
  releases: RulesRelease[];
  pageToken?: string;
}

export interface RulesRelease {
  /**
   * The name of the release.
   * Format: `projects/{projectId}/releases/{id}`.
   * `id` would be either `cloud.storage` or `cloud.firestore`.
   */
  name: string;

  /**
   * Name of the ruleset associated with the release.
   * Format: `projects/{projectId}/rulesets/{uuid}`
   */
  rulesetName: string;

  /**
   * Timestamp in ISO 8601 format.
   */
  createTime: string;

  /**
   * Timestamp in ISO 8601 format.
   * Note: this might only be present if the release has been updated, I'm
   * not sure. Should check.
   */
  updateTime: string;
}

/**
 * The result of listing rulesets.
 */
export interface ListRulesetsResult {
  rulesets: Ruleset[];
  pageToken?: string;
}

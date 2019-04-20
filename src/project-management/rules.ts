import { FirebaseProjectManagementError } from '../utils/error';

const RELEASE_NAME_REGEX = /^projects\/([^\/]+)\/releases\/([^\/]+)$/;
const RULESET_NAME_REGEX = /^projects\/([^\/]+)\/rulesets\/([^\/]+)$/;

export const VALID_SERVICES: RulesService[] = [
  'firestore',
  'storage',
  'database',
];

export const RELEASE_NAME_FOR_SERVICE = {
  firestore: 'cloud.firestore',
  storage: 'firebase.storage',
};

export type RulesService = 'firestore' | 'storage' | 'database';

export interface Ruleset {
  /**
   * The name of the ruleset.
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
  testSuiteName?: string; // TODO: Maybe not? Totally undocumented AFAIK.
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
   * This will usually be either `firebase.storage` or `cloud.firestore`.
   */
  name: string;

  /**
   * Name of the ruleset associated with the release.
   */
  rulesetName: string;

  /**
   * Timestamp in ISO 8601 format.
   */
  createTime: string;

  /**
   * Timestamp in ISO 8601 format.
   * TODO: this might only be present if the release has been updated, I'm
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

/**
 * Assert that the given service name is among the valid ones.
 */
export function assertValidRulesService(
  service: RulesService,
  methodName: string,
) {
  if (VALID_SERVICES.indexOf(service) < 0) {
    throw new FirebaseProjectManagementError(
      'invalid-argument',
      `The service name passed to ${methodName}() must be one of ${VALID_SERVICES.join(
        ', ',
      )}.`,
    );
  }
}

/**
 * Returns the release object with its name shortened.
 */
export function shortenReleaseName(release: RulesRelease): RulesRelease {
  const nameMatch = release.name.match(RELEASE_NAME_REGEX);
  return { ...release, name: nameMatch[2] };
}

/**
 * Returns the ruleset object with its name shortened.
 */
export function shortenRulesetName<T extends Ruleset | RulesetWithFiles>(
  ruleset: T,
): T {
  const nameMatch = ruleset.name.match(RULESET_NAME_REGEX);
  return { ...ruleset, name: nameMatch[2] };
}

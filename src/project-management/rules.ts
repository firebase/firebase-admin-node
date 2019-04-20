import { FirebaseProjectManagementError } from '../utils/error';

const VALID_SERVICES: Service[] = ['firestore', 'storage', 'database'];
const RELEASE_NAME_FIRESTORE = 'cloud.firestore';
const RELEASE_NAME_STORAGE = 'firebase.storage';
const REGEX_RELEASE_NAME = /^projects\/([^\/]+)\/releases\/([^\/]+)$/;
const REGEX_RULESET_NAME = /^projects\/([^\/]+)\/rulesets\/([^\/]+)$/;

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

export function assertValidRulesService(service: Service, methodName: string) {
  if (VALID_SERVICES.indexOf(service) < 0) {
    throw new FirebaseProjectManagementError(
      'invalid-argument',
      `The service name passed to ${methodName}() must be one of ${VALID_SERVICES.join(
        ', ',
      )}.`,
    );
  }
}

export function shortenReleaseName(release: RulesRelease): RulesRelease {
  const nameMatch = release.name.match(REGEX_RELEASE_NAME);
  return { ...release, name: nameMatch[2] };
}

export function expandReleaseName<T extends RulesRelease | string>(
  release: T,
  resourceName: string,
): T {
  if (typeof release === 'string') {
    return `${resourceName}/releases/${release}` as any;
  } else {
    return {
      ...release,
      name: `${resourceName}/releases/${(release as any).name}`,
    };
  }
}

export function shortenRulesetName<T extends Ruleset | RulesetFile>(
  ruleset: T,
): T {
  const nameMatch = ruleset.name.match(REGEX_RULESET_NAME);
  return { ...ruleset, name: nameMatch[2] };
}

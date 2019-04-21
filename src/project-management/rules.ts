import { FirebaseProjectManagementError } from '../utils/error';
import {
  RulesetResponse,
  RulesetWithFilesResponse,
  RulesReleaseResponse,
} from './firebase-rules-api-request';

const RELEASE_NAME_REGEX = /^projects\/([^\/]+)\/releases\/(.+)$/;
const RULESET_NAME_REGEX = /^projects\/([^\/]+)\/rulesets\/(.+)$/;
const VALID_SERVICES: RulesService[] = ['firestore', 'storage', 'database'];

export const RULES_RELEASE_NAME_FOR_SERVICE = {
  firestore: 'cloud.firestore',
  storage: 'firebase.storage',
};

export type RulesService = 'firestore' | 'storage' | 'database';

export interface Ruleset {
  /**
   * The UUID of the ruleset.
   */
  id: string;

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
   * ID of the ruleset associated with the release.
   */
  rulesetId: string;

  /**
   * Timestamp in ISO 8601 format.
   */
  createTime: string;

  /**
   * Timestamp in ISO 8601 format.
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

export function shortenReleaseName(name: string): string {
  const nameMatch = name.match(RELEASE_NAME_REGEX);

  if (!nameMatch) {
    throw new FirebaseProjectManagementError(
      'internal-error',
      'The rules release name has an unknown format: ' + name,
    );
  }

  return nameMatch[2];
}

export function shortenRulesetName(name: string): string {
  const nameMatch = name.match(RULESET_NAME_REGEX);

  if (!nameMatch) {
    throw new FirebaseProjectManagementError(
      'internal-error',
      'The ruleset name has an unknown format: ' + name,
    );
  }
  return nameMatch[2];
}

/**
 * Takes a release response and returns it with a shortened name.
 */
export function processReleaseResponse(
  releaseResponse: RulesReleaseResponse,
): RulesRelease {
  const { name, rulesetName, ...restRelease } = releaseResponse;
  return {
    name: shortenReleaseName(name),
    rulesetId: shortenRulesetName(rulesetName),
    ...restRelease,
  };
}

/**
 * Takes a ruleset response and returns it replacing its name with its id.
 */
export function processRulesetResponse(
  rulesetResponse: RulesetResponse,
): Ruleset;
export function processRulesetResponse(
  rulesetResponse: RulesetWithFilesResponse,
  withFiles: boolean,
): RulesetWithFiles;
export function processRulesetResponse(
  rulesetResponse: RulesetResponse | RulesetWithFilesResponse,
  withFiles = false,
): Ruleset | RulesetWithFiles {
  const { name, ...restResponse } = rulesetResponse;
  const ruleset: any = {
    id: shortenRulesetName(name),
    ...restResponse,
  };

  if (withFiles) {
    ruleset.files = (ruleset as RulesetWithFilesResponse).source.files;
    delete ruleset.source;
  }

  return ruleset;
}

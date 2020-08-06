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

import { HttpRequestConfig, HttpClient, HttpError, AuthorizedHttpClient } from '../utils/api-request';
import { PrefixedFirebaseError } from '../utils/error';
import { FirebaseSecurityRulesError, SecurityRulesErrorCode } from './security-rules-internal';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { FirebaseApp } from '../firebase-app';

const RULES_V1_API = 'https://firebaserules.googleapis.com/v1';
const FIREBASE_VERSION_HEADER = {
  'X-Firebase-Client': `fire-admin-node/${utils.getSdkVersion()}`,
};

export interface Release {
  readonly name: string;
  readonly rulesetName: string;
  readonly createTime?: string;
  readonly updateTime?: string;
}

export interface RulesetContent {
  readonly source: {
    readonly files: Array<{ name: string; content: string }>;
  };
}

export interface RulesetResponse extends RulesetContent {
  readonly name: string;
  readonly createTime: string;
}

export interface ListRulesetsResponse {
  readonly rulesets: Array<{ name: string; createTime: string }>;
  readonly nextPageToken?: string;
}

/**
 * Class that facilitates sending requests to the Firebase security rules backend API.
 *
 * @private
 */
export class SecurityRulesApiClient {

  private readonly httpClient: HttpClient;
  private projectIdPrefix?: string;

  constructor(private readonly app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument',
        'First argument passed to admin.securityRules() must be a valid Firebase app '
          + 'instance.');
    }

    this.httpClient = new AuthorizedHttpClient(app);
  }

  public getRuleset(name: string): Promise<RulesetResponse> {
    return Promise.resolve()
      .then(() => {
        return this.getRulesetName(name);
      })
      .then((rulesetName) => {
        return this.getResource<RulesetResponse>(rulesetName);
      });
  }

  public createRuleset(ruleset: RulesetContent): Promise<RulesetResponse> {
    if (!validator.isNonNullObject(ruleset) ||
      !validator.isNonNullObject(ruleset.source) ||
      !validator.isNonEmptyArray(ruleset.source.files)) {

      const err = new FirebaseSecurityRulesError('invalid-argument', 'Invalid rules content.');
      return Promise.reject(err);
    }

    for (const rf of ruleset.source.files) {
      if (!validator.isNonNullObject(rf) ||
        !validator.isNonEmptyString(rf.name) ||
        !validator.isNonEmptyString(rf.content)) {

        const err = new FirebaseSecurityRulesError(
          'invalid-argument', `Invalid rules file argument: ${JSON.stringify(rf)}`);
        return Promise.reject(err);
      }
    }

    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'POST',
          url: `${url}/rulesets`,
          data: ruleset,
        };
        return this.sendRequest<RulesetResponse>(request);
      });
  }

  public deleteRuleset(name: string): Promise<void> {
    return this.getUrl()
      .then((url) => {
        const rulesetName = this.getRulesetName(name);
        const request: HttpRequestConfig = {
          method: 'DELETE',
          url: `${url}/${rulesetName}`,
        };
        return this.sendRequest<void>(request);
      });
  }

  public listRulesets(pageSize = 100, pageToken?: string): Promise<ListRulesetsResponse> {
    if (!validator.isNumber(pageSize)) {
      const err = new FirebaseSecurityRulesError('invalid-argument', 'Invalid page size.');
      return Promise.reject(err);
    }
    if (pageSize < 1 || pageSize > 100) {
      const err = new FirebaseSecurityRulesError(
        'invalid-argument', 'Page size must be between 1 and 100.');
      return Promise.reject(err);
    }
    if (typeof pageToken !== 'undefined' && !validator.isNonEmptyString(pageToken)) {
      const err = new FirebaseSecurityRulesError(
        'invalid-argument', 'Next page token must be a non-empty string.');
      return Promise.reject(err);
    }

    const data = {
      pageSize,
      pageToken,
    };
    if (!pageToken) {
      delete data.pageToken;
    }

    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/rulesets`,
          data,
        };
        return this.sendRequest<ListRulesetsResponse>(request);
      });
  }

  public getRelease(name: string): Promise<Release> {
    return this.getResource<Release>(`releases/${name}`);
  }

  public updateRelease(name: string, rulesetName: string): Promise<Release> {
    return this.getUrl()
      .then((url) => {
        return this.getReleaseDescription(name, rulesetName)
          .then((release) => {
            const request: HttpRequestConfig = {
              method: 'PATCH',
              url: `${url}/releases/${name}`,
              data: { release },
            };
            return this.sendRequest<Release>(request);
          });
      });
  }

  private getUrl(): Promise<string> {
    return this.getProjectIdPrefix()
      .then((projectIdPrefix) => {
        return `${RULES_V1_API}/${projectIdPrefix}`;
      });
  }

  private getProjectIdPrefix(): Promise<string> {
    if (this.projectIdPrefix) {
      return Promise.resolve(this.projectIdPrefix);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseSecurityRulesError(
            'invalid-argument',
            'Failed to determine project ID. Initialize the SDK with service account credentials, or '
            + 'set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT '
            + 'environment variable.');
        }

        this.projectIdPrefix = `projects/${projectId}`;
        return this.projectIdPrefix;
      });
  }

  /**
   * Gets the specified resource from the rules API. Resource names must be the short names without project
   * ID prefix (e.g. `rulesets/ruleset-name`).
   *
   * @param {string} name Full qualified name of the resource to get.
   * @returns {Promise<T>} A promise that fulfills with the resource.
   */
  private getResource<T>(name: string): Promise<T> {
    return this.getUrl()
      .then((url) => {
        const request: HttpRequestConfig = {
          method: 'GET',
          url: `${url}/${name}`,
        };
        return this.sendRequest<T>(request);
      });
  }

  private getReleaseDescription(name: string, rulesetName: string): Promise<Release> {
    return this.getProjectIdPrefix()
      .then((projectIdPrefix) => {
        return {
          name: `${projectIdPrefix}/releases/${name}`,
          rulesetName: `${projectIdPrefix}/${this.getRulesetName(rulesetName)}`,
        };
      });
  }

  private getRulesetName(name: string): string {
    if (!validator.isNonEmptyString(name)) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument', 'Ruleset name must be a non-empty string.');
    }

    if (name.indexOf('/') !== -1) {
      throw new FirebaseSecurityRulesError(
        'invalid-argument', 'Ruleset name must not contain any "/" characters.');
    }

    return `rulesets/${name}`;
  }

  private sendRequest<T>(request: HttpRequestConfig): Promise<T> {
    request.headers = FIREBASE_VERSION_HEADER;
    return this.httpClient.send(request)
      .then((resp) => {
        return resp.data as T;
      })
      .catch((err) => {
        throw this.toFirebaseError(err);
      });
  }

  private toFirebaseError(err: HttpError): PrefixedFirebaseError {
    if (err instanceof PrefixedFirebaseError) {
      return err;
    }

    const response = err.response;
    if (!response.isJson()) {
      return new FirebaseSecurityRulesError(
        'unknown-error',
        `Unexpected response with status: ${response.status} and body: ${response.text}`);
    }

    const error: Error = (response.data as ErrorResponse).error || {};
    let code: SecurityRulesErrorCode = 'unknown-error';
    if (error.status && error.status in ERROR_CODE_MAPPING) {
      code = ERROR_CODE_MAPPING[error.status];
    }
    const message = error.message || `Unknown server error: ${response.text}`;
    return new FirebaseSecurityRulesError(code, message);
  }
}

interface ErrorResponse {
  error?: Error;
}

interface Error {
  code?: number;
  message?: string;
  status?: string;
}

const ERROR_CODE_MAPPING: { [key: string]: SecurityRulesErrorCode } = {
  INVALID_ARGUMENT: 'invalid-argument',
  NOT_FOUND: 'not-found',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  UNAUTHENTICATED: 'authentication-error',
  UNKNOWN: 'unknown-error',
};

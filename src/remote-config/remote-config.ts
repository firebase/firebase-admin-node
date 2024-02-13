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

import { App } from '../app';
import * as validator from '../utils/validator';
import { FirebaseRemoteConfigError, RemoteConfigApiClient } from './remote-config-api-client-internal';
import {
  ListVersionsOptions,
  ListVersionsResult,
  RemoteConfigCondition,
  RemoteConfigParameter,
  RemoteConfigParameterGroup,
  RemoteConfigServerTemplate,
  RemoteConfigTemplate,
  RemoteConfigUser,
  Version,
  ExplicitParameterValue,
  InAppDefaultValue,
  ParameterValueType,
  RemoteConfigServerConfig,
  RemoteConfigServerTemplateData
} from './remote-config-api';

/**
 * The Firebase `RemoteConfig` service interface.
 */
export class RemoteConfig {

  private readonly client: RemoteConfigApiClient;

  /**
   * An in-memory cache for the {@link RemoteConfigServerTemplate} of the project.
   */
  public cachedServerTemplate: RemoteConfigServerTemplate;


  /**
   * @param app - The app for this RemoteConfig service.
   * @constructor
   * @internal
   */
  constructor(readonly app: App) {
    this.client = new RemoteConfigApiClient(app);
  }

  /**
   * Gets the current active version of the {@link RemoteConfigTemplate} of the project.
   *
   * @returns A promise that fulfills with a `RemoteConfigTemplate`.
   */
  public getTemplate(): Promise<RemoteConfigTemplate> {
    return this.client.getTemplate()
      .then((templateResponse) => {
        return new RemoteConfigTemplateImpl(templateResponse);
      });
  }

  /**
   * Gets the requested version of the {@link RemoteConfigTemplate} of the project.
   *
   * @param versionNumber - Version number of the Remote Config template to look up.
   *
   * @returns A promise that fulfills with a `RemoteConfigTemplate`.
   */
  public getTemplateAtVersion(versionNumber: number | string): Promise<RemoteConfigTemplate> {
    return this.client.getTemplateAtVersion(versionNumber)
      .then((templateResponse) => {
        return new RemoteConfigTemplateImpl(templateResponse);
      });
  }

  /**
   * Validates a {@link RemoteConfigTemplate}.
   *
   * @param template - The Remote Config template to be validated.
   * @returns A promise that fulfills with the validated `RemoteConfigTemplate`.
   */
  public validateTemplate(template: RemoteConfigTemplate): Promise<RemoteConfigTemplate> {
    return this.client.validateTemplate(template)
      .then((templateResponse) => {
        return new RemoteConfigTemplateImpl(templateResponse);
      });
  }

  /**
   * Publishes a Remote Config template.
   *
   * @param template - The Remote Config template to be published.
   * @param options - Optional options object when publishing a Remote Config template:
   *    - `force`: Setting this to `true` forces the Remote Config template to
   *      be updated and circumvent the ETag. This approach is not recommended
   *      because it risks causing the loss of updates to your Remote Config
   *      template if multiple clients are updating the Remote Config template.
   *      See {@link https://firebase.google.com/docs/remote-config/use-config-rest#etag_usage_and_forced_updates |
   *      ETag usage and forced updates}.
   *
   * @returns A Promise that fulfills with the published `RemoteConfigTemplate`.
   */
  public publishTemplate(template: RemoteConfigTemplate, options?: { force: boolean }): Promise<RemoteConfigTemplate> {
    return this.client.publishTemplate(template, options)
      .then((templateResponse) => {
        return new RemoteConfigTemplateImpl(templateResponse);
      });
  }

  /**
   * Rolls back a project's published Remote Config template to the specified version.
   * A rollback is equivalent to getting a previously published Remote Config
   * template and re-publishing it using a force update.
   *
   * @param versionNumber - The version number of the Remote Config template to roll back to.
   *    The specified version number must be lower than the current version number, and not have
   *    been deleted due to staleness. Only the last 300 versions are stored.
   *    All versions that correspond to non-active Remote Config templates (that is, all except the
   *    template that is being fetched by clients) are also deleted if they are more than 90 days old.
   * @returns A promise that fulfills with the published `RemoteConfigTemplate`.
   */
  public rollback(versionNumber: number | string): Promise<RemoteConfigTemplate> {
    return this.client.rollback(versionNumber)
      .then((templateResponse) => {
        return new RemoteConfigTemplateImpl(templateResponse);
      });
  }

  /**
   * Gets a list of Remote Config template versions that have been published, sorted in reverse
   * chronological order. Only the last 300 versions are stored.
   * All versions that correspond to non-active Remote Config templates (i.e., all except the
   * template that is being fetched by clients) are also deleted if they are older than 90 days.
   *
   * @param options - Optional options object for getting a list of versions.
   * @returns A promise that fulfills with a `ListVersionsResult`.
   */
  public listVersions(options?: ListVersionsOptions): Promise<ListVersionsResult> {
    return this.client.listVersions(options)
      .then((listVersionsResponse) => {
        return {
          versions: listVersionsResponse.versions?.map(version => new VersionImpl(version)) ?? [],
          nextPageToken: listVersionsResponse.nextPageToken,
        }
      });
  }

  /**
   * Creates and returns a new Remote Config template from a JSON string.
   *
   * @param json - The JSON string to populate a Remote Config template.
   *
   * @returns A new template instance.
   */
  public createTemplateFromJSON(json: string): RemoteConfigTemplate {
    if (!validator.isNonEmptyString(json)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        'JSON string must be a valid non-empty string');
    }

    let template: RemoteConfigTemplate;
    try {
      template = JSON.parse(json);
    } catch (e) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Failed to parse the JSON string: ${json}. ` + e
      );
    }

    return new RemoteConfigTemplateImpl(template);
  }

  /**
   * Instantiates {@link RemoteConfigServerTemplate} and then fetches and caches the latest
   * template version of the project.
   */
  public async getServerTemplate(options?: {
    defaultConfig?: RemoteConfigServerConfig,
    template?: RemoteConfigServerTemplateData,
  }): Promise<RemoteConfigServerTemplate> {
    const template = this.initServerTemplate(options);
    await template.load();
    return template;
  }

  /**
   * Synchronously instantiates {@link RemoteConfigServerTemplate}.
   */
  public initServerTemplate(options?: {
    defaultConfig?: RemoteConfigServerConfig,
    template?: RemoteConfigServerTemplateData,
  }): RemoteConfigServerTemplate {
    const template = new RemoteConfigServerTemplateImpl(this.client, options?.defaultConfig);
    if (options?.template) {
      template.cache = options?.template;
    }
    return template;
  }
}

/**
 * Remote Config template internal implementation.
 */
class RemoteConfigTemplateImpl implements RemoteConfigTemplate {

  public parameters: { [key: string]: RemoteConfigParameter };
  public parameterGroups: { [key: string]: RemoteConfigParameterGroup };
  public conditions: RemoteConfigCondition[];
  private readonly etagInternal: string;
  public version?: Version;

  constructor(config: RemoteConfigTemplate) {
    if (!validator.isNonNullObject(config) ||
      !validator.isNonEmptyString(config.etag)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Invalid Remote Config template: ${JSON.stringify(config)}`);
    }

    this.etagInternal = config.etag;

    if (typeof config.parameters !== 'undefined') {
      if (!validator.isNonNullObject(config.parameters)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Remote Config parameters must be a non-null object');
      }
      this.parameters = config.parameters;
    } else {
      this.parameters = {};
    }

    if (typeof config.parameterGroups !== 'undefined') {
      if (!validator.isNonNullObject(config.parameterGroups)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Remote Config parameter groups must be a non-null object');
      }
      this.parameterGroups = config.parameterGroups;
    } else {
      this.parameterGroups = {};
    }

    if (typeof config.conditions !== 'undefined') {
      if (!validator.isArray(config.conditions)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Remote Config conditions must be an array');
      }
      this.conditions = config.conditions;
    } else {
      this.conditions = [];
    }

    if (typeof config.version !== 'undefined') {
      this.version = new VersionImpl(config.version);
    }
  }

  /**
   * Gets the ETag of the template.
   *
   * @returns The ETag of the Remote Config template.
   */
  get etag(): string {
    return this.etagInternal;
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    return {
      conditions: this.conditions,
      parameters: this.parameters,
      parameterGroups: this.parameterGroups,
      etag: this.etag,
      version: this.version,
    }
  }
}

/**
 * Remote Config data-plane template data implementation.
 */
class RemoteConfigServerTemplateImpl implements RemoteConfigServerTemplate {
  public cache: RemoteConfigServerTemplateData;

  constructor(
    private readonly apiClient: RemoteConfigApiClient,
    public readonly defaultConfig: RemoteConfigServerConfig = {}
  ) { }

  /**
   * Fetches and caches the current active version of the {@link RemoteConfigServerTemplate} of the project.
   */
  public load(): Promise<void> {
    return this.apiClient.getServerTemplate()
      .then((template) => {
        this.cache = new RemoteConfigServerTemplateDataImpl(template);
      });
  }

  /**
   * Evaluates the current template in cache to produce a {@link RemoteConfigServerConfig}
   */
  public evaluate(): RemoteConfigServerConfig {
    if (!this.cache) {
      throw new FirebaseRemoteConfigError(
        'failed-precondition',
        'No Remote Config Server template in cache. Call load() before calling evaluate().');
    }

    const renderedConfig: RemoteConfigServerConfig = {};

    for (const [key, parameter] of Object.entries(this.cache.parameters)) {
      const { defaultValue, valueType } = parameter;

      if (!defaultValue) {
        console.debug(`Filtering out parameter ${key} with no default value`);
        continue;
      }

      if ((defaultValue as InAppDefaultValue).useInAppDefault) {
        console.debug(`Filtering out parameter ${key} with "use in-app default" value`);
        continue;
      }

      const parameterDefaultValue = (defaultValue as ExplicitParameterValue).value;

      renderedConfig[key] = this.parseRemoteConfigParameterValue(valueType, parameterDefaultValue);
    }

    // Merges rendered config over default config.
    const mergedConfig = Object.assign(this.defaultConfig, renderedConfig);

    // Enables config to be a convenient object, but with the ability to perform additional
    // functionality when a value is retrieved.
    const proxyHandler = {
      get(target: RemoteConfigServerConfig, prop: string) {
        return target[prop];
      }
    };

    return new Proxy(mergedConfig, proxyHandler);
  }

  /**
   * Private helper method to process and parse a parameter value based on {@link ParameterValueType}
   */
  private parseRemoteConfigParameterValue(parameterType: ParameterValueType | undefined,
    parameterDefaultValue: string): string | number | boolean {
    const BOOLEAN_TRUTHY_VALUES = ['1', 'true', 't', 'yes', 'y', 'on'];
    const DEFAULT_VALUE_FOR_NUMBER = 0;
    const DEFAULT_VALUE_FOR_STRING = '';

    if (parameterType === 'BOOLEAN') {
      return BOOLEAN_TRUTHY_VALUES.indexOf(parameterDefaultValue) >= 0;
    } else if (parameterType === 'NUMBER') {
      const num = Number(parameterDefaultValue);
      if (isNaN(num)) {
        return DEFAULT_VALUE_FOR_NUMBER;
      }
      return num;
    } else {
      // Treat everything else as string
      return parameterDefaultValue || DEFAULT_VALUE_FOR_STRING;
    }
  }
}

/**
 * Remote Config data-plane template data implementation.
 */
class RemoteConfigServerTemplateDataImpl implements RemoteConfigServerTemplateData {
  public parameters: { [key: string]: RemoteConfigParameter };
  public parameterGroups: { [key: string]: RemoteConfigParameterGroup };
  public conditions: RemoteConfigCondition[];
  public readonly etag: string;
  public version?: Version;

  constructor(template: RemoteConfigServerTemplateData) {
    if (!validator.isNonNullObject(template) ||
      !validator.isNonEmptyString(template.etag)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Invalid Remote Config template: ${JSON.stringify(template)}`);
    }

    this.etag = template.etag;

    if (typeof template.parameters !== 'undefined') {
      if (!validator.isNonNullObject(template.parameters)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Remote Config parameters must be a non-null object');
      }
      this.parameters = template.parameters;
    } else {
      this.parameters = {};
    }

    if (typeof template.conditions !== 'undefined') {
      if (!validator.isArray(template.conditions)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Remote Config conditions must be an array');
      }
      this.conditions = template.conditions;
    } else {
      this.conditions = [];
    }

    if (typeof template.version !== 'undefined') {
      this.version = new VersionImpl(template.version);
    }
  }
}

/**
* Remote Config Version internal implementation.
*/
class VersionImpl implements Version {
  public readonly versionNumber?: string; // int64 format
  public readonly updateTime?: string; // in UTC
  public readonly updateOrigin?: ('REMOTE_CONFIG_UPDATE_ORIGIN_UNSPECIFIED' | 'CONSOLE' |
    'REST_API' | 'ADMIN_SDK_NODE');
  public readonly updateType?: ('REMOTE_CONFIG_UPDATE_TYPE_UNSPECIFIED' |
    'INCREMENTAL_UPDATE' | 'FORCED_UPDATE' | 'ROLLBACK');
  public readonly updateUser?: RemoteConfigUser;
  public readonly description?: string;
  public readonly rollbackSource?: string;
  public readonly isLegacy?: boolean;

  constructor(version: Version) {
    if (!validator.isNonNullObject(version)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Invalid Remote Config version instance: ${JSON.stringify(version)}`);
    }

    if (typeof version.versionNumber !== 'undefined') {
      if (!validator.isNonEmptyString(version.versionNumber) &&
        !validator.isNumber(version.versionNumber)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version number must be a non-empty string in int64 format or a number');
      }
      if (!Number.isInteger(Number(version.versionNumber))) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version number must be an integer or a string in int64 format');
      }
      this.versionNumber = version.versionNumber;
    }

    if (typeof version.updateOrigin !== 'undefined') {
      if (!validator.isNonEmptyString(version.updateOrigin)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version update origin must be a non-empty string');
      }
      this.updateOrigin = version.updateOrigin;
    }

    if (typeof version.updateType !== 'undefined') {
      if (!validator.isNonEmptyString(version.updateType)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version update type must be a non-empty string');
      }
      this.updateType = version.updateType;
    }

    if (typeof version.updateUser !== 'undefined') {
      if (!validator.isNonNullObject(version.updateUser)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version update user must be a non-null object');
      }
      this.updateUser = version.updateUser;
    }

    if (typeof version.description !== 'undefined') {
      if (!validator.isNonEmptyString(version.description)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version description must be a non-empty string');
      }
      this.description = version.description;
    }

    if (typeof version.rollbackSource !== 'undefined') {
      if (!validator.isNonEmptyString(version.rollbackSource)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version rollback source must be a non-empty string');
      }
      this.rollbackSource = version.rollbackSource;
    }

    if (typeof version.isLegacy !== 'undefined') {
      if (!validator.isBoolean(version.isLegacy)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version.isLegacy must be a boolean');
      }
      this.isLegacy = version.isLegacy;
    }

    // The backend API provides timestamps in ISO date strings. The Admin SDK exposes timestamps
    // in UTC date strings. If a developer uses a previously obtained template with UTC timestamps
    // we could still validate it below.
    if (typeof version.updateTime !== 'undefined') {
      if (!this.isValidTimestamp(version.updateTime)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          'Version update time must be a valid date string');
      }
      this.updateTime = new Date(version.updateTime).toUTCString();
    }
  }

  /**
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    return {
      versionNumber: this.versionNumber,
      updateOrigin: this.updateOrigin,
      updateType: this.updateType,
      updateUser: this.updateUser,
      description: this.description,
      rollbackSource: this.rollbackSource,
      isLegacy: this.isLegacy,
      updateTime: this.updateTime,
    }
  }

  private isValidTimestamp(timestamp: string): boolean {
    // This validation fails for timestamps earlier than January 1, 1970 and considers strings
    // such as "1.2" as valid timestamps.
    return validator.isNonEmptyString(timestamp) && (new Date(timestamp)).getTime() > 0;
  }
}

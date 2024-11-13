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
import { ConditionEvaluator } from './condition-evaluator-internal';
import { ValueImpl } from './internal/value-impl';
import {
  ListVersionsOptions,
  ListVersionsResult,
  RemoteConfigCondition,
  RemoteConfigParameter,
  RemoteConfigParameterGroup,
  ServerTemplate,
  RemoteConfigTemplate,
  RemoteConfigUser,
  Version,
  ExplicitParameterValue,
  InAppDefaultValue,
  ServerConfig,
  RemoteConfigParameterValue,
  EvaluationContext,
  ServerTemplateData,
  NamedCondition,
  Value,
  DefaultConfig,
  GetServerTemplateOptions,
  InitServerTemplateOptions,
  ServerTemplateDataType,
  FetchResponse,
} from './remote-config-api';

/**
 * The Firebase `RemoteConfig` service interface.
 */
export class RemoteConfig {

  private readonly client: RemoteConfigApiClient;

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
   * Instantiates {@link ServerTemplate} and then fetches and caches the latest
   * template version of the project.
   */
  public async getServerTemplate(options?: GetServerTemplateOptions): Promise<ServerTemplate> {
    const template = this.initServerTemplate(options);
    await template.load();
    return template;
  }

  /**
   * Synchronously instantiates {@link ServerTemplate}.
   */
  public initServerTemplate(options?: InitServerTemplateOptions): ServerTemplate {
    const template = new ServerTemplateImpl(
      this.client, new ConditionEvaluator(), options?.defaultConfig);

    if (options?.template) {
      template.set(options?.template);
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
 * Remote Config dataplane template data implementation.
 */
class ServerTemplateImpl implements ServerTemplate {
  private cache: ServerTemplateData;
  private stringifiedDefaultConfig: {[key: string]: string} = {};

  constructor(
    private readonly apiClient: RemoteConfigApiClient,
    private readonly conditionEvaluator: ConditionEvaluator,
    public readonly defaultConfig: DefaultConfig = {}
  ) {
    // RC stores all remote values as string, but it's more intuitive
    // to declare default values with specific types, so this converts
    // the external declaration to an internal string representation.
    for (const key in defaultConfig) {
      this.stringifiedDefaultConfig[key] = String(defaultConfig[key]);
    }
  }

  /**
   * Fetches and caches the current active version of the project's {@link ServerTemplate}.
   */
  public load(): Promise<void> {
    return this.apiClient.getServerTemplate()
      .then((template) => {
        this.cache = new ServerTemplateDataImpl(template);
      });
  }

  /**
   * Parses a {@link ServerTemplateDataType} and caches it.
   */
  public set(template: ServerTemplateDataType): void {
    let parsed;
    if (validator.isString(template)) {
      try {
        parsed = JSON.parse(template);
      } catch (e) {
        // Transforms JSON parse errors to Firebase error.
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          `Failed to parse the JSON string: ${template}. ` + e);
      }
    } else {
      parsed = template;
    }
    // Throws template parse errors.
    this.cache = new ServerTemplateDataImpl(parsed);
  }

  /**
   * Evaluates the current template in cache to produce a {@link ServerConfig}.
   */
  public evaluate(context: EvaluationContext = {}): ServerConfig {
    if (!this.cache) {

      // This is the only place we should throw during evaluation, since it's under the
      // control of application logic. To preserve forward-compatibility, we should only
      // return false in cases where the SDK is unsure how to evaluate the fetched template.
      throw new FirebaseRemoteConfigError(
        'failed-precondition',
        'No Remote Config Server template in cache. Call load() before calling evaluate().');
    }

    const evaluatedConditions = this.conditionEvaluator.evaluateConditions(
      this.cache.conditions, context);

    const configValues: { [key: string]: Value } = {};

    // Initializes config Value objects with default values.
    for (const key in this.stringifiedDefaultConfig) {
      configValues[key] = new ValueImpl('default', this.stringifiedDefaultConfig[key]);
    }

    // Overlays config Value objects derived by evaluating the template.
    for (const [key, parameter] of Object.entries(this.cache.parameters)) {
      const { conditionalValues, defaultValue } = parameter;

      // Supports parameters with no conditional values.
      const normalizedConditionalValues = conditionalValues || {};

      let parameterValueWrapper: RemoteConfigParameterValue | undefined = undefined;

      // Iterates in order over condition list. If there is a value associated
      // with a condition, this checks if the condition is true.
      for (const [conditionName, conditionEvaluation] of evaluatedConditions) {
        if (normalizedConditionalValues[conditionName] && conditionEvaluation) {
          parameterValueWrapper = normalizedConditionalValues[conditionName];
          break;
        }
      }

      if (parameterValueWrapper && (parameterValueWrapper as InAppDefaultValue).useInAppDefault) {
        // TODO: add logging once we have a wrapped logger.
        continue;
      }

      if (parameterValueWrapper) {
        const parameterValue = (parameterValueWrapper as ExplicitParameterValue).value;
        configValues[key] = new ValueImpl('remote', parameterValue);
        continue;
      }

      if (!defaultValue) {
        // TODO: add logging once we have a wrapped logger.
        continue;
      }

      if ((defaultValue as InAppDefaultValue).useInAppDefault) {
        // TODO: add logging once we have a wrapped logger.
        continue;
      }

      const parameterDefaultValue = (defaultValue as ExplicitParameterValue).value;
      configValues[key] = new ValueImpl('remote', parameterDefaultValue);
    }

    return new ServerConfigImpl(configValues);
  }

  /**
   * @returns JSON representation of the server template
   */
  public toJSON(): ServerTemplateData {
    return this.cache;
  }
}

class ServerConfigImpl implements ServerConfig {
  constructor(
    private readonly configValues: { [key: string]: Value },
  ){}
  getBoolean(key: string): boolean {
    return this.getValue(key).asBoolean();
  }
  getNumber(key: string): number {
    return this.getValue(key).asNumber();
  }
  getString(key: string): string {
    return this.getValue(key).asString();
  }
  getValue(key: string): Value {
    return this.configValues[key] || new ValueImpl('static');
  }
  serializeForClient(): FetchResponse {
    const config: {[key:string]:string} = {};
    for (const [param, value] of Object.entries(this.configValues)) {
      config[param] = value.asString();
    }
    return  {
      status: 200,
      eTag: `etag-${Math.floor(Math.random() * 100000)}`,
      config,
    };
  }
}

/**
 * Remote Config dataplane template data implementation.
 */
class ServerTemplateDataImpl implements ServerTemplateData {
  public parameters: { [key: string]: RemoteConfigParameter };
  public parameterGroups: { [key: string]: RemoteConfigParameterGroup };
  public conditions: NamedCondition[];
  public readonly etag: string;
  public version?: Version;

  constructor(template: ServerTemplateData) {
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

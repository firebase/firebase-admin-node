/*!
 * Copyright 2021 Google Inc.
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

/**
 * Colors that are associated with conditions for display purposes.
 */
export type TagColor = 'BLUE' | 'BROWN' | 'CYAN' | 'DEEP_ORANGE' | 'GREEN' |
  'INDIGO' | 'LIME' | 'ORANGE' | 'PINK' | 'PURPLE' | 'TEAL';

/**
 * Type representing a Remote Config parameter value data type.
 * Defaults to `STRING` if unspecified.
 */
export type ParameterValueType = 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON'

/**
 * Interface representing a Remote Config condition.
 * A condition targets a specific group of users. A list of these conditions make up
 * part of a Remote Config template.
 */
export interface RemoteConfigCondition {

  /**
   * A non-empty and unique name of this condition.
   */
  name: string;

  /**
   * The logic of this condition.
   * See the documentation on
   * {@link https://firebase.google.com/docs/remote-config/condition-reference | condition expressions}
   * for the expected syntax of this field.
   */
  expression: string;

  /**
   * The color associated with this condition for display purposes in the Firebase Console.
   * Not specifying this value results in the console picking an arbitrary color to associate
   * with the condition.
   */
  tagColor?: TagColor;
}

/**
 * Represents a Remote Config condition in the dataplane.
 * A condition targets a specific group of users. A list of these conditions
 * comprise part of a Remote Config template.
 */
export interface NamedCondition {

  /**
   * A non-empty and unique name of this condition.
   */
  name: string;

  /**
   * The logic of this condition.
   * See the documentation on
   * {@link https://firebase.google.com/docs/remote-config/condition-reference | condition expressions}
   * for the expected syntax of this field.
   */
  condition: OneOfCondition;
}

/**
 * Represents a condition that may be one of several types.
 * Only the first defined field will be processed.
 */
export interface OneOfCondition {

  /**
   * Makes this condition an OR condition.
   */
  orCondition?: OrCondition;

  /**
   * Makes this condition an AND condition.
   */
  andCondition?: AndCondition;

  /**
   * Makes this condition a constant true.
   */
  true?: Record<string, never>;

  /**
   * Makes this condition a constant false.
   */
  false?: Record<string, never>;

  /**
   * Makes this condition a percent condition.
   */
  percent?: PercentCondition;
}

/**
 * Represents a collection of conditions that evaluate to true if all are true.
 */
export interface AndCondition {

  /**
   * The collection of conditions.
   */
  conditions?: Array<OneOfCondition>;
}

/**
 * Represents a collection of conditions that evaluate to true if any are true.
 */
export interface OrCondition {

  /**
   * The collection of conditions.
   */
  conditions?: Array<OneOfCondition>;
}

/**
 * Defines supported operators for percent conditions.
 */
export enum PercentConditionOperator {

  /**
   * A catchall error case.
   */
  UNKNOWN = 'UNKNOWN',

  /**
   * Target percentiles less than or equal to the target percent.
   * A condition using this operator must specify microPercent.
   */
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',

  /**
   * Target percentiles greater than the target percent.
   * A condition using this operator must specify microPercent.
   */
  GREATER_THAN = 'GREATER_THAN',

  /**
   * Target percentiles within an interval defined by a lower bound and an
   * upper bound. The lower bound is an exclusive (open) bound and the
   * micro_percent_range_upper_bound is an inclusive (closed) bound.
   * A condition using this operator must specify microPercentRange.
   */
  BETWEEN = 'BETWEEN'
}

/**
 * Represents the limit of percentiles to target in micro-percents.
 * The value must be in the range [0 and 100000000]
 */
export interface MicroPercentRange {

  /**
   * The lower limit of percentiles to target in micro-percents.
   * The value must be in the range [0 and 100000000].
   */
  microPercentLowerBound?: number;

  /**
   * The upper limit of percentiles to target in micro-percents.
   * The value must be in the range [0 and 100000000].
   */
  microPercentUpperBound?: number;
}

/**
 * Represents a condition that compares the instance pseudo-random
 * percentile to a given limit.
 */
export interface PercentCondition {

  /**
   * The choice of percent operator to determine how to compare targets
   * to percent(s).
   */
  percentOperator?: PercentConditionOperator;

  /**
   * The limit of percentiles to target in micro-percents when
   * using the LESS_OR_EQUAL and GREATER_THAN operators. The value must
   * be in the range [0 and 100000000].
   */
  microPercent?: number;

  /**
   * The seed used when evaluating the hash function to map an instance to
   * a value in the hash space. This is a string which can have 0 - 32
   * characters and can contain ASCII characters [-_.0-9a-zA-Z].The string
   * is case-sensitive.
   */
  seed?: string;

  /**
   * The micro-percent interval to be used with the
   * BETWEEN operator.
   */
  microPercentRange?: MicroPercentRange;
}

/**
 * Interface representing an explicit parameter value.
 */
export interface ExplicitParameterValue {
  /**
   * The `string` value that the parameter is set to.
   */
  value: string;
}

/**
 * Interface representing an in-app-default value.
 */
export interface InAppDefaultValue {
  /**
   * If `true`, the parameter is omitted from the parameter values returned to a client.
   */
  useInAppDefault: boolean;
}

/**
 * Type representing a Remote Config parameter value.
 * A `RemoteConfigParameterValue` could be either an `ExplicitParameterValue` or
 * an `InAppDefaultValue`.
 */
export type RemoteConfigParameterValue = ExplicitParameterValue | InAppDefaultValue;

/**
 * Interface representing a Remote Config parameter.
 * At minimum, a `defaultValue` or a `conditionalValues` entry must be present for the
 * parameter to have any effect.
 */
export interface RemoteConfigParameter {

  /**
   * The value to set the parameter to, when none of the named conditions evaluate to `true`.
   */
  defaultValue?: RemoteConfigParameterValue;

  /**
   * A `(condition name, value)` map. The condition name of the highest priority
   * (the one listed first in the Remote Config template's conditions list) determines the value of
   * this parameter.
   */
  conditionalValues?: { [key: string]: RemoteConfigParameterValue };

  /**
   * A description for this parameter. Should not be over 100 characters and may contain any
   * Unicode characters.
   */
  description?: string;

  /**
   * The data type for all values of this parameter in the current version of the template.
   * Defaults to `ParameterValueType.STRING` if unspecified.
   */
  valueType?: ParameterValueType;
}

/**
 * Interface representing a Remote Config parameter group.
 * Grouping parameters is only for management purposes and does not affect client-side
 * fetching of parameter values.
 */
export interface RemoteConfigParameterGroup {
  /**
   * A description for the group. Its length must be less than or equal to 256 characters.
   * A description may contain any Unicode characters.
   */
  description?: string;

  /**
   * Map of parameter keys to their optional default values and optional conditional values for
   * parameters that belong to this group. A parameter only appears once per
   * Remote Config template. An ungrouped parameter appears at the top level, whereas a
   * parameter organized within a group appears within its group's map of parameters.
   */
  parameters: { [key: string]: RemoteConfigParameter };
}

/**
 * Represents a Remote Config client template.
 */
export interface RemoteConfigTemplate {
  /**
   * A list of conditions in descending order by priority.
   */
  conditions: RemoteConfigCondition[];

  /**
   * Map of parameter keys to their optional default values and optional conditional values.
   */
  parameters: { [key: string]: RemoteConfigParameter };

  /**
   * Map of parameter group names to their parameter group objects.
   * A group's name is mutable but must be unique among groups in the Remote Config template.
   * The name is limited to 256 characters and intended to be human-readable. Any Unicode
   * characters are allowed.
   */
  parameterGroups: { [key: string]: RemoteConfigParameterGroup };

  /**
   * ETag of the current Remote Config template (readonly).
   */
  readonly etag: string;

  /**
   * Version information for the current Remote Config template.
   */
  version?: Version;
}

/**
 * Represents the data in a Remote Config server template.
 */
export interface ServerTemplateData {
  /**
   * A list of conditions in descending order by priority.
   */
  conditions: NamedCondition[];

  /**
   * Map of parameter keys to their optional default values and optional conditional values.
   */
  parameters: { [key: string]: RemoteConfigParameter };

  /**
   * Current Remote Config template ETag (read-only).
   */
  readonly etag: string;

  /**
   * Version information for the current Remote Config template.
   */
  version?: Version;
}

/**
 * Represents optional arguments that can be used when instantiating {@link ServerTemplate}.
 */
export interface GetServerTemplateOptions {

  /**
   * Defines in-app default parameter values, so that your app behaves as
   * intended before it connects to the Remote Config backend, and so that
   * default values are available if none are set on the backend.
   */
  defaultConfig?: DefaultConfig;
}

/**
 * Represents the type of a Remote Config server template that can be set on
 * {@link ServerTemplate}. This can either be a {@link ServerTemplateData} object
 * or a template JSON string.
 */
export type ServerTemplateDataType = ServerTemplateData | string;

/**
 * Represents optional arguments that can be used when instantiating
 * {@link ServerTemplate} synchronously.
 */
export interface InitServerTemplateOptions extends GetServerTemplateOptions {

  /**
   * Enables integrations to use template data loaded independently. For
   * example, customers can reduce initialization latency by pre-fetching and
   * caching template data and then using this option to initialize the SDK with
   * that data.
   */
  template?: ServerTemplateDataType,
}

/**
 * Represents a stateful abstraction for a Remote Config server template.
 */
export interface ServerTemplate {
  /**
   * Evaluates the current template to produce a {@link ServerConfig}.
   */
  evaluate(context?: EvaluationContext): ServerConfig;

  /**
   * Fetches and caches the current active version of the
   * project's {@link ServerTemplate}.
   */
  load(): Promise<void>;

  /**
   * Sets and caches a {@link ServerTemplateData} or a JSON string representing
   * the server template
   */
  set(template: ServerTemplateDataType): void;

  /**
   * Returns a JSON representation of {@link ServerTemplateData}
   */
  toJSON(): ServerTemplateData;
}

/**
 * Represents template evaluation input signals.
 */
export type EvaluationContext = {

  /**
   * Defines the identifier to use when splitting a group. For example,
   * this is used by the percent condition.
   */
  randomizationId?: string
};

/**
 * Interface representing a Remote Config user.
 */
export interface RemoteConfigUser {
  /**
   * Email address. Output only.
   */
  email: string;

  /**
   * Display name. Output only.
   */
  name?: string;

  /**
   * Image URL. Output only.
   */
  imageUrl?: string;
}

/**
 * Interface representing a Remote Config template version.
 * Output only, except for the version description. Contains metadata about a particular
 * version of the Remote Config template. All fields are set at the time the specified Remote
 * Config template is published. A version's description field may be specified in
 * `publishTemplate` calls.
 */
export interface Version {
  /**
   * The version number of a Remote Config template.
   */
  versionNumber?: string;

  /**
   * The timestamp of when this version of the Remote Config template was written to the
   * Remote Config backend.
   */
  updateTime?: string;

  /**
   * The origin of the template update action.
   */
  updateOrigin?: ('REMOTE_CONFIG_UPDATE_ORIGIN_UNSPECIFIED' | 'CONSOLE' |
    'REST_API' | 'ADMIN_SDK_NODE');

  /**
   * The type of the template update action.
   */
  updateType?: ('REMOTE_CONFIG_UPDATE_TYPE_UNSPECIFIED' |
    'INCREMENTAL_UPDATE' | 'FORCED_UPDATE' | 'ROLLBACK');

  /**
   * Aggregation of all metadata fields about the account that performed the update.
   */
  updateUser?: RemoteConfigUser;

  /**
   * The user-provided description of the corresponding Remote Config template.
   */
  description?: string;

  /**
   * The version number of the Remote Config template that has become the current version
   * due to a rollback. Only present if this version is the result of a rollback.
   */
  rollbackSource?: string;

  /**
   * Indicates whether this Remote Config template was published before version history was
   * supported.
   */
  isLegacy?: boolean;
}

/**
 * Interface representing a list of Remote Config template versions.
 */
export interface ListVersionsResult {
  /**
   * A list of version metadata objects, sorted in reverse chronological order.
   */
  versions: Version[];

  /**
   * Token to retrieve the next page of results, or empty if there are no more results
   * in the list.
   */
  nextPageToken?: string;
}

/**
 * Interface representing options for Remote Config list versions operation.
 */
export interface ListVersionsOptions {
  /**
   * The maximum number of items to return per page.
   */
  pageSize?: number;

  /**
   * The `nextPageToken` value returned from a previous list versions request, if any.
   */
  pageToken?: string;

  /**
   * Specifies the newest version number to include in the results.
   * If specified, must be greater than zero. Defaults to the newest version.
   */
  endVersionNumber?: string | number;

  /**
   * Specifies the earliest update time to include in the results. Any entries updated before this
   * time are omitted.
   */
  startTime?: Date | string;

  /**
   * Specifies the latest update time to include in the results. Any entries updated on or after
   * this time are omitted.
   */
  endTime?: Date | string;
}

/**
 * Represents the configuration produced by evaluating a server template.
 */
export interface ServerConfig {

  /**
   * Gets the value for the given key as a boolean.
   *
   * Convenience method for calling <code>serverConfig.getValue(key).asBoolean()</code>.
   *
   * @param key - The name of the parameter.
   *
   * @returns The value for the given key as a boolean.
   */
  getBoolean(key: string): boolean;

  /**
   * Gets the value for the given key as a number.
   *
   * Convenience method for calling <code>serverConfig.getValue(key).asNumber()</code>.
   *
   * @param key - The name of the parameter.
   *
   * @returns The value for the given key as a number.
   */
  getNumber(key: string): number;

  /**
   * Gets the value for the given key as a string.
   * Convenience method for calling <code>serverConfig.getValue(key).asString()</code>.
   *
   * @param key - The name of the parameter.
   *
   * @returns The value for the given key as a string.
   */
  getString(key: string): string;

  /**
   * Gets the {@link Value} for the given key.
   *
   * Ensures application logic will always have a type-safe reference,
   * even if the parameter is removed remotely.
   *
   * @param key - The name of the parameter.
   *
   * @returns The value for the given key.
   */
  getValue(key: string): Value;
}

/**
 * Wraps a parameter value with metadata and type-safe getters.
 *
 * Type-safe getters insulate application logic from remote
 * changes to parameter names and types.
 */
export interface Value {

  /**
   * Gets the value as a boolean.
   *
   * The following values (case insensitive) are interpreted as true:
   * "1", "true", "t", "yes", "y", "on". Other values are interpreted as false.
   */
  asBoolean(): boolean;

  /**
   * Gets the value as a number. Comparable to calling <code>Number(value) || 0</code>.
   */
  asNumber(): number;

  /**
   * Gets the value as a string.
   */
  asString(): string;

  /**
   * Gets the {@link ValueSource} for the given key.
   */
  getSource(): ValueSource;
}

/**
 * Indicates the source of a value.
 *
 * <ul>
 *   <li>"static" indicates the value was defined by a static constant.</li>
 *   <li>"default" indicates the value was defined by default config.</li>
 *   <li>"remote" indicates the value was defined by config produced by
 *   evaluating a template.</li>
 * </ul>
 */
export type ValueSource = 'static' | 'default' | 'remote';

/**
 * Defines the format for in-app default parameter values.
 */
export type DefaultConfig = { [key: string]: string | number | boolean };

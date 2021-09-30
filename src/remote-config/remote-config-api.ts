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
 * Interface representing a Remote Config template.
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

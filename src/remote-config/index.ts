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

import { app } from '../firebase-namespace-api';

/**
 * Gets the {@link remoteConfig.RemoteConfig `RemoteConfig`} service for the
 * default app or a given app.
 *
 * `admin.remoteConfig()` can be called with no arguments to access the default
 * app's {@link remoteConfig.RemoteConfig `RemoteConfig`} service or as
 * `admin.remoteConfig(app)` to access the
 * {@link remoteConfig.RemoteConfig `RemoteConfig`} service associated with a
 * specific app.
 *
 * @example
 * ```javascript
 * // Get the `RemoteConfig` service for the default app
 * var defaultRemoteConfig = admin.remoteConfig();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `RemoteConfig` service for a given app
 * var otherRemoteConfig = admin.remoteConfig(otherApp);
 * ```
 *
 * @param app Optional app for which to return the `RemoteConfig` service.
 *   If not provided, the default `RemoteConfig` service is returned.
 *
 * @return The default `RemoteConfig` service if no
 *   app is provided, or the `RemoteConfig` service associated with the provided
 *   app.
 */
export declare function remoteConfig(app?: app.App): remoteConfig.RemoteConfig;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace remoteConfig {
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
     * {@link https://firebase.google.com/docs/remote-config/condition-reference condition expressions}
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
   * Colors that are associated with conditions for display purposes.
   */
  export type TagColor = 'BLUE' | 'BROWN' | 'CYAN' | 'DEEP_ORANGE' | 'GREEN' |
    'INDIGO' | 'LIME' | 'ORANGE' | 'PINK' | 'PURPLE' | 'TEAL';

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
   * The Firebase `RemoteConfig` service interface.
   */
  export interface RemoteConfig {
    app: app.App;

    /**
     * Gets the current active version of the {@link remoteConfig.RemoteConfigTemplate
     * `RemoteConfigTemplate`} of the project.
     *
     * @return A promise that fulfills with a `RemoteConfigTemplate`.
     */
    getTemplate(): Promise<RemoteConfigTemplate>;

    /**
     * Gets the requested version of the {@link remoteConfig.RemoteConfigTemplate
     * `RemoteConfigTemplate`} of the project.
     *
     * @param versionNumber Version number of the Remote Config template to look up.
     *
     * @return A promise that fulfills with a `RemoteConfigTemplate`.
     */
    getTemplateAtVersion(versionNumber: number | string): Promise<RemoteConfigTemplate>;

    /**
     * Validates a {@link remoteConfig.RemoteConfigTemplate `RemoteConfigTemplate`}.
     *
     * @param template The Remote Config template to be validated.
     * @returns A promise that fulfills with the validated `RemoteConfigTemplate`.
     */
    validateTemplate(template: RemoteConfigTemplate): Promise<RemoteConfigTemplate>;

    /**
     * Publishes a Remote Config template.
     *
     * @param template The Remote Config template to be published.
     * @param options Optional options object when publishing a Remote Config template:
     *    - {boolean} `force` Setting this to `true` forces the Remote Config template to
     *      be updated and circumvent the ETag. This approach is not recommended
     *      because it risks causing the loss of updates to your Remote Config
     *      template if multiple clients are updating the Remote Config template.
     *      See {@link https://firebase.google.com/docs/remote-config/use-config-rest#etag_usage_and_forced_updates
     *      ETag usage and forced updates}.
     *
     * @return A Promise that fulfills with the published `RemoteConfigTemplate`.
     */
    publishTemplate(template: RemoteConfigTemplate, options?: { force: boolean }): Promise<RemoteConfigTemplate>;

    /**
    * Rolls back a project's published Remote Config template to the specified version.
    * A rollback is equivalent to getting a previously published Remote Config
    * template and re-publishing it using a force update.
    *
    * @param versionNumber The version number of the Remote Config template to roll back to.
    *    The specified version number must be lower than the current version number, and not have
    *    been deleted due to staleness. Only the last 300 versions are stored.
    *    All versions that correspond to non-active Remote Config templates (that is, all except the
    *    template that is being fetched by clients) are also deleted if they are more than 90 days old.
    * @return A promise that fulfills with the published `RemoteConfigTemplate`.
    */
    rollback(versionNumber: string | number): Promise<RemoteConfigTemplate>;

    /**
    * Gets a list of Remote Config template versions that have been published, sorted in reverse
    * chronological order. Only the last 300 versions are stored.
    * All versions that correspond to non-active Remote Config templates (that is, all except the
    * template that is being fetched by clients) are also deleted if they are more than 90 days old.
    *
    * @param options Optional {@link remoteConfig.ListVersionsOptions `ListVersionsOptions`}
    *    object for getting a list of template versions.
    * @return A promise that fulfills with a `ListVersionsResult`.
    */
    listVersions(options?: ListVersionsOptions): Promise<ListVersionsResult>;

    /**
     * Creates and returns a new Remote Config template from a JSON string.
     *
     * @param json The JSON string to populate a Remote Config template.
     *
     * @return A new template instance.
     */
    createTemplateFromJSON(json: string): RemoteConfigTemplate;
  }
}

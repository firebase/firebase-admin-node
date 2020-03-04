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

import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { FirebaseApp } from '../firebase-app';
import * as validator from '../utils/validator';
import { FirebaseRemoteConfigError } from './remote-config-utils';
import {
  RemoteConfigApiClient,
  RemoteConfigResponse,
  RemoteConfigParameter
} from './remote-config-api-client';

/** Interface representing a Remote Config condition. */
export interface RemoteConfigCondition {
  name: string;
  expression: string;
  color?: string;
}

/**
 * Internals of an RemoteConfig service instance.
 */
class RemoteConfigInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up
    return Promise.resolve(undefined);
  }
}

/**
 * Remote Config service bound to the provided app.
 */
export class RemoteConfig implements FirebaseServiceInterface {
  public readonly INTERNAL: RemoteConfigInternals = new RemoteConfigInternals();

  private readonly client: RemoteConfigApiClient;

  /**
   * @param {FirebaseApp} app The app for this RemoteConfig service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    this.client = new RemoteConfigApiClient(app);
  }

  /**
  * Gets the current active version of the Remote Config template of the project.
  *
  * @return {Promise<RemoteConfigTemplate>} A Promise that fulfills when the template is available.
  */
  public getTemplate(): Promise<RemoteConfigTemplate> {
    return this.client.getTemplate()
      .then((templateResponse) => {
        return new RemoteConfigTemplate(templateResponse);
      });
  }
}

/**
 * Remote Config template class.
 */
export class RemoteConfigTemplate {

  public parameters: { [key: string]: RemoteConfigParameter };
  public conditions: RemoteConfigCondition[];
  private readonly eTagInternal: string;

  constructor(config: RemoteConfigResponse) {
    if (!validator.isNonNullObject(config) ||
      !validator.isNonEmptyString(config.eTag)) {
      throw new FirebaseRemoteConfigError(
        'invalid-argument',
        `Invalid Remote Config template response: ${JSON.stringify(config)}`);
    }

    this.parameters = {};
    this.conditions = [];
    this.eTagInternal = config.eTag;

    if (typeof config.parameters !== 'undefined') {
      if (!validator.isNonNullObject(config.parameters)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          `Remote Config parameters must be a non-null object`);
      }
      this.parameters = config.parameters;
    }

    if (typeof config.conditions !== 'undefined') {
      if (!validator.isArray(config.conditions)) {
        throw new FirebaseRemoteConfigError(
          'invalid-argument',
          `Remote Config conditions must be an array`);
      }
      this.conditions = config.conditions.map(p => ({
        name: p.name,
        expression: p.expression,
        color: p.tagColor
      }));
    }
  }

  /**
   * Gets the ETag of the template.
   *
   * @return {string} The ETag of the Remote Config template.
   */
  get eTag(): string {
    return this.eTagInternal;
  }

  /**
   * Find an existing Remote Config condition by name.
   *
   * @param {string} name The name of the Remote Config condition.
   *
   * @return {RemoteConfigCondition} The Remote Config condition with the provided name.
   */
  public getCondition(name: string): RemoteConfigCondition | undefined {
    return this.conditions.find((c) => c.name === name);
  }

  /** @return {object} The plain object representation of the current template data. */
  public toJSON(): object {
    return {
      parameters: this.parameters,
      conditions: this.conditions,
      eTag: this.eTag,
    };
  }
}

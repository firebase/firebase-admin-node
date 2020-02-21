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

/** Interface representing a Remote Config parameter. */
export interface RemoteConfigParameter {
  key: string;
  defaultValue?: string; // If `undefined`, the parameter uses the in-app default value
  description?: string;

  // A dictionary of {conditionName: value}
  // `undefined` value sets `useInAppDefault` to `true` (equivalent to `No Value`)
  conditionalValues?: { [name: string]: string | undefined };
}

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

  /**
   * @param {FirebaseApp} app The app for this RemoteConfig service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) { }
}

/**
 * Remote Config template class.
 */
export class RemoteConfigTemplate {

  public parameters: RemoteConfigParameter[];
  public conditions: RemoteConfigCondition[];
  private readonly eTagInternal: string;

  /**
   * Gets the ETag of the template.
   *
   * @return {string} The ETag of the Remote Config template.
   */
  get eTag(): string {
    return this.eTagInternal;
  }

  /**
   * Find an existing Remote Config parameter by key.
   *
   * @param {string} key The key of the Remote Config parameter.
   *
   * @return {RemoteConfigParameter} The Remote Config parameter with the provided key.
   */
  public getParameter(key: string): RemoteConfigParameter | undefined {
    return this.parameters.find((p) => p.key === key);
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

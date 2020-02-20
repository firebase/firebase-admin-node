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
import {
  RemoteConfigCondition, RemoteConfigParameter
} from './remote-config-types';
import {
  RemoteConfigApiClient
} from './remote-config-api-client';
import { FirebaseRemoteConfigError } from './remote-config-utils';

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

  private readonly requestHandler: RemoteConfigApiClient;

  /**
   * @param {FirebaseApp} app The app for this RemoteConfig service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    this.requestHandler = new RemoteConfigApiClient(app);
  }

  /**
   * Gets the current active version of the Remote Config template of the project.
   *
   * @return {Promise<RemoteConfigTemplate>} A Promise that fulfills when the template is available.
   */
  public getTemplate(): Promise<RemoteConfigTemplate> {
    //TODO(lahirumaramba): implement the functionality
    return Promise.resolve<RemoteConfigTemplate>(new RemoteConfigTemplate());
  }

  /**
   * Validates a Remote Config template.
   *
   * @param {RemoteConfigTemplate} template The Remote Config template to be validated.
   *
   * @return {Promise<RemoteConfigTemplate>} A Promise that fulfills when a template is validated.
   */
  public validateTemplate(template: RemoteConfigTemplate): Promise<RemoteConfigTemplate> {
    //TODO(lahirumaramba): implement the functionality
    return Promise.resolve<RemoteConfigTemplate>(new RemoteConfigTemplate());
  }

  /**
   * Publishes a Remote Config template.
   *
   * @param {RemoteConfigTemplate} template The Remote Config template to be validated.
   * @param {any=} options Optional options object when publishing a Remote Config template.
   *
   * @return {Promise<RemoteConfigTemplate>} A Promise that fulfills when a template is published.
   */
  public publishTemplate(template: RemoteConfigTemplate, options?: {force: boolean}): Promise<RemoteConfigTemplate> {
    //TODO(lahirumaramba): implement the functionality
    return Promise.resolve<RemoteConfigTemplate>(new RemoteConfigTemplate());
  }

  /**
   * Creates and returns a new Remote Config template from a JSON string.
   *
   * @param {string} json The JSON string to populate a Remote Config template.
   *
   * @return {RemoteConfigTemplate} A new template instance.
   */
  public createTemplateFromJSON(json: string): RemoteConfigTemplate {
    //TODO(lahirumaramba): implement the functionality
    return new RemoteConfigTemplate();
  }
}

/**
 * Remote Config template class.
 */
export class RemoteConfigTemplate {

  public parameters: RemoteConfigParameter[];
  public conditions: RemoteConfigCondition[];
  private readonly eTag: string;

  /**
   * Find an existing Remote Config parameter by key.
   *
   * @param {string} key The key of the Remote Config parameter.
   *
   * @return {RemoteConfigParameter} The Remote Config parameter with the provided key.
   */
  public getParameter(key: string): RemoteConfigParameter {
    return this.parameters.find( (p) => p.key === key );
  }

  /**
   * Find an existing Remote Config condition by name.
   *
   * @param {string} name The name of the Remote Config condition.
   *
   * @return {RemoteConfigCondition} The Remote Config condition with the provided name.
   */
  public getCondition(name: string): RemoteConfigCondition {
    return this.conditions.find( (c) => c.name === name );
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

/*!
 * Copyright 2022 Google Inc.
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
import * as validator from '../utils/validator';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import {
  ProviderRecaptchaConfig,
  RecaptchaConfig,
  RecaptchaConfigAuth,
  RecaptchaKeyConfig,
  RecaptchaManagedRules
} from './auth-config';

/**
 * Interface representing the properties to update on the provided tenant.
 */
export interface UpdateProjectConfigRequest {
  /**
   * The recaptcha configuration to update on the project.
   */
  recaptchaConfig?: RecaptchaConfig;
}

/**
 * We are only exposing the recaptcha config for now.
 */
export interface ProjectConfigServerResponse {
  emailPasswordRecaptchaConfig?: ProviderRecaptchaConfig;
  recaptchaManagedRules?: RecaptchaManagedRules;
  recaptchaKeyConfig?: RecaptchaKeyConfig[];
}

export interface ProjectConfigClientRequest {
  emailPasswordRecaptchaConfig?: ProviderRecaptchaConfig;
  recaptchaManagedRules?: RecaptchaManagedRules;
  recaptchaKeyConfig?: RecaptchaKeyConfig[];
}

/**
* Represents a project configuration.
*/
export class ProjectConfig {
  private readonly recaptchaConfig_?: RecaptchaConfigAuth;

  private static validate(request: any): void {
    const validKeys = {
      recaptchaConfig: true,
    };
    if (!validator.isNonNullObject(request)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"UpdateProjectConfigRequest" must be a valid non-null object.',
      );
    }
    // Check for unsupported top level attributes.
    for (const key in request) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `"${key}" is not a valid UpdateProjectConfigRequest parameter.`,
        );
      }
    }
    RecaptchaConfigAuth.validate(request.recaptchaConfig);
  }

  /**
   * Build the corresponding server request for a UpdateProjectConfigRequest object.
   * @param configOptions - The properties to convert to a server request.
   * @returns  The equivalent server request.
   * 
   * @internal
   */
  public static buildServerRequest(configOptions: UpdateProjectConfigRequest): ProjectConfigClientRequest {
    ProjectConfig.validate(configOptions);
    const request: ProjectConfigClientRequest = {};
    // reCAPTCHA Key Config cannot be updated.
    if (typeof configOptions.recaptchaConfig?.emailPasswordRecaptchaConfig !== 'undefined') {
      request.emailPasswordRecaptchaConfig = configOptions.recaptchaConfig.emailPasswordRecaptchaConfig;
    }
    if (typeof configOptions.recaptchaConfig?.recaptchaManagedRules !== 'undefined') {
      request.recaptchaManagedRules = configOptions.recaptchaConfig.recaptchaManagedRules;
    }
    return request;
  }
 
  /**
   * The recaptcha configuration.
   */
  get recaptchaConfig(): RecaptchaConfig | undefined {
    return this.recaptchaConfig_;
  }
  /**
   * The Project Config object constructor.
   *
   * @param response - The server side response used to initialize the Project Config object.
   * @constructor
   * @internal
   */
  constructor(response: ProjectConfigServerResponse) {
    if (typeof response.emailPasswordRecaptchaConfig !== 'undefined'
    || typeof response.recaptchaManagedRules !== 'undefined'
    || typeof response.recaptchaKeyConfig !== 'undefined') {
      this.recaptchaConfig_ = new RecaptchaConfigAuth(
        response.emailPasswordRecaptchaConfig, response.recaptchaManagedRules,
        response.recaptchaKeyConfig);
    }
  }
  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    // JSON serialization
    const json = {
      recaptchaConfig: this.recaptchaConfig_?.toJSON(),
    };
    if (typeof json.recaptchaConfig === 'undefined') {
      delete json.recaptchaConfig;
    }
    return json;
  }
}


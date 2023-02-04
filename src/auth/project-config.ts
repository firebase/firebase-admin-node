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
  SmsRegionsAuthConfig,
  SmsRegionConfig,
  EmailPrivacyConfig,
  EmailPrivacyAuthConfig,
} from './auth-config';
import { deepCopy } from '../utils/deep-copy';

/**
 * Interface representing the properties to update on the provided project config.
 */
export interface UpdateProjectConfigRequest {
  /**
   * The SMS configuration to update on the project.
   */
  smsRegionConfig?: SmsRegionConfig;
  emailPrivacyConfig?: EmailPrivacyConfig;
}

/**
 * Response received from getting or updating a project config.
 * This object currently exposes only the SMS Region config.
 */
export interface ProjectConfigServerResponse {
  smsRegionConfig?: SmsRegionConfig;
  emailPrivacyConfig?: EmailPrivacyConfig;
}

/**
 * Request sent to update project config.
 * This object currently exposes only the SMS Region config.
 */
export interface ProjectConfigClientRequest {
  smsRegionConfig?: SmsRegionConfig;
  emailPrivacyConfig?: EmailPrivacyConfig;
}

/**
* Represents a project configuration.
*/
export class ProjectConfig {
  /**
   * The SMS Regions Config for the project.
   * Configures the regions where users are allowed to send verification SMS.
   * This is based on the calling code of the destination phone number.
   */
  public readonly smsRegionConfig?: SmsRegionConfig;
  public readonly emailPrivacyConfig?: EmailPrivacyConfig;

  /**
   * Validates a project config options object. Throws an error on failure.
   *
   * @param request - The project config options object to validate.
   */
  private static validate(request: ProjectConfigClientRequest): void {
    if (!validator.isNonNullObject(request)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"UpdateProjectConfigRequest" must be a valid non-null object.',
      );
    }
    const validKeys = {
      smsRegionConfig: true,
      emailPrivacyConfig: true,
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
    // Validate SMS Regions Config if provided.
    if (typeof request.smsRegionConfig !== 'undefined') {
      SmsRegionsAuthConfig.validate(request.smsRegionConfig);
    }

    // Validate Email Privacy Config if provided.
    if (typeof request.emailPrivacyConfig !== 'undefined') {
      EmailPrivacyAuthConfig.validate(request.emailPrivacyConfig);
    }
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
    return configOptions as ProjectConfigClientRequest;
  }

  /**
   * The Project Config object constructor.
   *
   * @param response - The server side response used to initialize the Project Config object.
   * @constructor
   * @internal
   */
  constructor(response: ProjectConfigServerResponse) {
    if (typeof response.smsRegionConfig !== 'undefined') {
      this.smsRegionConfig = response.smsRegionConfig;
    }
    if (typeof response.emailPrivacyConfig !== 'undefined') {
      this.emailPrivacyConfig = response.emailPrivacyConfig;
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
      smsRegionConfig: deepCopy(this.smsRegionConfig),
      emailPrivacyConfig: deepCopy(this.emailPrivacyConfig),
    };
    if (typeof json.smsRegionConfig === 'undefined') {
      delete json.smsRegionConfig;
    }
    if (typeof json.emailPrivacyConfig === 'undefined') {
      delete json.emailPrivacyConfig;
    }
    return json;
  }
}


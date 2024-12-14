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
  MultiFactorConfig,
  MultiFactorAuthConfig,
  MultiFactorAuthServerConfig,
  RecaptchaConfig,
  RecaptchaAuthConfig,
  RecaptchaAuthServerConfig,
  PasswordPolicyAuthConfig,
  PasswordPolicyAuthServerConfig,
  PasswordPolicyConfig,
  EmailPrivacyConfig,
  EmailPrivacyAuthConfig,
  MobileLinksConfig,
  MobileLinksAuthConfig,
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
  /**
   * The multi-factor auth configuration to update on the project.
   */
  multiFactorConfig?: MultiFactorConfig;

  /**
   * The reCAPTCHA configuration to update on the project.
   * By enabling reCAPTCHA Enterprise integration, you are
   * agreeing to the reCAPTCHA Enterprise
   * {@link https://cloud.google.com/terms/service-terms | Term of Service}.
   */
  recaptchaConfig?: RecaptchaConfig;
  /**
   * The password policy configuration to update on the project
   */
  passwordPolicyConfig?: PasswordPolicyConfig;
  /**
   * The email privacy configuration to update on the project
   */
  emailPrivacyConfig?: EmailPrivacyConfig;

  /**
   * The mobile links configuration for the project
   */
  mobileLinksConfig?: MobileLinksConfig;
}

/**
 * Response received when getting or updating the project config.
 */
export interface ProjectConfigServerResponse {
  smsRegionConfig?: SmsRegionConfig;
  mfa?: MultiFactorAuthServerConfig;
  recaptchaConfig?: RecaptchaAuthServerConfig;
  passwordPolicyConfig?: PasswordPolicyAuthServerConfig;
  emailPrivacyConfig?: EmailPrivacyConfig;
  mobileLinksConfig?: MobileLinksConfig;
}

/**
 * Request to update the project config.
 */
export interface ProjectConfigClientRequest {
  smsRegionConfig?: SmsRegionConfig;
  mfa?: MultiFactorAuthServerConfig;
  recaptchaConfig?: RecaptchaAuthServerConfig;
  passwordPolicyConfig?: PasswordPolicyAuthServerConfig;
  emailPrivacyConfig?: EmailPrivacyConfig;
  mobileLinksConfig?: MobileLinksConfig;
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

  /**
   * The project's multi-factor auth configuration.
   * Supports only phone and TOTP.
   */  
  private readonly multiFactorConfig_?: MultiFactorConfig;
  /**
   * The multi-factor auth configuration.
   */
  get multiFactorConfig(): MultiFactorConfig | undefined {
    return this.multiFactorConfig_;
  }
  /**
   * The reCAPTCHA configuration to update on the project.
   * By enabling reCAPTCHA Enterprise integration, you are
   * agreeing to the reCAPTCHA Enterprise
   * {@link https://cloud.google.com/terms/service-terms | Term of Service}.
   */
  private readonly recaptchaConfig_?: RecaptchaAuthConfig;
  /**
   * The reCAPTCHA configuration.
   */
  get recaptchaConfig(): RecaptchaConfig | undefined {
    return this.recaptchaConfig_;
  }
  /**
   * The password policy configuration for the project
   */
  public readonly passwordPolicyConfig?: PasswordPolicyConfig;
  /**
   * The email privacy configuration for the project
   */
  public readonly emailPrivacyConfig?: EmailPrivacyConfig;

  /**
   * The mobile links configuration for the project
   */
  public readonly mobileLinksConfig?: MobileLinksConfig
  
  /**
   * Validates a project config options object. Throws an error on failure.
   *
   * @param request - The project config options object to validate.
   */
  private static validate(request: UpdateProjectConfigRequest): void {
    if (!validator.isNonNullObject(request)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"UpdateProjectConfigRequest" must be a valid non-null object.',
      );
    }
    const validKeys = {
      smsRegionConfig: true,
      multiFactorConfig: true,
      recaptchaConfig: true,
      passwordPolicyConfig: true,
      emailPrivacyConfig: true,
      mobileLinksConfig: true,
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

    // Validate Multi Factor Config if provided
    if (typeof request.multiFactorConfig !== 'undefined') {
      MultiFactorAuthConfig.validate(request.multiFactorConfig);
    }
    // Validate reCAPTCHA config attribute.
    if (typeof request.recaptchaConfig !== 'undefined') {
      RecaptchaAuthConfig.validate(request.recaptchaConfig);
    }

    // Validate Password policy Config if provided
    if (typeof request.passwordPolicyConfig !== 'undefined') {
      PasswordPolicyAuthConfig.validate(request.passwordPolicyConfig);
    }

    // Validate Email Privacy Config if provided.
    if (typeof request.emailPrivacyConfig !== 'undefined') {
      EmailPrivacyAuthConfig.validate(request.emailPrivacyConfig);
    }

    // Validate Mobile Links Config if provided.
    if (typeof request.mobileLinksConfig !== 'undefined') {
      MobileLinksAuthConfig.validate(request.mobileLinksConfig);
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
    const request: ProjectConfigClientRequest = {};
    if (typeof configOptions.smsRegionConfig !== 'undefined') {
      request.smsRegionConfig = configOptions.smsRegionConfig;
    }
    if (typeof configOptions.multiFactorConfig !== 'undefined') {
      request.mfa = MultiFactorAuthConfig.buildServerRequest(configOptions.multiFactorConfig);
    }
    if (typeof configOptions.recaptchaConfig !== 'undefined') {
      request.recaptchaConfig = RecaptchaAuthConfig.buildServerRequest(configOptions.recaptchaConfig);
    }
    if (typeof configOptions.passwordPolicyConfig !== 'undefined') {
      request.passwordPolicyConfig = PasswordPolicyAuthConfig.buildServerRequest(configOptions.passwordPolicyConfig);
    }
    if (typeof configOptions.emailPrivacyConfig !== 'undefined') {
      request.emailPrivacyConfig = configOptions.emailPrivacyConfig;
    }
    if (typeof configOptions.mobileLinksConfig !== 'undefined') {
      request.mobileLinksConfig = configOptions.mobileLinksConfig;
    }
    return request;
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
    //Backend API returns "mfa" in case of project config and "mfaConfig" in case of tenant config. 
    //The SDK exposes it as multiFactorConfig always.
    if (typeof response.mfa !== 'undefined') {
      this.multiFactorConfig_ = new MultiFactorAuthConfig(response.mfa);
    }
    if (typeof response.recaptchaConfig !== 'undefined') {
      this.recaptchaConfig_ = new RecaptchaAuthConfig(response.recaptchaConfig);
    }
    if (typeof response.passwordPolicyConfig !== 'undefined') {
      this.passwordPolicyConfig = new PasswordPolicyAuthConfig(response.passwordPolicyConfig);
    }
    if (typeof response.emailPrivacyConfig !== 'undefined') {
      this.emailPrivacyConfig = response.emailPrivacyConfig;
    }
    if (typeof response.mobileLinksConfig !== 'undefined') {
      this.mobileLinksConfig = response.mobileLinksConfig;
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
      multiFactorConfig: deepCopy(this.multiFactorConfig),
      recaptchaConfig: deepCopy(this.recaptchaConfig),
      passwordPolicyConfig: deepCopy(this.passwordPolicyConfig),
      emailPrivacyConfig: deepCopy(this.emailPrivacyConfig),
      mobileLinksConfig: deepCopy(this.mobileLinksConfig),
    };
    if (typeof json.smsRegionConfig === 'undefined') {
      delete json.smsRegionConfig;
    }
    if (typeof json.multiFactorConfig === 'undefined') {
      delete json.multiFactorConfig;
    }
    if (typeof json.recaptchaConfig === 'undefined') {
      delete json.recaptchaConfig;
    }
    if (typeof json.passwordPolicyConfig === 'undefined') {
      delete json.passwordPolicyConfig;
    }
    if (typeof json.emailPrivacyConfig === 'undefined') {
      delete json.emailPrivacyConfig;
    }
    if (typeof json.mobileLinksConfig === 'undefined') {
      delete json.mobileLinksConfig;
    }
    return json;
  }
}


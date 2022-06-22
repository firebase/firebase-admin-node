/*!
 * Copyright 2019 Google Inc.
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
import { deepCopy } from '../utils/deep-copy';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';

import {
  EmailSignInConfig, EmailSignInConfigServerRequest, MultiFactorAuthServerConfig,
  MultiFactorConfig, validateTestPhoneNumbers, EmailSignInProviderConfig,
  MultiFactorAuthConfig,
} from './auth-config';

/**
 * Interface representing the properties to update on the provided tenant.
 */
export interface UpdateTenantRequest {

  /**
   * The tenant display name.
   */
  displayName?: string;

  /**
   * The email sign in configuration.
   */
  emailSignInConfig?: EmailSignInProviderConfig;

  /**
   * Whether the anonymous provider is enabled.
   */
  anonymousSignInEnabled?: boolean;

  /**
   * The multi-factor auth configuration to update on the tenant.
   */
  multiFactorConfig?: MultiFactorConfig;

  /**
   * The updated map containing the test phone number / code pairs for the tenant.
   * Passing null clears the previously save phone number / code pairs.
   */
  testPhoneNumbers?: { [phoneNumber: string]: string } | null;
}

/**
 * Interface representing the properties to set on a new tenant.
 */
export type CreateTenantRequest = UpdateTenantRequest;


/** The corresponding server side representation of a TenantOptions object. */
export interface TenantOptionsServerRequest extends EmailSignInConfigServerRequest {
  displayName?: string;
  enableAnonymousUser?: boolean;
  mfaConfig?: MultiFactorAuthServerConfig;
  testPhoneNumbers?: {[key: string]: string};
}

/** The tenant server response interface. */
export interface TenantServerResponse {
  name: string;
  displayName?: string;
  allowPasswordSignup?: boolean;
  enableEmailLinkSignin?: boolean;
  enableAnonymousUser?: boolean;
  mfaConfig?: MultiFactorAuthServerConfig;
  testPhoneNumbers?: {[key: string]: string};
}

/**
 * Represents a tenant configuration.
 *
 * Multi-tenancy support requires Google Cloud's Identity Platform
 * (GCIP). To learn more about GCIP, including pricing and features,
 * see the {@link https://cloud.google.com/identity-platform | GCIP documentation}.
 *
 * Before multi-tenancy can be used on a Google Cloud Identity Platform project,
 * tenants must be allowed on that project via the Cloud Console UI.
 *
 * A tenant configuration provides information such as the display name, tenant
 * identifier and email authentication configuration.
 * For OIDC/SAML provider configuration management, `TenantAwareAuth` instances should
 * be used instead of a `Tenant` to retrieve the list of configured IdPs on a tenant.
 * When configuring these providers, note that tenants will inherit
 * whitelisted domains and authenticated redirect URIs of their parent project.
 *
 * All other settings of a tenant will also be inherited. These will need to be managed
 * from the Cloud Console UI.
 */
export class Tenant {

  /**
   * The tenant identifier.
   */
  public readonly tenantId: string;

  /**
   * The tenant display name.
   */
  public readonly displayName?: string;

  public readonly anonymousSignInEnabled: boolean;

  /**
   * The map containing the test phone number / code pairs for the tenant.
   */
  public readonly testPhoneNumbers?: {[phoneNumber: string]: string};

  private readonly emailSignInConfig_?: EmailSignInConfig;
  private readonly multiFactorConfig_?: MultiFactorAuthConfig;

  /**
   * Builds the corresponding server request for a TenantOptions object.
   *
   * @param tenantOptions - The properties to convert to a server request.
   * @param createRequest - Whether this is a create request.
   * @returns The equivalent server request.
   *
   * @internal
   */
  public static buildServerRequest(
    tenantOptions: UpdateTenantRequest, createRequest: boolean): TenantOptionsServerRequest {
    Tenant.validate(tenantOptions, createRequest);
    let request: TenantOptionsServerRequest = {};
    if (typeof tenantOptions.emailSignInConfig !== 'undefined') {
      request = EmailSignInConfig.buildServerRequest(tenantOptions.emailSignInConfig);
    }
    if (typeof tenantOptions.displayName !== 'undefined') {
      request.displayName = tenantOptions.displayName;
    }
    if (typeof tenantOptions.anonymousSignInEnabled !== 'undefined') {
      request.enableAnonymousUser = tenantOptions.anonymousSignInEnabled;
    }
    if (typeof tenantOptions.multiFactorConfig !== 'undefined') {
      request.mfaConfig = MultiFactorAuthConfig.buildServerRequest(tenantOptions.multiFactorConfig);
    }
    if (typeof tenantOptions.testPhoneNumbers !== 'undefined') {
      // null will clear existing test phone numbers. Translate to empty object.
      request.testPhoneNumbers = tenantOptions.testPhoneNumbers ?? {};
    }
    return request;
  }

  /**
   * Returns the tenant ID corresponding to the resource name if available.
   *
   * @param resourceName - The server side resource name
   * @returns The tenant ID corresponding to the resource, null otherwise.
   *
   * @internal
   */
  public static getTenantIdFromResourceName(resourceName: string): string | null {
    // name is of form projects/project1/tenants/tenant1
    const matchTenantRes = resourceName.match(/\/tenants\/(.*)$/);
    if (!matchTenantRes || matchTenantRes.length < 2) {
      return null;
    }
    return matchTenantRes[1];
  }

  /**
   * Validates a tenant options object. Throws an error on failure.
   *
   * @param request - The tenant options object to validate.
   * @param createRequest - Whether this is a create request.
   */
  private static validate(request: any, createRequest: boolean): void {
    const validKeys = {
      displayName: true,
      emailSignInConfig: true,
      anonymousSignInEnabled: true,
      multiFactorConfig: true,
      testPhoneNumbers: true,
    };
    const label = createRequest ? 'CreateTenantRequest' : 'UpdateTenantRequest';
    if (!validator.isNonNullObject(request)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"${label}" must be a valid non-null object.`,
      );
    }
    // Check for unsupported top level attributes.
    for (const key in request) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `"${key}" is not a valid ${label} parameter.`,
        );
      }
    }
    // Validate displayName type if provided.
    if (typeof request.displayName !== 'undefined' &&
        !validator.isNonEmptyString(request.displayName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"${label}.displayName" must be a valid non-empty string.`,
      );
    }
    // Validate emailSignInConfig type if provided.
    if (typeof request.emailSignInConfig !== 'undefined') {
      // This will throw an error if invalid.
      EmailSignInConfig.buildServerRequest(request.emailSignInConfig);
    }
    // Validate test phone numbers if provided.
    if (typeof request.testPhoneNumbers !== 'undefined' &&
        request.testPhoneNumbers !== null) {
      validateTestPhoneNumbers(request.testPhoneNumbers);
    } else if (request.testPhoneNumbers === null && createRequest) {
      // null allowed only for update operations.
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"${label}.testPhoneNumbers" must be a non-null object.`,
      );
    }
    // Validate multiFactorConfig type if provided.
    if (typeof request.multiFactorConfig !== 'undefined') {
      // This will throw an error if invalid.
      MultiFactorAuthConfig.buildServerRequest(request.multiFactorConfig);
    }
  }

  /**
   * The Tenant object constructor.
   *
   * @param response - The server side response used to initialize the Tenant object.
   * @constructor
   * @internal
   */
  constructor(response: TenantServerResponse) {
    const tenantId = Tenant.getTenantIdFromResourceName(response.name);
    if (!tenantId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid tenant response',
      );
    }
    this.tenantId = tenantId;
    this.displayName = response.displayName;
    try {
      this.emailSignInConfig_ = new EmailSignInConfig(response);
    } catch (e) {
      // If allowPasswordSignup is undefined, it is disabled by default.
      this.emailSignInConfig_ = new EmailSignInConfig({
        allowPasswordSignup: false,
      });
    }
    this.anonymousSignInEnabled = !!response.enableAnonymousUser;
    if (typeof response.mfaConfig !== 'undefined') {
      this.multiFactorConfig_ = new MultiFactorAuthConfig(response.mfaConfig);
    }
    if (typeof response.testPhoneNumbers !== 'undefined') {
      this.testPhoneNumbers = deepCopy(response.testPhoneNumbers || {});
    }
  }

  /**
   * The email sign in provider configuration.
   */
  get emailSignInConfig(): EmailSignInProviderConfig | undefined {
    return this.emailSignInConfig_;
  }

  /**
   * The multi-factor auth configuration on the current tenant.
   */
  get multiFactorConfig(): MultiFactorConfig | undefined {
    return this.multiFactorConfig_;
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    const json = {
      tenantId: this.tenantId,
      displayName: this.displayName,
      emailSignInConfig: this.emailSignInConfig_?.toJSON(),
      multiFactorConfig: this.multiFactorConfig_?.toJSON(),
      anonymousSignInEnabled: this.anonymousSignInEnabled,
      testPhoneNumbers: this.testPhoneNumbers,
    };
    if (typeof json.multiFactorConfig === 'undefined') {
      delete json.multiFactorConfig;
    }
    if (typeof json.testPhoneNumbers === 'undefined') {
      delete json.testPhoneNumbers;
    }
    return json;
  }
}


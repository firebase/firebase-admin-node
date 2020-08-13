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
import { validateTestPhoneNumbers } from './auth-config';
import {
  EmailSignInConfig, MultiFactorAuthConfig, 
} from './auth-config-internal';
import { TenantOptions, TenantServerResponse, TenantOptionsServerRequest } from './tenant-internal';

/** The interface representing the listTenant API response. */
export interface ListTenantsResult {
  /**
   * The list of {@link admin.auth.Tenant `Tenant`} objects for the downloaded batch.
   */
  tenants: Tenant[];

  /**
   * The next page token if available. This is needed for the next batch download.
   */
  pageToken?: string;
}

/**
 * Interface representing a tenant configuration.
 *
 * Multi-tenancy support requires Google Cloud's Identity Platform
 * (GCIP). To learn more about GCIP, including pricing and features,
 * see the [GCIP documentation](https://cloud.google.com/identity-platform)
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

  /**
   * The email sign in provider configuration.
   */
  public readonly emailSignInConfig?: EmailSignInConfig;

  /**
   * The multi-factor auth configuration on the current tenant.
   */
  public readonly multiFactorConfig?: MultiFactorAuthConfig;

  /**
   * The map containing the test phone number / code pairs for the tenant.
   */
  public readonly testPhoneNumbers?: {[phoneNumber: string]: string};

  // TODO(hlazu): MOVE THESE OUT!
  /**
   * Builds the corresponding server request for a TenantOptions object.
   *
   * @param {TenantOptions} tenantOptions The properties to convert to a server request.
   * @param {boolean} createRequest Whether this is a create request.
   * @return {object} The equivalent server request.
   */
  public static buildServerRequest(
    tenantOptions: TenantOptions, createRequest: boolean): TenantOptionsServerRequest {
    Tenant.validate(tenantOptions, createRequest);
    let request: TenantOptionsServerRequest = {};
    if (typeof tenantOptions.emailSignInConfig !== 'undefined') {
      request = EmailSignInConfig.buildServerRequest(tenantOptions.emailSignInConfig);
    }
    if (typeof tenantOptions.displayName !== 'undefined') {
      request.displayName = tenantOptions.displayName;
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
   * @param {string} resourceName The server side resource name
   * @return {?string} The tenant ID corresponding to the resource, null otherwise.
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
   * @param {any} request The tenant options object to validate.
   * @param {boolean} createRequest Whether this is a create request.
   */
  private static validate(request: any, createRequest: boolean): void {
    const validKeys = {
      displayName: true,
      emailSignInConfig: true,
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
   * @param response The server side response used to initialize the Tenant object.
   * @constructor
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
      this.emailSignInConfig = new EmailSignInConfig(response);
    } catch (e) {
      // If allowPasswordSignup is undefined, it is disabled by default.
      this.emailSignInConfig = new EmailSignInConfig({
        allowPasswordSignup: false,
      });
    }
    if (typeof response.mfaConfig !== 'undefined') {
      this.multiFactorConfig = new MultiFactorAuthConfig(response.mfaConfig);
    }
    if (typeof response.testPhoneNumbers !== 'undefined') {
      this.testPhoneNumbers = deepCopy(response.testPhoneNumbers || {});
    }
  }

  /**
   * @return A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    const json = {
      tenantId: this.tenantId,
      displayName: this.displayName,
      emailSignInConfig: this.emailSignInConfig?.toJSON(),
      multiFactorConfig: this.multiFactorConfig?.toJSON(),
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

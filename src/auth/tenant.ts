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
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';
import {
  EmailSignInConfig, EmailSignInConfigServerRequest, EmailSignInProviderConfig,
} from './auth-config';

/** The TenantOptions interface used for create/read/update tenant operations. */
export interface TenantOptions {
  displayName?: string;
  emailSignInConfig?: EmailSignInProviderConfig;
}

/** The corresponding server side representation of a TenantOptions object. */
export interface TenantOptionsServerRequest extends EmailSignInConfigServerRequest {
  displayName?: string;
}

/** The tenant server response interface. */
export interface TenantServerResponse {
  name: string;
  displayName?: string;
  allowPasswordSignup?: boolean;
  enableEmailLinkSignin?: boolean;
}

/** The interface representing the listTenant API response. */
export interface ListTenantsResult {
  tenants: Tenant[];
  pageToken?: string;
}


/**
 * Tenant class that defines a Firebase Auth tenant.
 */
export class Tenant {
  public readonly tenantId: string;
  public readonly displayName?: string;
  public readonly emailSignInConfig?: EmailSignInConfig;

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
  }

  /**
   * The Tenant object constructor.
   *
   * @param {any} response The server side response used to initialize the Tenant object.
   * @constructor
   */
  constructor(response: any) {
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
  }

  /** @return {object} The plain object representation of the tenant. */
  public toJSON(): object {
    return {
      tenantId: this.tenantId,
      displayName: this.displayName,
      emailSignInConfig: this.emailSignInConfig && this.emailSignInConfig.toJSON(),
    };
  }
}


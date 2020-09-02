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

import { deepCopy } from '../utils/deep-copy';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import { TenantServerResponse, TenantUtils } from './tenant-internal';
import { EmailSignInProviderConfig, MultiFactorConfig } from './auth-config';
import { EmailSignInConfig, MultiFactorAuthConfig } from './auth-config-internal';


/** The TenantOptions interface used for create/read/update tenant operations. */
export interface TenantOptions {
  /**
   * The tenant display name.
   */
  displayName?: string;

  /**
   * The email sign in configuration.
   */
  emailSignInConfig?: EmailSignInProviderConfig;
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
   * The map containing the test phone number / code pairs for the tenant.
   */
  public readonly testPhoneNumbers?: {[phoneNumber: string]: string};

  private readonly _emailSignInConfig?: EmailSignInConfig;

  private readonly _multiFactorConfig?: MultiFactorAuthConfig;

  /**
   * The Tenant object constructor.
   *
   * @param response The server side response used to initialize the Tenant object.
   * @constructor
   * @internal
   */
  constructor(response: TenantServerResponse) {
    const tenantId = TenantUtils.getTenantIdFromResourceName(response.name);
    if (!tenantId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid tenant response',
      );
    }
    this.tenantId = tenantId;
    this.displayName = response.displayName;
    try {
      this._emailSignInConfig = new EmailSignInConfig(response);
    } catch (e) {
      // If allowPasswordSignup is undefined, it is disabled by default.
      this._emailSignInConfig = new EmailSignInConfig({
        allowPasswordSignup: false,
      });
    }
    if (typeof response.mfaConfig !== 'undefined') {
      this._multiFactorConfig = new MultiFactorAuthConfig(response.mfaConfig);
    }
    if (typeof response.testPhoneNumbers !== 'undefined') {
      this.testPhoneNumbers = deepCopy(response.testPhoneNumbers || {});
    }
  }

  /**
   * The email sign in provider configuration.
   */
  public get emailSignInConfig(): EmailSignInProviderConfig | undefined {
    return this._emailSignInConfig;
  }

  /**
   * The multi-factor auth configuration on the current tenant.
   */
  public get multiFactorConfig(): MultiFactorConfig | undefined {
    return this._multiFactorConfig;
  }

  /**
   * @return A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    const json = {
      tenantId: this.tenantId,
      displayName: this.displayName,
      emailSignInConfig: this._emailSignInConfig?.toJSON(),
      multiFactorConfig: this._multiFactorConfig?.toJSON(),
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

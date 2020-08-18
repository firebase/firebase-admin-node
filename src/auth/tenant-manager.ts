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

import { AuthRequestHandler } from './auth-api-request';
import { FirebaseApp } from '../firebase-app';
import { TenantAwareAuth } from './auth';
import { Tenant, ListTenantsResult } from './tenant';
import { TenantServerResponse } from './tenant-internal';
import { TenantOptions } from './tenant';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import * as validator from '../utils/validator';

/**
 * Defines the tenant manager used to help manage tenant related operations.
 * This includes:
 * <ul>
 * <li>The ability to create, update, list, get and delete tenants for the underlying
 *     project.</li>
 * <li>Getting a `TenantAwareAuth` instance for running Auth related operations
 *     (user management, provider configuration management, token verification,
 *     email link generation, etc) in the context of a specified tenant.</li>
 * </ul>
 */
export class TenantManager {
  private readonly authRequestHandler: AuthRequestHandler;
  private readonly tenantsMap: {[key: string]: TenantAwareAuth};

  /**
   * Initializes a TenantManager instance for a specified FirebaseApp.
   * @param app The app for this TenantManager instance.
   */
  constructor(private readonly app: FirebaseApp) {
    this.authRequestHandler = new AuthRequestHandler(app);
    this.tenantsMap = {};
  }

  /**
   * @param tenantId The tenant ID whose `TenantAwareAuth` instance is to be returned.
   *
   * @return The `TenantAwareAuth` instance corresponding to this tenant identifier.
   */
  public authForTenant(tenantId: string): TenantAwareAuth {
    if (!validator.isNonEmptyString(tenantId)) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_TENANT_ID);
    }
    if (typeof this.tenantsMap[tenantId] === 'undefined') {
      this.tenantsMap[tenantId] = new TenantAwareAuth(this.app, tenantId);
    }
    return this.tenantsMap[tenantId];
  }

  /**
   * Gets the tenant configuration for the tenant corresponding to a given `tenantId`.
   *
   * @param tenantId The tenant identifier corresponding to the tenant whose data to fetch.
   *
   * @return A promise fulfilled with the tenant configuration to the provided `tenantId`.
   */
  public getTenant(tenantId: string): Promise<Tenant> {
    return this.authRequestHandler.getTenant(tenantId)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }

  /**
   * Retrieves a list of tenants (single batch only) with a size of `maxResults`
   * starting from the offset as specified by `pageToken`. This is used to
   * retrieve all the tenants of a specified project in batches.
   *
   * @param maxResults The page size, 1000 if undefined. This is also
   *   the maximum allowed limit.
   * @param pageToken The next page token. If not specified, returns
   *   tenants starting without any offset.
   *
   * @return A promise that resolves with
   *   a batch of downloaded tenants and the next page token.
   */
  public listTenants(
    maxResults?: number,
    pageToken?: string): Promise<ListTenantsResult> {
    return this.authRequestHandler.listTenants(maxResults, pageToken)
      .then((response: {tenants: TenantServerResponse[]; nextPageToken?: string}) => {
        // List of tenants to return.
        const tenants: Tenant[] = [];
        // Convert each user response to a Tenant.
        response.tenants.forEach((tenantResponse: TenantServerResponse) => {
          tenants.push(new Tenant(tenantResponse));
        });
        // Return list of tenants and the next page token if available.
        const result = {
          tenants,
          pageToken: response.nextPageToken,
        };
        // Delete result.pageToken if undefined.
        if (typeof result.pageToken === 'undefined') {
          delete result.pageToken;
        }
        return result;
      });
  }

  /**
   * Deletes an existing tenant.
   *
   * @param tenantId The `tenantId` corresponding to the tenant to delete.
   *
   * @return An empty promise fulfilled once the tenant has been deleted.
   */
  public deleteTenant(tenantId: string): Promise<void> {
    return this.authRequestHandler.deleteTenant(tenantId);
  }

  /**
   * Creates a new tenant.
   * When creating new tenants, tenants that use separate billing and quota will require their
   * own project and must be defined as `full_service`.
   *
   * @param tenantOptions The properties to set on the new tenant configuration to be created.
   *
   * @return A promise fulfilled with the tenant configuration corresponding to the newly
   *   created tenant.
   */
  public createTenant(tenantOptions: TenantOptions): Promise<Tenant> {
    return this.authRequestHandler.createTenant(tenantOptions)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }

  /**
   * Updates an existing tenant configuration.
   *
   * @param tenantId The `tenantId` corresponding to the tenant to delete.
   * @param tenantOptions The properties to update on the provided tenant.
   *
   * @return A promise fulfilled with the update tenant data.
   */
  public updateTenant(tenantId: string, tenantOptions: TenantOptions): Promise<Tenant> {
    return this.authRequestHandler.updateTenant(tenantId, tenantOptions)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }
}

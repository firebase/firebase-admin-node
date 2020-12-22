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
import { Tenant, TenantServerResponse } from './tenant';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import * as validator from '../utils/validator';
import { auth } from './index';

import ListTenantsResult = auth.ListTenantsResult;
import TenantManagerInterface = auth.TenantManager;
import CreateTenantRequest = auth.CreateTenantRequest;
import UpdateTenantRequest = auth.UpdateTenantRequest;

/**
 * Data structure used to help manage tenant related operations.
 * This includes:
 * - The ability to create, update, list, get and delete tenants for the underlying project.
 * - Getting a TenantAwareAuth instance for running Auth related operations (user mgmt, provider config mgmt, etc)
 *   in the context of a specified tenant.
 */
export class TenantManager implements TenantManagerInterface {
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
   * Returns a TenantAwareAuth instance for the corresponding tenant ID.
   *
   * @param tenantId The tenant ID whose TenantAwareAuth is to be returned.
   * @return The corresponding TenantAwareAuth instance.
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
   * Looks up the tenant identified by the provided tenant ID and returns a promise that is
   * fulfilled with the corresponding tenant if it is found.
   *
   * @param tenantId The tenant ID of the tenant to look up.
   * @return A promise that resolves with the corresponding tenant.
   */
  public getTenant(tenantId: string): Promise<Tenant> {
    return this.authRequestHandler.getTenant(tenantId)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }

  /**
   * Exports a batch of tenant accounts. Batch size is determined by the maxResults argument.
   * Starting point of the batch is determined by the pageToken argument.
   *
   * @param maxResults The page size, 1000 if undefined. This is also the maximum
   *     allowed limit.
   * @param pageToken The next page token. If not specified, returns users starting
   *     without any offset.
   * @return A promise that resolves with
   *     the current batch of downloaded tenants and the next page token. For the last page, an
   *     empty list of tenants and no page token are returned.
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
   * Deletes the tenant identified by the provided tenant ID and returns a promise that is
   * fulfilled when the tenant is found and successfully deleted.
   *
   * @param tenantId The tenant ID of the tenant to delete.
   * @return A promise that resolves when the tenant is successfully deleted.
   */
  public deleteTenant(tenantId: string): Promise<void> {
    return this.authRequestHandler.deleteTenant(tenantId);
  }

  /**
   * Creates a new tenant with the properties provided.
   *
   * @param tenantOptions The properties to set on the new tenant to be created.
   * @return A promise that resolves with the newly created tenant.
   */
  public createTenant(tenantOptions: CreateTenantRequest): Promise<Tenant> {
    return this.authRequestHandler.createTenant(tenantOptions)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }

  /**
   * Updates an existing tenant identified by the tenant ID with the properties provided.
   *
   * @param tenantId The tenant identifier of the tenant to update.
   * @param tenantOptions The properties to update on the existing tenant.
   * @return A promise that resolves with the modified tenant.
   */
  public updateTenant(tenantId: string, tenantOptions: UpdateTenantRequest): Promise<Tenant> {
    return this.authRequestHandler.updateTenant(tenantId, tenantOptions)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }
}

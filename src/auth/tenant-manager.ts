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
import { App } from '../app';
import * as utils from '../utils/index';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';

import { BaseAuth, createFirebaseTokenGenerator, SessionCookieOptions } from './base-auth';
import { Tenant, TenantServerResponse, CreateTenantRequest, UpdateTenantRequest } from './tenant';
import {
  AuthRequestHandler, TenantAwareAuthRequestHandler,
} from './auth-api-request';
import { DecodedIdToken } from './token-verifier';

/**
 * Interface representing the object returned from a
 * {@link TenantManager.listTenants}
 * operation.
 * Contains the list of tenants for the current batch and the next page token if available.
 */
export interface ListTenantsResult {

  /**
   * The list of {@link Tenant} objects for the downloaded batch.
   */
  tenants: Tenant[];

  /**
   * The next page token if available. This is needed for the next batch download.
   */
  pageToken?: string;
}

/**
 * Tenant-aware `Auth` interface used for managing users, configuring SAML/OIDC providers,
 * generating email links for password reset, email verification, etc for specific tenants.
 *
 * Multi-tenancy support requires Google Cloud's Identity Platform
 * (GCIP). To learn more about GCIP, including pricing and features,
 * see the {@link https://cloud.google.com/identity-platform | GCIP documentation}.
 *
 * Each tenant contains its own identity providers, settings and sets of users.
 * Using `TenantAwareAuth`, users for a specific tenant and corresponding OIDC/SAML
 * configurations can also be managed, ID tokens for users signed in to a specific tenant
 * can be verified, and email action links can also be generated for users belonging to the
 * tenant.
 *
 * `TenantAwareAuth` instances for a specific `tenantId` can be instantiated by calling
 * {@link TenantManager.authForTenant}.
 */
export class TenantAwareAuth extends BaseAuth {

  /**
   * The tenant identifier corresponding to this `TenantAwareAuth` instance.
   * All calls to the user management APIs, OIDC/SAML provider management APIs, email link
   * generation APIs, etc will only be applied within the scope of this tenant.
   */
  public readonly tenantId: string;

  /**
   * The TenantAwareAuth class constructor.
   *
   * @param app - The app that created this tenant.
   * @param tenantId - The corresponding tenant ID.
   * @constructor
   * @internal
   */
  constructor(app: App, tenantId: string) {
    super(app, new TenantAwareAuthRequestHandler(
      app, tenantId), createFirebaseTokenGenerator(app, tenantId));
    utils.addReadonlyGetter(this, 'tenantId', tenantId);
  }

  /**
   * {@inheritdoc BaseAuth.verifyIdToken}
   */
  public verifyIdToken(idToken: string, checkRevoked = false): Promise<DecodedIdToken> {
    return super.verifyIdToken(idToken, checkRevoked)
      .then((decodedClaims) => {
        // Validate tenant ID.
        if (decodedClaims.firebase.tenant !== this.tenantId) {
          throw new FirebaseAuthError(AuthClientErrorCode.MISMATCHING_TENANT_ID);
        }
        return decodedClaims;
      });
  }

  /**
   * {@inheritdoc BaseAuth.createSessionCookie}
   */
  public createSessionCookie(
    idToken: string, sessionCookieOptions: SessionCookieOptions): Promise<string> {
    // Validate arguments before processing.
    if (!validator.isNonEmptyString(idToken)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ID_TOKEN));
    }
    if (!validator.isNonNullObject(sessionCookieOptions) ||
        !validator.isNumber(sessionCookieOptions.expiresIn)) {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_SESSION_COOKIE_DURATION));
    }
    // This will verify the ID token and then match the tenant ID before creating the session cookie.
    return this.verifyIdToken(idToken)
      .then(() => {
        return super.createSessionCookie(idToken, sessionCookieOptions);
      });
  }

  /**
   * {@inheritdoc BaseAuth.verifySessionCookie}
   */
  public verifySessionCookie(
    sessionCookie: string, checkRevoked = false): Promise<DecodedIdToken> {
    return super.verifySessionCookie(sessionCookie, checkRevoked)
      .then((decodedClaims) => {
        if (decodedClaims.firebase.tenant !== this.tenantId) {
          throw new FirebaseAuthError(AuthClientErrorCode.MISMATCHING_TENANT_ID);
        }
        return decodedClaims;
      });
  }
}

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
   *
   * @param app - The app for this TenantManager instance.
   *
   * @constructor
   * @internal
   */
  constructor(private readonly app: App) {
    this.authRequestHandler = new AuthRequestHandler(app);
    this.tenantsMap = {};
  }

  /**
   * Returns a `TenantAwareAuth` instance bound to the given tenant ID.
   *
   * @param tenantId - The tenant ID whose `TenantAwareAuth` instance is to be returned.
   *
   * @returns The `TenantAwareAuth` instance corresponding to this tenant identifier.
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
   * @param tenantId - The tenant identifier corresponding to the tenant whose data to fetch.
   *
   * @returns A promise fulfilled with the tenant configuration to the provided `tenantId`.
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
   * @param maxResults - The page size, 1000 if undefined. This is also
   *   the maximum allowed limit.
   * @param pageToken - The next page token. If not specified, returns
   *   tenants starting without any offset.
   *
   * @returns A promise that resolves with
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
   * @param tenantId - The `tenantId` corresponding to the tenant to delete.
   *
   * @returns An empty promise fulfilled once the tenant has been deleted.
   */
  public deleteTenant(tenantId: string): Promise<void> {
    return this.authRequestHandler.deleteTenant(tenantId);
  }

  /**
   * Creates a new tenant.
   * When creating new tenants, tenants that use separate billing and quota will require their
   * own project and must be defined as `full_service`.
   *
   * @param tenantOptions - The properties to set on the new tenant configuration to be created.
   *
   * @returns A promise fulfilled with the tenant configuration corresponding to the newly
   *   created tenant.
   */
  public createTenant(tenantOptions: CreateTenantRequest): Promise<Tenant> {
    return this.authRequestHandler.createTenant(tenantOptions)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }

  /**
   * Updates an existing tenant configuration.
   *
   * @param tenantId - The `tenantId` corresponding to the tenant to delete.
   * @param tenantOptions - The properties to update on the provided tenant.
   *
   * @returns A promise fulfilled with the update tenant data.
   */
  public updateTenant(tenantId: string, tenantOptions: UpdateTenantRequest): Promise<Tenant> {
    return this.authRequestHandler.updateTenant(tenantId, tenantOptions)
      .then((response: TenantServerResponse) => {
        return new Tenant(response);
      });
  }
}

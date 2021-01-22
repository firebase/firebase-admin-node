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

import { BaseAuth, SessionCookieOptions } from './base-auth';
import { Tenant, TenantServerResponse, CreateTenantRequest, UpdateTenantRequest } from './tenant';
import { FirebaseTokenGenerator, EmulatedSigner, cryptoSignerFromApp } from './token-generator';
import {
  AuthRequestHandler, TenantAwareAuthRequestHandler, useEmulator,
} from './auth-api-request';
import { DecodedIdToken } from './token-verifier';

/**
 * Interface representing the object returned from a
 * {@link auth.TenantManager.listTenants `listTenants()`}
 * operation.
 * Contains the list of tenants for the current batch and the next page token if available.
 */
export interface ListTenantsResult {

  /**
   * The list of {@link auth.Tenant `Tenant`} objects for the downloaded batch.
   */
  tenants: Tenant[];

  /**
   * The next page token if available. This is needed for the next batch download.
   */
  pageToken?: string;
}

/**
 * The tenant aware Auth class.
 */
export class TenantAwareAuth extends BaseAuth {

  public readonly tenantId: string;

  /**
   * The TenantAwareAuth class constructor.
   *
   * @param {object} app The app that created this tenant.
   * @param tenantId The corresponding tenant ID.
   * @constructor
   * @internal
   */
  constructor(app: App, tenantId: string) {
    const cryptoSigner = useEmulator() ? new EmulatedSigner() : cryptoSignerFromApp(app);
    const tokenGenerator = new FirebaseTokenGenerator(cryptoSigner, tenantId);
    super(app, new TenantAwareAuthRequestHandler(app, tenantId), tokenGenerator);
    utils.addReadonlyGetter(this, 'tenantId', tenantId);
  }

  /**
   * Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified. If checkRevoked is set to true,
   * verifies if the session corresponding to the ID token was revoked. If the corresponding
   * user's session was invalidated, an auth/id-token-revoked error is thrown. If not specified
   * the check is not applied.
   *
   * @param {string} idToken The JWT to verify.
   * @param {boolean=} checkRevoked Whether to check if the ID token is revoked.
   * @return {Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful
   *     verification.
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
   * Creates a new Firebase session cookie with the specified options that can be used for
   * session management (set as a server side session cookie with custom cookie policy).
   * The session cookie JWT will have the same payload claims as the provided ID token.
   *
   * @param {string} idToken The Firebase ID token to exchange for a session cookie.
   * @param {SessionCookieOptions} sessionCookieOptions The session cookie options which includes
   *     custom session duration.
   *
   * @return {Promise<string>} A promise that resolves on success with the created session cookie.
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
   * Verifies a Firebase session cookie. Returns a Promise with the tokens claims. Rejects
   * the promise if the token could not be verified. If checkRevoked is set to true,
   * verifies if the session corresponding to the session cookie was revoked. If the corresponding
   * user's session was invalidated, an auth/session-cookie-revoked error is thrown. If not
   * specified the check is not performed.
   *
   * @param {string} sessionCookie The session cookie to verify.
   * @param {boolean=} checkRevoked Whether to check if the session cookie is revoked.
   * @return {Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful
   *     verification.
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
 * Data structure used to help manage tenant related operations.
 * This includes:
 * - The ability to create, update, list, get and delete tenants for the underlying project.
 * - Getting a TenantAwareAuth instance for running Auth related operations (user mgmt, provider config mgmt, etc)
 *   in the context of a specified tenant.
 */
export class TenantManager {
  private readonly authRequestHandler: AuthRequestHandler;
  private readonly tenantsMap: {[key: string]: TenantAwareAuth};

  /**
   * Initializes a TenantManager instance for a specified FirebaseApp.
   *
   * @param app The app for this TenantManager instance.
   *
   * @constructor
   * @internal
   */
  constructor(private readonly app: App) {
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

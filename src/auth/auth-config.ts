/*!
 * Copyright 2018 Google Inc.
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


/** The filter interface used for listing provider configurations. */
export interface AuthProviderConfigFilter {
  type: 'saml' | 'oidc';
  maxResults?: number;
  pageToken?: string;
}

/** The base Auth provider configuration interface. */
export interface AuthProviderConfig {
  providerId: string;
  displayName?: string;
  enabled: boolean;
}

/** The OIDC Auth provider configuration interface. */
export interface OIDCAuthProviderConfig extends AuthProviderConfig {
  clientId: string;
  issuer: string;
}

/** The SAML Auth provider configuration interface. */
export interface SAMLAuthProviderConfig extends AuthProviderConfig {
  idpEntityId: string;
  ssoURL: string;
  x509Certificates: string[];
  rpEntityId: string;
  callbackURL?: string;
  enableRequestSigning?: boolean;
}

/** The public API response interface for listing provider configs. */
export interface ListProviderConfigResults {
  providerConfigs: AuthProviderConfig[];
  pageToken?: string;
}

/** The public API request interface for updating a SAML Auth provider. */
export interface SAMLUpdateAuthProviderRequest {
  idpEntityId?: string;
  ssoURL?: string;
  x509Certificates?: string[];
  rpEntityId?: string;
  callbackURL?: string;
  enableRequestSigning?: boolean;
  enabled?: boolean;
  displayName?: string;
}

/** The generic request interface for updating/creating a SAML Auth provider. */
export interface SAMLAuthProviderRequest extends SAMLUpdateAuthProviderRequest {
  providerId?: string;
}

/** The public API request interface for updating an OIDC Auth provider. */
export interface OIDCUpdateAuthProviderRequest {
  clientId?: string;
  issuer?: string;
  enabled?: boolean;
  displayName?: string;
}

/** The public API request interface for updating a generic Auth provider. */
export type UpdateAuthProviderRequest = SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest;
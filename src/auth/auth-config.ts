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

import * as validator from '../utils/validator';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import { AuthFactorServerType } from './auth-config-internal';

/** A maximum of 10 test phone number / code pairs can be configured. */
export const MAXIMUM_TEST_PHONE_NUMBERS = 10;

/**
 * The filter interface used for listing provider configurations. This is used
 * when specifying how to list configured identity providers via
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listProviderConfigs `listProviderConfigs()`}.
 */
export interface AuthProviderConfigFilter {
  /**
   * The Auth provider configuration filter. This can be either `saml` or `oidc`.
   * The former is used to look up SAML providers only, while the latter is used
   * for OIDC providers.
   */
  type: 'saml' | 'oidc';
  /**
   * The maximum number of results to return per page. The default and maximum is
   * 100.
   */
  maxResults?: number;
  /**
   * The next page token. When not specified, the lookup starts from the beginning
   * of the list.
   */
  pageToken?: string;
}

/**
 * The base Auth provider configuration interface.
 */
export interface AuthProviderConfig {
  /**
   * The provider ID defined by the developer.
   * For a SAML provider, this is always prefixed by `saml.`.
   * For an OIDC provider, this is always prefixed by `oidc.`.
   */
  providerId: string;

  /**
   * The user-friendly display name to the current configuration. This name is
   * also used as the provider label in the Cloud Console.
   */
  displayName?: string;

  /**
   * Whether the provider configuration is enabled or disabled. A user
   * cannot sign in using a disabled provider.
   */
  enabled: boolean;
}

/**
 * The [OIDC](https://openid.net/specs/openid-connect-core-1_0-final.html) Auth
 * provider configuration interface. An OIDC provider can be created via
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createProviderConfig `createProviderConfig()`}.
 */
export interface OIDCAuthProviderConfig extends AuthProviderConfig {
  /**
   * This is the required client ID used to confirm the audience of an OIDC
   * provider's
   * [ID token](https://openid.net/specs/openid-connect-core-1_0-final.html#IDToken).
   */
  clientId: string;

  /**
   * This is the required provider issuer used to match the provider issuer of
   * the ID token and to determine the corresponding OIDC discovery document, eg.
   * [`/.well-known/openid-configuration`](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig).
   * This is needed for the following:
   * <ul>
   * <li>To verify the provided issuer.</li>
   * <li>Determine the authentication/authorization endpoint during the OAuth
   *     `id_token` authentication flow.</li>
   * <li>To retrieve the public signing keys via `jwks_uri` to verify the OIDC
   *     provider's ID token's signature.</li>
   * <li>To determine the claims_supported to construct the user attributes to be
   *     returned in the additional user info response.</li>
   * </ul>
   * ID token validation will be performed as defined in the
   * [spec](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation).
   */
  issuer: string;
}

/**
 * The
 * [SAML](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
 * Auth provider configuration interface. A SAML provider can be created via
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createProviderConfig `createProviderConfig()`}.
 */
export interface SAMLAuthProviderConfig extends AuthProviderConfig {
  /**
   * The SAML IdP entity identifier.
   */
  idpEntityId: string;
  /**
   * The SAML IdP SSO URL. This must be a valid URL.
   */
  ssoURL: string;
  /**
   * The list of SAML IdP X.509 certificates issued by CA for this provider.
   * Multiple certificates are accepted to prevent outages during
   * IdP key rotation (for example ADFS rotates every 10 days). When the Auth
   * server receives a SAML response, it will match the SAML response with the
   * certificate on record. Otherwise the response is rejected.
   * Developers are expected to manage the certificate updates as keys are
   * rotated.
   */
  x509Certificates: string[];
  /**
   * The SAML relying party (service provider) entity ID.
   * This is defined by the developer but needs to be provided to the SAML IdP.
   */
  rpEntityId: string;
  /**
   * This is fixed and must always be the same as the OAuth redirect URL
   * provisioned by Firebase Auth,
   * `https://project-id.firebaseapp.com/__/auth/handler` unless a custom
   * `authDomain` is used.
   * The callback URL should also be provided to the SAML IdP during
   * configuration.
   */
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

/**
 * The request interface for updating an OIDC Auth provider. This is used
 * when updating an OIDC provider's configuration via
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#updateProviderConfig `updateProviderConfig()`}.
 */
export interface OIDCUpdateAuthProviderRequest {
  /**
   * The OIDC provider's updated client ID. If not provided, the existing
   * configuration's value is not modified.
   */
  clientId?: string;
  /**
   * The OIDC provider's updated issuer. If not provided, the existing
   * configuration's value is not modified.
   */
  issuer?: string;
  /**
   * Whether the OIDC provider is enabled or not. If not provided, the existing
   * configuration's setting is not modified.
   */
  enabled?: boolean;
  /**
   * The OIDC provider's updated display name. If not provided, the existing
   * configuration's value is not modified.
   */
  displayName?: string;
}

/** The public API request interface for updating a generic Auth provider. */
export type UpdateAuthProviderRequest = SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest;

/**
 * Identifies a second factor type.
 */
export type AuthFactorType = 'phone';

/** Identifies a multi-factor configuration state. */
export type MultiFactorConfigState =  'ENABLED' | 'DISABLED';

/**
 * Public API interface representing a multi-factor configuration.
 */
export interface MultiFactorConfig {
  /**
   * The multi-factor config state.
   */
  state: MultiFactorConfigState;

  /**
   * The list of identifiers for enabled second factors.
   * Currently only ‘phone’ is supported.
   */
  factorIds?: AuthFactorType[];
}

/** Server side multi-factor configuration. */
export interface MultiFactorAuthServerConfig {
  state?: MultiFactorConfigState;
  enabledProviders?: AuthFactorServerType[];
}

/**
 * Validates the provided map of test phone number / code pairs.
 * @param testPhoneNumbers The phone number / code pairs to validate.
 */
export function validateTestPhoneNumbers(
  testPhoneNumbers: {[phoneNumber: string]: string},
): void {
  if (!validator.isObject(testPhoneNumbers)) {
    throw new FirebaseAuthError(
      AuthClientErrorCode.INVALID_ARGUMENT,
      '"testPhoneNumbers" must be a map of phone number / code pairs.',
    );
  }
  if (Object.keys(testPhoneNumbers).length > MAXIMUM_TEST_PHONE_NUMBERS) {
    throw new FirebaseAuthError(AuthClientErrorCode.MAXIMUM_TEST_PHONE_NUMBER_EXCEEDED);
  }
  for (const phoneNumber in testPhoneNumbers) {
    // Validate phone number.
    if (!validator.isPhoneNumber(phoneNumber)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_TESTING_PHONE_NUMBER,
        `"${phoneNumber}" is not a valid E.164 standard compliant phone number.`
      );
    }

    // Validate code.
    if (!validator.isString(testPhoneNumbers[phoneNumber]) ||
        !/^[\d]{6}$/.test(testPhoneNumbers[phoneNumber])) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_TESTING_PHONE_NUMBER,
        `"${testPhoneNumbers[phoneNumber]}" is not a valid 6 digit code string.`
      );
    }
  }
}

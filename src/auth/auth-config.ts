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

import * as utils from '../utils';
import * as validator from '../utils/validator';
import {deepCopy} from '../utils/deep-copy';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';


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

/** The server side SAML configuration request interface. */
export interface SAMLConfigServerRequest {
  idpConfig?: {
    idpEntityId?: string;
    ssoUrl?: string;
    idpCertificates?: Array<{
      x509Certificate: string;
    }>;
    signRequest?: boolean;
  };
  spConfig?: {
    spEntityId?: string;
    callbackUri?: string;
  };
  displayName?: string;
  enabled?: boolean;
  [key: string]: any;
}

/** The server side SAML configuration response interface. */
export interface SAMLConfigServerResponse {
  // Used when getting config.
  // projects/${projectId}/inboundSamlConfigs/${providerId}
  name?: string;
  idpConfig?: {
    idpEntityId?: string;
    ssoUrl?: string;
    idpCertificates?: Array<{
      x509Certificate: string;
    }>;
    signRequest?: boolean;
  };
  spConfig?: {
    spEntityId?: string;
    callbackUri?: string;
  };
  displayName?: string;
  enabled?: boolean;
}

/** The server side OIDC configuration request interface. */
export interface OIDCConfigServerRequest {
  clientId?: string;
  issuer?: string;
  displayName?: string;
  enabled?: boolean;
  [key: string]: any;
}

/** The server side OIDC configuration response interface. */
export interface OIDCConfigServerResponse {
  // Used when getting config.
  // projects/${projectId}/oauthIdpConfigs/${providerId}
  name?: string;
  clientId?: string;
  issuer?: string;
  displayName?: string;
  enabled?: boolean;
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

/** The generic request interface for updating/creating an OIDC Auth provider. */
export interface OIDCAuthProviderRequest extends OIDCUpdateAuthProviderRequest {
  providerId?: string;
}

/** The public API request interface for updating a generic Auth provider. */
export type UpdateAuthProviderRequest = SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest;


/**
 * Defines the SAMLConfig class used to convert a client side configuration to its
 * server side representation.
 */
export class SAMLConfig implements SAMLAuthProviderConfig {
  public readonly enabled: boolean;
  public readonly displayName?: string;
  public readonly providerId: string;
  public readonly idpEntityId: string;
  public readonly ssoURL: string;
  public readonly x509Certificates: string[];
  public readonly rpEntityId: string;
  public readonly callbackURL?: string;
  public readonly enableRequestSigning?: boolean;

  /**
   * Converts a client side request to a SAMLConfigServerRequest which is the format
   * accepted by the backend server.
   * Throws an error if validation fails. If the request is not a SAMLConfig request,
   * returns null.
   *
   * @param {SAMLAuthProviderRequest} options The options object to convert to a server request.
   * @param {boolean=} ignoreMissingFields Whether to ignore missing fields.
   * @return {?SAMLConfigServerRequest} The resulting server request or null if not valid.
   */
  public static buildServerRequest(
      options: SAMLAuthProviderRequest,
      ignoreMissingFields: boolean = false): SAMLConfigServerRequest | null {
    const makeRequest = validator.isNonNullObject(options) &&
        (options.providerId || ignoreMissingFields);
    if (!makeRequest) {
      return null;
    }
    const request: SAMLConfigServerRequest = {};
    // Validate options.
    SAMLConfig.validate(options, ignoreMissingFields);
    request.enabled = options.enabled;
    request.displayName = options.displayName;
    // IdP config.
    if (options.idpEntityId || options.ssoURL || options.x509Certificates) {
      request.idpConfig = {
        idpEntityId: options.idpEntityId,
        ssoUrl: options.ssoURL,
        signRequest: options.enableRequestSigning,
        idpCertificates: typeof options.x509Certificates === 'undefined' ? undefined : [],
      };
      if (options.x509Certificates) {
        for (const cert of (options.x509Certificates || [])) {
          request.idpConfig.idpCertificates.push({x509Certificate: cert});
        }
      }
    }
    // RP config.
    if (options.callbackURL || options.rpEntityId) {
      request.spConfig = {
        spEntityId: options.rpEntityId,
        callbackUri: options.callbackURL,
      };
    }
    return request;
  }

  /**
   * Returns the provider ID corresponding to the resource name if available.
   *
   * @param {string} resourceName The server side resource name.
   * @return {?string} The provider ID corresponding to the resource, null otherwise.
   */
  public static getProviderIdFromResourceName(resourceName: string): string | null {
    // name is of form projects/project1/inboundSamlConfigs/providerId1
    const matchProviderRes = resourceName.match(/\/inboundSamlConfigs\/(saml\..*)$/);
    if (!matchProviderRes || matchProviderRes.length < 2) {
      return null;
    }
    return matchProviderRes[1];
  }

  /**
   * @param {any} providerId The provider ID to check.
   * @return {boolean} Whether the provider ID corresponds to a SAML provider.
   */
  public static isProviderId(providerId: any): providerId is string {
    return validator.isNonEmptyString(providerId) && providerId.indexOf('saml.') === 0;
  }

  /**
   * Validates the SAMLConfig options object. Throws an error on failure.
   *
   * @param {SAMLAuthProviderRequest} options The options object to validate.
   * @param {boolean=} ignoreMissingFields Whether to ignore missing fields.
   */
  public static validate(options: SAMLAuthProviderRequest, ignoreMissingFields: boolean = false) {
    const validKeys = {
      enabled: true,
      displayName: true,
      providerId: true,
      idpEntityId: true,
      ssoURL: true,
      x509Certificates: true,
      rpEntityId: true,
      callbackURL: true,
      enableRequestSigning: true,
    };
    if (!validator.isNonNullObject(options)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig" must be a valid non-null object.',
      );
    }
    // Check for unsupported top level attributes.
    for (const key in options) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_CONFIG,
          `"${key}" is not a valid SAML config parameter.`,
        );
      }
    }
    // Required fields.
    if (validator.isNonEmptyString(options.providerId)) {
      if (options.providerId.indexOf('saml.') !== 0) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_PROVIDER_ID,
          '"SAMLAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "saml.".',
        );
      }
    } else if (!ignoreMissingFields) {
      // providerId is required and not provided correctly.
      throw new FirebaseAuthError(
        !options.providerId ? AuthClientErrorCode.MISSING_PROVIDER_ID : AuthClientErrorCode.INVALID_PROVIDER_ID,
        '"SAMLAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "saml.".',
      );
    }
    if (!(ignoreMissingFields && typeof options.idpEntityId === 'undefined') &&
        !validator.isNonEmptyString(options.idpEntityId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.idpEntityId" must be a valid non-empty string.',
      );
    }
    if (!(ignoreMissingFields && typeof options.ssoURL === 'undefined') &&
        !validator.isURL(options.ssoURL)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.ssoURL" must be a valid URL string.',
      );
    }
    if (!(ignoreMissingFields && typeof options.rpEntityId === 'undefined') &&
        !validator.isNonEmptyString(options.rpEntityId)) {
      throw new FirebaseAuthError(
        !options.rpEntityId ? AuthClientErrorCode.MISSING_SAML_RELYING_PARTY_CONFIG :
            AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.rpEntityId" must be a valid non-empty string.',
      );
    }
    if (!(ignoreMissingFields && typeof options.callbackURL === 'undefined') &&
        !validator.isURL(options.callbackURL)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.callbackURL" must be a valid URL string.',
      );
    }
    if (!(ignoreMissingFields && typeof options.x509Certificates === 'undefined') &&
        !validator.isArray(options.x509Certificates)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.x509Certificates" must be a valid array of X509 certificate strings.',
      );
    }
    (options.x509Certificates || []).forEach((cert: string) => {
      if (!validator.isNonEmptyString(cert)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_CONFIG,
          '"SAMLAuthProviderConfig.x509Certificates" must be a valid array of X509 certificate strings.',
        );
      }
    });
    if (typeof options.enableRequestSigning !== 'undefined' &&
        !validator.isBoolean(options.enableRequestSigning)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.enableRequestSigning" must be a boolean.',
      );
    }
    if (typeof options.enabled !== 'undefined' &&
        !validator.isBoolean(options.enabled)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.enabled" must be a boolean.',
      );
    }
    if (typeof options.displayName !== 'undefined' &&
        !validator.isString(options.displayName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.displayName" must be a valid string.',
      );
    }
  }

  /**
   * The SAMLConfig constructor.
   *
   * @param {any} response The server side response used to initialize the SAMLConfig object.
   * @constructor
   */
  constructor(response: SAMLConfigServerResponse) {
    if (!response ||
        !response.idpConfig ||
        !response.spConfig ||
        !response.name ||
        !(validator.isString(response.name) &&
          SAMLConfig.getProviderIdFromResourceName(response.name))) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    }
    utils.addReadonlyGetter(this, 'providerId', SAMLConfig.getProviderIdFromResourceName(response.name));
    // RP config.
    utils.addReadonlyGetter(this, 'rpEntityId', response.spConfig.spEntityId);
    utils.addReadonlyGetter(this, 'callbackURL', response.spConfig.callbackUri);
    // IdP config.
    utils.addReadonlyGetter(this, 'idpEntityId', response.idpConfig.idpEntityId);
    utils.addReadonlyGetter(this, 'ssoURL', response.idpConfig.ssoUrl);
    utils.addReadonlyGetter(this, 'enableRequestSigning', !!response.idpConfig.signRequest);
    const x509Certificates: string[] = [];
    for (const cert of (response.idpConfig.idpCertificates || [])) {
      if (cert.x509Certificate) {
        x509Certificates.push(cert.x509Certificate);
      }
    }
    utils.addReadonlyGetter(this, 'x509Certificates', x509Certificates);
    // When enabled is undefined, it takes its default value of false.
    utils.addReadonlyGetter(this, 'enabled', !!response.enabled);
    utils.addReadonlyGetter(this, 'displayName', response.displayName);
  }

  /** @return {SAMLAuthProviderConfig} The plain object representation of the SAMLConfig. */
  public toJSON(): SAMLAuthProviderConfig {
    return {
      enabled: this.enabled,
      displayName: this.displayName,
      providerId: this.providerId,
      idpEntityId: this.idpEntityId,
      ssoURL: this.ssoURL,
      x509Certificates: deepCopy(this.x509Certificates),
      rpEntityId: this.rpEntityId,
      callbackURL: this.callbackURL,
      enableRequestSigning: this.enableRequestSigning,
    };
  }
}

/**
 * Defines the OIDCConfig class used to convert a client side configuration to its
 * server side representation.
 */
export class OIDCConfig implements OIDCAuthProviderConfig {
  public readonly enabled: boolean;
  public readonly displayName?: string;
  public readonly providerId: string;
  public readonly issuer: string;
  public readonly clientId: string;

  /**
   * Converts a client side request to a OIDCConfigServerRequest which is the format
   * accepted by the backend server.
   * Throws an error if validation fails. If the request is not a OIDCConfig request,
   * returns null.
   *
   * @param {OIDCAuthProviderRequest} options The options object to convert to a server request.
   * @param {boolean=} ignoreMissingFields Whether to ignore missing fields.
   * @return {?OIDCConfigServerRequest} The resulting server request or null if not valid.
   */
  public static buildServerRequest(
      options: OIDCAuthProviderRequest,
      ignoreMissingFields: boolean = false): OIDCConfigServerRequest | null {
    const makeRequest = validator.isNonNullObject(options) &&
        (options.providerId || ignoreMissingFields);
    if (!makeRequest) {
      return null;
    }
    const request: OIDCConfigServerRequest = {};
    // Validate options.
    OIDCConfig.validate(options, ignoreMissingFields);
    request.enabled = options.enabled;
    request.displayName = options.displayName;
    request.issuer = options.issuer;
    request.clientId = options.clientId;
    return request;
  }

  /**
   * Returns the provider ID corresponding to the resource name if available.
   *
   * @param {string} resourceName The server side resource name
   * @return {?string} The provider ID corresponding to the resource, null otherwise.
   */
  public static getProviderIdFromResourceName(resourceName: string): string | null {
    // name is of form projects/project1/oauthIdpConfigs/providerId1
    const matchProviderRes = resourceName.match(/\/oauthIdpConfigs\/(oidc\..*)$/);
    if (!matchProviderRes || matchProviderRes.length < 2) {
      return null;
    }
    return matchProviderRes[1];
  }

  /**
   * @param {any} providerId The provider ID to check.
   * @return {boolean} Whether the provider ID corresponds to an OIDC provider.
   */
  public static isProviderId(providerId: any): providerId is string {
    return validator.isNonEmptyString(providerId) && providerId.indexOf('oidc.') === 0;
  }

  /**
   * Validates the OIDCConfig options object. Throws an error on failure.
   *
   * @param {OIDCAuthProviderRequest} options The options object to validate.
   * @param {boolean=} ignoreMissingFields Whether to ignore missing fields.
   */
  public static validate(options: OIDCAuthProviderRequest, ignoreMissingFields: boolean = false) {
    const validKeys = {
      enabled: true,
      displayName: true,
      providerId: true,
      clientId: true,
      issuer: true,
    };
    if (!validator.isNonNullObject(options)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"OIDCAuthProviderConfig" must be a valid non-null object.',
      );
    }
    // Check for unsupported top level attributes.
    for (const key in options) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_CONFIG,
          `"${key}" is not a valid OIDC config parameter.`,
        );
      }
    }
    // Required fields.
    if (validator.isNonEmptyString(options.providerId)) {
      if (options.providerId.indexOf('oidc.') !== 0) {
        throw new FirebaseAuthError(
          !options.providerId ? AuthClientErrorCode.MISSING_PROVIDER_ID : AuthClientErrorCode.INVALID_PROVIDER_ID,
          '"OIDCAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "oidc.".',
        );
      }
    } else if (!ignoreMissingFields) {
      throw new FirebaseAuthError(
        !options.providerId ? AuthClientErrorCode.MISSING_PROVIDER_ID : AuthClientErrorCode.INVALID_PROVIDER_ID,
        '"OIDCAuthProviderConfig.providerId" must be a valid non-empty string prefixed with "oidc.".',
      );
    }
    if (!(ignoreMissingFields && typeof options.clientId === 'undefined') &&
        !validator.isNonEmptyString(options.clientId)) {
      throw new FirebaseAuthError(
        !options.clientId ? AuthClientErrorCode.MISSING_OAUTH_CLIENT_ID : AuthClientErrorCode.INVALID_OAUTH_CLIENT_ID,
        '"OIDCAuthProviderConfig.clientId" must be a valid non-empty string.',
      );
    }
    if (!(ignoreMissingFields && typeof options.issuer === 'undefined') &&
        !validator.isURL(options.issuer)) {
      throw new FirebaseAuthError(
        !options.issuer ? AuthClientErrorCode.MISSING_ISSUER : AuthClientErrorCode.INVALID_CONFIG,
        '"OIDCAuthProviderConfig.issuer" must be a valid URL string.',
      );
    }
    if (typeof options.enabled !== 'undefined' &&
        !validator.isBoolean(options.enabled)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"OIDCAuthProviderConfig.enabled" must be a boolean.',
      );
    }
    if (typeof options.displayName !== 'undefined' &&
        !validator.isString(options.displayName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"OIDCAuthProviderConfig.displayName" must be a valid string.',
      );
    }
  }

  /**
   * The OIDCConfig constructor.
   *
   * @param {any} response The server side response used to initialize the OIDCConfig object.
   * @constructor
   */
  constructor(response: OIDCConfigServerResponse) {
    if (!response ||
        !response.issuer ||
        !response.clientId ||
        !response.name ||
        !(validator.isString(response.name) &&
          OIDCConfig.getProviderIdFromResourceName(response.name))) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid OIDC configuration response');
    }
    utils.addReadonlyGetter(this, 'providerId', OIDCConfig.getProviderIdFromResourceName(response.name));
    utils.addReadonlyGetter(this, 'clientId', response.clientId);
    utils.addReadonlyGetter(this, 'issuer', response.issuer);
    // When enabled is undefined, it takes its default value of false.
    utils.addReadonlyGetter(this, 'enabled', !!response.enabled);
    utils.addReadonlyGetter(this, 'displayName', response.displayName);
  }

  /** @return {OIDCAuthProviderConfig} The plain object representation of the OIDCConfig. */
  public toJSON(): OIDCAuthProviderConfig {
    return {
      enabled: this.enabled,
      displayName: this.displayName,
      providerId: this.providerId,
      issuer: this.issuer,
      clientId: this.clientId,
    };
  }
}

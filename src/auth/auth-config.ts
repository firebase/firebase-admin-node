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
import { deepCopy } from '../utils/deep-copy';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import { auth } from './index';

import MultiFactorConfigInterface = auth.MultiFactorConfig;
import MultiFactorConfigState = auth.MultiFactorConfigState;
import AuthFactorType = auth.AuthFactorType;
import EmailSignInProviderConfig = auth.EmailSignInProviderConfig;
import OIDCAuthProviderConfig = auth.OIDCAuthProviderConfig;
import SAMLAuthProviderConfig = auth.SAMLAuthProviderConfig;

/** A maximum of 10 test phone number / code pairs can be configured. */
export const MAXIMUM_TEST_PHONE_NUMBERS = 10;

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

/** The server side email configuration request interface. */
export interface EmailSignInConfigServerRequest {
  allowPasswordSignup?: boolean;
  enableEmailLinkSignin?: boolean;
}

/** Identifies the server side second factor type. */
type AuthFactorServerType = 'PHONE_SMS';

/** Client Auth factor type to server auth factor type mapping. */
const AUTH_FACTOR_CLIENT_TO_SERVER_TYPE: {[key: string]: AuthFactorServerType} = {
  phone: 'PHONE_SMS',
};

/** Server Auth factor type to client auth factor type mapping. */
const AUTH_FACTOR_SERVER_TO_CLIENT_TYPE: {[key: string]: AuthFactorType} =
  Object.keys(AUTH_FACTOR_CLIENT_TO_SERVER_TYPE)
    .reduce((res: {[key: string]: AuthFactorType}, key) => {
      res[AUTH_FACTOR_CLIENT_TO_SERVER_TYPE[key]] = key as AuthFactorType;
      return res;
    }, {});

/** Server side multi-factor configuration. */
export interface MultiFactorAuthServerConfig {
  state?: MultiFactorConfigState;
  enabledProviders?: AuthFactorServerType[];
}

/**
 * Defines the multi-factor config class used to convert client side MultiFactorConfig
 * to a format that is understood by the Auth server.
 */
export class MultiFactorAuthConfig implements MultiFactorConfigInterface {
  public readonly state: MultiFactorConfigState;
  public readonly factorIds: AuthFactorType[];

  /**
   * Static method to convert a client side request to a MultiFactorAuthServerConfig.
   * Throws an error if validation fails.
   *
   * @param options The options object to convert to a server request.
   * @return The resulting server request.
   */
  public static buildServerRequest(options: MultiFactorConfigInterface): MultiFactorAuthServerConfig {
    const request: MultiFactorAuthServerConfig = {};
    MultiFactorAuthConfig.validate(options);
    if (Object.prototype.hasOwnProperty.call(options, 'state')) {
      request.state = options.state;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'factorIds')) {
      (options.factorIds || []).forEach((factorId) => {
        if (typeof request.enabledProviders === 'undefined') {
          request.enabledProviders = [];
        }
        request.enabledProviders.push(AUTH_FACTOR_CLIENT_TO_SERVER_TYPE[factorId]);
      });
      // In case an empty array is passed. Ensure it gets populated so the array is cleared.
      if (options.factorIds && options.factorIds.length === 0) {
        request.enabledProviders = [];
      }
    }
    return request;
  }

  /**
   * Validates the MultiFactorConfig options object. Throws an error on failure.
   *
   * @param options The options object to validate.
   */
  private static validate(options: MultiFactorConfigInterface): void {
    const validKeys = {
      state: true,
      factorIds: true,
    };
    if (!validator.isNonNullObject(options)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"MultiFactorConfig" must be a non-null object.',
      );
    }
    // Check for unsupported top level attributes.
    for (const key in options) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_CONFIG,
          `"${key}" is not a valid MultiFactorConfig parameter.`,
        );
      }
    }
    // Validate content.
    if (typeof options.state !== 'undefined' &&
        options.state !== 'ENABLED' &&
        options.state !== 'DISABLED') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"MultiFactorConfig.state" must be either "ENABLED" or "DISABLED".',
      );
    }

    if (typeof options.factorIds !== 'undefined') {
      if (!validator.isArray(options.factorIds)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_CONFIG,
          '"MultiFactorConfig.factorIds" must be an array of valid "AuthFactorTypes".',
        );
      }

      // Validate content of array.
      options.factorIds.forEach((factorId) => {
        if (typeof AUTH_FACTOR_CLIENT_TO_SERVER_TYPE[factorId] === 'undefined') {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_CONFIG,
            `"${factorId}" is not a valid "AuthFactorType".`,
          );
        }
      });
    }
  }

  /**
   * The MultiFactorAuthConfig constructor.
   *
   * @param response The server side response used to initialize the
   *     MultiFactorAuthConfig object.
   * @constructor
   */
  constructor(response: MultiFactorAuthServerConfig) {
    if (typeof response.state === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid multi-factor configuration response');
    }
    this.state = response.state;
    this.factorIds = [];
    (response.enabledProviders || []).forEach((enabledProvider) => {
      // Ignore unsupported types. It is possible the current admin SDK version is
      // not up to date and newer backend types are supported.
      if (typeof AUTH_FACTOR_SERVER_TO_CLIENT_TYPE[enabledProvider] !== 'undefined') {
        this.factorIds.push(AUTH_FACTOR_SERVER_TO_CLIENT_TYPE[enabledProvider]);
      }
    })
  }

  /** @return The plain object representation of the multi-factor config instance. */
  public toJSON(): object {
    return {
      state: this.state,
      factorIds: this.factorIds,
    };
  }
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


/**
 * Defines the email sign-in config class used to convert client side EmailSignInConfig
 * to a format that is understood by the Auth server.
 */
export class EmailSignInConfig implements EmailSignInProviderConfig {
  public readonly enabled: boolean;
  public readonly passwordRequired?: boolean;

  /**
   * Static method to convert a client side request to a EmailSignInConfigServerRequest.
   * Throws an error if validation fails.
   *
   * @param {any} options The options object to convert to a server request.
   * @return {EmailSignInConfigServerRequest} The resulting server request.
   */
  public static buildServerRequest(options: EmailSignInProviderConfig): EmailSignInConfigServerRequest {
    const request: EmailSignInConfigServerRequest = {};
    EmailSignInConfig.validate(options);
    if (Object.prototype.hasOwnProperty.call(options, 'enabled')) {
      request.allowPasswordSignup = options.enabled;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'passwordRequired')) {
      request.enableEmailLinkSignin = !options.passwordRequired;
    }
    return request;
  }

  /**
   * Validates the EmailSignInConfig options object. Throws an error on failure.
   *
   * @param {any} options The options object to validate.
   */
  private static validate(options: EmailSignInProviderConfig): void {
    // TODO: Validate the request.
    const validKeys = {
      enabled: true,
      passwordRequired: true,
    };
    if (!validator.isNonNullObject(options)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"EmailSignInConfig" must be a non-null object.',
      );
    }
    // Check for unsupported top level attributes.
    for (const key in options) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `"${key}" is not a valid EmailSignInConfig parameter.`,
        );
      }
    }
    // Validate content.
    if (typeof options.enabled !== 'undefined' &&
        !validator.isBoolean(options.enabled)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"EmailSignInConfig.enabled" must be a boolean.',
      );
    }
    if (typeof options.passwordRequired !== 'undefined' &&
        !validator.isBoolean(options.passwordRequired)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"EmailSignInConfig.passwordRequired" must be a boolean.',
      );
    }
  }

  /**
   * The EmailSignInConfig constructor.
   *
   * @param {any} response The server side response used to initialize the
   *     EmailSignInConfig object.
   * @constructor
   */
  constructor(response: {[key: string]: any}) {
    if (typeof response.allowPasswordSignup === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid email sign-in configuration response');
    }
    this.enabled = response.allowPasswordSignup;
    this.passwordRequired = !response.enableEmailLinkSignin;
  }

  /** @return {object} The plain object representation of the email sign-in config. */
  public toJSON(): object {
    return {
      enabled: this.enabled,
      passwordRequired: this.passwordRequired,
    };
  }
}


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
    options: Partial<SAMLAuthProviderConfig>,
    ignoreMissingFields = false): SAMLConfigServerRequest | null {
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
        signRequest: (options as any).enableRequestSigning,
        idpCertificates: typeof options.x509Certificates === 'undefined' ? undefined : [],
      };
      if (options.x509Certificates) {
        for (const cert of (options.x509Certificates || [])) {
          request.idpConfig!.idpCertificates!.push({ x509Certificate: cert });
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
  public static validate(options: Partial<SAMLAuthProviderConfig>, ignoreMissingFields = false): void {
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
    if (typeof (options as any).enableRequestSigning !== 'undefined' &&
        !validator.isBoolean((options as any).enableRequestSigning)) {
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
        !response.idpConfig.idpEntityId ||
        !response.idpConfig.ssoUrl ||
        !response.spConfig ||
        !response.spConfig.spEntityId ||
        !response.name ||
        !(validator.isString(response.name) &&
          SAMLConfig.getProviderIdFromResourceName(response.name))) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    }

    const providerId = SAMLConfig.getProviderIdFromResourceName(response.name);
    if (!providerId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    }
    this.providerId = providerId;

    // RP config.
    this.rpEntityId = response.spConfig.spEntityId;
    this.callbackURL = response.spConfig.callbackUri;
    // IdP config.
    this.idpEntityId = response.idpConfig.idpEntityId;
    this.ssoURL = response.idpConfig.ssoUrl;
    this.enableRequestSigning = !!response.idpConfig.signRequest;
    const x509Certificates: string[] = [];
    for (const cert of (response.idpConfig.idpCertificates || [])) {
      if (cert.x509Certificate) {
        x509Certificates.push(cert.x509Certificate);
      }
    }
    this.x509Certificates = x509Certificates;
    // When enabled is undefined, it takes its default value of false.
    this.enabled = !!response.enabled;
    this.displayName = response.displayName;
  }

  /** @return The plain object representation of the SAMLConfig. */
  public toJSON(): object {
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
   * @param options The options object to convert to a server request.
   * @param ignoreMissingFields Whether to ignore missing fields.
   * @return The resulting server request or null if not valid.
   */
  public static buildServerRequest(
    options: Partial<OIDCAuthProviderConfig>,
    ignoreMissingFields = false): OIDCConfigServerRequest | null {
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
   * @param options The options object to validate.
   * @param ignoreMissingFields Whether to ignore missing fields.
   */
  public static validate(options: Partial<OIDCAuthProviderConfig>, ignoreMissingFields = false): void {
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

    const providerId = OIDCConfig.getProviderIdFromResourceName(response.name);
    if (!providerId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid SAML configuration response');
    }
    this.providerId = providerId;

    this.clientId = response.clientId;
    this.issuer = response.issuer;
    // When enabled is undefined, it takes its default value of false.
    this.enabled = !!response.enabled;
    this.displayName = response.displayName;
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

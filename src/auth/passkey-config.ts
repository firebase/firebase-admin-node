/*!
 * Copyright 2023 Google Inc.
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
import { deepCopy } from '../utils/deep-copy';

/**
 * Interface representing the properties to update in a passkey config.
 */
export interface PasskeyConfigRequest {
    rpId?: string;
    /**
     * An array of website or app origins. Only challenges signed
     * from these origins will be allowed for signing in with passkeys.
     */
    expectedOrigins?: string[];
}

/**
 * Response received from the server when retrieving, creating, or updating the passkey config.
 */
export interface PasskeyConfigServerResponse {
    name?: string;
    rpId?: string;
    expectedOrigins?: string[];
}

/**
 * Request for creating or updating the passkey config on the server.
 */
export interface PasskeyConfigClientRequest {
    rpId?: string;
    expectedOrigins?: string[];
}

/**
 * Configuration for signing in users using passkeys.
 */
export class PasskeyConfig {
  /**
   * The name of the PasskeyConfig resource.
   */
  public readonly name?: string;
  /**
   * The relying party ID for passkey verifications.
   * This cannot be changed once created.
   */
  public readonly rpId?: string;
  /**
   * The allowed website or app origins.
   * Only challenges signed from these origins will be allowed for signing in with passkeys.
   */
  public readonly expectedOrigins?: string[];

  /**
   * Validates a passkey config request object and throws an error on failure.
   * @param isCreateRequest - A boolean indicating if it's a create request or not.
   * @param passkeyConfigRequest - Passkey config to be set.
   * @param rpId - (optional) Relying party ID if it's a create request.
   * @throws FirebaseAuthError - If validation fails.
   *
   * @internal
   */
  private static validate(isCreateRequest: boolean, passkeyConfigRequest?: PasskeyConfigRequest): void {
    // Validation for creating a new PasskeyConfig.
    if (isCreateRequest && !validator.isNonEmptyString(passkeyConfigRequest?.rpId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        "'rpId' must be a non-empty string.",
      );
    }
    // // Validation for updating an existing PasskeyConfig.
    // if (!isCreateRequest && typeof rpId !== 'undefined') {
    //   throw new FirebaseAuthError(
    //     AuthClientErrorCode.INVALID_ARGUMENT,
    //     "'rpId' cannot be changed once created.",
    //   );
    // }
    if (!validator.isNonNullObject(passkeyConfigRequest)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        "'passkeyConfigRequest' must not be null.",
      );
    }
    const validKeys = {
      rpId: true,
      expectedOrigins: true,
    };
    // Check for unsupported top-level attributes.
    for (const key in passkeyConfigRequest) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `'${key}' is not a valid PasskeyConfigRequest parameter.`,
        );
      }
    }
    if (!validator.isNonEmptyArray(passkeyConfigRequest.expectedOrigins)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        "'passkeyConfigRequest.expectedOrigins' must contain at least one item.",
      );
    }
    for (const origin of passkeyConfigRequest.expectedOrigins) {
      if (!validator.isNonEmptyString(origin)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          "'passkeyConfigRequest.expectedOrigins' cannot contain empty strings.",
        );
      }
    }
  }

  /**
   * Build a server request for a Passkey Config object.
   * @param isCreateRequest - A boolean stating if it's a create request.
   * @param passkeyConfigRequest - Passkey config to be updated.
   * @returns The equivalent server request.
   * @throws FirebaseAuthError - If validation fails.
   *
   * @internal
   */
  public static buildServerRequest(isCreateRequest: boolean,
    passkeyConfigRequest?: PasskeyConfigRequest): PasskeyConfigClientRequest {
    PasskeyConfig.validate(isCreateRequest, passkeyConfigRequest);
    const request: PasskeyConfigClientRequest = {};
    if (typeof passkeyConfigRequest?.rpId !== 'undefined') {
      request.rpId = passkeyConfigRequest.rpId;
    }
    if (typeof passkeyConfigRequest?.expectedOrigins !== 'undefined') {
      request.expectedOrigins = passkeyConfigRequest.expectedOrigins;
    }
    return request;
  }

  /**
   * The Passkey Config object constructor.
   * @param response - The server-side response used to initialize the Passkey Config object.
   * @constructor
   *
   * @internal
   */
  constructor(response: PasskeyConfigServerResponse) {
    if (typeof response.name !== 'undefined') {
      this.name = response.name;
    }
    if (typeof response.rpId !== 'undefined') {
      this.rpId = response.rpId;
    }
    if (typeof response.expectedOrigins !== 'undefined') {
      this.expectedOrigins = response.expectedOrigins;
    }
  }

  /**
   * Returns a JSON-serializable representation of this object.
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    const json = {
      name: this.name,
      rpId: this.rpId,
      expectedOrigins: deepCopy(this.expectedOrigins),
    };
    if (typeof json.name === 'undefined') {
      delete json.name;
    }
    if (typeof json.rpId === 'undefined') {
      delete json.rpId;
    }
    if (typeof json.expectedOrigins === 'undefined') {
      delete json.expectedOrigins;
    }
    return json;
  }
}

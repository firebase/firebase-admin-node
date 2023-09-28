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

export interface UpdatePasskeyConfigRequest {
    /**
     * The relying party ID for the purpose of passkeys verifications.
     * This cannot be changed once created.
     */
    rpId?: string;
    /**
     * The website or app origins associated with the customer's sites or apps.
     * Only challenges signed from these origins will be allowed to sign in
     * with passkeys.
     */
    expectedOrigins?: string[];
  }

/**
 * Response received when getting or updating the passkey config.
 */
export interface PasskeyConfigServerResponse {
    name?: string;
    rpId?: string;
    expectedOrigins?: string[];
  }

/**
 * Response received when getting or updating the passkey config.
 */
export interface PasskeyConfigClientRequest {
    rpId?: string;
    expectedOrigins?: string[];
  }

export class PasskeyConfig {
  /** 
     * The name of the PasskeyConfig resource.
     */
  public readonly name_?: string;
  /**
   * The relying party ID for the purpose of passkeys verifications.
   * This cannot be changed once created.
   */
  public readonly rpId_?: string;
  /**
   * The website or app origins associated with the customer's sites or apps.
   * Only challenges signed from these origins will be allowed to sign in
   * with passkeys.
   */
  public readonly expectedOrigins_?: string[];

  /**
   *
   * @param request - //insert comment
   */
  private static validate(request: UpdatePasskeyConfigRequest): void {
    if (!validator.isNonNullObject(request)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"UpdatePasskeyConfigRequest" must be a valid non-null object.',
      );
    }
    const validKeys = {
      rpId: true,
      expectedOrigins: true,
    }
    // Check for unsupported top level attributes.
    for (const key in request) {
      if (!(key in validKeys)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `"${key}" is not a valid UpdatePasskeyConfigRequest parameter.`,
        );
      }
    }
  }

  /**
   * Build the corresponding server request for a UpdatePasskeyConfigRequest object.
   * @param configOptions - The properties to convert to a server request.
   * @returns  The equivalent server request.
   *
   * @internal
   */
  public static buildServerRequest(configOptions: UpdatePasskeyConfigRequest): PasskeyConfigClientRequest {
    PasskeyConfig.validate(configOptions);
    const request: PasskeyConfigClientRequest = {};
    if (typeof configOptions.rpId !== 'undefined') {
      request.rpId = request.rpId
    }
    if (typeof configOptions.expectedOrigins !== 'undefined') {
      request.expectedOrigins = configOptions.expectedOrigins;
    }
    return request;
  }
 
  /**
   * The Passkey Config object constructor.
   *
   * @param response - The server side response used to initialize the Passkey Config object.
   * @constructor
   * @internal
   */
  constructor(response: PasskeyConfigServerResponse) {
    if (typeof response.name !== 'undefined') {
      this.name_ = response.name;
    }
    if (typeof response.rpId !== 'undefined') {
      this.rpId_ = response.rpId;
    }
    if (typeof response.expectedOrigins !== 'undefined') {
      this.expectedOrigins_ = response.expectedOrigins;
    }
  }
  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    // JSON serialization
    const json = {
      name: this.name_,
      rpId: this.rpId_,
      expectedOrigins: this.expectedOrigins_,
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


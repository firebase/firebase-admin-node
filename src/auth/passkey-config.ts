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
import {deepCopy} from '../utils/deep-copy';

export interface PasskeyConfigRequest {
    expectedOrigins?: string[];
}

export interface PasskeyConfigServerResponse {
    name?: string;
    rpId?: string;
    expectedOrigins?: string[];
}

export interface PasskeyConfigClientRequest {
    rpId?: string;
    expectedOrigins?: string[];
}


export class PasskeyConfig {
  public readonly name?: string;
  public readonly rpId?: string;
  public readonly expectedOrigins?: string[];

  private static validate(isCreateRequest: boolean, passkeyConfigRequest?: PasskeyConfigRequest, rpId?: string) {
    if(isCreateRequest && !validator.isNonEmptyString(rpId)) {
        throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            `'rpId' must be a valid non-empty string'`,
          );
    }
    if(!isCreateRequest && typeof rpId !== 'undefined') {
        throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            `'rpId' cannot be changed once created.'`,
          );
    }
    if(!validator.isNonNullObject(passkeyConfigRequest)) {
        throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            `'passkeyConfigRequest' must be a valid non-empty object.'`,
          );
    }
    const validKeys = {
        expectedOrigins: true,
    };
    // Check for unsupported top level attributes.
    for (const key in passkeyConfigRequest) {
        if (!(key in validKeys)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            `'${key}' is not a valid PasskeyConfigRequest parameter.`,
          );
        }
      }
    if(!validator.isNonEmptyArray(passkeyConfigRequest.expectedOrigins)) {
        throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            `'passkeyConfigRequest.expectedOrigins' must be a valid non-empty array of strings.'`,
          );
    }
    for (const origin of passkeyConfigRequest.expectedOrigins) {
      if (!validator.isNonEmptyString(origin)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          `'passkeyConfigRequest.expectedOrigins' must be a valid non-empty array of strings.'`,
        );
      }
    }    
  };

  public static buildServerRequest(isCreateRequest: boolean, passkeyConfigRequest?: PasskeyConfigRequest, rpId?: string): PasskeyConfigClientRequest {
    PasskeyConfig.validate(isCreateRequest, passkeyConfigRequest, rpId);
    let request: PasskeyConfigClientRequest = {};
    if(isCreateRequest && typeof rpId !== 'undefined') {
        request.rpId = rpId;
    }
    if(typeof passkeyConfigRequest?.expectedOrigins !== 'undefined') {
        request.expectedOrigins = passkeyConfigRequest.expectedOrigins;
    }
    return request;
  };

  constructor(response: PasskeyConfigServerResponse) {
    if(typeof response.name !== 'undefined') {
        this.name = response.name;
    }
    if(typeof response.rpId !== 'undefined') {
        this.rpId = response.rpId;
    };
    if(typeof response.expectedOrigins !== 'undefined') {
        this.expectedOrigins = response.expectedOrigins;
    }
  };

  public toJSON(): object {
    const json = {
      name: deepCopy(this.name),
      rpId: deepCopy(this.rpId),
      expectedOrigins: deepCopy(this.expectedOrigins),
    };
    if(typeof json.name === 'undefined') {
      delete json.name;
    }
    if(typeof json.rpId === 'undefined') {
      delete json.rpId;
    }
    if(typeof json.expectedOrigins === 'undefined') {
      delete json.expectedOrigins;
    }
    return json;
  }

};


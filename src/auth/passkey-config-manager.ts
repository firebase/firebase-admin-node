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
import { App } from '../app';
import {
  AuthRequestHandler,
} from './auth-api-request';
import {
  PasskeyConfig,
  PasskeyConfigClientRequest,
  PasskeyConfigRequest,
  PasskeyConfigServerResponse
} from './passkey-config';

/**
 * Manages Passkey configuration for a Firebase app.
 */
export class PasskeyConfigManager {
  private readonly authRequestHandler: AuthRequestHandler;

  /**
   * Initializes a PasskeyConfigManager instance for a specified FirebaseApp.
   *
   * @param app - The Firebase app associated with this PasskeyConfigManager instance.
   *
   * @constructor
   * @internal
   */
  constructor(app: App) {
    this.authRequestHandler = new AuthRequestHandler(app);
  }

  /**
   * Retrieves the Passkey Configuration.
   *
   * @param tenantId - (optional) The tenant ID if querying passkeys on a specific tenant.
   * @returns A promise fulfilled with the passkey configuration.
   */
  public getPasskeyConfig(tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.getPasskeyConfig(tenantId)
      .then((response: PasskeyConfigServerResponse) => {
        return new PasskeyConfig(response);
      });
  }

  /**
   * Creates a new passkey configuration.
   *
   * @param passkeyConfigRequest - Configuration details for the passkey.
   * @param tenantId - (optional) The tenant ID for which the passkey config is created.
   * @returns A promise fulfilled with the newly created passkey configuration.
   */
  public createPasskeyConfig(passkeyConfigRequest: PasskeyConfigRequest, tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.updatePasskeyConfig(true, tenantId, passkeyConfigRequest)
      .then((response: PasskeyConfigClientRequest) => {
        return new PasskeyConfig(response);
      });
  }

  /**
   * Updates an existing passkey configuration.
   *
   * @param passkeyConfigRequest - Updated configuration details for the passkey.
   * @param tenantId - (optional) The tenant ID for which the passkey config is updated.
   * @returns A promise fulfilled with the updated passkey configuration.
   */
  public updatePasskeyConfig(passkeyConfigRequest: PasskeyConfigRequest, tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.updatePasskeyConfig(false, tenantId, passkeyConfigRequest)
      .then((response: PasskeyConfigClientRequest) => {
        return new PasskeyConfig(response);
      });
  }
}

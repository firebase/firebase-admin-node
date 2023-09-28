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
import { PasskeyConfig, PasskeyConfigServerResponse, UpdatePasskeyConfigRequest } from './passkey-config';
import {
  AuthRequestHandler,
} from './auth-api-request';

/**
 * Manages the current passkey config by handling get and update operations.
 */
export class PasskeyConfigManager {
  private readonly authRequestHandler: AuthRequestHandler;

  /**
   * Initializes a PasskeyConfigManager instance for a specified FirebaseApp.
   *
   * @param app - The app for this PasskeyConfigManager instance.
   */
  constructor(app: App) {
    this.authRequestHandler = new AuthRequestHandler(app);
  }

  /**
   * Get the passkey configuration.
   *
   * @param tenantId - Optional tenant ID.
   * @returns A promise fulfilled with the passkey configuration.
   */
  public getPasskeyConfig(tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.getPasskeyConfig(tenantId)
      .then((response: PasskeyConfigServerResponse) => {
        return new PasskeyConfig(response);
      });
  }

  /**
   * Updates the passkey configuration.
   *
   * @param passkeyConfigOptions - The properties to update on the passkey.
   * @param tenantId - Optional tenant ID.
   * @returns A promise fulfilled with the updated passkey configuration.
   */
  public updatePasskeyConfig(passkeyConfigOptions: UpdatePasskeyConfigRequest, tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.updatePasskeyConfig(passkeyConfigOptions, tenantId)
      .then((response: PasskeyConfigServerResponse) => {
        return new PasskeyConfig(response);
      });
  }
}
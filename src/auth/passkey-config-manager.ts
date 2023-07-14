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
 * Manages (gets and updates) the current passkey config.
 */
export class PasskeyConfigManager {
  private readonly authRequestHandler: AuthRequestHandler;
  /**
   * Initializes a ProjectConfigManager instance for a specified FirebaseApp.
   *
   * @param app - The app for this ProjectConfigManager instance.
   *
   * @constructor
   * @internal
   */
  constructor(app: App) {
    this.authRequestHandler = new AuthRequestHandler(app);
  }

  /**
   * Get the project configuration.
   *
   * @returns A promise fulfilled with the project configuration.
   */
  public getPasskeyConfig(tenantId: string = ""): Promise<PasskeyConfig> {
    return this.authRequestHandler.getPasskeyConfig(tenantId)
      .then((response: PasskeyConfigServerResponse) => {
        return new PasskeyConfig(response);
      })
  }
  /**
   * Updates Passkey configuration.
   *
   * @param passkeyConfigOptions - The properties to update on the passkey.
   *
   * @returns A promise fulfilled with the updated passkey config.
   */
  public updatePasskeyConfig(tenantId: string = "", passkeyConfigOptions: UpdatePasskeyConfigRequest): Promise<PasskeyConfig> {
    return this.authRequestHandler.updatePasskeyConfig(tenantId, passkeyConfigOptions)
      .then((response: PasskeyConfigServerResponse) => {
        return new PasskeyConfig(response);
      })
  }
}

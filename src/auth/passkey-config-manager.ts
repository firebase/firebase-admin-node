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


export class PasskeyConfigManager {
  private readonly authRequestHandler: AuthRequestHandler;
  
  constructor(app: App) {
    this.authRequestHandler = new AuthRequestHandler(app);
  }

  public getPasskeyConfig(tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.getPasskeyConfig(tenantId)
      .then((response: PasskeyConfigServerResponse) => {
        return new PasskeyConfig(response);
      });
  }

  public createPasskeyConfig(rpId: string, passkeyConfigRequest: PasskeyConfigRequest, 
    tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.updatePasskeyConfig(true, tenantId, passkeyConfigRequest, rpId)
      .then((response: PasskeyConfigClientRequest) => {
        return new PasskeyConfig(response);
      });
  }

  public updatePasskeyConfig(passkeyConfigRequest: PasskeyConfigRequest, tenantId?: string): Promise<PasskeyConfig> {
    return this.authRequestHandler.updatePasskeyConfig(false, tenantId, passkeyConfigRequest)
      .then((response: PasskeyConfigClientRequest) => {
        return new PasskeyConfig(response);
      });
  }
}

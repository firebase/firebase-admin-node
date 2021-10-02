/*!
 * @license
 * Copyright 2017 Google Inc.
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

import { App } from '../app/index';
import { AuthRequestHandler } from './auth-api-request';
import { TenantManager } from './tenant-manager';
import { BaseAuth } from './base-auth';

/**
 * Auth service bound to the provided app.
 * An Auth instance can have multiple tenants.
 */
export class Auth extends BaseAuth {

  private readonly tenantManager_: TenantManager;
  private readonly app_: App;

  /**
   * @param app - The app for this Auth service.
   * @constructor
   * @internal
   */
  constructor(app: App) {
    super(app, new AuthRequestHandler(app));
    this.app_ = app;
    this.tenantManager_ = new TenantManager(app);
  }

  /**
   * Returns the app associated with this Auth instance.
   *
   * @returns The app associated with this Auth instance.
   */
  get app(): App {
    return this.app_;
  }

  /**
   * Returns the tenant manager instance associated with the current project.
   *
   * @returns The tenant manager instance associated with the current project.
   */
  public tenantManager(): TenantManager {
    return this.tenantManager_;
  }
}

/*!
 * Copyright 2020 Google Inc.
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

import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { BaseAuth } from './auth';
import { TenantManager } from './tenant-manager';
import {
  AuthRequestHandler
} from './auth-api-request';
import { FirebaseApp } from '../firebase-app';

/**
 * Internals of an Auth instance.
 */
class AuthInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up
    return Promise.resolve(undefined);
  }
}


/**
 * Auth service bound to the provided app.
 * An Auth instance can have multiple tenants.
 */
export class Auth extends BaseAuth<AuthRequestHandler> implements FirebaseServiceInterface {

  public INTERNAL: AuthInternals = new AuthInternals();
  private readonly tenantManager_: TenantManager;
  private readonly app_: FirebaseApp;

  /**
   * @param {object} app The app for this Auth service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    super(app, new AuthRequestHandler(app));
    this.app_ = app;
    this.tenantManager_ = new TenantManager(app);
  }

  /**
   * Returns the app associated with this Auth instance.
   *
   * @return {FirebaseApp} The app associated with this Auth instance.
   */
  get app(): FirebaseApp {
    return this.app_;
  }

  /** @return The current Auth instance's tenant manager. */
  public tenantManager(): TenantManager {
    return this.tenantManager_;
  }
}
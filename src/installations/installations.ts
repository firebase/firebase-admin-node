/*!
 * Copyright 2021 Google Inc.
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

import { FirebaseApp } from '../firebase-app';
import { FirebaseInstallationsError, InstallationsClientErrorCode } from '../utils/error';
import { FirebaseInstallationsRequestHandler } from './installations-request-handler';
import { installations } from './index';
import * as validator from '../utils/validator';

import InstallationsInterface = installations.Installations;

/**
 * The `Installations` service for the current app.
 */
export class Installations implements InstallationsInterface {

  private app_: FirebaseApp;
  private requestHandler: FirebaseInstallationsRequestHandler;

  /**
   * @param app The app for this Installations service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseInstallationsError(
        InstallationsClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.installations() must be a valid Firebase app instance.',
      );
    }

    this.app_ = app;
    this.requestHandler = new FirebaseInstallationsRequestHandler(app);
  }

  /**
   * Deletes the specified installation ID and the associated data from Firebase.
   *
   * @param fid The Firebase installation ID to be deleted.
   *
   * @return A promise fulfilled when the installation ID is deleted.
   */
  public deleteInstallation(fid: string): Promise<void> {
    return this.requestHandler.deleteInstallation(fid);
  }

  /**
   * Returns the app associated with this Installations instance.
   *
   * @return The app associated with this Installations instance.
   */
  get app(): FirebaseApp {
    return this.app_;
  }
}

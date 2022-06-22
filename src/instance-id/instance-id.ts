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

import { getInstallations } from '../installations';
import { App } from '../app/index';
import {
  FirebaseInstallationsError, FirebaseInstanceIdError,
  InstallationsClientErrorCode, InstanceIdClientErrorCode,
} from '../utils/error';
import * as validator from '../utils/validator';

/**
 * The `InstanceId` service enables deleting the Firebase instance IDs
 * associated with Firebase client app instances.
 *
 * @deprecated Use {@link firebase-admin.installations#Installations} instead.
 */
export class InstanceId {

  private app_: App;

  /**
   * @param app - The app for this InstanceId service.
   * @constructor
   * @internal
   */
  constructor(app: App) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseInstanceIdError(
        InstanceIdClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to instanceId() must be a valid Firebase app instance.',
      );
    }

    this.app_ = app;
  }

  /**
   * Deletes the specified instance ID and the associated data from Firebase.
   *
   * Note that Google Analytics for Firebase uses its own form of Instance ID to
   * keep track of analytics data. Therefore deleting a Firebase Instance ID does
   * not delete Analytics data. See
   * {@link https://firebase.google.com/support/privacy/manage-iids#delete_an_instance_id |
   * Delete an Instance ID}
   * for more information.
   *
   * @param instanceId - The instance ID to be deleted.
   *
   * @returns A promise fulfilled when the instance ID is deleted.
   */
  public deleteInstanceId(instanceId: string): Promise<void> {
    return getInstallations(this.app).deleteInstallation(instanceId)
      .catch((err) => {
        if (err instanceof FirebaseInstallationsError) {
          let code = err.code.replace('installations/', '');
          if (code === InstallationsClientErrorCode.INVALID_INSTALLATION_ID.code) {
            code = InstanceIdClientErrorCode.INVALID_INSTANCE_ID.code;
          }

          throw new FirebaseInstanceIdError({ code, message: err.message });
        }

        throw err;
      });
  }

  /**
   * Returns the app associated with this InstanceId instance.
   *
   * @returns The app associated with this InstanceId instance.
   */
  get app(): App {
    return this.app_;
  }
}

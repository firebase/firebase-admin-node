/*!
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

import {FirebaseApp} from '../firebase-app';
import {FirebaseInstanceIdError, InstanceIdClientErrorCode} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {FirebaseInstanceIdRequestHandler} from './instance-id-request';

import * as utils from '../utils/index';
import * as validator from '../utils/validator';

/**
 * Internals of an InstanceId service instance.
 */
class InstanceIdInternals implements FirebaseServiceInternalsInterface {
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

export class InstanceId implements FirebaseServiceInterface {
  public INTERNAL: InstanceIdInternals = new InstanceIdInternals();

  private app_: FirebaseApp;
  private requestHandler: FirebaseInstanceIdRequestHandler;

  /**
   * @param {Object} app The app for this InstanceId service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseInstanceIdError(
        InstanceIdClientErrorCode.INVALID_ARGUMENT,
        'First argument passed to admin.instanceId() must be a valid Firebase app instance.'
      );
    }

    const projectId: string = utils.getProjectId(app);
    if (!validator.isNonEmptyString(projectId)) {
      // Assert for an explicit projct ID (either via AppOptions or the cert itself).
      throw new FirebaseInstanceIdError(
        InstanceIdClientErrorCode.INVALID_PROJECT_ID,
        'Failed to determine project ID for InstanceId. Initialize the '
        + 'SDK with service account credentials or set project ID as an app option. '
        + 'Alternatively set the GCLOUD_PROJECT environment variable.',
      );
    }

    this.app_ = app;
    this.requestHandler = new FirebaseInstanceIdRequestHandler(app, projectId);
  }

  /**
   * Deletes the specified instance ID from Firebase. This can be used to delete an instance ID
   * and associated user data from a Firebase project, pursuant to the General Data Protection
   * Regulation (GDPR).
   *
   * @param {string} instanceId The instance ID to be deleted
   * @return {Promise<void>} A promise that resolves when the instance ID is successfully deleted.
   */
  public deleteInstanceId(instanceId: string): Promise<void> {
    return this.requestHandler.deleteInstanceId(instanceId)
      .then((result) => {
        // Return nothing on success
      });
  }

  /**
   * Returns the app associated with this InstanceId instance.
   *
   * @return {FirebaseApp} The app associated with this InstanceId instance.
   */
  get app(): FirebaseApp {
    return this.app_;
  }
}

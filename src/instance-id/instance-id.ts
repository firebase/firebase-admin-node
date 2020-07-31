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

import { FirebaseApp } from '../firebase-app';

/**
 * Gets the {@link InstanceId `InstanceId`} service for the
 * current app.
 *
 * @example
 * ```javascript
 * var instanceId = app.instanceId();
 * // The above is shorthand for:
 * // var instanceId = admin.instanceId(app);
 * ```
 *
 * @return The `InstanceId` service for the
 *   current app.
 */
export interface InstanceId {
  app: FirebaseApp;

  /**
   * Deletes the specified instance ID and the associated data from Firebase.
   *
   * Note that Google Analytics for Firebase uses its own form of Instance ID to
   * keep track of analytics data. Therefore deleting a Firebase Instance ID does
   * not delete Analytics data. See
   * [Delete an Instance ID](/support/privacy/manage-iids#delete_an_instance_id)
   * for more information.
   *
   * @param instanceId The instance ID to be deleted.
   *
   * @return A promise fulfilled when the instance ID is deleted.
   */
  deleteInstanceId(instanceId: string): Promise<void>;
}

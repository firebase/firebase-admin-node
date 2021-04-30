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

import { app } from '../firebase-namespace-api';

/**
 * Gets the {@link installations.Installations `Installations`} service for the
 * default app or a given app.
 *
 * `admin.installations()` can be called with no arguments to access the default
 * app's {@link installations.Installations `Installations`} service or as
 * `admin.installations(app)` to access the
 * {@link installations.Installations `Installations`} service associated with a
 * specific app.
 *
 * @example
 * ```javascript
 * // Get the Installations service for the default app
 * var defaultInstallations = admin.installations();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Installations service for a given app
 * var otherInstallations = admin.installations(otherApp);
 *```
 *
 * @param app Optional app whose `Installations` service to
 *   return. If not provided, the default `Installations` service is
 *   returned.
 *
 * @return The default `Installations` service if
 *   no app is provided or the `Installations` service associated with the
 *   provided app.
 */
export declare function installations(app?: app.App): installations.Installations;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace installations {
  /**
   * Gets the {@link Installations `Installations`} service for the
   * current app.
   *
   * @example
   * ```javascript
   * var installations = app.installations();
   * // The above is shorthand for:
   * // var installations = admin.installations(app);
   * ```
   *
   * @return The `Installations` service for the
   *   current app.
   */
  export interface Installations {
    app: app.App;

    /**
     * Deletes the specified installation ID and the associated data from Firebase.
     *
     * Note that Google Analytics for Firebase uses its own form of Instance ID to
     * keep track of analytics data. Therefore deleting a Firebase installation ID does
     * not delete Analytics data. See
     * [Delete a Firebase installation](/docs/projects/manage-installations#delete-installation)
     * for more information.
     *
     * @param fid The Firebase installation ID to be deleted.
     *
     * @return A promise fulfilled when the installation ID is deleted.
     */
    deleteInstallation(fid: string): Promise<void>;
  }
}

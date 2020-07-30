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

import { IosAppMetadata } from './app-metadata';

/**
 * A reference to a Firebase iOS app.
 *
 * Do not call this constructor directly. Instead, use
 * [`projectManagement.iosApp()`](admin.projectManagement.ProjectManagement#iosApp).
 */
export interface IosApp {
  appId: string;

  /**
   * Retrieves metadata about this iOS app.
   *
   * @return {!Promise<IosAppMetadata>} A promise that
   *     resolves to the retrieved metadata about this iOS app.
   */
  getMetadata(): Promise<IosAppMetadata>;

  /**
   * Sets the optional user-assigned display name of the app.
   *
   * @param newDisplayName The new display name to set.
   *
   * @return A promise that resolves when the display name has
   *     been set.
   */
  setDisplayName(newDisplayName: string): Promise<void>;

  /**
   * Gets the configuration artifact associated with this app.
   *
   * @return A promise that resolves to the iOS app's Firebase
   *     config file, in UTF-8 string format. This string is typically intended to
   *     be written to a plist file that gets shipped with your iOS app.
   */
  getConfig(): Promise<string>;
}

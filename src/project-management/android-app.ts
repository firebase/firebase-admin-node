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

import { AndroidAppMetadata } from './app-metadata';

/**
 * A SHA-1 or SHA-256 certificate.
 *
 * Do not call this constructor directly. Instead, use
 * [`projectManagement.shaCertificate()`](admin.projectManagement.ProjectManagement#shaCertificate).
 */
export interface ShaCertificate {
  /**
   * The SHA certificate type.
   *
   * @example
   * ```javascript
   * var certType = shaCertificate.certType;
   * ```
   */
  certType: ('sha1' | 'sha256');

  /**
   * The SHA-1 or SHA-256 hash for this certificate.
   *
   * @example
   * ```javascript
   * var shaHash = shaCertificate.shaHash;
   * ```
   */
  shaHash: string;

  /**
   * The fully-qualified resource name that identifies this sha-key.
   *
   * This is useful when manually constructing requests for Firebase's public API.
   *
   * @example
   * ```javascript
   * var resourceName = shaCertificate.resourceName;
   * ```
   */
  resourceName?: string;
}

/**
   * A reference to a Firebase Android app.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.androidApp()`](admin.projectManagement.ProjectManagement#androidApp).
   */
export interface AndroidApp {
  appId: string;

  /**
   * Retrieves metadata about this Android app.
   *
   * @return A promise that resolves to the retrieved metadata about this Android app.
   */
  getMetadata(): Promise<AndroidAppMetadata>;

  /**
   * Sets the optional user-assigned display name of the app.
   *
   * @param newDisplayName The new display name to set.
   *
   * @return A promise that resolves when the display name has been set.
   */
  setDisplayName(newDisplayName: string): Promise<void>;

  /**
   * Gets the list of SHA certificates associated with this Android app in Firebase.
   *
   * @return The list of SHA-1 and SHA-256 certificates associated with this Android app in
   *     Firebase.
   */
  getShaCertificates(): Promise<ShaCertificate[]>;

  /**
   * Adds the given SHA certificate to this Android app.
   *
   * @param certificateToAdd The SHA certificate to add.
   *
   * @return A promise that resolves when the given certificate
   *     has been added to the Android app.
   */
  addShaCertificate(certificateToAdd: ShaCertificate): Promise<void>;

  /**
   * Deletes the specified SHA certificate from this Android app.
   *
   * @param  certificateToDelete The SHA certificate to delete.
   *
   * @return A promise that resolves when the specified
   *     certificate has been removed from the Android app.
   */
  deleteShaCertificate(certificateToRemove: ShaCertificate): Promise<void>;

  /**
   * Gets the configuration artifact associated with this app.
   *
   * @return A promise that resolves to the Android app's
   *     Firebase config file, in UTF-8 string format. This string is typically
   *     intended to be written to a JSON file that gets shipped with your Android
   *     app.
   */
  getConfig(): Promise<string>;
}

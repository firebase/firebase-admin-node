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
import { AppMetadata } from './app-metadata';
import { AndroidApp, ShaCertificate } from './android-app';
import { IosApp } from './ios-app';

/**
   * The Firebase ProjectManagement service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.projectManagement()`](admin.projectManagement#projectManagement).
   */
export interface ProjectManagement {
  app: FirebaseApp;

  /**
   * Lists up to 100 Firebase apps associated with this Firebase project.
   *
   * @return A promise that resolves to the metadata list of the apps.
   */
  listAppMetadata(): Promise<AppMetadata[]>;

  /**
   * Lists up to 100 Firebase Android apps associated with this Firebase project.
   *
   * @return The list of Android apps.
   */
  listAndroidApps(): Promise<AndroidApp[]>;

  /**
   * Lists up to 100 Firebase iOS apps associated with this Firebase project.
   *
   * @return The list of iOS apps.
   */
  listIosApps(): Promise<IosApp[]>;

  /**
   * Creates an `AndroidApp` object, referencing the specified Android app within
   * this Firebase project.
   *
   * This method does not perform an RPC.
   *
   * @param appId The `appId` of the Android app to reference.
   *
   * @return An `AndroidApp` object that references the specified Firebase Android app.
   */
  androidApp(appId: string): AndroidApp;

  /**
   * Update the display name of this Firebase project.
   *
   * @param newDisplayName The new display name to be updated.
   *
   * @return A promise that resolves when the project display name has been updated.
   */
  setDisplayName(newDisplayName: string): Promise<void>;

  /**
   * Creates an `iOSApp` object, referencing the specified iOS app within
   * this Firebase project.
   *
   * This method does not perform an RPC.
   *
   * @param appId The `appId` of the iOS app to reference.
   *
   * @return An `iOSApp` object that references the specified Firebase iOS app.
   */
  iosApp(appId: string): IosApp;

  /**
   * Creates a `ShaCertificate` object.
   *
   * This method does not perform an RPC.
   *
   * @param shaHash The SHA-1 or SHA-256 hash for this certificate.
   *
   * @return A `ShaCertificate` object contains the specified SHA hash.
   */
  shaCertificate(shaHash: string): ShaCertificate;

  /**
   * Creates a new Firebase Android app associated with this Firebase project.
   *
   * @param packageName The canonical package name of the Android App,
   *     as would appear in the Google Play Developer Console.
   * @param displayName An optional user-assigned display name for this
   *     new app.
   *
   * @return A promise that resolves to the newly created Android app.
   */
  createAndroidApp(
    packageName: string, displayName?: string): Promise<AndroidApp>;

  /**
   * Creates a new Firebase iOS app associated with this Firebase project.
   *
   * @param bundleId The iOS app bundle ID to use for this new app.
   * @param displayName An optional user-assigned display name for this
   *     new app.
   *
   * @return A promise that resolves to the newly created iOS app.
   */
  createIosApp(bundleId: string, displayName?: string): Promise<IosApp>;
}

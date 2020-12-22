/*!
 * Copyright 2018 Google Inc.
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

import { FirebaseProjectManagementError } from '../utils/error';
import * as validator from '../utils/validator';
import { ProjectManagementRequestHandler, assertServerResponse } from './project-management-api-request-internal';
import { projectManagement } from './index';

import IosAppInterface = projectManagement.IosApp;
import IosAppMetadata = projectManagement.IosAppMetadata;
import AppPlatform = projectManagement.AppPlatform;

export class IosApp implements IosAppInterface {
  private readonly resourceName: string;

  constructor(
      public readonly appId: string,
      private readonly requestHandler: ProjectManagementRequestHandler) {
    if (!validator.isNonEmptyString(appId)) {
      throw new FirebaseProjectManagementError(
        'invalid-argument', 'appId must be a non-empty string.');
    }

    this.resourceName = `projects/-/iosApps/${appId}`;
  }

  /**
   * Retrieves metadata about this iOS app.
   *
   * @return {!Promise<admin.projectManagement.IosAppMetadata>} A promise that
   *     resolves to the retrieved metadata about this iOS app.
   */
  public getMetadata(): Promise<IosAppMetadata> {
    return this.requestHandler.getResource(this.resourceName)
      .then((responseData: any) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          'getMetadata()\'s responseData must be a non-null object.');

        const requiredFieldsList = ['name', 'appId', 'projectId', 'bundleId'];
        requiredFieldsList.forEach((requiredField) => {
          assertServerResponse(
            validator.isNonEmptyString(responseData[requiredField]),
            responseData,
            `getMetadata()'s responseData.${requiredField} must be a non-empty string.`);
        });

        const metadata: IosAppMetadata = {
          platform: AppPlatform.IOS,
          resourceName: responseData.name,
          appId: responseData.appId,
          displayName: responseData.displayName || null,
          projectId: responseData.projectId,
          bundleId: responseData.bundleId,
        };
        return metadata;
      });
  }

  /**
   * Sets the optional user-assigned display name of the app.
   *
   * @param newDisplayName The new display name to set.
   *
   * @return A promise that resolves when the display name has
   *     been set.
   */
  public setDisplayName(newDisplayName: string): Promise<void> {
    return this.requestHandler.setDisplayName(this.resourceName, newDisplayName);
  }

  /**
   * Gets the configuration artifact associated with this app.
   *
   * @return A promise that resolves to the iOS app's Firebase
   *     config file, in UTF-8 string format. This string is typically intended to
   *     be written to a plist file that gets shipped with your iOS app.
   */
  public getConfig(): Promise<string> {
    return this.requestHandler.getConfig(this.resourceName)
      .then((responseData: any) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          'getConfig()\'s responseData must be a non-null object.');

        const base64ConfigFileContents = responseData.configFileContents;
        assertServerResponse(
          validator.isBase64String(base64ConfigFileContents),
          responseData,
          'getConfig()\'s responseData.configFileContents must be a base64 string.');

        return Buffer.from(base64ConfigFileContents, 'base64').toString('utf8');
      });
  }
}

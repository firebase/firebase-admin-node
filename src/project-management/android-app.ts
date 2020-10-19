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

import AndroidAppInterface = projectManagement.AndroidApp;
import AndroidAppMetadata = projectManagement.AndroidAppMetadata;
import AppPlatform = projectManagement.AppPlatform;
import ShaCertificateInterface = projectManagement.ShaCertificate;

export class AndroidApp implements AndroidAppInterface {
  private readonly resourceName: string;

  constructor(
      public readonly appId: string,
      private readonly requestHandler: ProjectManagementRequestHandler) {
    if (!validator.isNonEmptyString(appId)) {
      throw new FirebaseProjectManagementError(
        'invalid-argument', 'appId must be a non-empty string.');
    }

    this.resourceName = `projects/-/androidApps/${appId}`;
  }

  /**
   * Retrieves metadata about this Android app.
   *
   * @return A promise that resolves to the retrieved metadata about this Android app.
   */
  public getMetadata(): Promise<AndroidAppMetadata> {
    return this.requestHandler.getResource(this.resourceName)
      .then((responseData: any) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          'getMetadata()\'s responseData must be a non-null object.');

        const requiredFieldsList = ['name', 'appId', 'projectId', 'packageName'];
        requiredFieldsList.forEach((requiredField) => {
          assertServerResponse(
            validator.isNonEmptyString(responseData[requiredField]),
            responseData,
            `getMetadata()'s responseData.${requiredField} must be a non-empty string.`);
        });

        const metadata: AndroidAppMetadata = {
          platform: AppPlatform.ANDROID,
          resourceName: responseData.name,
          appId: responseData.appId,
          displayName: responseData.displayName || null,
          projectId: responseData.projectId,
          packageName: responseData.packageName,
        };
        return metadata;
      });
  }

  /**
   * Sets the optional user-assigned display name of the app.
   *
   * @param newDisplayName The new display name to set.
   *
   * @return A promise that resolves when the display name has been set.
   */
  public setDisplayName(newDisplayName: string): Promise<void> {
    return this.requestHandler.setDisplayName(this.resourceName, newDisplayName);
  }

  /**
   * Gets the list of SHA certificates associated with this Android app in Firebase.
   *
   * @return The list of SHA-1 and SHA-256 certificates associated with this Android app in
   *     Firebase.
   */
  public getShaCertificates(): Promise<ShaCertificate[]> {
    return this.requestHandler.getAndroidShaCertificates(this.resourceName)
      .then((responseData: any) => {
        assertServerResponse(
          validator.isNonNullObject(responseData),
          responseData,
          'getShaCertificates()\'s responseData must be a non-null object.');

        if (!responseData.certificates) {
          return [];
        }

        assertServerResponse(
          validator.isArray(responseData.certificates),
          responseData,
          '"certificates" field must be present in the getShaCertificates() response data.');

        const requiredFieldsList = ['name', 'shaHash'];

        return responseData.certificates.map((certificateJson: any) => {
          requiredFieldsList.forEach((requiredField) => {
            assertServerResponse(
              validator.isNonEmptyString(certificateJson[requiredField]),
              responseData,
              `getShaCertificates()'s responseData.certificates[].${requiredField} must be a `
                      + 'non-empty string.');
          });

          return new ShaCertificate(certificateJson.shaHash, certificateJson.name);
        });
      });
  }

  /**
   * Adds the given SHA certificate to this Android app.
   *
   * @param certificateToAdd The SHA certificate to add.
   *
   * @return A promise that resolves when the given certificate
   *     has been added to the Android app.
   */
  public addShaCertificate(certificateToAdd: ShaCertificate): Promise<void> {
    return this.requestHandler.addAndroidShaCertificate(this.resourceName, certificateToAdd);
  }

  /**
   * Deletes the specified SHA certificate from this Android app.
   *
   * @param  certificateToDelete The SHA certificate to delete.
   *
   * @return A promise that resolves when the specified
   *     certificate has been removed from the Android app.
   */
  public deleteShaCertificate(certificateToDelete: ShaCertificate): Promise<void> {
    if (!certificateToDelete.resourceName) {
      throw new FirebaseProjectManagementError(
        'invalid-argument',
        'Specified certificate does not include a resourceName. (Use AndroidApp.getShaCertificates() to retrieve ' +
              'certificates with a resourceName.');
    }
    return this.requestHandler.deleteResource(certificateToDelete.resourceName);
  }

  /**
   * Gets the configuration artifact associated with this app.
   *
   * @return A promise that resolves to the Android app's
   *     Firebase config file, in UTF-8 string format. This string is typically
   *     intended to be written to a JSON file that gets shipped with your Android
   *     app.
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

/**
 * A SHA-1 or SHA-256 certificate.
 *
 * Do not call this constructor directly. Instead, use
 * [`projectManagement.shaCertificate()`](projectManagement.ProjectManagement#shaCertificate).
 */
export class ShaCertificate implements ShaCertificateInterface {
  /**
   * The SHA certificate type.
   *
   * @example
   * ```javascript
   * var certType = shaCertificate.certType;
   * ```
   */
  public readonly certType: ('sha1' | 'sha256');

  /**
   * Creates a ShaCertificate using the given hash. The ShaCertificate's type (eg. 'sha256') is
   * automatically determined from the hash itself.
   *
   * @param shaHash The sha256 or sha1 hash for this certificate.
   * @example
   * ```javascript
   * var shaHash = shaCertificate.shaHash;
   * ```
   * @param resourceName The Firebase resource name for this certificate. This does not need to be
   *     set when creating a new certificate.
   * @example
   * ```javascript
   * var resourceName = shaCertificate.resourceName;
   * ```
   */
  constructor(public readonly shaHash: string, public readonly resourceName?: string) {
    if (/^[a-fA-F0-9]{40}$/.test(shaHash)) {
      this.certType = 'sha1';
    } else if (/^[a-fA-F0-9]{64}$/.test(shaHash)) {
      this.certType = 'sha256';
    } else {
      throw new FirebaseProjectManagementError(
        'invalid-argument', 'shaHash must be either a sha256 hash or a sha1 hash.');
    }
  }
}

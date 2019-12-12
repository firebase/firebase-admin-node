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

import { FirebaseApp } from '../firebase-app';
import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { FirebaseProjectManagementError } from '../utils/error';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { AndroidApp, ShaCertificate } from './android-app';
import { IosApp } from './ios-app';
import { ProjectManagementRequestHandler, assertServerResponse } from './project-management-api-request';
import { AppMetadata, AppPlatform } from './app-metadata';

/**
 * Internals of a Project Management instance.
 */
class ProjectManagementInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<void>} An empty Promise that will be resolved when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up.
    return Promise.resolve();
  }
}

/**
 * ProjectManagement service bound to the provided app.
 */
export class ProjectManagement implements FirebaseServiceInterface {

  public readonly INTERNAL: ProjectManagementInternals = new ProjectManagementInternals();

  private readonly requestHandler: ProjectManagementRequestHandler;
  private projectId: string;

  /**
   * @param {object} app The app for this ProjectManagement service.
   * @constructor
   */
  constructor(readonly app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseProjectManagementError(
          'invalid-argument',
          'First argument passed to admin.projectManagement() must be a valid Firebase app '
              + 'instance.');
    }

    this.requestHandler = new ProjectManagementRequestHandler(app);
  }

  /**
   * Lists up to 100 Firebase Android apps associated with this Firebase project.
   */
  public listAndroidApps(): Promise<AndroidApp[]> {
    return this.listPlatformApps<AndroidApp>('android', 'listAndroidApps()');
  }

  /**
   * Lists up to 100 Firebase iOS apps associated with this Firebase project.
   */
  public listIosApps(): Promise<IosApp[]> {
    return this.listPlatformApps<IosApp>('ios', 'listIosApps()');
  }

  /**
   * Returns an AndroidApp object for the given appId. No RPC is made.
   */
  public androidApp(appId: string): AndroidApp {
    return new AndroidApp(appId, this.requestHandler);
  }

  /**
   * Returns an IosApp object for the given appId. No RPC is made.
   */
  public iosApp(appId: string): IosApp {
    return new IosApp(appId, this.requestHandler);
  }

  /**
   * Returns a ShaCertificate object for the given shaHash. No RPC is made.
   */
  public shaCertificate(shaHash: string): ShaCertificate {
    return new ShaCertificate(shaHash);
  }

  /**
   * Creates a new Firebase Android app, associated with this Firebase project.
   */
  public createAndroidApp(packageName: string, displayName?: string): Promise<AndroidApp> {
    return this.getResourceName()
      .then((resourceName) => {
        return this.requestHandler.createAndroidApp(resourceName, packageName, displayName);
      })
      .then((responseData: any) => {
        assertServerResponse(
            validator.isNonNullObject(responseData),
            responseData,
            'createAndroidApp()\'s responseData must be a non-null object.');

        assertServerResponse(
            validator.isNonEmptyString(responseData.appId),
            responseData,
            `"responseData.appId" field must be present in createAndroidApp()'s response data.`);
        return new AndroidApp(responseData.appId, this.requestHandler);
      });
  }

  /**
   * Creates a new Firebase iOS app, associated with this Firebase project.
   */
  public createIosApp(bundleId: string, displayName?: string): Promise<IosApp> {
    return this.getResourceName()
      .then((resourceName) => {
        return this.requestHandler.createIosApp(resourceName, bundleId, displayName);
      })
      .then((responseData: any) => {
        assertServerResponse(
            validator.isNonNullObject(responseData),
            responseData,
            'createIosApp()\'s responseData must be a non-null object.');

        assertServerResponse(
            validator.isNonEmptyString(responseData.appId),
            responseData,
            `"responseData.appId" field must be present in createIosApp()'s response data.`);
        return new IosApp(responseData.appId, this.requestHandler);
      });
  }

  /**
   * Lists up to 100 Firebase apps associated with this Firebase project.
   */
  public listAppMetadata(): Promise<AppMetadata[]> {
    return this.getResourceName()
      .then((resourceName) => {
        return this.requestHandler.listAppMetadata(resourceName);
      })
      .then((responseData) => {
        return this.getProjectId()
          .then((projectId) => {
            return this.transformResponseToAppMetadata(responseData, projectId);
          });
      });
  }

  /**
   * Update display name of the project
   */
  public setDisplayName(newDisplayName: string): Promise<void> {
    return this.getResourceName()
      .then((resourceName) => {
        return this.requestHandler.setDisplayName(resourceName, newDisplayName);
      });
  }

  private transformResponseToAppMetadata(responseData: any, projectId: string): AppMetadata[] {
    this.assertListAppsResponseData(responseData, 'listAppMetadata()');

    if (!responseData.apps) {
      return [];
    }

    return responseData.apps.map((appJson: any) => {
      assertServerResponse(
          validator.isNonEmptyString(appJson.appId),
          responseData,
          `"apps[].appId" field must be present in the listAppMetadata() response data.`);
      assertServerResponse(
          validator.isNonEmptyString(appJson.platform),
          responseData,
          `"apps[].platform" field must be present in the listAppMetadata() response data.`);
      const metadata: AppMetadata = {
        appId: appJson.appId,
        platform: (AppPlatform as any)[appJson.platform] || AppPlatform.PLATFORM_UNKNOWN,
        projectId,
        resourceName: appJson.name,
      };
      if (appJson.displayName) {
        metadata.displayName = appJson.displayName;
      }
      return metadata;
    });
  }

  private getResourceName(): Promise<string> {
    return this.getProjectId()
      .then((projectId) => {
        return `projects/${projectId}`;
      });
  }

  private getProjectId(): Promise<string> {
    if (this.projectId) {
      return Promise.resolve(this.projectId);
    }

    return utils.findProjectId(this.app)
      .then((projectId) => {
        // Assert that a specific project ID was provided within the app.
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseProjectManagementError(
              'invalid-project-id',
              'Failed to determine project ID. Initialize the SDK with service account credentials, or '
                + 'set project ID as an app option. Alternatively, set the GOOGLE_CLOUD_PROJECT '
                + 'environment variable.');
        }

        this.projectId = projectId;
        return this.projectId;
      });
  }

  /**
   * Lists up to 100 Firebase apps for a specified platform, associated with this Firebase project.
   */
  private listPlatformApps<T>(platform: 'android' | 'ios', callerName: string): Promise<T[]> {
    return this.getResourceName()
      .then((resourceName) => {
        return (platform === 'android') ?
          this.requestHandler.listAndroidApps(resourceName)
          : this.requestHandler.listIosApps(resourceName);
      })
      .then((responseData: any) => {
        this.assertListAppsResponseData(responseData, callerName);

        if (!responseData.apps) {
          return [];
        }

        return responseData.apps.map((appJson: any) => {
          assertServerResponse(
              validator.isNonEmptyString(appJson.appId),
              responseData,
              `"apps[].appId" field must be present in the ${callerName} response data.`);
          if (platform === 'android') {
            return new AndroidApp(appJson.appId, this.requestHandler);
          } else {
            return new IosApp(appJson.appId, this.requestHandler);
          }
        });
      });
  }

  private assertListAppsResponseData(responseData: any, callerName: string): void {
    assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        `${callerName}\'s responseData must be a non-null object.`);

    if (responseData.apps) {
      assertServerResponse(
          validator.isArray(responseData.apps),
          responseData,
          `"apps" field must be present in the ${callerName} response data.`);
      }
  }
}

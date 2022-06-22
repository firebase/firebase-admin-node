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

import * as validator from '../utils/validator';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';

/**
 * This is the interface that defines the required continue/state URL with
 * optional Android and iOS bundle identifiers.
 */
export interface ActionCodeSettings {

  /**
   * Defines the link continue/state URL, which has different meanings in
   * different contexts:
   * <ul>
   * <li>When the link is handled in the web action widgets, this is the deep
   *     link in the `continueUrl` query parameter.</li>
   * <li>When the link is handled in the app directly, this is the `continueUrl`
   *     query parameter in the deep link of the Dynamic Link.</li>
   * </ul>
   */
  url: string;

  /**
   * Whether to open the link via a mobile app or a browser.
   * The default is false. When set to true, the action code link is sent
   * as a Universal Link or Android App Link and is opened by the app if
   * installed. In the false case, the code is sent to the web widget first
   * and then redirects to the app if installed.
   */
  handleCodeInApp?: boolean;

  /**
   * Defines the iOS bundle ID. This will try to open the link in an iOS app if it
   * is installed.
   */
  iOS?: {

    /**
     * Defines the required iOS bundle ID of the app where the link should be
     * handled if the application is already installed on the device.
     */
    bundleId: string;
  };

  /**
   * Defines the Android package name. This will try to open the link in an
   * android app if it is installed. If `installApp` is passed, it specifies
   * whether to install the Android app if the device supports it and the app is
   * not already installed. If this field is provided without a `packageName`, an
   * error is thrown explaining that the `packageName` must be provided in
   * conjunction with this field. If `minimumVersion` is specified, and an older
   * version of the app is installed, the user is taken to the Play Store to
   * upgrade the app.
   */
  android?: {

    /**
     * Defines the required Android package name of the app where the link should be
     * handled if the Android app is installed.
     */
    packageName: string;

    /**
     * Whether to install the Android app if the device supports it and the app is
     * not already installed.
     */
    installApp?: boolean;

    /**
     * The Android minimum version if available. If the installed app is an older
     * version, the user is taken to the GOogle Play Store to upgrade the app.
     */
    minimumVersion?: string;
  };

  /**
   * Defines the dynamic link domain to use for the current link if it is to be
   * opened using Firebase Dynamic Links, as multiple dynamic link domains can be
   * configured per project. This field provides the ability to explicitly choose
   * configured per project. This fields provides the ability explicitly choose
   * one. If none is provided, the oldest domain is used by default.
   */
  dynamicLinkDomain?: string;
}

/** Defines the email action code server request. */
interface EmailActionCodeRequest {
  continueUrl?: string;
  canHandleCodeInApp?: boolean;
  dynamicLinkDomain?: string;
  androidPackageName?: string;
  androidMinimumVersion: string;
  androidInstallApp?: boolean;
  iOSBundleId?: string;
}

/**
 * Defines the ActionCodeSettings builder class used to convert the
 * ActionCodeSettings object to its corresponding server request.
 *
 * @internal
 */
export class ActionCodeSettingsBuilder {
  private continueUrl?: string;
  private apn?: string;
  private amv?: string;
  private installApp?: boolean;
  private ibi?: string;
  private canHandleCodeInApp?: boolean;
  private dynamicLinkDomain?: string;

  /**
   * ActionCodeSettingsBuilder constructor.
   *
   * @param {ActionCodeSettings} actionCodeSettings The ActionCodeSettings
   *     object used to initiliaze this server request builder.
   * @constructor
   */
  constructor(actionCodeSettings: ActionCodeSettings) {
    if (!validator.isNonNullObject(actionCodeSettings)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"ActionCodeSettings" must be a non-null object.',
      );
    }
    if (typeof actionCodeSettings.url === 'undefined') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.MISSING_CONTINUE_URI,
      );
    } else if (!validator.isURL(actionCodeSettings.url)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONTINUE_URI,
      );
    }
    this.continueUrl = actionCodeSettings.url;

    if (typeof actionCodeSettings.handleCodeInApp !== 'undefined' &&
      !validator.isBoolean(actionCodeSettings.handleCodeInApp)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"ActionCodeSettings.handleCodeInApp" must be a boolean.',
      );
    }
    this.canHandleCodeInApp = actionCodeSettings.handleCodeInApp || false;

    if (typeof actionCodeSettings.dynamicLinkDomain !== 'undefined' &&
      !validator.isNonEmptyString(actionCodeSettings.dynamicLinkDomain)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_DYNAMIC_LINK_DOMAIN,
      );
    }
    this.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;

    if (typeof actionCodeSettings.iOS !== 'undefined') {
      if (!validator.isNonNullObject(actionCodeSettings.iOS)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"ActionCodeSettings.iOS" must be a valid non-null object.',
        );
      } else if (typeof actionCodeSettings.iOS.bundleId === 'undefined') {
        throw new FirebaseAuthError(
          AuthClientErrorCode.MISSING_IOS_BUNDLE_ID,
        );
      } else if (!validator.isNonEmptyString(actionCodeSettings.iOS.bundleId)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"ActionCodeSettings.iOS.bundleId" must be a valid non-empty string.',
        );
      }
      this.ibi = actionCodeSettings.iOS.bundleId;
    }

    if (typeof actionCodeSettings.android !== 'undefined') {
      if (!validator.isNonNullObject(actionCodeSettings.android)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"ActionCodeSettings.android" must be a valid non-null object.',
        );
      } else if (typeof actionCodeSettings.android.packageName === 'undefined') {
        throw new FirebaseAuthError(
          AuthClientErrorCode.MISSING_ANDROID_PACKAGE_NAME,
        );
      } else if (!validator.isNonEmptyString(actionCodeSettings.android.packageName)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"ActionCodeSettings.android.packageName" must be a valid non-empty string.',
        );
      } else if (typeof actionCodeSettings.android.minimumVersion !== 'undefined' &&
        !validator.isNonEmptyString(actionCodeSettings.android.minimumVersion)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"ActionCodeSettings.android.minimumVersion" must be a valid non-empty string.',
        );
      } else if (typeof actionCodeSettings.android.installApp !== 'undefined' &&
        !validator.isBoolean(actionCodeSettings.android.installApp)) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_ARGUMENT,
          '"ActionCodeSettings.android.installApp" must be a valid boolean.',
        );
      }
      this.apn = actionCodeSettings.android.packageName;
      this.amv = actionCodeSettings.android.minimumVersion;
      this.installApp = actionCodeSettings.android.installApp || false;
    }
  }

  /**
   * Returns the corresponding constructed server request corresponding to the
   * current ActionCodeSettings.
   *
   * @returns The constructed EmailActionCodeRequest request.
   */
  public buildRequest(): EmailActionCodeRequest {
    const request: { [key: string]: any } = {
      continueUrl: this.continueUrl,
      canHandleCodeInApp: this.canHandleCodeInApp,
      dynamicLinkDomain: this.dynamicLinkDomain,
      androidPackageName: this.apn,
      androidMinimumVersion: this.amv,
      androidInstallApp: this.installApp,
      iOSBundleId: this.ibi,
    };
    // Remove all null and undefined fields from request.
    for (const key in request) {
      if (Object.prototype.hasOwnProperty.call(request, key)) {
        if (typeof request[key] === 'undefined' || request[key] === null) {
          delete request[key];
        }
      }
    }
    return request as EmailActionCodeRequest;
  }
}

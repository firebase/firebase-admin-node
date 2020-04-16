import * as _admin from './index.d';

export namespace admin.projectManagement {

  /**
   * A SHA-1 or SHA-256 certificate.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.shaCertificate()`](admin.projectManagement.ProjectManagement#shaCertificate).
   */
  interface ShaCertificate {

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
   * Metadata about a Firebase app.
   */
  interface AppMetadata {

    /**
     * The globally unique, Firebase-assigned identifier of the app.
     *
     * @example
     * ```javascript
     * var appId = appMetadata.appId;
     * ```
     */
    appId: string;

    /**
     * The optional user-assigned display name of the app.
     *
     * @example
     * ```javascript
     * var displayName = appMetadata.displayName;
     * ```
     */
    displayName?: string;

    /**
     * The development platform of the app. Supporting Android and iOS app platforms.
     *
     * @example
     * ```javascript
     * var platform = AppPlatform.ANDROID;
     * ```
     */
    platform: AppPlatform;

    /**
     * The globally unique, user-assigned ID of the parent project for the app.
     *
     * @example
     * ```javascript
     * var projectId = appMetadata.projectId;
     * ```
     */
    projectId: string;

    /**
     * The fully-qualified resource name that identifies this app.
     *
     * This is useful when manually constructing requests for Firebase's public API.
     *
     * @example
     * ```javascript
     * var resourceName = androidAppMetadata.resourceName;
     * ```
     */
    resourceName: string;
  }

  /**
   * Platforms with which a Firebase App can be associated.
   */
  enum AppPlatform {

    /**
     * Unknown state. This is only used for distinguishing unset values.
     */
    PLATFORM_UNKNOWN = 'PLATFORM_UNKNOWN',

    /**
     * The Firebase App is associated with iOS.
     */
    IOS = 'IOS',

    /**
     * The Firebase App is associated with Android.
     */
    ANDROID = 'ANDROID',
  }

  /**
   * Metadata about a Firebase Android App.
   */
  interface AndroidAppMetadata extends AppMetadata {

    platform: AppPlatform.ANDROID;

    /**
     * The canonical package name of the Android App, as would appear in the Google Play Developer
     * Console.
     *
     * @example
     * ```javascript
     * var packageName = androidAppMetadata.packageName;
     * ```
     */
    packageName: string;
  }

  /**
   * Metadata about a Firebase iOS App.
   */
  interface IosAppMetadata extends AppMetadata {
    platform: AppPlatform.IOS;

    /**
     * The canonical bundle ID of the iOS App as it would appear in the iOS App Store.
     *
     * @example
     * ```javascript
     * var bundleId = iosAppMetadata.bundleId;
     *```
     */
    bundleId: string;
  }

  /**
   * A reference to a Firebase Android app.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.androidApp()`](admin.projectManagement.ProjectManagement#androidApp).
   */
  interface AndroidApp {
    appId: string;

    /**
     * Retrieves metadata about this Android app.
     *
     * @return A promise that resolves to the retrieved metadata about this Android app.
     */
    getMetadata(): Promise<admin.projectManagement.AndroidAppMetadata>;

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
    getShaCertificates(): Promise<admin.projectManagement.ShaCertificate[]>;

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

  /**
   * A reference to a Firebase iOS app.
   *
   * Do not call this constructor directly. Instead, use
   * [`projectManagement.iosApp()`](admin.projectManagement.ProjectManagement#iosApp).
   */
  interface IosApp {
    appId: string;

    /**
     * Retrieves metadata about this iOS app.
     *
     * @return {!Promise<admin.projectManagement.IosAppMetadata>} A promise that
     *     resolves to the retrieved metadata about this iOS app.
     */
    getMetadata(): Promise<admin.projectManagement.IosAppMetadata>;

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

  /**
   * The Firebase ProjectManagement service interface.
   *
   * Do not call this constructor directly. Instead, use
   * [`admin.projectManagement()`](admin.projectManagement#projectManagement).
   */
  interface ProjectManagement {
    app: _admin.app.App;

    /**
     * Lists up to 100 Firebase apps associated with this Firebase project.
     *
     * @return A promise that resolves to the metadata list of the apps.
     */
    listAppMetadata(): Promise<admin.projectManagement.AppMetadata[]>;

    /**
     * Lists up to 100 Firebase Android apps associated with this Firebase project.
     *
     * @return The list of Android apps.
     */
    listAndroidApps(): Promise<admin.projectManagement.AndroidApp[]>;

    /**
     * Lists up to 100 Firebase iOS apps associated with this Firebase project.
     *
     * @return The list of iOS apps.
     */
    listIosApps(): Promise<admin.projectManagement.IosApp[]>;

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
    androidApp(appId: string): admin.projectManagement.AndroidApp;

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
    iosApp(appId: string): admin.projectManagement.IosApp;

    /**
     * Creates a `ShaCertificate` object.
     *
     * This method does not perform an RPC.
     *
     * @param shaHash The SHA-1 or SHA-256 hash for this certificate.
     *
     * @return A `ShaCertificate` object contains the specified SHA hash.
     */
    shaCertificate(shaHash: string): admin.projectManagement.ShaCertificate;

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
      packageName: string, displayName?: string): Promise<admin.projectManagement.AndroidApp>;

    /**
     * Creates a new Firebase iOS app associated with this Firebase project.
     *
     * @param bundleId The iOS app bundle ID to use for this new app.
     * @param displayName An optional user-assigned display name for this
     *     new app.
     *
     * @return A promise that resolves to the newly created iOS app.
     */
    createIosApp(bundleId: string, displayName?: string): Promise<admin.projectManagement.IosApp>;
  }
}

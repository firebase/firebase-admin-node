{% extends "_internal/templates/reference.html" %}
{% block title %}ProjectManagement class{% endblock title %}
{% block body %}
The Firebase ProjectManagement service interface.

Do not call this constructor directly. Instead, use \[`admin.projectManagement()`<!-- -->\](projectManagement\#projectManagement).

<b>Signature:</b>

```typescript
export declare class ProjectManagement 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.project-management.projectmanagement.md#projectmanagementapp) |  | App |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [androidApp(appId)](./firebase-admin.project-management.projectmanagement.md#projectmanagementandroidapp) |  | Creates an <code>AndroidApp</code> object, referencing the specified Android app within this Firebase project.<!-- -->This method does not perform an RPC. |
|  [createAndroidApp(packageName, displayName)](./firebase-admin.project-management.projectmanagement.md#projectmanagementcreateandroidapp) |  | Creates a new Firebase Android app associated with this Firebase project. |
|  [createIosApp(bundleId, displayName)](./firebase-admin.project-management.projectmanagement.md#projectmanagementcreateiosapp) |  | Creates a new Firebase iOS app associated with this Firebase project. |
|  [iosApp(appId)](./firebase-admin.project-management.projectmanagement.md#projectmanagementiosapp) |  | Creates an <code>iOSApp</code> object, referencing the specified iOS app within this Firebase project.<!-- -->This method does not perform an RPC. |
|  [listAndroidApps()](./firebase-admin.project-management.projectmanagement.md#projectmanagementlistandroidapps) |  | Lists up to 100 Firebase Android apps associated with this Firebase project. The list of Android apps. |
|  [listAppMetadata()](./firebase-admin.project-management.projectmanagement.md#projectmanagementlistappmetadata) |  | Lists up to 100 Firebase apps associated with this Firebase project. A promise that resolves to the metadata list of the apps. |
|  [listIosApps()](./firebase-admin.project-management.projectmanagement.md#projectmanagementlistiosapps) |  | Lists up to 100 Firebase iOS apps associated with this Firebase project. The list of iOS apps. |
|  [setDisplayName(newDisplayName)](./firebase-admin.project-management.projectmanagement.md#projectmanagementsetdisplayname) |  | Update the display name of this Firebase project. |
|  [shaCertificate(shaHash)](./firebase-admin.project-management.projectmanagement.md#projectmanagementshacertificate) |  | Creates a <code>ShaCertificate</code> object.<!-- -->This method does not perform an RPC. |

## ProjectManagement.app

<b>Signature:</b>

```typescript
readonly app: App;
```

## ProjectManagement.androidApp()

Creates an `AndroidApp` object, referencing the specified Android app within this Firebase project.

This method does not perform an RPC.

<b>Signature:</b>

```typescript
androidApp(appId: string): AndroidApp;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  appId | string | The <code>appId</code> of the Android app to reference. An <code>AndroidApp</code> object that references the specified Firebase Android app. |

<b>Returns:</b>

[AndroidApp](./firebase-admin.project-management.androidapp.md#androidapp_class)

## ProjectManagement.createAndroidApp()

Creates a new Firebase Android app associated with this Firebase project.

<b>Signature:</b>

```typescript
createAndroidApp(packageName: string, displayName?: string): Promise<AndroidApp>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  packageName | string | The canonical package name of the Android App, as would appear in the Google Play Developer Console. |
|  displayName | string | An optional user-assigned display name for this new app. A promise that resolves to the newly created Android app. |

<b>Returns:</b>

Promise&lt;[AndroidApp](./firebase-admin.project-management.androidapp.md#androidapp_class)<!-- -->&gt;

## ProjectManagement.createIosApp()

Creates a new Firebase iOS app associated with this Firebase project.

<b>Signature:</b>

```typescript
createIosApp(bundleId: string, displayName?: string): Promise<IosApp>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  bundleId | string | The iOS app bundle ID to use for this new app. |
|  displayName | string | An optional user-assigned display name for this new app. A promise that resolves to the newly created iOS app. |

<b>Returns:</b>

Promise&lt;[IosApp](./firebase-admin.project-management.iosapp.md#iosapp_class)<!-- -->&gt;

## ProjectManagement.iosApp()

Creates an `iOSApp` object, referencing the specified iOS app within this Firebase project.

This method does not perform an RPC.

<b>Signature:</b>

```typescript
iosApp(appId: string): IosApp;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  appId | string | The <code>appId</code> of the iOS app to reference. An <code>iOSApp</code> object that references the specified Firebase iOS app. |

<b>Returns:</b>

[IosApp](./firebase-admin.project-management.iosapp.md#iosapp_class)

## ProjectManagement.listAndroidApps()

Lists up to 100 Firebase Android apps associated with this Firebase project.

 The list of Android apps.

<b>Signature:</b>

```typescript
listAndroidApps(): Promise<AndroidApp[]>;
```
<b>Returns:</b>

Promise&lt;[AndroidApp](./firebase-admin.project-management.androidapp.md#androidapp_class)<!-- -->\[\]&gt;

## ProjectManagement.listAppMetadata()

Lists up to 100 Firebase apps associated with this Firebase project.

 A promise that resolves to the metadata list of the apps.

<b>Signature:</b>

```typescript
listAppMetadata(): Promise<AppMetadata[]>;
```
<b>Returns:</b>

Promise&lt;[AppMetadata](./firebase-admin.project-management.appmetadata.md#appmetadata_interface)<!-- -->\[\]&gt;

## ProjectManagement.listIosApps()

Lists up to 100 Firebase iOS apps associated with this Firebase project.

 The list of iOS apps.

<b>Signature:</b>

```typescript
listIosApps(): Promise<IosApp[]>;
```
<b>Returns:</b>

Promise&lt;[IosApp](./firebase-admin.project-management.iosapp.md#iosapp_class)<!-- -->\[\]&gt;

## ProjectManagement.setDisplayName()

Update the display name of this Firebase project.

<b>Signature:</b>

```typescript
setDisplayName(newDisplayName: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newDisplayName | string | The new display name to be updated. A promise that resolves when the project display name has been updated. |

<b>Returns:</b>

Promise&lt;void&gt;

## ProjectManagement.shaCertificate()

Creates a `ShaCertificate` object.

This method does not perform an RPC.

<b>Signature:</b>

```typescript
shaCertificate(shaHash: string): ShaCertificate;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  shaHash | string | The SHA-1 or SHA-256 hash for this certificate. A <code>ShaCertificate</code> object contains the specified SHA hash. |

<b>Returns:</b>

[ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class)

{% endblock body %}

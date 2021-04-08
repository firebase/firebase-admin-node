Metadata about a Firebase Android App.

<b>Signature:</b>

```typescript
export interface AndroidAppMetadata extends AppMetadata 
```
<b>Extends:</b> [AppMetadata](./firebase-admin.project-management.appmetadata.md#appmetadata_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [packageName](./firebase-admin.project-management.androidappmetadata.md#androidappmetadatapackagename) | string | The canonical package name of the Android App, as would appear in the Google Play Developer Console. |
|  [platform](./firebase-admin.project-management.androidappmetadata.md#androidappmetadataplatform) | [AppPlatform.ANDROID](./firebase-admin.project-management.md#appplatformandroid_enummember) |  |

## AndroidAppMetadata.packageName

The canonical package name of the Android App, as would appear in the Google Play Developer Console.

<b>Signature:</b>

```typescript
packageName: string;
```

### Example


```javascript
var packageName = androidAppMetadata.packageName;

```

## AndroidAppMetadata.platform

<b>Signature:</b>

```typescript
platform: AppPlatform.ANDROID;
```

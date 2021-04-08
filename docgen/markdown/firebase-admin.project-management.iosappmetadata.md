Metadata about a Firebase iOS App.

<b>Signature:</b>

```typescript
export interface IosAppMetadata extends AppMetadata 
```
<b>Extends:</b> [AppMetadata](./firebase-admin.project-management.appmetadata.md#appmetadata_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [bundleId](./firebase-admin.project-management.iosappmetadata.md#iosappmetadatabundleid) | string | The canonical bundle ID of the iOS App as it would appear in the iOS App Store. |
|  [platform](./firebase-admin.project-management.iosappmetadata.md#iosappmetadataplatform) | [AppPlatform.IOS](./firebase-admin.project-management.md#appplatformios_enummember) |  |

## IosAppMetadata.bundleId

The canonical bundle ID of the iOS App as it would appear in the iOS App Store.

<b>Signature:</b>

```typescript
bundleId: string;
```

### Example


```javascript
var bundleId = iosAppMetadata.bundleId;

```

## IosAppMetadata.platform

<b>Signature:</b>

```typescript
platform: AppPlatform.IOS;
```

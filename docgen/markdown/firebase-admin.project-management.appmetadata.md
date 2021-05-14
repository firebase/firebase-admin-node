{% extends "_internal/templates/reference.html" %}
{% block title %}AppMetadata interface{% endblock title %}
{% block body %}
Metadata about a Firebase app.

<b>Signature:</b>

```typescript
export interface AppMetadata 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [appId](./firebase-admin.project-management.appmetadata.md#appmetadataappid) | string | The globally unique, Firebase-assigned identifier of the app. |
|  [displayName](./firebase-admin.project-management.appmetadata.md#appmetadatadisplayname) | string | The optional user-assigned display name of the app. |
|  [platform](./firebase-admin.project-management.appmetadata.md#appmetadataplatform) | [AppPlatform](./firebase-admin.project-management.md#appplatform) | The development platform of the app. Supporting Android and iOS app platforms. |
|  [projectId](./firebase-admin.project-management.appmetadata.md#appmetadataprojectid) | string | The globally unique, user-assigned ID of the parent project for the app. |
|  [resourceName](./firebase-admin.project-management.appmetadata.md#appmetadataresourcename) | string | The fully-qualified resource name that identifies this app.<!-- -->This is useful when manually constructing requests for Firebase's public API. |

## AppMetadata.appId

The globally unique, Firebase-assigned identifier of the app.

<b>Signature:</b>

```typescript
appId: string;
```

### Example


```javascript
var appId = appMetadata.appId;

```

## AppMetadata.displayName

The optional user-assigned display name of the app.

<b>Signature:</b>

```typescript
displayName?: string;
```

### Example


```javascript
var displayName = appMetadata.displayName;

```

## AppMetadata.platform

The development platform of the app. Supporting Android and iOS app platforms.

<b>Signature:</b>

```typescript
platform: AppPlatform;
```

### Example


```javascript
var platform = AppPlatform.ANDROID;

```

## AppMetadata.projectId

The globally unique, user-assigned ID of the parent project for the app.

<b>Signature:</b>

```typescript
projectId: string;
```

### Example


```javascript
var projectId = appMetadata.projectId;

```

## AppMetadata.resourceName

The fully-qualified resource name that identifies this app.

This is useful when manually constructing requests for Firebase's public API.

<b>Signature:</b>

```typescript
resourceName: string;
```

### Example


```javascript
var resourceName = androidAppMetadata.resourceName;

```

{% endblock body %}

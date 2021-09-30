{% extends "_internal/templates/reference.html" %}
{% block title %}Installations class{% endblock title %}
{% block body %}
The `Installations` service for the current app.

<b>Signature:</b>

```typescript
export declare class Installations 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.installations.installations.md#installationsapp) |  | App | Returns the app associated with this Installations instance. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [deleteInstallation(fid)](./firebase-admin.installations.installations.md#installationsdeleteinstallation) |  | Deletes the specified installation ID and the associated data from Firebase. |

## Installations.app

Returns the app associated with this Installations instance.

<b>Signature:</b>

```typescript
get app(): App;
```

## Installations.deleteInstallation()

Deletes the specified installation ID and the associated data from Firebase.

<b>Signature:</b>

```typescript
deleteInstallation(fid: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  fid | string | The Firebase installation ID to be deleted. |

<b>Returns:</b>

Promise&lt;void&gt;

A promise fulfilled when the installation ID is deleted.

{% endblock body %}

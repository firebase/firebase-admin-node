{% extends "_internal/templates/reference.html" %}
{% block title %}IosApp class{% endblock title %}
{% block body %}
A reference to a Firebase iOS app.

Do not call this constructor directly. Instead, use [ProjectManagement.iosApp()](./firebase-admin.project-management.projectmanagement.md#projectmanagementiosapp)<!-- -->.

<b>Signature:</b>

```typescript
export declare class IosApp 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [appId](./firebase-admin.project-management.iosapp.md#iosappappid) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [getConfig()](./firebase-admin.project-management.iosapp.md#iosappgetconfig) |  | Gets the configuration artifact associated with this app. |
|  [getMetadata()](./firebase-admin.project-management.iosapp.md#iosappgetmetadata) |  | Retrieves metadata about this iOS app. |
|  [setDisplayName(newDisplayName)](./firebase-admin.project-management.iosapp.md#iosappsetdisplayname) |  | Sets the optional user-assigned display name of the app. |

## IosApp.appId

<b>Signature:</b>

```typescript
readonly appId: string;
```

## IosApp.getConfig()

Gets the configuration artifact associated with this app.

<b>Signature:</b>

```typescript
getConfig(): Promise<string>;
```
<b>Returns:</b>

Promise&lt;string&gt;

A promise that resolves to the iOS app's Firebase config file, in UTF-8 string format. This string is typically intended to be written to a plist file that gets shipped with your iOS app.

## IosApp.getMetadata()

Retrieves metadata about this iOS app.

<b>Signature:</b>

```typescript
getMetadata(): Promise<IosAppMetadata>;
```
<b>Returns:</b>

Promise&lt;[IosAppMetadata](./firebase-admin.project-management.iosappmetadata.md#iosappmetadata_interface)<!-- -->&gt;

A promise that resolves to the retrieved metadata about this iOS app.

## IosApp.setDisplayName()

Sets the optional user-assigned display name of the app.

<b>Signature:</b>

```typescript
setDisplayName(newDisplayName: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newDisplayName | string | The new display name to set. |

<b>Returns:</b>

Promise&lt;void&gt;

A promise that resolves when the display name has been set.

{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}AndroidApp class{% endblock title %}
{% block body %}
A reference to a Firebase Android app.

Do not call this constructor directly. Instead, use [ProjectManagement.androidApp()](./firebase-admin.project-management.projectmanagement.md#projectmanagementandroidapp)<!-- -->.

<b>Signature:</b>

```typescript
export declare class AndroidApp 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [appId](./firebase-admin.project-management.androidapp.md#androidappappid) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [addShaCertificate(certificateToAdd)](./firebase-admin.project-management.androidapp.md#androidappaddshacertificate) |  | Adds the given SHA certificate to this Android app. |
|  [deleteShaCertificate(certificateToDelete)](./firebase-admin.project-management.androidapp.md#androidappdeleteshacertificate) |  | Deletes the specified SHA certificate from this Android app. |
|  [getConfig()](./firebase-admin.project-management.androidapp.md#androidappgetconfig) |  | Gets the configuration artifact associated with this app. |
|  [getMetadata()](./firebase-admin.project-management.androidapp.md#androidappgetmetadata) |  | Retrieves metadata about this Android app. |
|  [getShaCertificates()](./firebase-admin.project-management.androidapp.md#androidappgetshacertificates) |  | Gets the list of SHA certificates associated with this Android app in Firebase. |
|  [setDisplayName(newDisplayName)](./firebase-admin.project-management.androidapp.md#androidappsetdisplayname) |  | Sets the optional user-assigned display name of the app. |

## AndroidApp.appId

<b>Signature:</b>

```typescript
readonly appId: string;
```

## AndroidApp.addShaCertificate()

Adds the given SHA certificate to this Android app.

<b>Signature:</b>

```typescript
addShaCertificate(certificateToAdd: ShaCertificate): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  certificateToAdd | [ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class) | The SHA certificate to add. |

<b>Returns:</b>

Promise&lt;void&gt;

A promise that resolves when the given certificate has been added to the Android app.

## AndroidApp.deleteShaCertificate()

Deletes the specified SHA certificate from this Android app.

<b>Signature:</b>

```typescript
deleteShaCertificate(certificateToDelete: ShaCertificate): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  certificateToDelete | [ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class) | The SHA certificate to delete. |

<b>Returns:</b>

Promise&lt;void&gt;

A promise that resolves when the specified certificate has been removed from the Android app.

## AndroidApp.getConfig()

Gets the configuration artifact associated with this app.

<b>Signature:</b>

```typescript
getConfig(): Promise<string>;
```
<b>Returns:</b>

Promise&lt;string&gt;

A promise that resolves to the Android app's Firebase config file, in UTF-8 string format. This string is typically intended to be written to a JSON file that gets shipped with your Android app.

## AndroidApp.getMetadata()

Retrieves metadata about this Android app.

<b>Signature:</b>

```typescript
getMetadata(): Promise<AndroidAppMetadata>;
```
<b>Returns:</b>

Promise&lt;[AndroidAppMetadata](./firebase-admin.project-management.androidappmetadata.md#androidappmetadata_interface)<!-- -->&gt;

A promise that resolves to the retrieved metadata about this Android app.

## AndroidApp.getShaCertificates()

Gets the list of SHA certificates associated with this Android app in Firebase.

<b>Signature:</b>

```typescript
getShaCertificates(): Promise<ShaCertificate[]>;
```
<b>Returns:</b>

Promise&lt;[ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class)<!-- -->\[\]&gt;

The list of SHA-1 and SHA-256 certificates associated with this Android app in Firebase.

## AndroidApp.setDisplayName()

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

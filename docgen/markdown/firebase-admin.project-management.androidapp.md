A reference to a Firebase Android app.

Do not call this constructor directly. Instead, use \[`projectManagement.androidApp()`<!-- -->\](projectManagement.ProjectManagement\#androidApp).

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
|  [getConfig()](./firebase-admin.project-management.androidapp.md#androidappgetconfig) |  | Gets the configuration artifact associated with this app. A promise that resolves to the Android app's Firebase config file, in UTF-8 string format. This string is typically intended to be written to a JSON file that gets shipped with your Android app. |
|  [getMetadata()](./firebase-admin.project-management.androidapp.md#androidappgetmetadata) |  | Retrieves metadata about this Android app. A promise that resolves to the retrieved metadata about this Android app. |
|  [getShaCertificates()](./firebase-admin.project-management.androidapp.md#androidappgetshacertificates) |  | Gets the list of SHA certificates associated with this Android app in Firebase. The list of SHA-1 and SHA-256 certificates associated with this Android app in Firebase. |
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
|  certificateToAdd | [ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class) | The SHA certificate to add. A promise that resolves when the given certificate has been added to the Android app. |

<b>Returns:</b>

Promise&lt;void&gt;

## AndroidApp.deleteShaCertificate()

Deletes the specified SHA certificate from this Android app.

<b>Signature:</b>

```typescript
deleteShaCertificate(certificateToDelete: ShaCertificate): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  certificateToDelete | [ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class) | The SHA certificate to delete. A promise that resolves when the specified certificate has been removed from the Android app. |

<b>Returns:</b>

Promise&lt;void&gt;

## AndroidApp.getConfig()

Gets the configuration artifact associated with this app.

 A promise that resolves to the Android app's Firebase config file, in UTF-8 string format. This string is typically intended to be written to a JSON file that gets shipped with your Android app.

<b>Signature:</b>

```typescript
getConfig(): Promise<string>;
```
<b>Returns:</b>

Promise&lt;string&gt;

## AndroidApp.getMetadata()

Retrieves metadata about this Android app.

 A promise that resolves to the retrieved metadata about this Android app.

<b>Signature:</b>

```typescript
getMetadata(): Promise<AndroidAppMetadata>;
```
<b>Returns:</b>

Promise&lt;[AndroidAppMetadata](./firebase-admin.project-management.androidappmetadata.md#androidappmetadata_interface)<!-- -->&gt;

## AndroidApp.getShaCertificates()

Gets the list of SHA certificates associated with this Android app in Firebase.

 The list of SHA-1 and SHA-256 certificates associated with this Android app in Firebase.

<b>Signature:</b>

```typescript
getShaCertificates(): Promise<ShaCertificate[]>;
```
<b>Returns:</b>

Promise&lt;[ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class)<!-- -->\[\]&gt;

## AndroidApp.setDisplayName()

Sets the optional user-assigned display name of the app.

<b>Signature:</b>

```typescript
setDisplayName(newDisplayName: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newDisplayName | string | The new display name to set. A promise that resolves when the display name has been set. |

<b>Returns:</b>

Promise&lt;void&gt;


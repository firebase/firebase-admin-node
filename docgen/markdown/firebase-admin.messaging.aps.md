Represents the \[aps dictionary\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html) that is part of APNs messages.

<b>Signature:</b>

```typescript
export interface Aps 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [alert](./firebase-admin.messaging.aps.md#apsalert) | string \| [ApsAlert](./firebase-admin.messaging.apsalert.md#apsalert_interface) | Alert to be included in the message. This may be a string or an object of type <code>admin.messaging.ApsAlert</code>. |
|  [badge](./firebase-admin.messaging.aps.md#apsbadge) | number | Badge to be displayed with the message. Set to 0 to remove the badge. When not specified, the badge will remain unchanged. |
|  [category](./firebase-admin.messaging.aps.md#apscategory) | string | Type of the notification. |
|  [contentAvailable](./firebase-admin.messaging.aps.md#apscontentavailable) | boolean | Specifies whether to configure a background update notification. |
|  [mutableContent](./firebase-admin.messaging.aps.md#apsmutablecontent) | boolean | Specifies whether to set the <code>mutable-content</code> property on the message so the clients can modify the notification via app extensions. |
|  [sound](./firebase-admin.messaging.aps.md#apssound) | string \| [CriticalSound](./firebase-admin.messaging.criticalsound.md#criticalsound_interface) | Sound to be played with the message. |
|  [threadId](./firebase-admin.messaging.aps.md#apsthreadid) | string | An app-specific identifier for grouping notifications. |

## Aps.alert

Alert to be included in the message. This may be a string or an object of type `admin.messaging.ApsAlert`<!-- -->.

<b>Signature:</b>

```typescript
alert?: string | ApsAlert;
```

## Aps.badge

Badge to be displayed with the message. Set to 0 to remove the badge. When not specified, the badge will remain unchanged.

<b>Signature:</b>

```typescript
badge?: number;
```

## Aps.category

Type of the notification.

<b>Signature:</b>

```typescript
category?: string;
```

## Aps.contentAvailable

Specifies whether to configure a background update notification.

<b>Signature:</b>

```typescript
contentAvailable?: boolean;
```

## Aps.mutableContent

Specifies whether to set the `mutable-content` property on the message so the clients can modify the notification via app extensions.

<b>Signature:</b>

```typescript
mutableContent?: boolean;
```

## Aps.sound

Sound to be played with the message.

<b>Signature:</b>

```typescript
sound?: string | CriticalSound;
```

## Aps.threadId

An app-specific identifier for grouping notifications.

<b>Signature:</b>

```typescript
threadId?: string;
```

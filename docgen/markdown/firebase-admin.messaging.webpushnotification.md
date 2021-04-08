Represents the WebPush-specific notification options that can be included in . This supports most of the standard options as defined in the Web Notification \[specification\](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification).

<b>Signature:</b>

```typescript
export interface WebpushNotification 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [actions](./firebase-admin.messaging.webpushnotification.md#webpushnotificationactions) | Array&lt;{ action: string; icon?: string; title: string; }&gt; | An array of notification actions representing the actions available to the user when the notification is presented. |
|  [badge](./firebase-admin.messaging.webpushnotification.md#webpushnotificationbadge) | string | URL of the image used to represent the notification when there is not enough space to display the notification itself. |
|  [body](./firebase-admin.messaging.webpushnotification.md#webpushnotificationbody) | string | Body text of the notification. |
|  [data](./firebase-admin.messaging.webpushnotification.md#webpushnotificationdata) | any | Arbitrary data that you want associated with the notification. This can be of any data type. |
|  [dir](./firebase-admin.messaging.webpushnotification.md#webpushnotificationdir) | 'auto' \| 'ltr' \| 'rtl' | The direction in which to display the notification. Must be one of <code>auto</code>, <code>ltr</code> or <code>rtl</code>. |
|  [icon](./firebase-admin.messaging.webpushnotification.md#webpushnotificationicon) | string | URL to the notification icon. |
|  [image](./firebase-admin.messaging.webpushnotification.md#webpushnotificationimage) | string | URL of an image to be displayed in the notification. |
|  [lang](./firebase-admin.messaging.webpushnotification.md#webpushnotificationlang) | string | The notification's language as a BCP 47 language tag. |
|  [renotify](./firebase-admin.messaging.webpushnotification.md#webpushnotificationrenotify) | boolean | A boolean specifying whether the user should be notified after a new notification replaces an old one. Defaults to false. |
|  [requireInteraction](./firebase-admin.messaging.webpushnotification.md#webpushnotificationrequireinteraction) | boolean | Indicates that a notification should remain active until the user clicks or dismisses it, rather than closing automatically. Defaults to false. |
|  [silent](./firebase-admin.messaging.webpushnotification.md#webpushnotificationsilent) | boolean | A boolean specifying whether the notification should be silent. Defaults to false. |
|  [tag](./firebase-admin.messaging.webpushnotification.md#webpushnotificationtag) | string | An identifying tag for the notification. |
|  [timestamp](./firebase-admin.messaging.webpushnotification.md#webpushnotificationtimestamp) | number | Timestamp of the notification. Refer to https://developer.mozilla.org/en-US/docs/Web/API/notification/timestamp for details. |
|  [title](./firebase-admin.messaging.webpushnotification.md#webpushnotificationtitle) | string | Title text of the notification. |
|  [vibrate](./firebase-admin.messaging.webpushnotification.md#webpushnotificationvibrate) | number \| number\[\] | A vibration pattern for the device's vibration hardware to emit when the notification fires. |

## WebpushNotification.actions

An array of notification actions representing the actions available to the user when the notification is presented.

<b>Signature:</b>

```typescript
actions?: Array<{
        action: string;
        icon?: string;
        title: string;
    }>;
```

## WebpushNotification.badge

URL of the image used to represent the notification when there is not enough space to display the notification itself.

<b>Signature:</b>

```typescript
badge?: string;
```

## WebpushNotification.body

Body text of the notification.

<b>Signature:</b>

```typescript
body?: string;
```

## WebpushNotification.data

Arbitrary data that you want associated with the notification. This can be of any data type.

<b>Signature:</b>

```typescript
data?: any;
```

## WebpushNotification.dir

The direction in which to display the notification. Must be one of `auto`<!-- -->, `ltr` or `rtl`<!-- -->.

<b>Signature:</b>

```typescript
dir?: 'auto' | 'ltr' | 'rtl';
```

## WebpushNotification.icon

URL to the notification icon.

<b>Signature:</b>

```typescript
icon?: string;
```

## WebpushNotification.image

URL of an image to be displayed in the notification.

<b>Signature:</b>

```typescript
image?: string;
```

## WebpushNotification.lang

The notification's language as a BCP 47 language tag.

<b>Signature:</b>

```typescript
lang?: string;
```

## WebpushNotification.renotify

A boolean specifying whether the user should be notified after a new notification replaces an old one. Defaults to false.

<b>Signature:</b>

```typescript
renotify?: boolean;
```

## WebpushNotification.requireInteraction

Indicates that a notification should remain active until the user clicks or dismisses it, rather than closing automatically. Defaults to false.

<b>Signature:</b>

```typescript
requireInteraction?: boolean;
```

## WebpushNotification.silent

A boolean specifying whether the notification should be silent. Defaults to false.

<b>Signature:</b>

```typescript
silent?: boolean;
```

## WebpushNotification.tag

An identifying tag for the notification.

<b>Signature:</b>

```typescript
tag?: string;
```

## WebpushNotification.timestamp

Timestamp of the notification. Refer to https://developer.mozilla.org/en-US/docs/Web/API/notification/timestamp for details.

<b>Signature:</b>

```typescript
timestamp?: number;
```

## WebpushNotification.title

Title text of the notification.

<b>Signature:</b>

```typescript
title?: string;
```

## WebpushNotification.vibrate

A vibration pattern for the device's vibration hardware to emit when the notification fires.

<b>Signature:</b>

```typescript
vibrate?: number | number[];
```

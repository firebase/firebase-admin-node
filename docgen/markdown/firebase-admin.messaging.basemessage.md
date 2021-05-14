{% extends "_internal/templates/reference.html" %}
{% block title %}BaseMessage interface{% endblock title %}
{% block body %}
<b>Signature:</b>

```typescript
export interface BaseMessage 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [android](./firebase-admin.messaging.basemessage.md#basemessageandroid) | [AndroidConfig](./firebase-admin.messaging.androidconfig.md#androidconfig_interface) |  |
|  [apns](./firebase-admin.messaging.basemessage.md#basemessageapns) | [ApnsConfig](./firebase-admin.messaging.apnsconfig.md#apnsconfig_interface) |  |
|  [data](./firebase-admin.messaging.basemessage.md#basemessagedata) | { \[key: string\]: string; } |  |
|  [fcmOptions](./firebase-admin.messaging.basemessage.md#basemessagefcmoptions) | [FcmOptions](./firebase-admin.messaging.fcmoptions.md#fcmoptions_interface) |  |
|  [notification](./firebase-admin.messaging.basemessage.md#basemessagenotification) | [Notification](./firebase-admin.messaging.notification.md#notification_interface) |  |
|  [webpush](./firebase-admin.messaging.basemessage.md#basemessagewebpush) | [WebpushConfig](./firebase-admin.messaging.webpushconfig.md#webpushconfig_interface) |  |

## BaseMessage.android

<b>Signature:</b>

```typescript
android?: AndroidConfig;
```

## BaseMessage.apns

<b>Signature:</b>

```typescript
apns?: ApnsConfig;
```

## BaseMessage.data

<b>Signature:</b>

```typescript
data?: {
        [key: string]: string;
    };
```

## BaseMessage.fcmOptions

<b>Signature:</b>

```typescript
fcmOptions?: FcmOptions;
```

## BaseMessage.notification

<b>Signature:</b>

```typescript
notification?: Notification;
```

## BaseMessage.webpush

<b>Signature:</b>

```typescript
webpush?: WebpushConfig;
```
{% endblock body %}

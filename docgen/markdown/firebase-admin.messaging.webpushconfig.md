{% extends "_internal/templates/reference.html" %}
{% block title %}WebpushConfig interface{% endblock title %}
{% block body %}
Represents the WebPush protocol options that can be included in an [Message](./firebase-admin.messaging.md#message)<!-- -->.

<b>Signature:</b>

```typescript
export interface WebpushConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [data](./firebase-admin.messaging.webpushconfig.md#webpushconfigdata) | { \[key: string\]: string; } | A collection of data fields. |
|  [fcmOptions](./firebase-admin.messaging.webpushconfig.md#webpushconfigfcmoptions) | [WebpushFcmOptions](./firebase-admin.messaging.webpushfcmoptions.md#webpushfcmoptions_interface) | Options for features provided by the FCM SDK for Web. |
|  [headers](./firebase-admin.messaging.webpushconfig.md#webpushconfigheaders) | { \[key: string\]: string; } | A collection of WebPush headers. Header values must be strings.<!-- -->See [WebPush specification](https://tools.ietf.org/html/rfc8030#section-5) for supported headers. |
|  [notification](./firebase-admin.messaging.webpushconfig.md#webpushconfignotification) | [WebpushNotification](./firebase-admin.messaging.webpushnotification.md#webpushnotification_interface) | A WebPush notification payload to be included in the message. |

## WebpushConfig.data

A collection of data fields.

<b>Signature:</b>

```typescript
data?: {
        [key: string]: string;
    };
```

## WebpushConfig.fcmOptions

Options for features provided by the FCM SDK for Web.

<b>Signature:</b>

```typescript
fcmOptions?: WebpushFcmOptions;
```

## WebpushConfig.headers

A collection of WebPush headers. Header values must be strings.

See [WebPush specification](https://tools.ietf.org/html/rfc8030#section-5) for supported headers.

<b>Signature:</b>

```typescript
headers?: {
        [key: string]: string;
    };
```

## WebpushConfig.notification

A WebPush notification payload to be included in the message.

<b>Signature:</b>

```typescript
notification?: WebpushNotification;
```
{% endblock body %}

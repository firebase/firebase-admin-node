{% extends "_internal/templates/reference.html" %}
{% block title %}ApnsConfig interface{% endblock title %}
{% block body %}
Represents the APNs-specific options that can be included in an . Refer to \[Apple documentation\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html) for various headers and payload fields supported by APNs.

<b>Signature:</b>

```typescript
export interface ApnsConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [fcmOptions](./firebase-admin.messaging.apnsconfig.md#apnsconfigfcmoptions) | [ApnsFcmOptions](./firebase-admin.messaging.apnsfcmoptions.md#apnsfcmoptions_interface) | Options for features provided by the FCM SDK for iOS. |
|  [headers](./firebase-admin.messaging.apnsconfig.md#apnsconfigheaders) | { \[key: string\]: string; } | A collection of APNs headers. Header values must be strings. |
|  [payload](./firebase-admin.messaging.apnsconfig.md#apnsconfigpayload) | [ApnsPayload](./firebase-admin.messaging.apnspayload.md#apnspayload_interface) | An APNs payload to be included in the message. |

## ApnsConfig.fcmOptions

Options for features provided by the FCM SDK for iOS.

<b>Signature:</b>

```typescript
fcmOptions?: ApnsFcmOptions;
```

## ApnsConfig.headers

A collection of APNs headers. Header values must be strings.

<b>Signature:</b>

```typescript
headers?: {
        [key: string]: string;
    };
```

## ApnsConfig.payload

An APNs payload to be included in the message.

<b>Signature:</b>

```typescript
payload?: ApnsPayload;
```
{% endblock body %}

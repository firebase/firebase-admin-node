{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingPayload interface{% endblock title %}
{% block body %}
Interface representing a Firebase Cloud Messaging message payload. One or both of the `data` and `notification` keys are required.

See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingPayload 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [data](./firebase-admin.messaging.messagingpayload.md#messagingpayloaddata) | [DataMessagePayload](./firebase-admin.messaging.datamessagepayload.md#datamessagepayload_interface) | The data message payload. |
|  [notification](./firebase-admin.messaging.messagingpayload.md#messagingpayloadnotification) | [NotificationMessagePayload](./firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) | The notification message payload. |

## MessagingPayload.data

The data message payload.

<b>Signature:</b>

```typescript
data?: DataMessagePayload;
```

## MessagingPayload.notification

The notification message payload.

<b>Signature:</b>

```typescript
notification?: NotificationMessagePayload;
```
{% endblock body %}

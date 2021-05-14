{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingDevicesResponse interface{% endblock title %}
{% block body %}
Interface representing the status of a message sent to an individual device via the FCM legacy APIs.

See [Send to individual devices](https://firebase.google.com/docs/cloud-messaging/admin/send-messages#send_to_individual_devices) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingDevicesResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [canonicalRegistrationTokenCount](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponsecanonicalregistrationtokencount) | number |  |
|  [failureCount](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponsefailurecount) | number |  |
|  [multicastId](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponsemulticastid) | number |  |
|  [results](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponseresults) | [MessagingDeviceResult](./firebase-admin.messaging.messagingdeviceresult.md#messagingdeviceresult_interface)<!-- -->\[\] |  |
|  [successCount](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponsesuccesscount) | number |  |

## MessagingDevicesResponse.canonicalRegistrationTokenCount

<b>Signature:</b>

```typescript
canonicalRegistrationTokenCount: number;
```

## MessagingDevicesResponse.failureCount

<b>Signature:</b>

```typescript
failureCount: number;
```

## MessagingDevicesResponse.multicastId

<b>Signature:</b>

```typescript
multicastId: number;
```

## MessagingDevicesResponse.results

<b>Signature:</b>

```typescript
results: MessagingDeviceResult[];
```

## MessagingDevicesResponse.successCount

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}

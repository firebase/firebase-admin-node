{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingDeviceGroupResponse interface{% endblock title %}
{% block body %}
Interface representing the server response from the  method.

See \[Send messages to device groups\](/docs/cloud-messaging/send-message?authuser=0\#send\_messages\_to\_device\_groups) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingDeviceGroupResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [failedRegistrationTokens](./firebase-admin.messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponsefailedregistrationtokens) | string\[\] | An array of registration tokens that failed to receive the message. |
|  [failureCount](./firebase-admin.messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponsefailurecount) | number | The number of messages that could not be processed and resulted in an error. |
|  [successCount](./firebase-admin.messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponsesuccesscount) | number | The number of messages that could not be processed and resulted in an error. |

## MessagingDeviceGroupResponse.failedRegistrationTokens

An array of registration tokens that failed to receive the message.

<b>Signature:</b>

```typescript
failedRegistrationTokens: string[];
```

## MessagingDeviceGroupResponse.failureCount

The number of messages that could not be processed and resulted in an error.

<b>Signature:</b>

```typescript
failureCount: number;
```

## MessagingDeviceGroupResponse.successCount

The number of messages that could not be processed and resulted in an error.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}

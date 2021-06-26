{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingConditionResponse interface{% endblock title %}
{% block body %}
Interface representing the server response from the legacy [Messaging.sendToCondition()](./firebase-admin.messaging.messaging.md#messagingsendtocondition) method.

See [Send to a condition](https://firebase.google.com/docs/cloud-messaging/admin/send-messages#send_to_a_condition) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingConditionResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [messageId](./firebase-admin.messaging.messagingconditionresponse.md#messagingconditionresponsemessageid) | number | The message ID for a successfully received request which FCM will attempt to deliver to all subscribed devices. |

## MessagingConditionResponse.messageId

The message ID for a successfully received request which FCM will attempt to deliver to all subscribed devices.

<b>Signature:</b>

```typescript
messageId: number;
```
{% endblock body %}

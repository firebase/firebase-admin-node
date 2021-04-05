{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingTopicResponse interface{% endblock title %}
{% block body %}
Interface representing the server response from the legacy  method.

See \[Send to a topic\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_topic) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingTopicResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [messageId](./firebase-admin.messaging.messagingtopicresponse.md#messagingtopicresponsemessageid) | number | The message ID for a successfully received request which FCM will attempt to deliver to all subscribed devices. |

## MessagingTopicResponse.messageId

The message ID for a successfully received request which FCM will attempt to deliver to all subscribed devices.

<b>Signature:</b>

```typescript
messageId: number;
```
{% endblock body %}

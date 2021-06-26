{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingTopicManagementResponse interface{% endblock title %}
{% block body %}
Interface representing the server response from the [Messaging.subscribeToTopic()](./firebase-admin.messaging.messaging.md#messagingsubscribetotopic) and [Messaging.unsubscribeFromTopic()](./firebase-admin.messaging.messaging.md#messagingunsubscribefromtopic) methods.

See [Manage topics from the server](https://firebase.google.com/docs/cloud-messaging/manage-topics) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingTopicManagementResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [errors](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponseerrors) | FirebaseArrayIndexError\[\] | An array of errors corresponding to the provided registration token(s). The length of this array will be equal to [MessagingTopicManagementResponse.failureCount](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponsefailurecount)<!-- -->. |
|  [failureCount](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponsefailurecount) | number | The number of registration tokens that could not be subscribed to the topic and resulted in an error. |
|  [successCount](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponsesuccesscount) | number | The number of registration tokens that were successfully subscribed to the topic. |

## MessagingTopicManagementResponse.errors

An array of errors corresponding to the provided registration token(s). The length of this array will be equal to [MessagingTopicManagementResponse.failureCount](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponsefailurecount)<!-- -->.

<b>Signature:</b>

```typescript
errors: FirebaseArrayIndexError[];
```

## MessagingTopicManagementResponse.failureCount

The number of registration tokens that could not be subscribed to the topic and resulted in an error.

<b>Signature:</b>

```typescript
failureCount: number;
```

## MessagingTopicManagementResponse.successCount

The number of registration tokens that were successfully subscribed to the topic.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}

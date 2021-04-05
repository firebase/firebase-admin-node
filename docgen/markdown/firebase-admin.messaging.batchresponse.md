{% extends "_internal/templates/reference.html" %}
{% block title %}BatchResponse interface{% endblock title %}
{% block body %}
Interface representing the server response from the  and  methods.

<b>Signature:</b>

```typescript
export interface BatchResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [failureCount](./firebase-admin.messaging.batchresponse.md#batchresponsefailurecount) | number | The number of messages that resulted in errors when sending. |
|  [responses](./firebase-admin.messaging.batchresponse.md#batchresponseresponses) | [SendResponse](./firebase-admin.messaging.sendresponse.md#sendresponse_interface)<!-- -->\[\] | An array of responses, each corresponding to a message. |
|  [successCount](./firebase-admin.messaging.batchresponse.md#batchresponsesuccesscount) | number | The number of messages that were successfully handed off for sending. |

## BatchResponse.failureCount

The number of messages that resulted in errors when sending.

<b>Signature:</b>

```typescript
failureCount: number;
```

## BatchResponse.responses

An array of responses, each corresponding to a message.

<b>Signature:</b>

```typescript
responses: SendResponse[];
```

## BatchResponse.successCount

The number of messages that were successfully handed off for sending.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}

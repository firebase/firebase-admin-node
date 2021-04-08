Interface representing the status of an individual message that was sent as part of a batch request.

<b>Signature:</b>

```typescript
export interface SendResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [error](./firebase-admin.messaging.sendresponse.md#sendresponseerror) | FirebaseError | An error, if the message was not handed off to FCM successfully. |
|  [messageId](./firebase-admin.messaging.sendresponse.md#sendresponsemessageid) | string | A unique message ID string, if the message was handed off to FCM for delivery. |
|  [success](./firebase-admin.messaging.sendresponse.md#sendresponsesuccess) | boolean | A boolean indicating if the message was successfully handed off to FCM or not. When true, the <code>messageId</code> attribute is guaranteed to be set. When false, the <code>error</code> attribute is guaranteed to be set. |

## SendResponse.error

An error, if the message was not handed off to FCM successfully.

<b>Signature:</b>

```typescript
error?: FirebaseError;
```

## SendResponse.messageId

A unique message ID string, if the message was handed off to FCM for delivery.

<b>Signature:</b>

```typescript
messageId?: string;
```

## SendResponse.success

A boolean indicating if the message was successfully handed off to FCM or not. When true, the `messageId` attribute is guaranteed to be set. When false, the `error` attribute is guaranteed to be set.

<b>Signature:</b>

```typescript
success: boolean;
```

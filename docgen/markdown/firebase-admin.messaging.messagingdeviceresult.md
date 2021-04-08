<b>Signature:</b>

```typescript
export interface MessagingDeviceResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [canonicalRegistrationToken](./firebase-admin.messaging.messagingdeviceresult.md#messagingdeviceresultcanonicalregistrationtoken) | string | The canonical registration token for the client app that the message was processed and sent to. You should use this value as the registration token for future requests. Otherwise, future messages might be rejected. |
|  [error](./firebase-admin.messaging.messagingdeviceresult.md#messagingdeviceresulterror) | FirebaseError | The error that occurred when processing the message for the recipient. |
|  [messageId](./firebase-admin.messaging.messagingdeviceresult.md#messagingdeviceresultmessageid) | string | A unique ID for the successfully processed message. |

## MessagingDeviceResult.canonicalRegistrationToken

The canonical registration token for the client app that the message was processed and sent to. You should use this value as the registration token for future requests. Otherwise, future messages might be rejected.

<b>Signature:</b>

```typescript
canonicalRegistrationToken?: string;
```

## MessagingDeviceResult.error

The error that occurred when processing the message for the recipient.

<b>Signature:</b>

```typescript
error?: FirebaseError;
```

## MessagingDeviceResult.messageId

A unique ID for the successfully processed message.

<b>Signature:</b>

```typescript
messageId?: string;
```

{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/messaging module{% endblock title %}
{% block body %}
Firebase Cloud Messaging (FCM).

## Classes

|  Class | Description |
|  --- | --- |
|  [Messaging](./firebase-admin.messaging.messaging.md#messaging_class) | Messaging service bound to the provided app. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getMessaging(app)](./firebase-admin.messaging.md#getmessaging) | Gets the [Messaging](./firebase-admin.messaging.messaging.md#messaging_class) service for the default app or a given app.<code>admin.messaging()</code> can be called with no arguments to access the default app's <code>Messaging</code> service or as <code>admin.messaging(app)</code> to access the <code>Messaging</code> service associated with aspecific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AndroidConfig](./firebase-admin.messaging.androidconfig.md#androidconfig_interface) | Represents the Android-specific options that can be included in an [Message](./firebase-admin.messaging.md#message)<!-- -->. |
|  [AndroidFcmOptions](./firebase-admin.messaging.androidfcmoptions.md#androidfcmoptions_interface) | Represents options for features provided by the FCM SDK for Android. |
|  [AndroidNotification](./firebase-admin.messaging.androidnotification.md#androidnotification_interface) | Represents the Android-specific notification options that can be included in [AndroidConfig](./firebase-admin.messaging.androidconfig.md#androidconfig_interface)<!-- -->. |
|  [ApnsConfig](./firebase-admin.messaging.apnsconfig.md#apnsconfig_interface) | Represents the APNs-specific options that can be included in an [Message](./firebase-admin.messaging.md#message)<!-- -->. Refer to [Apple documentation](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html) for various headers and payload fields supported by APNs. |
|  [ApnsFcmOptions](./firebase-admin.messaging.apnsfcmoptions.md#apnsfcmoptions_interface) | Represents options for features provided by the FCM SDK for iOS. |
|  [ApnsPayload](./firebase-admin.messaging.apnspayload.md#apnspayload_interface) | Represents the payload of an APNs message. Mainly consists of the <code>aps</code> dictionary. But may also contain other arbitrary custom keys. |
|  [Aps](./firebase-admin.messaging.aps.md#aps_interface) | Represents the [aps dictionary](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html) that is part of APNs messages. |
|  [ApsAlert](./firebase-admin.messaging.apsalert.md#apsalert_interface) |  |
|  [BaseMessage](./firebase-admin.messaging.basemessage.md#basemessage_interface) |  |
|  [BatchResponse](./firebase-admin.messaging.batchresponse.md#batchresponse_interface) | Interface representing the server response from the [Messaging.sendAll()](./firebase-admin.messaging.messaging.md#messagingsendall) and [Messaging.sendMulticast()](./firebase-admin.messaging.messaging.md#messagingsendmulticast) methods. |
|  [ConditionMessage](./firebase-admin.messaging.conditionmessage.md#conditionmessage_interface) |  |
|  [CriticalSound](./firebase-admin.messaging.criticalsound.md#criticalsound_interface) | Represents a critical sound configuration that can be included in the <code>aps</code> dictionary of an APNs payload. |
|  [DataMessagePayload](./firebase-admin.messaging.datamessagepayload.md#datamessagepayload_interface) | Interface representing an FCM legacy API data message payload. Data messages let developers send up to 4KB of custom key-value pairs. The keys and values must both be strings. Keys can be any custom string, except for the following reserved strings:<ul> <li><code>from</code></li> <li>Anything starting with <code>google.</code></li> </ul>See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [FcmOptions](./firebase-admin.messaging.fcmoptions.md#fcmoptions_interface) | Represents platform-independent options for features provided by the FCM SDKs. |
|  [LightSettings](./firebase-admin.messaging.lightsettings.md#lightsettings_interface) | Represents settings to control notification LED that can be included in [AndroidNotification](./firebase-admin.messaging.androidnotification.md#androidnotification_interface)<!-- -->. |
|  [MessagingConditionResponse](./firebase-admin.messaging.messagingconditionresponse.md#messagingconditionresponse_interface) | Interface representing the server response from the legacy [Messaging.sendToCondition()](./firebase-admin.messaging.messaging.md#messagingsendtocondition) method.<!-- -->See [Send to a condition](https://firebase.google.com/docs/cloud-messaging/admin/send-messages#send_to_a_condition) for code samples and detailed documentation. |
|  [MessagingDeviceGroupResponse](./firebase-admin.messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponse_interface) | Interface representing the server response from the [Messaging.sendToDeviceGroup()](./firebase-admin.messaging.messaging.md#messagingsendtodevicegroup) method.<!-- -->See [Send messages to device groups](https://firebase.google.com/docs/cloud-messaging/send-message?authuser=0#send_messages_to_device_groups) for code samples and detailed documentation. |
|  [MessagingDeviceResult](./firebase-admin.messaging.messagingdeviceresult.md#messagingdeviceresult_interface) |  |
|  [MessagingDevicesResponse](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponse_interface) | Interface representing the status of a message sent to an individual device via the FCM legacy APIs.<!-- -->See [Send to individual devices](https://firebase.google.com/docs/cloud-messaging/admin/send-messages#send_to_individual_devices) for code samples and detailed documentation. |
|  [MessagingOptions](./firebase-admin.messaging.messagingoptions.md#messagingoptions_interface) | Interface representing the options that can be provided when sending a message via the FCM legacy APIs.<!-- -->See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingPayload](./firebase-admin.messaging.messagingpayload.md#messagingpayload_interface) | Interface representing a Firebase Cloud Messaging message payload. One or both of the <code>data</code> and <code>notification</code> keys are required.<!-- -->See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingTopicManagementResponse](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponse_interface) | Interface representing the server response from the [Messaging.subscribeToTopic()](./firebase-admin.messaging.messaging.md#messagingsubscribetotopic) and [Messaging.unsubscribeFromTopic()](./firebase-admin.messaging.messaging.md#messagingunsubscribefromtopic) methods.<!-- -->See [Manage topics from the server](https://firebase.google.com/docs/cloud-messaging/manage-topics) for code samples and detailed documentation. |
|  [MessagingTopicResponse](./firebase-admin.messaging.messagingtopicresponse.md#messagingtopicresponse_interface) | Interface representing the server response from the legacy [Messaging.sendToTopic()](./firebase-admin.messaging.messaging.md#messagingsendtotopic) method.<!-- -->See [Send to a topic](https://firebase.google.com/docs/cloud-messaging/admin/send-messages#send_to_a_topic) for code samples and detailed documentation. |
|  [MulticastMessage](./firebase-admin.messaging.multicastmessage.md#multicastmessage_interface) | Payload for the [Messaging.sendMulticast()](./firebase-admin.messaging.messaging.md#messagingsendmulticast) method. The payload contains all the fields in the BaseMessage type, and a list of tokens. |
|  [Notification](./firebase-admin.messaging.notification.md#notification_interface) | A notification that can be included in [Message](./firebase-admin.messaging.md#message)<!-- -->. |
|  [NotificationMessagePayload](./firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) | Interface representing an FCM legacy API notification message payload. Notification messages let developers send up to 4KB of predefined key-value pairs. Accepted keys are outlined below.<!-- -->See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [SendResponse](./firebase-admin.messaging.sendresponse.md#sendresponse_interface) | Interface representing the status of an individual message that was sent as part of a batch request. |
|  [TokenMessage](./firebase-admin.messaging.tokenmessage.md#tokenmessage_interface) |  |
|  [TopicMessage](./firebase-admin.messaging.topicmessage.md#topicmessage_interface) |  |
|  [WebpushConfig](./firebase-admin.messaging.webpushconfig.md#webpushconfig_interface) | Represents the WebPush protocol options that can be included in an [Message](./firebase-admin.messaging.md#message)<!-- -->. |
|  [WebpushFcmOptions](./firebase-admin.messaging.webpushfcmoptions.md#webpushfcmoptions_interface) | Represents options for features provided by the FCM SDK for Web (which are not part of the Webpush standard). |
|  [WebpushNotification](./firebase-admin.messaging.webpushnotification.md#webpushnotification_interface) | Represents the WebPush-specific notification options that can be included in [WebpushConfig](./firebase-admin.messaging.webpushconfig.md#webpushconfig_interface)<!-- -->. This supports most of the standard options as defined in the Web Notification [specification](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification)<!-- -->. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Message](./firebase-admin.messaging.md#message) | Payload for the [Messaging.send()](./firebase-admin.messaging.messaging.md#messagingsend) operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition. |

## getMessaging()

Gets the [Messaging](./firebase-admin.messaging.messaging.md#messaging_class) service for the default app or a given app.

`admin.messaging()` can be called with no arguments to access the default app's `Messaging` service or as `admin.messaging(app)` to access the `Messaging` service associated with aspecific app.

<b>Signature:</b>

```typescript
export declare function getMessaging(app?: App): Messaging;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app whose <code>Messaging</code> service to return. If not provided, the default <code>Messaging</code> service will be returned. |

<b>Returns:</b>

[Messaging](./firebase-admin.messaging.messaging.md#messaging_class)

The default `Messaging` service if no app is provided or the `Messaging` service associated with the provided app.

### Example 1


```javascript
// Get the Messaging service for the default app
const defaultMessaging = getMessaging();

```

### Example 2


```javascript
// Get the Messaging service for a given app
const otherMessaging = getMessaging(otherApp);

```

## Message

Payload for the [Messaging.send()](./firebase-admin.messaging.messaging.md#messagingsend) operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition.

<b>Signature:</b>

```typescript
export declare type Message = TokenMessage | TopicMessage | ConditionMessage;
```
{% endblock body %}
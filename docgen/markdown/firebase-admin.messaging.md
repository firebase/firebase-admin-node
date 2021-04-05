{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin.messaging package{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [Messaging](./firebase-admin.messaging.messaging.md#messaging_class) | Messaging service bound to the provided app. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getMessaging(app)](./firebase-admin.messaging.md#getmessaging) | Gets the  service for the default app or a given app.<code>admin.messaging()</code> can be called with no arguments to access the default app's  service or as <code>admin.messaging(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AndroidConfig](./firebase-admin.messaging.androidconfig.md#androidconfig_interface) | Represents the Android-specific options that can be included in an . |
|  [AndroidFcmOptions](./firebase-admin.messaging.androidfcmoptions.md#androidfcmoptions_interface) | Represents options for features provided by the FCM SDK for Android. |
|  [AndroidNotification](./firebase-admin.messaging.androidnotification.md#androidnotification_interface) | Represents the Android-specific notification options that can be included in . |
|  [ApnsConfig](./firebase-admin.messaging.apnsconfig.md#apnsconfig_interface) | Represents the APNs-specific options that can be included in an . Refer to \[Apple documentation\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html) for various headers and payload fields supported by APNs. |
|  [ApnsFcmOptions](./firebase-admin.messaging.apnsfcmoptions.md#apnsfcmoptions_interface) | Represents options for features provided by the FCM SDK for iOS. |
|  [ApnsPayload](./firebase-admin.messaging.apnspayload.md#apnspayload_interface) | Represents the payload of an APNs message. Mainly consists of the <code>aps</code> dictionary. But may also contain other arbitrary custom keys. |
|  [Aps](./firebase-admin.messaging.aps.md#aps_interface) | Represents the \[aps dictionary\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html) that is part of APNs messages. |
|  [ApsAlert](./firebase-admin.messaging.apsalert.md#apsalert_interface) |  |
|  [BaseMessage](./firebase-admin.messaging.basemessage.md#basemessage_interface) |  |
|  [BatchResponse](./firebase-admin.messaging.batchresponse.md#batchresponse_interface) | Interface representing the server response from the  and  methods. |
|  [ConditionMessage](./firebase-admin.messaging.conditionmessage.md#conditionmessage_interface) |  |
|  [CriticalSound](./firebase-admin.messaging.criticalsound.md#criticalsound_interface) | Represents a critical sound configuration that can be included in the <code>aps</code> dictionary of an APNs payload. |
|  [DataMessagePayload](./firebase-admin.messaging.datamessagepayload.md#datamessagepayload_interface) | Interface representing an FCM legacy API data message payload. Data messages let developers send up to 4KB of custom key-value pairs. The keys and values must both be strings. Keys can be any custom string, except for the following reserved strings:<!-- -->\* <code>&quot;from&quot;</code> \* Anything starting with <code>&quot;google.&quot;</code>.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [FcmOptions](./firebase-admin.messaging.fcmoptions.md#fcmoptions_interface) | Represents platform-independent options for features provided by the FCM SDKs. |
|  [LightSettings](./firebase-admin.messaging.lightsettings.md#lightsettings_interface) | Represents settings to control notification LED that can be included in . |
|  [MessagingConditionResponse](./firebase-admin.messaging.messagingconditionresponse.md#messagingconditionresponse_interface) | Interface representing the server response from the legacy  method.<!-- -->See \[Send to a condition\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_condition) for code samples and detailed documentation. |
|  [MessagingDeviceGroupResponse](./firebase-admin.messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponse_interface) | Interface representing the server response from the  method.<!-- -->See \[Send messages to device groups\](/docs/cloud-messaging/send-message?authuser=0\#send\_messages\_to\_device\_groups) for code samples and detailed documentation. |
|  [MessagingDeviceResult](./firebase-admin.messaging.messagingdeviceresult.md#messagingdeviceresult_interface) |  |
|  [MessagingDevicesResponse](./firebase-admin.messaging.messagingdevicesresponse.md#messagingdevicesresponse_interface) | Interface representing the status of a message sent to an individual device via the FCM legacy APIs.<!-- -->See \[Send to individual devices\](/docs/cloud-messaging/admin/send-messages\#send\_to\_individual\_devices) for code samples and detailed documentation. |
|  [MessagingOptions](./firebase-admin.messaging.messagingoptions.md#messagingoptions_interface) | Interface representing the options that can be provided when sending a message via the FCM legacy APIs.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingPayload](./firebase-admin.messaging.messagingpayload.md#messagingpayload_interface) | Interface representing a Firebase Cloud Messaging message payload. One or both of the <code>data</code> and <code>notification</code> keys are required.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingTopicManagementResponse](./firebase-admin.messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponse_interface) | Interface representing the server response from the  and  methods.<!-- -->See \[Manage topics from the server\](/docs/cloud-messaging/manage-topics) for code samples and detailed documentation. |
|  [MessagingTopicResponse](./firebase-admin.messaging.messagingtopicresponse.md#messagingtopicresponse_interface) | Interface representing the server response from the legacy  method.<!-- -->See \[Send to a topic\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_topic) for code samples and detailed documentation. |
|  [MulticastMessage](./firebase-admin.messaging.multicastmessage.md#multicastmessage_interface) | Payload for the admin.messaing.sendMulticast() method. The payload contains all the fields in the BaseMessage type, and a list of tokens. |
|  [Notification](./firebase-admin.messaging.notification.md#notification_interface) | A notification that can be included in . |
|  [NotificationMessagePayload](./firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) | Interface representing an FCM legacy API notification message payload. Notification messages let developers send up to 4KB of predefined key-value pairs. Accepted keys are outlined below.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [SendResponse](./firebase-admin.messaging.sendresponse.md#sendresponse_interface) | Interface representing the status of an individual message that was sent as part of a batch request. |
|  [TokenMessage](./firebase-admin.messaging.tokenmessage.md#tokenmessage_interface) |  |
|  [TopicMessage](./firebase-admin.messaging.topicmessage.md#topicmessage_interface) |  |
|  [WebpushConfig](./firebase-admin.messaging.webpushconfig.md#webpushconfig_interface) | Represents the WebPush protocol options that can be included in an . |
|  [WebpushFcmOptions](./firebase-admin.messaging.webpushfcmoptions.md#webpushfcmoptions_interface) | Represents options for features provided by the FCM SDK for Web (which are not part of the Webpush standard). |
|  [WebpushNotification](./firebase-admin.messaging.webpushnotification.md#webpushnotification_interface) | Represents the WebPush-specific notification options that can be included in . This supports most of the standard options as defined in the Web Notification \[specification\](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification). |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Message](./firebase-admin.messaging.md#message) | Payload for the admin.messaging.send() operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition. |

## getMessaging()

Gets the  service for the default app or a given app.

`admin.messaging()` can be called with no arguments to access the default app's  service or as `admin.messaging(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getMessaging(app?: App): Messaging;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app whose <code>Messaging</code> service to return. If not provided, the default <code>Messaging</code> service will be returned. The default <code>Messaging</code> service if no app is provided or the <code>Messaging</code> service associated with the provided app. |

<b>Returns:</b>

[Messaging](./firebase-admin.messaging.messaging.md#messaging_class)

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

Payload for the admin.messaging.send() operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition.

<b>Signature:</b>

```typescript
export declare type Message = TokenMessage | TopicMessage | ConditionMessage;
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}MessagingOptions interface{% endblock title %}
{% block body %}
Interface representing the options that can be provided when sending a message via the FCM legacy APIs.

See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [collapseKey](./firebase-admin.messaging.messagingoptions.md#messagingoptionscollapsekey) | string | String identifying a group of messages (for example, "Updates Available") that can be collapsed, so that only the last message gets sent when delivery can be resumed. This is used to avoid sending too many of the same messages when the device comes back online or becomes active.<!-- -->There is no guarantee of the order in which messages get sent.<!-- -->A maximum of four different collapse keys is allowed at any given time. This means FCM server can simultaneously store four different send-to-sync messages per client app. If you exceed this number, there is no guarantee which four collapse keys the FCM server will keep.<!-- -->\*\*Default value:\*\* None |
|  [contentAvailable](./firebase-admin.messaging.messagingoptions.md#messagingoptionscontentavailable) | boolean | On iOS, use this field to represent <code>content-available</code> in the APNs payload. When a notification or data message is sent and this is set to <code>true</code>, an inactive client app is awoken. On Android, data messages wake the app by default. On Chrome, this flag is currently not supported.<!-- -->\*\*Default value:\*\* <code>false</code> |
|  [dryRun](./firebase-admin.messaging.messagingoptions.md#messagingoptionsdryrun) | boolean | Whether or not the message should actually be sent. When set to <code>true</code>, allows developers to test a request without actually sending a message. When set to <code>false</code>, the message will be sent.<!-- -->\*\*Default value:\*\* <code>false</code> |
|  [mutableContent](./firebase-admin.messaging.messagingoptions.md#messagingoptionsmutablecontent) | boolean | On iOS, use this field to represent <code>mutable-content</code> in the APNs payload. When a notification is sent and this is set to <code>true</code>, the content of the notification can be modified before it is displayed, using a [Notification Service app extension](https://developer.apple.com/reference/usernotifications/unnotificationserviceextension)<!-- -->.<!-- -->On Android and Web, this parameter will be ignored.<!-- -->\*\*Default value:\*\* <code>false</code> |
|  [priority](./firebase-admin.messaging.messagingoptions.md#messagingoptionspriority) | string | The priority of the message. Valid values are <code>&quot;normal&quot;</code> and <code>&quot;high&quot;.</code> On iOS, these correspond to APNs priorities <code>5</code> and <code>10</code>.<!-- -->By default, notification messages are sent with high priority, and data messages are sent with normal priority. Normal priority optimizes the client app's battery consumption and should be used unless immediate delivery is required. For messages with normal priority, the app may receive the message with unspecified delay.<!-- -->When a message is sent with high priority, it is sent immediately, and the app can wake a sleeping device and open a network connection to your server.<!-- -->For more information, see [Setting the priority of a message](https://firebase.google.com/docs/cloud-messaging/concept-options#setting-the-priority-of-a-message)<!-- -->.<!-- -->\*\*Default value:\*\* <code>&quot;high&quot;</code> for notification messages, <code>&quot;normal&quot;</code> for data messages |
|  [restrictedPackageName](./firebase-admin.messaging.messagingoptions.md#messagingoptionsrestrictedpackagename) | string | The package name of the application which the registration tokens must match in order to receive the message.<!-- -->\*\*Default value:\*\* None |
|  [timeToLive](./firebase-admin.messaging.messagingoptions.md#messagingoptionstimetolive) | number | How long (in seconds) the message should be kept in FCM storage if the device is offline. The maximum time to live supported is four weeks, and the default value is also four weeks. For more information, see [Setting the lifespan of a message](https://firebase.google.com/docs/cloud-messaging/concept-options#ttl)<!-- -->.<!-- -->\*\*Default value:\*\* <code>2419200</code> (representing four weeks, in seconds) |

## MessagingOptions.collapseKey

String identifying a group of messages (for example, "Updates Available") that can be collapsed, so that only the last message gets sent when delivery can be resumed. This is used to avoid sending too many of the same messages when the device comes back online or becomes active.

There is no guarantee of the order in which messages get sent.

A maximum of four different collapse keys is allowed at any given time. This means FCM server can simultaneously store four different send-to-sync messages per client app. If you exceed this number, there is no guarantee which four collapse keys the FCM server will keep.

\*\*Default value:\*\* None

<b>Signature:</b>

```typescript
collapseKey?: string;
```

## MessagingOptions.contentAvailable

On iOS, use this field to represent `content-available` in the APNs payload. When a notification or data message is sent and this is set to `true`<!-- -->, an inactive client app is awoken. On Android, data messages wake the app by default. On Chrome, this flag is currently not supported.

\*\*Default value:\*\* `false`

<b>Signature:</b>

```typescript
contentAvailable?: boolean;
```

## MessagingOptions.dryRun

Whether or not the message should actually be sent. When set to `true`<!-- -->, allows developers to test a request without actually sending a message. When set to `false`<!-- -->, the message will be sent.

\*\*Default value:\*\* `false`

<b>Signature:</b>

```typescript
dryRun?: boolean;
```

## MessagingOptions.mutableContent

On iOS, use this field to represent `mutable-content` in the APNs payload. When a notification is sent and this is set to `true`<!-- -->, the content of the notification can be modified before it is displayed, using a [Notification Service app extension](https://developer.apple.com/reference/usernotifications/unnotificationserviceextension)<!-- -->.

On Android and Web, this parameter will be ignored.

\*\*Default value:\*\* `false`

<b>Signature:</b>

```typescript
mutableContent?: boolean;
```

## MessagingOptions.priority

The priority of the message. Valid values are `"normal"` and `"high".` On iOS, these correspond to APNs priorities `5` and `10`<!-- -->.

By default, notification messages are sent with high priority, and data messages are sent with normal priority. Normal priority optimizes the client app's battery consumption and should be used unless immediate delivery is required. For messages with normal priority, the app may receive the message with unspecified delay.

When a message is sent with high priority, it is sent immediately, and the app can wake a sleeping device and open a network connection to your server.

For more information, see [Setting the priority of a message](https://firebase.google.com/docs/cloud-messaging/concept-options#setting-the-priority-of-a-message)<!-- -->.

\*\*Default value:\*\* `"high"` for notification messages, `"normal"` for data messages

<b>Signature:</b>

```typescript
priority?: string;
```

## MessagingOptions.restrictedPackageName

The package name of the application which the registration tokens must match in order to receive the message.

\*\*Default value:\*\* None

<b>Signature:</b>

```typescript
restrictedPackageName?: string;
```

## MessagingOptions.timeToLive

How long (in seconds) the message should be kept in FCM storage if the device is offline. The maximum time to live supported is four weeks, and the default value is also four weeks. For more information, see [Setting the lifespan of a message](https://firebase.google.com/docs/cloud-messaging/concept-options#ttl)<!-- -->.

\*\*Default value:\*\* `2419200` (representing four weeks, in seconds)

<b>Signature:</b>

```typescript
timeToLive?: number;
```
{% endblock body %}

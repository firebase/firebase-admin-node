{% extends "_internal/templates/reference.html" %}
{% block title %}AndroidConfig interface{% endblock title %}
{% block body %}
Represents the Android-specific options that can be included in an [Message](./firebase-admin.messaging.md#message)<!-- -->.

<b>Signature:</b>

```typescript
export interface AndroidConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [collapseKey](./firebase-admin.messaging.androidconfig.md#androidconfigcollapsekey) | string | Collapse key for the message. Collapse key serves as an identifier for a group of messages that can be collapsed, so that only the last message gets sent when delivery can be resumed. A maximum of four different collapse keys may be active at any given time. |
|  [data](./firebase-admin.messaging.androidconfig.md#androidconfigdata) | { \[key: string\]: string; } | A collection of data fields to be included in the message. All values must be strings. When provided, overrides any data fields set on the top-level [Message](./firebase-admin.messaging.md#message)<!-- -->. |
|  [fcmOptions](./firebase-admin.messaging.androidconfig.md#androidconfigfcmoptions) | [AndroidFcmOptions](./firebase-admin.messaging.androidfcmoptions.md#androidfcmoptions_interface) | Options for features provided by the FCM SDK for Android. |
|  [notification](./firebase-admin.messaging.androidconfig.md#androidconfignotification) | [AndroidNotification](./firebase-admin.messaging.androidnotification.md#androidnotification_interface) | Android notification to be included in the message. |
|  [priority](./firebase-admin.messaging.androidconfig.md#androidconfigpriority) | ('high' \| 'normal') | Priority of the message. Must be either <code>normal</code> or <code>high</code>. |
|  [restrictedPackageName](./firebase-admin.messaging.androidconfig.md#androidconfigrestrictedpackagename) | string | Package name of the application where the registration tokens must match in order to receive the message. |
|  [ttl](./firebase-admin.messaging.androidconfig.md#androidconfigttl) | number | Time-to-live duration of the message in milliseconds. |

## AndroidConfig.collapseKey

Collapse key for the message. Collapse key serves as an identifier for a group of messages that can be collapsed, so that only the last message gets sent when delivery can be resumed. A maximum of four different collapse keys may be active at any given time.

<b>Signature:</b>

```typescript
collapseKey?: string;
```

## AndroidConfig.data

A collection of data fields to be included in the message. All values must be strings. When provided, overrides any data fields set on the top-level [Message](./firebase-admin.messaging.md#message)<!-- -->.

<b>Signature:</b>

```typescript
data?: {
        [key: string]: string;
    };
```

## AndroidConfig.fcmOptions

Options for features provided by the FCM SDK for Android.

<b>Signature:</b>

```typescript
fcmOptions?: AndroidFcmOptions;
```

## AndroidConfig.notification

Android notification to be included in the message.

<b>Signature:</b>

```typescript
notification?: AndroidNotification;
```

## AndroidConfig.priority

Priority of the message. Must be either `normal` or `high`<!-- -->.

<b>Signature:</b>

```typescript
priority?: ('high' | 'normal');
```

## AndroidConfig.restrictedPackageName

Package name of the application where the registration tokens must match in order to receive the message.

<b>Signature:</b>

```typescript
restrictedPackageName?: string;
```

## AndroidConfig.ttl

Time-to-live duration of the message in milliseconds.

<b>Signature:</b>

```typescript
ttl?: number;
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}Notification interface{% endblock title %}
{% block body %}
A notification that can be included in .

<b>Signature:</b>

```typescript
export interface Notification 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [body](./firebase-admin.messaging.notification.md#notificationbody) | string | The notification body |
|  [imageUrl](./firebase-admin.messaging.notification.md#notificationimageurl) | string | URL of an image to be displayed in the notification. |
|  [title](./firebase-admin.messaging.notification.md#notificationtitle) | string | The title of the notification. |

## Notification.body

The notification body

<b>Signature:</b>

```typescript
body?: string;
```

## Notification.imageUrl

URL of an image to be displayed in the notification.

<b>Signature:</b>

```typescript
imageUrl?: string;
```

## Notification.title

The title of the notification.

<b>Signature:</b>

```typescript
title?: string;
```
{% endblock body %}

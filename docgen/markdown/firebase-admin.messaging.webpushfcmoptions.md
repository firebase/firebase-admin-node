{% extends "_internal/templates/reference.html" %}
{% block title %}WebpushFcmOptions interface{% endblock title %}
{% block body %}
Represents options for features provided by the FCM SDK for Web (which are not part of the Webpush standard).

<b>Signature:</b>

```typescript
export interface WebpushFcmOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [link](./firebase-admin.messaging.webpushfcmoptions.md#webpushfcmoptionslink) | string | The link to open when the user clicks on the notification. For all URL values, HTTPS is required. |

## WebpushFcmOptions.link

The link to open when the user clicks on the notification. For all URL values, HTTPS is required.

<b>Signature:</b>

```typescript
link?: string;
```
{% endblock body %}

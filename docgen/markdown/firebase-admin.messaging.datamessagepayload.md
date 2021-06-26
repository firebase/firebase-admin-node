{% extends "_internal/templates/reference.html" %}
{% block title %}DataMessagePayload interface{% endblock title %}
{% block body %}
Interface representing an FCM legacy API data message payload. Data messages let developers send up to 4KB of custom key-value pairs. The keys and values must both be strings. Keys can be any custom string, except for the following reserved strings:

<ul> <li><code>from</code></li> <li>Anything starting with <code>google.</code></li> </ul>

See [Build send requests](https://firebase.google.com/docs/cloud-messaging/send-message) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface DataMessagePayload 
```
{% endblock body %}

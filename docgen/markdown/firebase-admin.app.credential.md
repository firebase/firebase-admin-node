{% extends "_internal/templates/reference.html" %}
{% block title %}Credential interface{% endblock title %}
{% block body %}
Interface that provides Google OAuth2 access tokens used to authenticate with Firebase services.

In most cases, you will not need to implement this yourself and can instead use the default implementations provided by .

<b>Signature:</b>

```typescript
export interface Credential 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [getAccessToken()](./firebase-admin.app.credential.md#credentialgetaccesstoken) | Returns a Google OAuth2 access token object used to authenticate with Firebase services. |

## Credential.getAccessToken()

Returns a Google OAuth2 access token object used to authenticate with Firebase services.

<b>Signature:</b>

```typescript
getAccessToken(): Promise<GoogleOAuthAccessToken>;
```
<b>Returns:</b>

Promise&lt;[GoogleOAuthAccessToken](./firebase-admin.app.googleoauthaccesstoken.md#googleoauthaccesstoken_interface)<!-- -->&gt;

A Google OAuth2 access token object.

{% endblock body %}

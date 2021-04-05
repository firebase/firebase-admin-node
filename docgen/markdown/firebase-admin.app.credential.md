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
|  [getAccessToken()](./firebase-admin.app.credential.md#credentialgetaccesstoken) | Returns a Google OAuth2 access token object used to authenticate with Firebase services.<!-- -->This object contains the following properties: \* <code>access_token</code> (<code>string</code>): The actual Google OAuth2 access token. \* <code>expires_in</code> (<code>number</code>): The number of seconds from when the token was issued that it expires. A Google OAuth2 access token object. |

## Credential.getAccessToken()

Returns a Google OAuth2 access token object used to authenticate with Firebase services.

This object contains the following properties: \* `access_token` (`string`<!-- -->): The actual Google OAuth2 access token. \* `expires_in` (`number`<!-- -->): The number of seconds from when the token was issued that it expires.

 A Google OAuth2 access token object.

<b>Signature:</b>

```typescript
getAccessToken(): Promise<GoogleOAuthAccessToken>;
```
<b>Returns:</b>

Promise&lt;[GoogleOAuthAccessToken](./firebase-admin.app.googleoauthaccesstoken.md#googleoauthaccesstoken_interface)<!-- -->&gt;

{% endblock body %}

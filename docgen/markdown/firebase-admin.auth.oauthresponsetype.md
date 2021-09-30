{% extends "_internal/templates/reference.html" %}
{% block title %}OAuthResponseType interface{% endblock title %}
{% block body %}
The interface representing OIDC provider's response object for OAuth authorization flow. One of the following settings is required: <ul> <li>Set <code>code</code> to <code>true</code> for the code flow.</li> <li>Set <code>idToken</code> to <code>true</code> for the ID token flow.</li> </ul>

<b>Signature:</b>

```typescript
export interface OAuthResponseType 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [code](./firebase-admin.auth.oauthresponsetype.md#oauthresponsetypecode) | boolean | Whether authorization code is returned from IdP's authorization endpoint. |
|  [idToken](./firebase-admin.auth.oauthresponsetype.md#oauthresponsetypeidtoken) | boolean | Whether ID token is returned from IdP's authorization endpoint. |

## OAuthResponseType.code

Whether authorization code is returned from IdP's authorization endpoint.

<b>Signature:</b>

```typescript
code?: boolean;
```

## OAuthResponseType.idToken

Whether ID token is returned from IdP's authorization endpoint.

<b>Signature:</b>

```typescript
idToken?: boolean;
```
{% endblock body %}

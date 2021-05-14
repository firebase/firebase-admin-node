{% extends "_internal/templates/reference.html" %}
{% block title %}SessionCookieOptions interface{% endblock title %}
{% block body %}
Interface representing the session cookie options needed for the [BaseAuth.createSessionCookie()](./firebase-admin.auth.baseauth.md#baseauthcreatesessioncookie) method.

<b>Signature:</b>

```typescript
export interface SessionCookieOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [expiresIn](./firebase-admin.auth.sessioncookieoptions.md#sessioncookieoptionsexpiresin) | number | The session cookie custom expiration in milliseconds. The minimum allowed is 5 minutes and the maxium allowed is 2 weeks. |

## SessionCookieOptions.expiresIn

The session cookie custom expiration in milliseconds. The minimum allowed is 5 minutes and the maxium allowed is 2 weeks.

<b>Signature:</b>

```typescript
expiresIn: number;
```
{% endblock body %}

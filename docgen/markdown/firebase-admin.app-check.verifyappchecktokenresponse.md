{% extends "_internal/templates/reference.html" %}
{% block title %}VerifyAppCheckTokenResponse interface{% endblock title %}
{% block body %}
Interface representing a verified App Check token response.

<b>Signature:</b>

```typescript
export interface VerifyAppCheckTokenResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [appId](./firebase-admin.app-check.verifyappchecktokenresponse.md#verifyappchecktokenresponseappid) | string | The App ID corresponding to the App the App Check token belonged to. |
|  [token](./firebase-admin.app-check.verifyappchecktokenresponse.md#verifyappchecktokenresponsetoken) | [DecodedAppCheckToken](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktoken_interface) | The decoded Firebase App Check token. |

## VerifyAppCheckTokenResponse.appId

The App ID corresponding to the App the App Check token belonged to.

<b>Signature:</b>

```typescript
appId: string;
```

## VerifyAppCheckTokenResponse.token

The decoded Firebase App Check token.

<b>Signature:</b>

```typescript
token: DecodedAppCheckToken;
```
{% endblock body %}

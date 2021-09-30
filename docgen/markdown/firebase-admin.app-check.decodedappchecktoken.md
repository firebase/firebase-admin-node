{% extends "_internal/templates/reference.html" %}
{% block title %}DecodedAppCheckToken interface{% endblock title %}
{% block body %}
Interface representing a decoded Firebase App Check token, returned from the [AppCheck.verifyToken()](./firebase-admin.app-check.appcheck.md#appcheckverifytoken) method.

<b>Signature:</b>

```typescript
export interface DecodedAppCheckToken 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [app\_id](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenapp_id) | string | The App ID corresponding to the App the App Check token belonged to. This value is not actually one of the JWT token claims. It is added as a convenience, and is set as the value of the [sub](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokensub) property. |
|  [aud](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenaud) | string\[\] | The audience for which this token is intended. This value is a JSON array of two strings, the first is the project number of your Firebase project, and the second is the project ID of the same project. |
|  [exp](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenexp) | number | The App Check token's expiration time, in seconds since the Unix epoch. That is, the time at which this App Check token expires and should no longer be considered valid. |
|  [iat](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokeniat) | number | The App Check token's issued-at time, in seconds since the Unix epoch. That is, the time at which this App Check token was issued and should start to be considered valid. |
|  [iss](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokeniss) | string | The issuer identifier for the issuer of the response. This value is a URL with the format <code>https://firebaseappcheck.googleapis.com/&lt;PROJECT_NUMBER&gt;</code>, where <code>&lt;PROJECT_NUMBER&gt;</code> is the same project number specified in the [aud](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenaud) property. |
|  [sub](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokensub) | string | The Firebase App ID corresponding to the app the token belonged to. As a convenience, this value is copied over to the [app\_id](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenapp_id) property. |

## DecodedAppCheckToken.app\_id

The App ID corresponding to the App the App Check token belonged to. This value is not actually one of the JWT token claims. It is added as a convenience, and is set as the value of the [sub](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokensub) property.

<b>Signature:</b>

```typescript
app_id: string;
```

## DecodedAppCheckToken.aud

The audience for which this token is intended. This value is a JSON array of two strings, the first is the project number of your Firebase project, and the second is the project ID of the same project.

<b>Signature:</b>

```typescript
aud: string[];
```

## DecodedAppCheckToken.exp

The App Check token's expiration time, in seconds since the Unix epoch. That is, the time at which this App Check token expires and should no longer be considered valid.

<b>Signature:</b>

```typescript
exp: number;
```

## DecodedAppCheckToken.iat

The App Check token's issued-at time, in seconds since the Unix epoch. That is, the time at which this App Check token was issued and should start to be considered valid.

<b>Signature:</b>

```typescript
iat: number;
```

## DecodedAppCheckToken.iss

The issuer identifier for the issuer of the response. This value is a URL with the format `https://firebaseappcheck.googleapis.com/<PROJECT_NUMBER>`<!-- -->, where `<PROJECT_NUMBER>` is the same project number specified in the [aud](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenaud) property.

<b>Signature:</b>

```typescript
iss: string;
```

## DecodedAppCheckToken.sub

The Firebase App ID corresponding to the app the token belonged to. As a convenience, this value is copied over to the [app\_id](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktokenapp_id) property.

<b>Signature:</b>

```typescript
sub: string;
```
{% endblock body %}

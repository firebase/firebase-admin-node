{% extends "_internal/templates/reference.html" %}
{% block title %}AppCheckToken interface{% endblock title %}
{% block body %}
Interface representing an App Check token.

<b>Signature:</b>

```typescript
export interface AppCheckToken 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [token](./firebase-admin.app-check.appchecktoken.md#appchecktokentoken) | string | The Firebase App Check token. |
|  [ttlMillis](./firebase-admin.app-check.appchecktoken.md#appchecktokenttlmillis) | number | The time-to-live duration of the token in milliseconds. |

## AppCheckToken.token

The Firebase App Check token.

<b>Signature:</b>

```typescript
token: string;
```

## AppCheckToken.ttlMillis

The time-to-live duration of the token in milliseconds.

<b>Signature:</b>

```typescript
ttlMillis: number;
```
{% endblock body %}

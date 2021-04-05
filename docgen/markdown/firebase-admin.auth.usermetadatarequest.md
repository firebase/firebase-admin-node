{% extends "_internal/templates/reference.html" %}
{% block title %}UserMetadataRequest interface{% endblock title %}
{% block body %}
User metadata to include when importing a user.

<b>Signature:</b>

```typescript
export interface UserMetadataRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [creationTime](./firebase-admin.auth.usermetadatarequest.md#usermetadatarequestcreationtime) | string | The date the user was created, formatted as a UTC string. |
|  [lastSignInTime](./firebase-admin.auth.usermetadatarequest.md#usermetadatarequestlastsignintime) | string | The date the user last signed in, formatted as a UTC string. |

## UserMetadataRequest.creationTime

The date the user was created, formatted as a UTC string.

<b>Signature:</b>

```typescript
creationTime?: string;
```

## UserMetadataRequest.lastSignInTime

The date the user last signed in, formatted as a UTC string.

<b>Signature:</b>

```typescript
lastSignInTime?: string;
```
{% endblock body %}

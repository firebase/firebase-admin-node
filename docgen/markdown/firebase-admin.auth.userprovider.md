{% extends "_internal/templates/reference.html" %}
{% block title %}UserProvider interface{% endblock title %}
{% block body %}
Represents a user identity provider that can be associated with a Firebase user.

<b>Signature:</b>

```typescript
export interface UserProvider 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.userprovider.md#userproviderdisplayname) | string | The display name for the linked provider. |
|  [email](./firebase-admin.auth.userprovider.md#userprovideremail) | string | The email for the linked provider. |
|  [phoneNumber](./firebase-admin.auth.userprovider.md#userproviderphonenumber) | string | The phone number for the linked provider. |
|  [photoURL](./firebase-admin.auth.userprovider.md#userproviderphotourl) | string | The photo URL for the linked provider. |
|  [providerId](./firebase-admin.auth.userprovider.md#userproviderproviderid) | string | The linked provider ID (for example, "google.com" for the Google provider). |
|  [uid](./firebase-admin.auth.userprovider.md#userprovideruid) | string | The user identifier for the linked provider. |

## UserProvider.displayName

The display name for the linked provider.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UserProvider.email

The email for the linked provider.

<b>Signature:</b>

```typescript
email?: string;
```

## UserProvider.phoneNumber

The phone number for the linked provider.

<b>Signature:</b>

```typescript
phoneNumber?: string;
```

## UserProvider.photoURL

The photo URL for the linked provider.

<b>Signature:</b>

```typescript
photoURL?: string;
```

## UserProvider.providerId

The linked provider ID (for example, "google.com" for the Google provider).

<b>Signature:</b>

```typescript
providerId?: string;
```

## UserProvider.uid

The user identifier for the linked provider.

<b>Signature:</b>

```typescript
uid?: string;
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}UpdateRequest interface{% endblock title %}
{% block body %}
Interface representing the properties to update on the provided user.

<b>Signature:</b>

```typescript
export interface UpdateRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [disabled](./firebase-admin.auth.updaterequest.md#updaterequestdisabled) | boolean | Whether or not the user is disabled: <code>true</code> for disabled; <code>false</code> for enabled. |
|  [displayName](./firebase-admin.auth.updaterequest.md#updaterequestdisplayname) | string \| null | The user's display name. |
|  [email](./firebase-admin.auth.updaterequest.md#updaterequestemail) | string | The user's primary email. |
|  [emailVerified](./firebase-admin.auth.updaterequest.md#updaterequestemailverified) | boolean | Whether or not the user's primary email is verified. |
|  [multiFactor](./firebase-admin.auth.updaterequest.md#updaterequestmultifactor) | [MultiFactorUpdateSettings](./firebase-admin.auth.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The user's updated multi-factor related properties. |
|  [password](./firebase-admin.auth.updaterequest.md#updaterequestpassword) | string | The user's unhashed password. |
|  [phoneNumber](./firebase-admin.auth.updaterequest.md#updaterequestphonenumber) | string \| null | The user's primary phone number. |
|  [photoURL](./firebase-admin.auth.updaterequest.md#updaterequestphotourl) | string \| null | The user's photo URL. |
|  [providersToUnlink](./firebase-admin.auth.updaterequest.md#updaterequestproviderstounlink) | string\[\] | Unlinks this user from the specified providers. |
|  [providerToLink](./firebase-admin.auth.updaterequest.md#updaterequestprovidertolink) | [UserProvider](./firebase-admin.auth.userprovider.md#userprovider_interface) | Links this user to the specified provider.<!-- -->Linking a provider to an existing user account does not invalidate the refresh token of that account. In other words, the existing account would continue to be able to access resources, despite not having used the newly linked provider to log in. If you wish to force the user to authenticate with this new provider, you need to (a) revoke their refresh token (see https://firebase.google.com/docs/auth/admin/manage-sessions\#revoke\_refresh\_tokens), and (b) ensure no other authentication methods are present on this account. |

## UpdateRequest.disabled

Whether or not the user is disabled: `true` for disabled; `false` for enabled.

<b>Signature:</b>

```typescript
disabled?: boolean;
```

## UpdateRequest.displayName

The user's display name.

<b>Signature:</b>

```typescript
displayName?: string | null;
```

## UpdateRequest.email

The user's primary email.

<b>Signature:</b>

```typescript
email?: string;
```

## UpdateRequest.emailVerified

Whether or not the user's primary email is verified.

<b>Signature:</b>

```typescript
emailVerified?: boolean;
```

## UpdateRequest.multiFactor

The user's updated multi-factor related properties.

<b>Signature:</b>

```typescript
multiFactor?: MultiFactorUpdateSettings;
```

## UpdateRequest.password

The user's unhashed password.

<b>Signature:</b>

```typescript
password?: string;
```

## UpdateRequest.phoneNumber

The user's primary phone number.

<b>Signature:</b>

```typescript
phoneNumber?: string | null;
```

## UpdateRequest.photoURL

The user's photo URL.

<b>Signature:</b>

```typescript
photoURL?: string | null;
```

## UpdateRequest.providersToUnlink

Unlinks this user from the specified providers.

<b>Signature:</b>

```typescript
providersToUnlink?: string[];
```

## UpdateRequest.providerToLink

Links this user to the specified provider.

Linking a provider to an existing user account does not invalidate the refresh token of that account. In other words, the existing account would continue to be able to access resources, despite not having used the newly linked provider to log in. If you wish to force the user to authenticate with this new provider, you need to (a) revoke their refresh token (see https://firebase.google.com/docs/auth/admin/manage-sessions\#revoke\_refresh\_tokens), and (b) ensure no other authentication methods are present on this account.

<b>Signature:</b>

```typescript
providerToLink?: UserProvider;
```
{% endblock body %}

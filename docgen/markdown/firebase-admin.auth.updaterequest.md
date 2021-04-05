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
{% endblock body %}

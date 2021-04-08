Interface representing a user to import to Firebase Auth via the  method.

<b>Signature:</b>

```typescript
export interface UserImportRecord 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [customClaims](./firebase-admin.auth.userimportrecord.md#userimportrecordcustomclaims) | { \[key: string\]: any; } | The user's custom claims object if available, typically used to define user roles and propagated to an authenticated user's ID token. |
|  [disabled](./firebase-admin.auth.userimportrecord.md#userimportrecorddisabled) | boolean | Whether or not the user is disabled: <code>true</code> for disabled; <code>false</code> for enabled. |
|  [displayName](./firebase-admin.auth.userimportrecord.md#userimportrecorddisplayname) | string | The user's display name. |
|  [email](./firebase-admin.auth.userimportrecord.md#userimportrecordemail) | string | The user's primary email, if set. |
|  [emailVerified](./firebase-admin.auth.userimportrecord.md#userimportrecordemailverified) | boolean | Whether or not the user's primary email is verified. |
|  [metadata](./firebase-admin.auth.userimportrecord.md#userimportrecordmetadata) | [UserMetadataRequest](./firebase-admin.auth.usermetadatarequest.md#usermetadatarequest_interface) | Additional metadata about the user. |
|  [multiFactor](./firebase-admin.auth.userimportrecord.md#userimportrecordmultifactor) | [MultiFactorUpdateSettings](./firebase-admin.auth.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The user's multi-factor related properties. |
|  [passwordHash](./firebase-admin.auth.userimportrecord.md#userimportrecordpasswordhash) | Buffer | The buffer of bytes representing the user's hashed password. When a user is to be imported with a password hash,  are required to be specified to identify the hashing algorithm used to generate this hash. |
|  [passwordSalt](./firebase-admin.auth.userimportrecord.md#userimportrecordpasswordsalt) | Buffer | The buffer of bytes representing the user's password salt. |
|  [phoneNumber](./firebase-admin.auth.userimportrecord.md#userimportrecordphonenumber) | string | The user's primary phone number, if set. |
|  [photoURL](./firebase-admin.auth.userimportrecord.md#userimportrecordphotourl) | string | The user's photo URL. |
|  [providerData](./firebase-admin.auth.userimportrecord.md#userimportrecordproviderdata) | [UserProviderRequest](./firebase-admin.auth.userproviderrequest.md#userproviderrequest_interface)<!-- -->\[\] | An array of providers (for example, Google, Facebook) linked to the user. |
|  [tenantId](./firebase-admin.auth.userimportrecord.md#userimportrecordtenantid) | string | The identifier of the tenant where user is to be imported to. When not provided in an <code>admin.auth.Auth</code> context, the user is uploaded to the default parent project. When not provided in an <code>admin.auth.TenantAwareAuth</code> context, the user is uploaded to the tenant corresponding to that <code>TenantAwareAuth</code> instance's tenant ID. |
|  [uid](./firebase-admin.auth.userimportrecord.md#userimportrecorduid) | string | The user's <code>uid</code>. |

## UserImportRecord.customClaims

The user's custom claims object if available, typically used to define user roles and propagated to an authenticated user's ID token.

<b>Signature:</b>

```typescript
customClaims?: {
        [key: string]: any;
    };
```

## UserImportRecord.disabled

Whether or not the user is disabled: `true` for disabled; `false` for enabled.

<b>Signature:</b>

```typescript
disabled?: boolean;
```

## UserImportRecord.displayName

The user's display name.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UserImportRecord.email

The user's primary email, if set.

<b>Signature:</b>

```typescript
email?: string;
```

## UserImportRecord.emailVerified

Whether or not the user's primary email is verified.

<b>Signature:</b>

```typescript
emailVerified?: boolean;
```

## UserImportRecord.metadata

Additional metadata about the user.

<b>Signature:</b>

```typescript
metadata?: UserMetadataRequest;
```

## UserImportRecord.multiFactor

The user's multi-factor related properties.

<b>Signature:</b>

```typescript
multiFactor?: MultiFactorUpdateSettings;
```

## UserImportRecord.passwordHash

The buffer of bytes representing the user's hashed password. When a user is to be imported with a password hash,  are required to be specified to identify the hashing algorithm used to generate this hash.

<b>Signature:</b>

```typescript
passwordHash?: Buffer;
```

## UserImportRecord.passwordSalt

The buffer of bytes representing the user's password salt.

<b>Signature:</b>

```typescript
passwordSalt?: Buffer;
```

## UserImportRecord.phoneNumber

The user's primary phone number, if set.

<b>Signature:</b>

```typescript
phoneNumber?: string;
```

## UserImportRecord.photoURL

The user's photo URL.

<b>Signature:</b>

```typescript
photoURL?: string;
```

## UserImportRecord.providerData

An array of providers (for example, Google, Facebook) linked to the user.

<b>Signature:</b>

```typescript
providerData?: UserProviderRequest[];
```

## UserImportRecord.tenantId

The identifier of the tenant where user is to be imported to. When not provided in an `admin.auth.Auth` context, the user is uploaded to the default parent project. When not provided in an `admin.auth.TenantAwareAuth` context, the user is uploaded to the tenant corresponding to that `TenantAwareAuth` instance's tenant ID.

<b>Signature:</b>

```typescript
tenantId?: string;
```

## UserImportRecord.uid

The user's `uid`<!-- -->.

<b>Signature:</b>

```typescript
uid: string;
```

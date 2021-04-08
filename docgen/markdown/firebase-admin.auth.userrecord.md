Represents a user.

<b>Signature:</b>

```typescript
export declare class UserRecord 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [customClaims](./firebase-admin.auth.userrecord.md#userrecordcustomclaims) |  | { \[key: string\]: any; } | The user's custom claims object if available, typically used to define user roles and propagated to an authenticated user's ID token. This is set via  |
|  [disabled](./firebase-admin.auth.userrecord.md#userrecorddisabled) |  | boolean | Whether or not the user is disabled: <code>true</code> for disabled; <code>false</code> for enabled. |
|  [displayName](./firebase-admin.auth.userrecord.md#userrecorddisplayname) |  | string | The user's display name. |
|  [email](./firebase-admin.auth.userrecord.md#userrecordemail) |  | string | The user's primary email, if set. |
|  [emailVerified](./firebase-admin.auth.userrecord.md#userrecordemailverified) |  | boolean | Whether or not the user's primary email is verified. |
|  [metadata](./firebase-admin.auth.userrecord.md#userrecordmetadata) |  | [UserMetadata](./firebase-admin.auth.usermetadata.md#usermetadata_class) | Additional metadata about the user. |
|  [multiFactor](./firebase-admin.auth.userrecord.md#userrecordmultifactor) |  | [MultiFactorSettings](./firebase-admin.auth.multifactorsettings.md#multifactorsettings_class) | The multi-factor related properties for the current user, if available. |
|  [passwordHash](./firebase-admin.auth.userrecord.md#userrecordpasswordhash) |  | string | The user's hashed password (base64-encoded), only if Firebase Auth hashing algorithm (SCRYPT) is used. If a different hashing algorithm had been used when uploading this user, as is typical when migrating from another Auth system, this will be an empty string. If no password is set, this is null. This is only available when the user is obtained from . |
|  [passwordSalt](./firebase-admin.auth.userrecord.md#userrecordpasswordsalt) |  | string | The user's password salt (base64-encoded), only if Firebase Auth hashing algorithm (SCRYPT) is used. If a different hashing algorithm had been used to upload this user, typical when migrating from another Auth system, this will be an empty string. If no password is set, this is null. This is only available when the user is obtained from . |
|  [phoneNumber](./firebase-admin.auth.userrecord.md#userrecordphonenumber) |  | string | The user's primary phone number, if set. |
|  [photoURL](./firebase-admin.auth.userrecord.md#userrecordphotourl) |  | string | The user's photo URL. |
|  [providerData](./firebase-admin.auth.userrecord.md#userrecordproviderdata) |  | [UserInfo](./firebase-admin.auth.userinfo.md#userinfo_class)<!-- -->\[\] | An array of providers (for example, Google, Facebook) linked to the user. |
|  [tenantId](./firebase-admin.auth.userrecord.md#userrecordtenantid) |  | string \| null | The ID of the tenant the user belongs to, if available. |
|  [tokensValidAfterTime](./firebase-admin.auth.userrecord.md#userrecordtokensvalidaftertime) |  | string | The date the user's tokens are valid after, formatted as a UTC string. This is updated every time the user's refresh token are revoked either from the  API or from the Firebase Auth backend on big account changes (password resets, password or email updates, etc). |
|  [uid](./firebase-admin.auth.userrecord.md#userrecorduid) |  | string | The user's <code>uid</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.userrecord.md#userrecordtojson) |  |  A JSON-serializable representation of this object. |

## UserRecord.customClaims

The user's custom claims object if available, typically used to define user roles and propagated to an authenticated user's ID token. This is set via 

<b>Signature:</b>

```typescript
readonly customClaims?: {
        [key: string]: any;
    };
```

## UserRecord.disabled

Whether or not the user is disabled: `true` for disabled; `false` for enabled.

<b>Signature:</b>

```typescript
readonly disabled: boolean;
```

## UserRecord.displayName

The user's display name.

<b>Signature:</b>

```typescript
readonly displayName?: string;
```

## UserRecord.email

The user's primary email, if set.

<b>Signature:</b>

```typescript
readonly email?: string;
```

## UserRecord.emailVerified

Whether or not the user's primary email is verified.

<b>Signature:</b>

```typescript
readonly emailVerified: boolean;
```

## UserRecord.metadata

Additional metadata about the user.

<b>Signature:</b>

```typescript
readonly metadata: UserMetadata;
```

## UserRecord.multiFactor

The multi-factor related properties for the current user, if available.

<b>Signature:</b>

```typescript
readonly multiFactor?: MultiFactorSettings;
```

## UserRecord.passwordHash

The user's hashed password (base64-encoded), only if Firebase Auth hashing algorithm (SCRYPT) is used. If a different hashing algorithm had been used when uploading this user, as is typical when migrating from another Auth system, this will be an empty string. If no password is set, this is null. This is only available when the user is obtained from .

<b>Signature:</b>

```typescript
readonly passwordHash?: string;
```

## UserRecord.passwordSalt

The user's password salt (base64-encoded), only if Firebase Auth hashing algorithm (SCRYPT) is used. If a different hashing algorithm had been used to upload this user, typical when migrating from another Auth system, this will be an empty string. If no password is set, this is null. This is only available when the user is obtained from .

<b>Signature:</b>

```typescript
readonly passwordSalt?: string;
```

## UserRecord.phoneNumber

The user's primary phone number, if set.

<b>Signature:</b>

```typescript
readonly phoneNumber?: string;
```

## UserRecord.photoURL

The user's photo URL.

<b>Signature:</b>

```typescript
readonly photoURL?: string;
```

## UserRecord.providerData

An array of providers (for example, Google, Facebook) linked to the user.

<b>Signature:</b>

```typescript
readonly providerData: UserInfo[];
```

## UserRecord.tenantId

The ID of the tenant the user belongs to, if available.

<b>Signature:</b>

```typescript
readonly tenantId?: string | null;
```

## UserRecord.tokensValidAfterTime

The date the user's tokens are valid after, formatted as a UTC string. This is updated every time the user's refresh token are revoked either from the  API or from the Firebase Auth backend on big account changes (password resets, password or email updates, etc).

<b>Signature:</b>

```typescript
readonly tokensValidAfterTime?: string;
```

## UserRecord.uid

The user's `uid`<!-- -->.

<b>Signature:</b>

```typescript
readonly uid: string;
```

## UserRecord.toJSON()

 A JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object


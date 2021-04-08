User provider data to include when importing a user.

<b>Signature:</b>

```typescript
export interface UserProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.userproviderrequest.md#userproviderrequestdisplayname) | string | The display name for the linked provider. |
|  [email](./firebase-admin.auth.userproviderrequest.md#userproviderrequestemail) | string | The email for the linked provider. |
|  [phoneNumber](./firebase-admin.auth.userproviderrequest.md#userproviderrequestphonenumber) | string | The phone number for the linked provider. |
|  [photoURL](./firebase-admin.auth.userproviderrequest.md#userproviderrequestphotourl) | string | The photo URL for the linked provider. |
|  [providerId](./firebase-admin.auth.userproviderrequest.md#userproviderrequestproviderid) | string | The linked provider ID (for example, "google.com" for the Google provider). |
|  [uid](./firebase-admin.auth.userproviderrequest.md#userproviderrequestuid) | string | The user identifier for the linked provider. |

## UserProviderRequest.displayName

The display name for the linked provider.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UserProviderRequest.email

The email for the linked provider.

<b>Signature:</b>

```typescript
email?: string;
```

## UserProviderRequest.phoneNumber

The phone number for the linked provider.

<b>Signature:</b>

```typescript
phoneNumber?: string;
```

## UserProviderRequest.photoURL

The photo URL for the linked provider.

<b>Signature:</b>

```typescript
photoURL?: string;
```

## UserProviderRequest.providerId

The linked provider ID (for example, "google.com" for the Google provider).

<b>Signature:</b>

```typescript
providerId: string;
```

## UserProviderRequest.uid

The user identifier for the linked provider.

<b>Signature:</b>

```typescript
uid: string;
```

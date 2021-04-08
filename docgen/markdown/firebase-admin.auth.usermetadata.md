Represents a user's metadata.

<b>Signature:</b>

```typescript
export declare class UserMetadata 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [creationTime](./firebase-admin.auth.usermetadata.md#usermetadatacreationtime) |  | string | The date the user was created, formatted as a UTC string. |
|  [lastRefreshTime](./firebase-admin.auth.usermetadata.md#usermetadatalastrefreshtime) |  | string \| null | The time at which the user was last active (ID token refreshed), formatted as a UTC Date string (eg 'Sat, 03 Feb 2001 04:05:06 GMT'). Returns null if the user was never active. |
|  [lastSignInTime](./firebase-admin.auth.usermetadata.md#usermetadatalastsignintime) |  | string | The date the user last signed in, formatted as a UTC string. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.usermetadata.md#usermetadatatojson) |  |  A JSON-serializable representation of this object. |

## UserMetadata.creationTime

The date the user was created, formatted as a UTC string.

<b>Signature:</b>

```typescript
readonly creationTime: string;
```

## UserMetadata.lastRefreshTime

The time at which the user was last active (ID token refreshed), formatted as a UTC Date string (eg 'Sat, 03 Feb 2001 04:05:06 GMT'). Returns null if the user was never active.

<b>Signature:</b>

```typescript
readonly lastRefreshTime?: string | null;
```

## UserMetadata.lastSignInTime

The date the user last signed in, formatted as a UTC string.

<b>Signature:</b>

```typescript
readonly lastSignInTime: string;
```

## UserMetadata.toJSON()

 A JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object


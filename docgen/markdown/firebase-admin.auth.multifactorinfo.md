Interface representing the common properties of a user enrolled second factor.

<b>Signature:</b>

```typescript
export declare abstract class MultiFactorInfo 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [displayName](./firebase-admin.auth.multifactorinfo.md#multifactorinfodisplayname) |  | string | The optional display name of the enrolled second factor. |
|  [enrollmentTime](./firebase-admin.auth.multifactorinfo.md#multifactorinfoenrollmenttime) |  | string | The optional date the second factor was enrolled, formatted as a UTC string. |
|  [factorId](./firebase-admin.auth.multifactorinfo.md#multifactorinfofactorid) |  | string | The type identifier of the second factor. For SMS second factors, this is <code>phone</code>. |
|  [uid](./firebase-admin.auth.multifactorinfo.md#multifactorinfouid) |  | string | The ID of the enrolled second factor. This ID is unique to the user. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.multifactorinfo.md#multifactorinfotojson) |  |  A JSON-serializable representation of this object. |

## MultiFactorInfo.displayName

The optional display name of the enrolled second factor.

<b>Signature:</b>

```typescript
readonly displayName?: string;
```

## MultiFactorInfo.enrollmentTime

The optional date the second factor was enrolled, formatted as a UTC string.

<b>Signature:</b>

```typescript
readonly enrollmentTime?: string;
```

## MultiFactorInfo.factorId

The type identifier of the second factor. For SMS second factors, this is `phone`<!-- -->.

<b>Signature:</b>

```typescript
readonly factorId: string;
```

## MultiFactorInfo.uid

The ID of the enrolled second factor. This ID is unique to the user.

<b>Signature:</b>

```typescript
readonly uid: string;
```

## MultiFactorInfo.toJSON()

 A JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object


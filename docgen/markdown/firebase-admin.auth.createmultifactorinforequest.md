Interface representing base properties of a user enrolled second factor for a `CreateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface CreateMultiFactorInfoRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.createmultifactorinforequest.md#createmultifactorinforequestdisplayname) | string | The optional display name for an enrolled second factor. |
|  [factorId](./firebase-admin.auth.createmultifactorinforequest.md#createmultifactorinforequestfactorid) | string | The type identifier of the second factor. For SMS second factors, this is <code>phone</code>. |

## CreateMultiFactorInfoRequest.displayName

The optional display name for an enrolled second factor.

<b>Signature:</b>

```typescript
displayName?: string;
```

## CreateMultiFactorInfoRequest.factorId

The type identifier of the second factor. For SMS second factors, this is `phone`<!-- -->.

<b>Signature:</b>

```typescript
factorId: string;
```

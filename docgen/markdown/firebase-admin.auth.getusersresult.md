Represents the result of the  API.

<b>Signature:</b>

```typescript
export interface GetUsersResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [notFound](./firebase-admin.auth.getusersresult.md#getusersresultnotfound) | [UserIdentifier](./firebase-admin.auth.md#useridentifier)<!-- -->\[\] | Set of identifiers that were requested, but not found. |
|  [users](./firebase-admin.auth.getusersresult.md#getusersresultusers) | [UserRecord](./firebase-admin.auth.userrecord.md#userrecord_class)<!-- -->\[\] | Set of user records, corresponding to the set of users that were requested. Only users that were found are listed here. The result set is unordered. |

## GetUsersResult.notFound

Set of identifiers that were requested, but not found.

<b>Signature:</b>

```typescript
notFound: UserIdentifier[];
```

## GetUsersResult.users

Set of user records, corresponding to the set of users that were requested. Only users that were found are listed here. The result set is unordered.

<b>Signature:</b>

```typescript
users: UserRecord[];
```

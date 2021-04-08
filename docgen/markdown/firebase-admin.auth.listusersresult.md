Interface representing the object returned from a  operation. Contains the list of users for the current batch and the next page token if available.

<b>Signature:</b>

```typescript
export interface ListUsersResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [pageToken](./firebase-admin.auth.listusersresult.md#listusersresultpagetoken) | string | The next page token if available. This is needed for the next batch download. |
|  [users](./firebase-admin.auth.listusersresult.md#listusersresultusers) | [UserRecord](./firebase-admin.auth.userrecord.md#userrecord_class)<!-- -->\[\] | The list of  objects for the current downloaded batch. |

## ListUsersResult.pageToken

The next page token if available. This is needed for the next batch download.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListUsersResult.users

The list of  objects for the current downloaded batch.

<b>Signature:</b>

```typescript
users: UserRecord[];
```

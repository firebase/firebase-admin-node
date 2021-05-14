{% extends "_internal/templates/reference.html" %}
{% block title %}DeleteUsersResult interface{% endblock title %}
{% block body %}
Represents the result of the [BaseAuth.deleteUsers()](./firebase-admin.auth.baseauth.md#baseauthdeleteusers)<!-- -->. API.

<b>Signature:</b>

```typescript
export interface DeleteUsersResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [errors](./firebase-admin.auth.deleteusersresult.md#deleteusersresulterrors) | FirebaseArrayIndexError\[\] | A list of <code>FirebaseArrayIndexError</code> instances describing the errors that were encountered during the deletion. Length of this list is equal to the return value of [DeleteUsersResult.failureCount](./firebase-admin.auth.deleteusersresult.md#deleteusersresultfailurecount)<!-- -->. |
|  [failureCount](./firebase-admin.auth.deleteusersresult.md#deleteusersresultfailurecount) | number | The number of user records that failed to be deleted (possibly zero). |
|  [successCount](./firebase-admin.auth.deleteusersresult.md#deleteusersresultsuccesscount) | number | The number of users that were deleted successfully (possibly zero). Users that did not exist prior to calling <code>deleteUsers()</code> are considered to be successfully deleted. |

## DeleteUsersResult.errors

A list of `FirebaseArrayIndexError` instances describing the errors that were encountered during the deletion. Length of this list is equal to the return value of [DeleteUsersResult.failureCount](./firebase-admin.auth.deleteusersresult.md#deleteusersresultfailurecount)<!-- -->.

<b>Signature:</b>

```typescript
errors: FirebaseArrayIndexError[];
```

## DeleteUsersResult.failureCount

The number of user records that failed to be deleted (possibly zero).

<b>Signature:</b>

```typescript
failureCount: number;
```

## DeleteUsersResult.successCount

The number of users that were deleted successfully (possibly zero). Users that did not exist prior to calling `deleteUsers()` are considered to be successfully deleted.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}

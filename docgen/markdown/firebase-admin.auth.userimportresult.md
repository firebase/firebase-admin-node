Interface representing the response from the  method for batch importing users to Firebase Auth.

<b>Signature:</b>

```typescript
export interface UserImportResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [errors](./firebase-admin.auth.userimportresult.md#userimportresulterrors) | FirebaseArrayIndexError\[\] | An array of errors corresponding to the provided users to import. The length of this array is equal to \[<code>failureCount</code>\](\#failureCount). |
|  [failureCount](./firebase-admin.auth.userimportresult.md#userimportresultfailurecount) | number | The number of user records that failed to import to Firebase Auth. |
|  [successCount](./firebase-admin.auth.userimportresult.md#userimportresultsuccesscount) | number | The number of user records that successfully imported to Firebase Auth. |

## UserImportResult.errors

An array of errors corresponding to the provided users to import. The length of this array is equal to \[`failureCount`<!-- -->\](\#failureCount).

<b>Signature:</b>

```typescript
errors: FirebaseArrayIndexError[];
```

## UserImportResult.failureCount

The number of user records that failed to import to Firebase Auth.

<b>Signature:</b>

```typescript
failureCount: number;
```

## UserImportResult.successCount

The number of user records that successfully imported to Firebase Auth.

<b>Signature:</b>

```typescript
successCount: number;
```

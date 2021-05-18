{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/firestore module{% endblock title %}
{% block body %}

## External API Re-exports

The following externally defined APIs are re-exported from this module entry point for convenience.

|  Symbol | Description |
|  --- | --- |
|  [BulkWriter](https://googleapis.dev/nodejs/firestore/latest/BulkWriter.html) | `BulkWriter` type from the `@google-cloud/firestore` package. |
|  [BulkWriterOptions](https://googleapis.dev/nodejs/firestore/latest/global.html#BulkWriterOptions) | `BulkWriterOptions` type from the `@google-cloud/firestore` package. |
|  [CollectionGroup](https://googleapis.dev/nodejs/firestore/latest/CollectionGroup.html) | `CollectionGroup` type from the `@google-cloud/firestore` package. |
|  [CollectionReference](https://googleapis.dev/nodejs/firestore/latest/CollectionReference.html) | `CollectionReference` type from the `@google-cloud/firestore` package. |
|  [DocumentData](https://googleapis.dev/nodejs/firestore/latest/global.html#DocumentData) | `DocumentData` type from the `@google-cloud/firestore` package. |
|  [DocumentReference](https://googleapis.dev/nodejs/firestore/latest/DocumentReference.html) | `DocumentReference` type from the `@google-cloud/firestore` package. |
|  [DocumentSnapshot](https://googleapis.dev/nodejs/firestore/latest/DocumentSnapshot.html) | `DocumentSnapshot` type from the `@google-cloud/firestore` package. |
|  [FieldPath](https://googleapis.dev/nodejs/firestore/latest/FieldPath.html) | `FieldPath` type from the `@google-cloud/firestore` package. |
|  [FieldValue](https://googleapis.dev/nodejs/firestore/latest/FieldValue.html) | `FieldValue` type from the `@google-cloud/firestore` package. |
|  [Firestore](https://googleapis.dev/nodejs/firestore/latest/Firestore.html) | `Firestore` type from the `@google-cloud/firestore` package.  |
|  [FirestoreDataConverter](https://googleapis.dev/nodejs/firestore/latest/global.html#FirestoreDataConverter) | `FirestoreDataConverter` type from the `@google-cloud/firestore` package. |
|  [GeoPoint](https://googleapis.dev/nodejs/firestore/latest/GeoPoint.html) | `GeoPoint` type from the `@google-cloud/firestore` package. |
|  [Query](https://googleapis.dev/nodejs/firestore/latest/Query.html) | `Query` type from the `@google-cloud/firestore` package. |
|  [QueryDocumentSnapshot](https://googleapis.dev/nodejs/firestore/latest/QueryDocumentSnapshot.html) | `QueryDocumentSnapshot` type from the `@google-cloud/firestore` package. |
|  [QueryPartition](https://googleapis.dev/nodejs/firestore/latest/QueryPartition.html) | `QueryPartition` type from the `@google-cloud/firestore` package. |
|  [QuerySnapshot](https://googleapis.dev/nodejs/firestore/latest/QuerySnapshot.html) | `QuerySnapshot` type from the `@google-cloud/firestore` package. |
|  [Timestamp](https://googleapis.dev/nodejs/firestore/latest/Timestamp.html) | `Timestamp` type from the `@google-cloud/firestore` package. |
|  [Transaction](https://googleapis.dev/nodejs/firestore/latest/Transaction.html) | `Transaction` type from the `@google-cloud/firestore` package. |
|  [WriteBatch](https://googleapis.dev/nodejs/firestore/latest/WriteBatch.html) | `WriteBatch` type from the `@google-cloud/firestore` package. |
|  [WriteResult](https://googleapis.dev/nodejs/firestore/latest/WriteResult.html) | `WriteResult` type from the `@google-cloud/firestore` package. |
|  [setLogFunction](https://googleapis.dev/nodejs/firestore/latest/global.html#setLogFunction) | `setLogFunction` function from the `@google-cloud/firestore` package. |
Cloud Firestore.

## Functions

|  Function | Description |
|  --- | --- |
|  [getFirestore(app)](./firebase-admin.firestore.md#getfirestore) | Gets the [Firestore](https://googleapis.dev/nodejs/firestore/latest/Firestore.html) service for the default app or a given app.<code>getFirestore()</code> can be called with no arguments to access the default app's <code>Firestore</code> service or as <code>getFirestore(app)</code> to access the <code>Firestore</code> service associated with a specific app. |

## getFirestore()

Gets the [Firestore](https://googleapis.dev/nodejs/firestore/latest/Firestore.html) service for the default app or a given app.

`getFirestore()` can be called with no arguments to access the default app's `Firestore` service or as `getFirestore(app)` to access the `Firestore` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getFirestore(app?: App): Firestore;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App |  |

<b>Returns:</b>

Firestore

The default [Firestore](https://googleapis.dev/nodejs/firestore/latest/Firestore.html) service if no app is provided or the `Firestore` service associated with the provided app.

### Example 1


```javascript
// Get the Firestore service for the default app
const defaultFirestore = getFirestore();

```

### Example 2


```javascript
// Get the Firestore service for a specific app
const otherFirestore = getFirestore(app);

```

{% endblock body %}
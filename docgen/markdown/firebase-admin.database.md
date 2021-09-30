{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/database module{% endblock title %}
{% block body %}
Firebase Realtime Database.

## External API Re-exports

The following externally defined APIs are re-exported from this module entry point for convenience.

|  Symbol | Description |
|  --- | --- |
|  [DataSnapshot](https://firebase.google.com/docs/reference/js/firebase.database.DataSnapshot) | `DataSnapshot` type from the `@firebase/database` package. |
|  [EventType](https://firebase.google.com/docs/reference/js/firebase.database#eventtype) | `EventType` type from the `@firebase/database` package. |
|  [OnDisconnect](https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect) | `OnDisconnect` type from the `@firebase/database` package. |
|  [Query](https://firebase.google.com/docs/reference/js/firebase.database.Query) | `Query` type from the `@firebase/database` package. |
|  [Reference](https://firebase.google.com/docs/reference/js/firebase.database.Reference) | `Reference` type from the `@firebase/database` package. |
|  [ThenableReference](https://firebase.google.com/docs/reference/js/firebase.database.ThenableReference) | `ThenableReference` type from the `@firebase/database` package. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getDatabase(app)](./firebase-admin.database.md#getdatabase) | Gets the [Database](./firebase-admin.database.database.md#database_interface) service for the default app or a given app.<code>getDatabase()</code> can be called with no arguments to access the default app's <code>Database</code> service or as <code>getDatabase(app)</code> to access the <code>Database</code> service associated with a specific app. |
|  [getDatabaseWithUrl(url, app)](./firebase-admin.database.md#getdatabasewithurl) | Gets the [Database](./firebase-admin.database.database.md#database_interface) service for the default app or a given app.<code>getDatabaseWithUrl()</code> can be called with no arguments to access the default app's [Database](./firebase-admin.database.database.md#database_interface) service or as <code>getDatabaseWithUrl(app)</code> to access the [Database](./firebase-admin.database.database.md#database_interface) service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Database](./firebase-admin.database.database.md#database_interface) | The Firebase Database service interface. Extends the [Database](https://firebase.google.com/docs/reference/js/firebase.database.Database) interface provided by the <code>@firebase/database</code> package. |

## Variables

|  Variable | Description |
|  --- | --- |
|  [enableLogging](./firebase-admin.database.md#enablelogging) | [enableLogging](https://firebase.google.com/docs/reference/js/firebase.database#enablelogging) function from the <code>@firebase/database</code> package. |
|  [ServerValue](./firebase-admin.database.md#servervalue) | [ServerValue](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue) constant from the <code>@firebase/database</code> package. |

## getDatabase()

Gets the [Database](./firebase-admin.database.database.md#database_interface) service for the default app or a given app.

`getDatabase()` can be called with no arguments to access the default app's `Database` service or as `getDatabase(app)` to access the `Database` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getDatabase(app?: App): Database;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App |  |

<b>Returns:</b>

[Database](./firebase-admin.database.database.md#database_interface)

The default `Database` service if no app is provided or the `Database` service associated with the provided app.

### Example 1


```javascript
// Get the Database service for the default app
const defaultDatabase = getDatabase();

```

### Example 2


```javascript
// Get the Database service for a specific app
const otherDatabase = getDatabase(app);

```

## getDatabaseWithUrl()

Gets the [Database](./firebase-admin.database.database.md#database_interface) service for the default app or a given app.

`getDatabaseWithUrl()` can be called with no arguments to access the default app's [Database](./firebase-admin.database.database.md#database_interface) service or as `getDatabaseWithUrl(app)` to access the [Database](./firebase-admin.database.database.md#database_interface) service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getDatabaseWithUrl(url: string, app?: App): Database;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  url | string |  |
|  app | App |  |

<b>Returns:</b>

[Database](./firebase-admin.database.database.md#database_interface)

The default `Database` service if no app is provided or the `Database` service associated with the provided app.

### Example 1


```javascript
// Get the Database service for the default app
const defaultDatabase = getDatabaseWithUrl('https://example.firebaseio.com');

```

### Example 2


```javascript
// Get the Database service for a specific app
const otherDatabase = getDatabaseWithUrl('https://example.firebaseio.com', app);

```

## enableLogging

[enableLogging](https://firebase.google.com/docs/reference/js/firebase.database#enablelogging) function from the `@firebase/database` package.

<b>Signature:</b>

```typescript
enableLogging: typeof rtdb.enableLogging
```

## ServerValue

[ServerValue](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue) constant from the `@firebase/database` package.

<b>Signature:</b>

```typescript
ServerValue: rtdb.ServerValue
```
{% endblock body %}

## Functions

|  Function | Description |
|  --- | --- |
|  [getDatabase(app)](./firebase-admin.database.md#getdatabase) | Gets the  service for the default app or a given app.<code>getDatabase()</code> can be called with no arguments to access the default app's  service or as <code>getDatabase(app)</code> to access the  service associated with a specific app. |
|  [getDatabaseWithUrl(url, app)](./firebase-admin.database.md#getdatabasewithurl) | Gets the  service for the default app or a given app.<code>getDatabaseWithUrl()</code> can be called with no arguments to access the default app's  service or as <code>getDatabaseWithUrl(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Database](./firebase-admin.database.database.md#database_interface) |  |

## Variables

|  Variable | Description |
|  --- | --- |
|  [enableLogging](./firebase-admin.database.md#enablelogging) | \[<code>enableLogging</code>\](https://firebase.google.com/docs/reference/js/firebase.database\#enablelogging) function from the <code>@firebase/database</code> package. |
|  [ServerValue](./firebase-admin.database.md#servervalue) | \[<code>ServerValue</code>\](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue) module from the <code>@firebase/database</code> package. |

## getDatabase()

Gets the  service for the default app or a given app.

`getDatabase()` can be called with no arguments to access the default app's  service or as `getDatabase(app)` to access the  service associated with a specific app.

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

Gets the  service for the default app or a given app.

`getDatabaseWithUrl()` can be called with no arguments to access the default app's  service or as `getDatabaseWithUrl(app)` to access the  service associated with a specific app.

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

\[`enableLogging`<!-- -->\](https://firebase.google.com/docs/reference/js/firebase.database\#enablelogging) function from the `@firebase/database` package.

<b>Signature:</b>

```typescript
enableLogging: typeof rtdb.enableLogging
```

## ServerValue

\[`ServerValue`<!-- -->\](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue) module from the `@firebase/database` package.

<b>Signature:</b>

```typescript
ServerValue: rtdb.ServerValue
```

{% extends "_internal/templates/reference.html" %}
{% block title %}database namespace{% endblock title %}
{% block body %}
<b>Signature:</b>

```typescript
export declare namespace database 
```

## Variables

|  Variable | Description |
|  --- | --- |
|  [enableLogging](./firebase-admin.database_n.md#databaseenablelogging) | [enableLogging](https://firebase.google.com/docs/reference/js/firebase.database#enablelogging) function from the <code>@firebase/database</code> package. |
|  [ServerValue](./firebase-admin.database_n.md#databaseservervalue) | [ServerValue](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue) constant from the <code>@firebase/database</code> package. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Database](./firebase-admin.database_n.md#databasedatabase) | Type alias to [Database](./firebase-admin.database.database.md#database_interface)<!-- -->. |
|  [DataSnapshot](./firebase-admin.database_n.md#databasedatasnapshot) | Type alias to [DataSnapshot](https://firebase.google.com/docs/reference/js/firebase.database.DataSnapshot) type from the <code>@firebase/database</code> package. |
|  [EventType](./firebase-admin.database_n.md#databaseeventtype) | Type alias to the [EventType](https://firebase.google.com/docs/reference/js/firebase.database#eventtype) type from the <code>@firebase/database</code> package. |
|  [OnDisconnect](./firebase-admin.database_n.md#databaseondisconnect) | Type alias to [OnDisconnect](https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect) type from the <code>@firebase/database</code> package. |
|  [Query](./firebase-admin.database_n.md#databasequery) | Type alias to [Query](https://firebase.google.com/docs/reference/js/firebase.database.Query) type from the <code>@firebase/database</code> package. |
|  [Reference](./firebase-admin.database_n.md#databasereference) | Type alias to [Reference](https://firebase.google.com/docs/reference/js/firebase.database.Reference) type from the <code>@firebase/database</code> package. |
|  [ThenableReference](./firebase-admin.database_n.md#databasethenablereference) | Type alias to [ThenableReference](https://firebase.google.com/docs/reference/js/firebase.database.ThenableReference) type from the <code>@firebase/database</code> package. |

## database.enableLogging

[enableLogging](https://firebase.google.com/docs/reference/js/firebase.database#enablelogging) function from the `@firebase/database` package.

<b>Signature:</b>

```typescript
enableLogging: typeof rtdb.enableLogging
```

## database.ServerValue

[ServerValue](https://firebase.google.com/docs/reference/js/firebase.database.ServerValue) constant from the `@firebase/database` package.

<b>Signature:</b>

```typescript
ServerValue: rtdb.ServerValue
```

## database.Database

Type alias to [Database](./firebase-admin.database.database.md#database_interface)<!-- -->.

<b>Signature:</b>

```typescript
type Database = TDatabase;
```

## database.DataSnapshot

Type alias to [DataSnapshot](https://firebase.google.com/docs/reference/js/firebase.database.DataSnapshot) type from the `@firebase/database` package.

<b>Signature:</b>

```typescript
type DataSnapshot = rtdb.DataSnapshot;
```

## database.EventType

Type alias to the [EventType](https://firebase.google.com/docs/reference/js/firebase.database#eventtype) type from the `@firebase/database` package.

<b>Signature:</b>

```typescript
type EventType = rtdb.EventType;
```

## database.OnDisconnect

Type alias to [OnDisconnect](https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect) type from the `@firebase/database` package.

<b>Signature:</b>

```typescript
type OnDisconnect = rtdb.OnDisconnect;
```

## database.Query

Type alias to [Query](https://firebase.google.com/docs/reference/js/firebase.database.Query) type from the `@firebase/database` package.

<b>Signature:</b>

```typescript
type Query = rtdb.Query;
```

## database.Reference

Type alias to [Reference](https://firebase.google.com/docs/reference/js/firebase.database.Reference) type from the `@firebase/database` package.

<b>Signature:</b>

```typescript
type Reference = rtdb.Reference;
```

## database.ThenableReference

Type alias to [ThenableReference](https://firebase.google.com/docs/reference/js/firebase.database.ThenableReference) type from the `@firebase/database` package.

<b>Signature:</b>

```typescript
type ThenableReference = rtdb.ThenableReference;
```
{% endblock body %}

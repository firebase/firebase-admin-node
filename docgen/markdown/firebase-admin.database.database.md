{% extends "_internal/templates/reference.html" %}
{% block title %}Database interface{% endblock title %}
{% block body %}
The Firebase Database service interface. Extends the [Database](https://firebase.google.com/docs/reference/js/firebase.database.Database) interface provided by the `@firebase/database` package.

<b>Signature:</b>

```typescript
export interface Database extends FirebaseDatabase 
```
<b>Extends:</b> FirebaseDatabase

## Methods

|  Method | Description |
|  --- | --- |
|  [getRules()](./firebase-admin.database.database.md#databasegetrules) | Gets the currently applied security rules as a string. The return value consists of the rules source including comments. |
|  [getRulesJSON()](./firebase-admin.database.database.md#databasegetrulesjson) | Gets the currently applied security rules as a parsed JSON object. Any comments in the original source are stripped away. |
|  [setRules(source)](./firebase-admin.database.database.md#databasesetrules) | Sets the specified rules on the Firebase Realtime Database instance. If the rules source is specified as a string or a Buffer, it may include comments. |

## Database.getRules()

Gets the currently applied security rules as a string. The return value consists of the rules source including comments.

<b>Signature:</b>

```typescript
getRules(): Promise<string>;
```
<b>Returns:</b>

Promise&lt;string&gt;

A promise fulfilled with the rules as a raw string.

## Database.getRulesJSON()

Gets the currently applied security rules as a parsed JSON object. Any comments in the original source are stripped away.

<b>Signature:</b>

```typescript
getRulesJSON(): Promise<object>;
```
<b>Returns:</b>

Promise&lt;object&gt;

A promise fulfilled with the parsed rules object.

## Database.setRules()

Sets the specified rules on the Firebase Realtime Database instance. If the rules source is specified as a string or a Buffer, it may include comments.

<b>Signature:</b>

```typescript
setRules(source: string | Buffer | object): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  source | string \| Buffer \| object | Source of the rules to apply. Must not be <code>null</code> or empty. |

<b>Returns:</b>

Promise&lt;void&gt;

Resolves when the rules are set on the Realtime Database.

{% endblock body %}

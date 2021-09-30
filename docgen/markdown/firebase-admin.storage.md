{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/storage module{% endblock title %}
{% block body %}
Cloud Storage for Firebase.

## Classes

|  Class | Description |
|  --- | --- |
|  [Storage](./firebase-admin.storage.storage.md#storage_class) | The default <code>Storage</code> service if no app is provided or the <code>Storage</code> service associated with the provided app. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getStorage(app)](./firebase-admin.storage.md#getstorage) | Gets the [Storage](./firebase-admin.storage.storage.md#storage_class) service for the default app or a given app.<code>getStorage()</code> can be called with no arguments to access the default app's <code>Storage</code> service or as <code>getStorage(app)</code> to access the <code>Storage</code> service associated with a specific app. |

## getStorage()

Gets the [Storage](./firebase-admin.storage.storage.md#storage_class) service for the default app or a given app.

`getStorage()` can be called with no arguments to access the default app's `Storage` service or as `getStorage(app)` to access the `Storage` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getStorage(app?: App): Storage;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App |  |

<b>Returns:</b>

[Storage](./firebase-admin.storage.storage.md#storage_class)

### Example 1


```javascript
// Get the Storage service for the default app
const defaultStorage = getStorage();

```

### Example 2


```javascript
// Get the Storage service for a given app
const otherStorage = getStorage(otherApp);

```

{% endblock body %}
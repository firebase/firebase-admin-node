{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin.storage package{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [Storage](./firebase-admin.storage.storage.md#storage_class) | The default <code>Storage</code> service if no app is provided or the <code>Storage</code> service associated with the provided app. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getStorage(app)](./firebase-admin.storage.md#getstorage) | Gets the  service for the default app or a given app.<code>getStorage()</code> can be called with no arguments to access the default app's  service or as <code>getStorage(app)</code> to access the  service associated with a specific app. |

## getStorage()

Gets the  service for the default app or a given app.

`getStorage()` can be called with no arguments to access the default app's  service or as `getStorage(app)` to access the  service associated with a specific app.

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

{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin.instance-id package{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [InstanceId](./firebase-admin.instance-id.instanceid.md#instanceid_class) | The <code>InstanceId</code> service enables deleting the Firebase instance IDs associated with Firebase client app instances. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getInstanceId(app)](./firebase-admin.instance-id.md#getinstanceid) | Gets the  service for the default app or a given app.<code>getInstanceId()</code> can be called with no arguments to access the default app's  service or as <code>getInstanceId(app)</code> to access the  service associated with a specific app. |

## getInstanceId()

Gets the  service for the default app or a given app.

`getInstanceId()` can be called with no arguments to access the default app's  service or as `getInstanceId(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getInstanceId(app?: App): InstanceId;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app whose <code>InstanceId</code> service to return. If not provided, the default <code>InstanceId</code> service will be returned. The default <code>InstanceId</code> service if no app is provided or the <code>InstanceId</code> service associated with the provided app. |

<b>Returns:</b>

[InstanceId](./firebase-admin.instance-id.instanceid.md#instanceid_class)

### Example 1


```javascript
// Get the Instance ID service for the default app
const defaultInstanceId = getInstanceId();

```

### Example 2


```javascript
// Get the Instance ID service for a given app
const otherInstanceId = getInstanceId(otherApp);

```

{% endblock body %}

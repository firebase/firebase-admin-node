{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/installations module{% endblock title %}
{% block body %}
Firebase Instance ID service.

## Classes

|  Class | Description |
|  --- | --- |
|  [Installations](./firebase-admin.installations.installations.md#installations_class) | The <code>Installations</code> service for the current app. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getInstallations(app)](./firebase-admin.installations.md#getinstallations) | Gets the [Installations](./firebase-admin.installations.installations.md#installations_class) service for the default app or a given app.<code>getInstallations()</code> can be called with no arguments to access the default app's <code>Installations</code> service or as <code>getInstallations(app)</code> to access the <code>Installations</code> service associated with a specific app. |

## getInstallations()

Gets the [Installations](./firebase-admin.installations.installations.md#installations_class) service for the default app or a given app.

`getInstallations()` can be called with no arguments to access the default app's `Installations` service or as `getInstallations(app)` to access the `Installations` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getInstallations(app?: App): Installations;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app whose <code>Installations</code> service to return. If not provided, the default <code>Installations</code> service will be returned. |

<b>Returns:</b>

[Installations](./firebase-admin.installations.installations.md#installations_class)

The default `Installations` service if no app is provided or the `Installations` service associated with the provided app.

### Example 1


```javascript
// Get the Installations service for the default app
const defaultInstallations = getInstallations();

```

### Example 2


```javascript
// Get the Installations service for a given app
const otherInstallations = getInstallations(otherApp);

```

{% endblock body %}
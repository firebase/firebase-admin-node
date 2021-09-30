{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/app-check module{% endblock title %}
{% block body %}
Firebase App Check.

## Classes

|  Class | Description |
|  --- | --- |
|  [AppCheck](./firebase-admin.app-check.appcheck.md#appcheck_class) | The Firebase <code>AppCheck</code> service interface. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getAppCheck(app)](./firebase-admin.app-check.md#getappcheck) | Gets the [AppCheck](./firebase-admin.app-check.appcheck.md#appcheck_class) service for the default app or a given app.<code>getAppCheck()</code> can be called with no arguments to access the default app's <code>AppCheck</code> service or as <code>getAppCheck(app)</code> to access the <code>AppCheck</code> service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AppCheckToken](./firebase-admin.app-check.appchecktoken.md#appchecktoken_interface) | Interface representing an App Check token. |
|  [AppCheckTokenOptions](./firebase-admin.app-check.appchecktokenoptions.md#appchecktokenoptions_interface) | Interface representing App Check token options. |
|  [DecodedAppCheckToken](./firebase-admin.app-check.decodedappchecktoken.md#decodedappchecktoken_interface) | Interface representing a decoded Firebase App Check token, returned from the [AppCheck.verifyToken()](./firebase-admin.app-check.appcheck.md#appcheckverifytoken) method. |
|  [VerifyAppCheckTokenResponse](./firebase-admin.app-check.verifyappchecktokenresponse.md#verifyappchecktokenresponse_interface) | Interface representing a verified App Check token response. |

## getAppCheck()

Gets the [AppCheck](./firebase-admin.app-check.appcheck.md#appcheck_class) service for the default app or a given app.

`getAppCheck()` can be called with no arguments to access the default app's `AppCheck` service or as `getAppCheck(app)` to access the `AppCheck` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getAppCheck(app?: App): AppCheck;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app for which to return the <code>AppCheck</code> service. If not provided, the default <code>AppCheck</code> service is returned. |

<b>Returns:</b>

[AppCheck](./firebase-admin.app-check.appcheck.md#appcheck_class)

The default `AppCheck` service if no app is provided, or the `AppCheck` service associated with the provided app.

### Example 1


```javascript
// Get the `AppCheck` service for the default app
const defaultAppCheck = getAppCheck();

```

### Example 2


```javascript
// Get the `AppCheck` service for a given app
const otherAppCheck = getAppCheck(otherApp);

```

{% endblock body %}
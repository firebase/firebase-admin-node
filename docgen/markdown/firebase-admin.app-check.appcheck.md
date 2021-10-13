{% extends "_internal/templates/reference.html" %}
{% block title %}AppCheck class{% endblock title %}
{% block body %}
The Firebase `AppCheck` service interface.

<b>Signature:</b>

```typescript
export declare class AppCheck 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.app-check.appcheck.md#appcheckapp) |  | App |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [createToken(appId, options)](./firebase-admin.app-check.appcheck.md#appcheckcreatetoken) |  | Creates a new [AppCheckToken](./firebase-admin.app-check.appchecktoken.md#appchecktoken_interface) that can be sent back to a client. |
|  [verifyToken(appCheckToken)](./firebase-admin.app-check.appcheck.md#appcheckverifytoken) |  | Verifies a Firebase App Check token (JWT). If the token is valid, the promise is fulfilled with the token's decoded claims; otherwise, the promise is rejected. |

## AppCheck.app

<b>Signature:</b>

```typescript
readonly app: App;
```

## AppCheck.createToken()

Creates a new [AppCheckToken](./firebase-admin.app-check.appchecktoken.md#appchecktoken_interface) that can be sent back to a client.

<b>Signature:</b>

```typescript
createToken(appId: string, options?: AppCheckTokenOptions): Promise<AppCheckToken>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  appId | string | The app ID to use as the JWT app\_id. |
|  options | [AppCheckTokenOptions](./firebase-admin.app-check.appchecktokenoptions.md#appchecktokenoptions_interface) | Optional options object when creating a new App Check Token. |

<b>Returns:</b>

Promise&lt;[AppCheckToken](./firebase-admin.app-check.appchecktoken.md#appchecktoken_interface)<!-- -->&gt;

A promise that fulfills with a `AppCheckToken`<!-- -->.

## AppCheck.verifyToken()

Verifies a Firebase App Check token (JWT). If the token is valid, the promise is fulfilled with the token's decoded claims; otherwise, the promise is rejected.

<b>Signature:</b>

```typescript
verifyToken(appCheckToken: string): Promise<VerifyAppCheckTokenResponse>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  appCheckToken | string | The App Check token to verify. |

<b>Returns:</b>

Promise&lt;[VerifyAppCheckTokenResponse](./firebase-admin.app-check.verifyappchecktokenresponse.md#verifyappchecktokenresponse_interface)<!-- -->&gt;

A promise fulfilled with the token's decoded claims if the App Check token is valid; otherwise, a rejected promise.

{% endblock body %}

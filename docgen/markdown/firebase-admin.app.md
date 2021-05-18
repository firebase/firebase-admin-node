{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/app module{% endblock title %}
{% block body %}
Firebase App and SDK initialization.

## Functions

|  Function | Description |
|  --- | --- |
|  [applicationDefault(httpAgent)](./firebase-admin.app.md#applicationdefault) | Returns a credential created from the [Google Application Default Credentials](https://developers.google.com/identity/protocols/application-default-credentials) that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.<!-- -->Google Application Default Credentials are available on any Google infrastructure, such as Google App Engine and Google Compute Engine.<!-- -->See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details. |
|  [cert(serviceAccountPathOrObject, httpAgent)](./firebase-admin.app.md#cert) | Returns a credential created from the provided service account that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.<!-- -->See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details. |
|  [deleteApp(app)](./firebase-admin.app.md#deleteapp) | Renders this given <code>App</code> unusable and frees the resources of all associated services (though it does \*not\* clean up any backend resources). When running the SDK locally, this method must be called to ensure graceful termination of the process. |
|  [getApp(name)](./firebase-admin.app.md#getapp) |  |
|  [getApps()](./firebase-admin.app.md#getapps) |  |
|  [initializeApp(options, name)](./firebase-admin.app.md#initializeapp) |  |
|  [refreshToken(refreshTokenPathOrObject, httpAgent)](./firebase-admin.app.md#refreshtoken) | Returns a credential created from the provided refresh token that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.<!-- -->See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [App](./firebase-admin.app.app.md#app_interface) | A Firebase app holds the initialization information for a collection of services. |
|  [AppOptions](./firebase-admin.app.appoptions.md#appoptions_interface) | Available options to pass to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->. |
|  [Credential](./firebase-admin.app.credential.md#credential_interface) | Interface that provides Google OAuth2 access tokens used to authenticate with Firebase services.<!-- -->In most cases, you will not need to implement this yourself and can instead use the default implementations provided by . |
|  [FirebaseArrayIndexError](./firebase-admin.app.firebasearrayindexerror.md#firebasearrayindexerror_interface) | Composite type which includes both a <code>FirebaseError</code> object and an index which can be used to get the errored item. |
|  [FirebaseError](./firebase-admin.app.firebaseerror.md#firebaseerror_interface) | <code>FirebaseError</code> is a subclass of the standard JavaScript <code>Error</code> object. In addition to a message string and stack trace, it contains a string code. |
|  [GoogleOAuthAccessToken](./firebase-admin.app.googleoauthaccesstoken.md#googleoauthaccesstoken_interface) | Interface for Google OAuth 2.0 access tokens. |
|  [ServiceAccount](./firebase-admin.app.serviceaccount.md#serviceaccount_interface) |  |

## Variables

|  Variable | Description |
|  --- | --- |
|  [SDK\_VERSION](./firebase-admin.app.md#sdk_version) |  |

## applicationDefault()

Returns a credential created from the [Google Application Default Credentials](https://developers.google.com/identity/protocols/application-default-credentials) that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.

Google Application Default Credentials are available on any Google infrastructure, such as Google App Engine and Google Compute Engine.

See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details.

<b>Signature:</b>

```typescript
export declare function applicationDefault(httpAgent?: Agent): Credential;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  httpAgent | Agent | Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent) to be used when retrieving access tokens from Google token servers. |

<b>Returns:</b>

[Credential](./firebase-admin.app.credential.md#credential_interface)

A credential authenticated via Google Application Default Credentials that can be used to initialize an app.

### Example


```javascript
initializeApp({
  credential: applicationDefault(),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

## cert()

Returns a credential created from the provided service account that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.

See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details.

<b>Signature:</b>

```typescript
export declare function cert(serviceAccountPathOrObject: string | ServiceAccount, httpAgent?: Agent): Credential;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  serviceAccountPathOrObject | string \| [ServiceAccount](./firebase-admin.app.serviceaccount.md#serviceaccount_interface) | The path to a service account key JSON file or an object representing a service account key. |
|  httpAgent | Agent | Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent) to be used when retrieving access tokens from Google token servers. |

<b>Returns:</b>

[Credential](./firebase-admin.app.credential.md#credential_interface)

A credential authenticated via the provided service account that can be used to initialize an app.

### Example 1


```javascript
// Providing a path to a service account key JSON file
const serviceAccount = require("path/to/serviceAccountKey.json");
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

### Example 2


```javascript
// Providing a service account object inline
initializeApp({
  credential: cert({
    projectId: "<PROJECT_ID>",
    clientEmail: "foo@<PROJECT_ID>.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----<KEY>-----END PRIVATE KEY-----\n"
  }),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

## deleteApp()

Renders this given `App` unusable and frees the resources of all associated services (though it does \*not\* clean up any backend resources). When running the SDK locally, this method must be called to ensure graceful termination of the process.

<b>Signature:</b>

```typescript
export declare function deleteApp(app: App): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.app.md#app_interface) |  |

<b>Returns:</b>

Promise&lt;void&gt;

### Example


```javascript
deleteApp(app)
  .then(function() {
    console.log("App deleted successfully");
  })
  .catch(function(error) {
    console.log("Error deleting app:", error);
  });

```

## getApp()

<b>Signature:</b>

```typescript
export declare function getApp(name?: string): App;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | string |  |

<b>Returns:</b>

[App](./firebase-admin.app.app.md#app_interface)

## getApps()

<b>Signature:</b>

```typescript
export declare function getApps(): App[];
```
<b>Returns:</b>

[App](./firebase-admin.app.app.md#app_interface)<!-- -->\[\]

## initializeApp()

<b>Signature:</b>

```typescript
export declare function initializeApp(options?: AppOptions, name?: string): App;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [AppOptions](./firebase-admin.app.appoptions.md#appoptions_interface) |  |
|  name | string |  |

<b>Returns:</b>

[App](./firebase-admin.app.app.md#app_interface)

## refreshToken()

Returns a credential created from the provided refresh token that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.

See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details.

<b>Signature:</b>

```typescript
export declare function refreshToken(refreshTokenPathOrObject: string | object, httpAgent?: Agent): Credential;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  refreshTokenPathOrObject | string \| object | The path to a Google OAuth2 refresh token JSON file or an object representing a Google OAuth2 refresh token. |
|  httpAgent | Agent | Optional [HTTP Agent](https://nodejs.org/api/http.html#http_class_http_agent) to be used when retrieving access tokens from Google token servers. |

<b>Returns:</b>

[Credential](./firebase-admin.app.credential.md#credential_interface)

A credential authenticated via the provided service account that can be used to initialize an app.

### Example


```javascript
// Providing a path to a refresh token JSON file
const refreshToken = require("path/to/refreshToken.json");
initializeApp({
  credential: refreshToken(refreshToken),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

## SDK\_VERSION

<b>Signature:</b>

```typescript
SDK_VERSION: string
```
{% endblock body %}
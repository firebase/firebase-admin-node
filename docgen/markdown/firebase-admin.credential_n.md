{% extends "_internal/templates/reference.html" %}
{% block title %}credential namespace{% endblock title %}
{% block body %}
<b>Signature:</b>

```typescript
export declare namespace credential 
```

## Variables

|  Variable | Description |
|  --- | --- |
|  [applicationDefault](./firebase-admin.credential_n.md#credentialapplicationdefault) | Returns a credential created from the [Google Application Default Credentials](https://developers.google.com/identity/protocols/application-default-credentials) that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.<!-- -->Google Application Default Credentials are available on any Google infrastructure, such as Google App Engine and Google Compute Engine.<!-- -->See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details. |
|  [cert](./firebase-admin.credential_n.md#credentialcert) | Returns a credential created from the provided service account that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.<!-- -->See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details. |
|  [refreshToken](./firebase-admin.credential_n.md#credentialrefreshtoken) | Returns a credential created from the provided refresh token that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.<!-- -->See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Credential](./firebase-admin.credential_n.md#credentialcredential) | Interface that provides Google OAuth2 access tokens used to authenticate with Firebase services.<!-- -->In most cases, you will not need to implement this yourself and can instead use the default implementations provided by . |

## credential.applicationDefault

Returns a credential created from the [Google Application Default Credentials](https://developers.google.com/identity/protocols/application-default-credentials) that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.

Google Application Default Credentials are available on any Google infrastructure, such as Google App Engine and Google Compute Engine.

See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details.

<b>Signature:</b>

```typescript
applicationDefault: typeof applicationDefaultFn
```

### Example


```javascript
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

## credential.cert

Returns a credential created from the provided service account that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.

See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details.

<b>Signature:</b>

```typescript
cert: typeof certFn
```

### Example 1


```javascript
// Providing a path to a service account key JSON file
var serviceAccount = require("path/to/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

### Example 2


```javascript
// Providing a service account object inline
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "<PROJECT_ID>",
    clientEmail: "foo@<PROJECT_ID>.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----<KEY>-----END PRIVATE KEY-----\n"
  }),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

## credential.refreshToken

Returns a credential created from the provided refresh token that grants admin access to Firebase services. This credential can be used in the call to [initializeApp()](./firebase-admin.app.md#initializeapp)<!-- -->.

See [Initialize the SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) for more details.

<b>Signature:</b>

```typescript
refreshToken: typeof refreshTokenFn
```

### Example


```javascript
// Providing a path to a refresh token JSON file
var refreshToken = require("path/to/refreshToken.json");
admin.initializeApp({
  credential: admin.credential.refreshToken(refreshToken),
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
});

```

## credential.Credential

Interface that provides Google OAuth2 access tokens used to authenticate with Firebase services.

In most cases, you will not need to implement this yourself and can instead use the default implementations provided by .

<b>Signature:</b>

```typescript
type Credential = TCredential;
```
{% endblock body %}

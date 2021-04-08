
## Functions

|  Function | Description |
|  --- | --- |
|  [app(name)](./firebase-admin.md#app) |  |
|  [auth(app)](./firebase-admin.md#auth) | Gets the  service for the default app or a given app.<code>admin.auth()</code> can be called with no arguments to access the default app's  service or as <code>admin.auth(app)</code> to access the  service associated with a specific app. |
|  [database(app)](./firebase-admin.md#database) | Gets the  service for the default app or a given app.<code>admin.database()</code> can be called with no arguments to access the default app's  service or as <code>admin.database(app)</code> to access the  service associated with a specific app.<code>admin.database</code> is also a namespace that can be used to access global constants and methods associated with the <code>Database</code> service. |
|  [firestore(app)](./firebase-admin.md#firestore) |  |
|  [initializeApp(options, name)](./firebase-admin.md#initializeapp) |  |
|  [instanceId(app)](./firebase-admin.md#instanceid) | Gets the  service for the default app or a given app.<code>admin.instanceId()</code> can be called with no arguments to access the default app's  service or as <code>admin.instanceId(app)</code> to access the  service associated with a specific app. |
|  [machineLearning(app)](./firebase-admin.md#machinelearning) | Gets the  service for the default app or a given app.<code>admin.machineLearning()</code> can be called with no arguments to access the default app's  service or as <code>admin.machineLearning(app)</code> to access the  service associated with a specific app. |
|  [messaging(app)](./firebase-admin.md#messaging) | Gets the  service for the default app or a given app.<code>admin.messaging()</code> can be called with no arguments to access the default app's  service or as <code>admin.messaging(app)</code> to access the  service associated with a specific app. |
|  [projectManagement(app)](./firebase-admin.md#projectmanagement) | Gets the  service for the default app or a given app.<code>admin.projectManagement()</code> can be called with no arguments to access the default app's  service, or as <code>admin.projectManagement(app)</code> to access the  service associated with a specific app. |
|  [remoteConfig(app)](./firebase-admin.md#remoteconfig) | Gets the  service for the default app or a given app.<code>admin.remoteConfig()</code> can be called with no arguments to access the default app's  service or as <code>admin.remoteConfig(app)</code> to access the  service associated with a specific app. |
|  [securityRules(app)](./firebase-admin.md#securityrules) | Gets the  service for the default app or a given app.<code>admin.securityRules()</code> can be called with no arguments to access the default app's  service, or as <code>admin.securityRules(app)</code> to access the  service associated with a specific app. |
|  [storage(app)](./firebase-admin.md#storage) | Gets the  service for the default app or a given app.<code>admin.storage()</code> can be called with no arguments to access the default app's  service or as <code>admin.storage(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [App](./firebase-admin.app.md#app_interface) | A Firebase app holds the initialization information for a collection of services.<!-- -->Do not call this constructor directly. Instead, use  to create an app. |
|  [AppOptions](./firebase-admin.appoptions.md#appoptions_interface) | Available options to pass to \[<code>initializeApp()</code>\](admin\#.initializeApp). |
|  [FirebaseArrayIndexError](./firebase-admin.firebasearrayindexerror.md#firebasearrayindexerror_interface) | Composite type which includes both a <code>FirebaseError</code> object and an index which can be used to get the errored item. |
|  [FirebaseError](./firebase-admin.firebaseerror.md#firebaseerror_interface) | <code>FirebaseError</code> is a subclass of the standard JavaScript <code>Error</code> object. In addition to a message string and stack trace, it contains a string code. |
|  [GoogleOAuthAccessToken](./firebase-admin.googleoauthaccesstoken.md#googleoauthaccesstoken_interface) | Interface for Google OAuth 2.0 access tokens. |
|  [ServiceAccount](./firebase-admin.serviceaccount.md#serviceaccount_interface) |  |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [app](./firebase-admin.md#app_namespace) |  |
|  [auth](./firebase-admin.md#auth_namespace) |  |
|  [credential](./firebase-admin.md#credential_namespace) |  |
|  [database](./firebase-admin.md#database_namespace) |  |
|  [firestore](./firebase-admin.md#firestore_namespace) |  |
|  [instanceId](./firebase-admin.md#instanceid_namespace) |  |
|  [machineLearning](./firebase-admin.md#machinelearning_namespace) |  |
|  [messaging](./firebase-admin.md#messaging_namespace) |  |
|  [projectManagement](./firebase-admin.md#projectmanagement_namespace) |  |
|  [remoteConfig](./firebase-admin.md#remoteconfig_namespace) |  |
|  [securityRules](./firebase-admin.md#securityrules_namespace) |  |
|  [storage](./firebase-admin.md#storage_namespace) |  |

## Variables

|  Variable | Description |
|  --- | --- |
|  [apps](./firebase-admin.md#apps) |  |
|  [SDK\_VERSION](./firebase-admin.md#sdk_version) |  |

## app()

<b>Signature:</b>

```typescript
export declare function app(name?: string): app.App;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | string |  |

<b>Returns:</b>

[app.App](./firebase-admin.app.md#appapp_interface)

## auth()

Gets the  service for the default app or a given app.

`admin.auth()` can be called with no arguments to access the default app's  service or as `admin.auth(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function auth(app?: App): auth.Auth;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) |  |

<b>Returns:</b>

[auth.Auth](./firebase-admin.md#authauth)

### Example 1


```javascript
// Get the Auth service for the default app
var defaultAuth = admin.auth();

```

### Example 2


```javascript
// Get the Auth service for a given app
var otherAuth = admin.auth(otherApp);

```

## database()

Gets the  service for the default app or a given app.

`admin.database()` can be called with no arguments to access the default app's  service or as `admin.database(app)` to access the  service associated with a specific app.

`admin.database` is also a namespace that can be used to access global constants and methods associated with the `Database` service.

<b>Signature:</b>

```typescript
export declare function database(app?: App): database.Database;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) |  |

<b>Returns:</b>

[database.Database](./firebase-admin.md#databasedatabase)

### Example 1


```javascript
// Get the Database service for the default app
var defaultDatabase = admin.database();

```

### Example 2


```javascript
// Get the Database service for a specific app
var otherDatabase = admin.database(app);

```

## firestore()

<b>Signature:</b>

```typescript
export declare function firestore(app?: App): _firestore.Firestore;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) |  |

<b>Returns:</b>

\_firestore.Firestore

## initializeApp()

<b>Signature:</b>

```typescript
export declare function initializeApp(options?: AppOptions, name?: string): app.App;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [AppOptions](./firebase-admin.appoptions.md#appoptions_interface) |  |
|  name | string |  |

<b>Returns:</b>

[app.App](./firebase-admin.app.md#appapp_interface)

## instanceId()

Gets the  service for the default app or a given app.

`admin.instanceId()` can be called with no arguments to access the default app's  service or as `admin.instanceId(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function instanceId(app?: App): instanceId.InstanceId;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) | Optional app whose <code>InstanceId</code> service to return. If not provided, the default <code>InstanceId</code> service will be returned. The default <code>InstanceId</code> service if no app is provided or the <code>InstanceId</code> service associated with the provided app. |

<b>Returns:</b>

[instanceId.InstanceId](./firebase-admin.md#instanceidinstanceid)

### Example 1


```javascript
// Get the Instance ID service for the default app
var defaultInstanceId = admin.instanceId();

```

### Example 2


```javascript
// Get the Instance ID service for a given app
var otherInstanceId = admin.instanceId(otherApp);

```

## machineLearning()

Gets the  service for the default app or a given app.

`admin.machineLearning()` can be called with no arguments to access the default app's  service or as `admin.machineLearning(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function machineLearning(app?: App): machineLearning.MachineLearning;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) | Optional app whose <code>MachineLearning</code> service to return. If not provided, the default <code>MachineLearning</code> service will be returned. The default <code>MachineLearning</code> service if no app is provided or the <code>MachineLearning</code> service associated with the provided app. |

<b>Returns:</b>

[machineLearning.MachineLearning](./firebase-admin.md#machinelearningmachinelearning)

### Example 1


```javascript
// Get the MachineLearning service for the default app
var defaultMachineLearning = admin.machineLearning();

```

### Example 2


```javascript
// Get the MachineLearning service for a given app
var otherMachineLearning = admin.machineLearning(otherApp);

```

## messaging()

Gets the  service for the default app or a given app.

`admin.messaging()` can be called with no arguments to access the default app's  service or as `admin.messaging(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function messaging(app?: App): messaging.Messaging;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) | Optional app whose <code>Messaging</code> service to return. If not provided, the default <code>Messaging</code> service will be returned. The default <code>Messaging</code> service if no app is provided or the <code>Messaging</code> service associated with the provided app. |

<b>Returns:</b>

[messaging.Messaging](./firebase-admin.md#messagingmessaging)

### Example 1


```javascript
// Get the Messaging service for the default app
var defaultMessaging = admin.messaging();

```

### Example 2


```javascript
// Get the Messaging service for a given app
var otherMessaging = admin.messaging(otherApp);

```

## projectManagement()

Gets the  service for the default app or a given app.

`admin.projectManagement()` can be called with no arguments to access the default app's  service, or as `admin.projectManagement(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function projectManagement(app?: App): projectManagement.ProjectManagement;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) | Optional app whose <code>ProjectManagement</code> service to return. If not provided, the default <code>ProjectManagement</code> service will be returned. \*  The default <code>ProjectManagement</code> service if no app is provided or the <code>ProjectManagement</code> service associated with the provided app. |

<b>Returns:</b>

[projectManagement.ProjectManagement](./firebase-admin.md#projectmanagementprojectmanagement)

### Example 1


```javascript
// Get the ProjectManagement service for the default app
var defaultProjectManagement = admin.projectManagement();

```

### Example 2


```javascript
// Get the ProjectManagement service for a given app
var otherProjectManagement = admin.projectManagement(otherApp);

```

## remoteConfig()

Gets the  service for the default app or a given app.

`admin.remoteConfig()` can be called with no arguments to access the default app's  service or as `admin.remoteConfig(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function remoteConfig(app?: App): remoteConfig.RemoteConfig;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) | Optional app for which to return the <code>RemoteConfig</code> service. If not provided, the default <code>RemoteConfig</code> service is returned. The default <code>RemoteConfig</code> service if no app is provided, or the <code>RemoteConfig</code> service associated with the provided app. |

<b>Returns:</b>

[remoteConfig.RemoteConfig](./firebase-admin.md#remoteconfigremoteconfig)

### Example 1


```javascript
// Get the `RemoteConfig` service for the default app
var defaultRemoteConfig = admin.remoteConfig();

```

### Example 2


```javascript
// Get the `RemoteConfig` service for a given app
var otherRemoteConfig = admin.remoteConfig(otherApp);

```

## securityRules()

Gets the  service for the default app or a given app.

`admin.securityRules()` can be called with no arguments to access the default app's  service, or as `admin.securityRules(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function securityRules(app?: App): securityRules.SecurityRules;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) | Optional app to return the <code>SecurityRules</code> service for. If not provided, the default <code>SecurityRules</code> service is returned.  The default <code>SecurityRules</code> service if no app is provided, or the <code>SecurityRules</code> service associated with the provided app. |

<b>Returns:</b>

[securityRules.SecurityRules](./firebase-admin.md#securityrulessecurityrules)

### Example 1


```javascript
// Get the SecurityRules service for the default app
var defaultSecurityRules = admin.securityRules();

```

### Example 2

\`\`\`<!-- -->javascript // Get the SecurityRules service for a given app var otherSecurityRules = admin.securityRules(otherApp); \`\`\`

## storage()

Gets the  service for the default app or a given app.

`admin.storage()` can be called with no arguments to access the default app's  service or as `admin.storage(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function storage(app?: App): storage.Storage;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin.app.md#app_interface) |  |

<b>Returns:</b>

[storage.Storage](./firebase-admin.md#storagestorage)

### Example 1


```javascript
// Get the Storage service for the default app
var defaultStorage = admin.storage();

```

### Example 2


```javascript
// Get the Storage service for a given app
var otherStorage = admin.storage(otherApp);

```

## apps

<b>Signature:</b>

```typescript
apps: (app.App | null)[]
```

## SDK\_VERSION

<b>Signature:</b>

```typescript
SDK_VERSION: string
```

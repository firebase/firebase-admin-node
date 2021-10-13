{% extends "_internal/templates/reference.html" %}
{% block title %}app.App interface{% endblock title %}
{% block body %}
A Firebase app holds the initialization information for a collection of services.

Do not call this constructor directly. Instead, use [initializeApp()](./firebase-admin.app.md#initializeapp) to create an app.

<b>Signature:</b>

```typescript
interface App extends AppCore 
```
<b>Extends:</b> AppCore

## Methods

|  Method | Description |
|  --- | --- |
|  [appCheck()](./firebase-admin.app_n.app.md#appappappcheck) |  |
|  [auth()](./firebase-admin.app_n.app.md#appappauth) |  |
|  [database(url)](./firebase-admin.app_n.app.md#appappdatabase) |  |
|  [delete()](./firebase-admin.app_n.app.md#appappdelete) | Renders this local <code>FirebaseApp</code> unusable and frees the resources of all associated services (though it does \*not\* clean up any backend resources). When running the SDK locally, this method must be called to ensure graceful termination of the process. |
|  [firestore()](./firebase-admin.app_n.app.md#appappfirestore) |  |
|  [installations()](./firebase-admin.app_n.app.md#appappinstallations) |  |
|  [instanceId()](./firebase-admin.app_n.app.md#appappinstanceid) |  |
|  [machineLearning()](./firebase-admin.app_n.app.md#appappmachinelearning) |  |
|  [messaging()](./firebase-admin.app_n.app.md#appappmessaging) |  |
|  [projectManagement()](./firebase-admin.app_n.app.md#appappprojectmanagement) |  |
|  [remoteConfig()](./firebase-admin.app_n.app.md#appappremoteconfig) |  |
|  [securityRules()](./firebase-admin.app_n.app.md#appappsecurityrules) |  |
|  [storage()](./firebase-admin.app_n.app.md#appappstorage) |  |

## app.App.appCheck()

<b>Signature:</b>

```typescript
appCheck(): appCheck.AppCheck;
```
<b>Returns:</b>

[appCheck.AppCheck](./firebase-admin.appcheck_n.md#appcheckappcheck)

## app.App.auth()

<b>Signature:</b>

```typescript
auth(): auth.Auth;
```
<b>Returns:</b>

[auth.Auth](./firebase-admin.auth_n.md#authauth)

## app.App.database()

<b>Signature:</b>

```typescript
database(url?: string): database.Database;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  url | string |  |

<b>Returns:</b>

[database.Database](./firebase-admin.database_n.md#databasedatabase)

## app.App.delete()

Renders this local `FirebaseApp` unusable and frees the resources of all associated services (though it does \*not\* clean up any backend resources). When running the SDK locally, this method must be called to ensure graceful termination of the process.

<b>Signature:</b>

```typescript
delete(): Promise<void>;
```
<b>Returns:</b>

Promise&lt;void&gt;

### Example


```javascript
app.delete()
  .then(function() {
    console.log("App deleted successfully");
  })
  .catch(function(error) {
    console.log("Error deleting app:", error);
  });

```

## app.App.firestore()

<b>Signature:</b>

```typescript
firestore(): firestore.Firestore;
```
<b>Returns:</b>

firestore.Firestore

## app.App.installations()

<b>Signature:</b>

```typescript
installations(): installations.Installations;
```
<b>Returns:</b>

[installations.Installations](./firebase-admin.installations_n.md#installationsinstallations)

## app.App.instanceId()

> Warning: This API is now obsolete.
> 
> Use [Installations](./firebase-admin.installations.installations.md#installations_class) instead.
> 

<b>Signature:</b>

```typescript
instanceId(): instanceId.InstanceId;
```
<b>Returns:</b>

[instanceId.InstanceId](./firebase-admin.instanceid_n.md#instanceidinstanceid)

## app.App.machineLearning()

<b>Signature:</b>

```typescript
machineLearning(): machineLearning.MachineLearning;
```
<b>Returns:</b>

[machineLearning.MachineLearning](./firebase-admin.machinelearning_n.md#machinelearningmachinelearning)

## app.App.messaging()

<b>Signature:</b>

```typescript
messaging(): messaging.Messaging;
```
<b>Returns:</b>

[messaging.Messaging](./firebase-admin.messaging_n.md#messagingmessaging)

## app.App.projectManagement()

<b>Signature:</b>

```typescript
projectManagement(): projectManagement.ProjectManagement;
```
<b>Returns:</b>

[projectManagement.ProjectManagement](./firebase-admin.projectmanagement_n.md#projectmanagementprojectmanagement)

## app.App.remoteConfig()

<b>Signature:</b>

```typescript
remoteConfig(): remoteConfig.RemoteConfig;
```
<b>Returns:</b>

[remoteConfig.RemoteConfig](./firebase-admin.remoteconfig_n.md#remoteconfigremoteconfig)

## app.App.securityRules()

<b>Signature:</b>

```typescript
securityRules(): securityRules.SecurityRules;
```
<b>Returns:</b>

[securityRules.SecurityRules](./firebase-admin.securityrules_n.md#securityrulessecurityrules)

## app.App.storage()

<b>Signature:</b>

```typescript
storage(): storage.Storage;
```
<b>Returns:</b>

[storage.Storage](./firebase-admin.storage_n.md#storagestorage)

{% endblock body %}

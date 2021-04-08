
## Classes

|  Class | Description |
|  --- | --- |
|  [RemoteConfig](./firebase-admin.remote-config.remoteconfig.md#remoteconfig_class) | The Firebase <code>RemoteConfig</code> service interface. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getRemoteConfig(app)](./firebase-admin.remote-config.md#getremoteconfig) | Gets the  service for the default app or a given app.<code>getRemoteConfig()</code> can be called with no arguments to access the default app's  service or as <code>getRemoteConfig(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ExplicitParameterValue](./firebase-admin.remote-config.explicitparametervalue.md#explicitparametervalue_interface) | Interface representing an explicit parameter value. |
|  [InAppDefaultValue](./firebase-admin.remote-config.inappdefaultvalue.md#inappdefaultvalue_interface) | Interface representing an in-app-default value. |
|  [ListVersionsOptions](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptions_interface) | Interface representing options for Remote Config list versions operation. |
|  [ListVersionsResult](./firebase-admin.remote-config.listversionsresult.md#listversionsresult_interface) | Interface representing a list of Remote Config template versions. |
|  [RemoteConfigCondition](./firebase-admin.remote-config.remoteconfigcondition.md#remoteconfigcondition_interface) | Interface representing a Remote Config condition. A condition targets a specific group of users. A list of these conditions make up part of a Remote Config template. |
|  [RemoteConfigParameter](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparameter_interface) | Interface representing a Remote Config parameter. At minimum, a <code>defaultValue</code> or a <code>conditionalValues</code> entry must be present for the parameter to have any effect. |
|  [RemoteConfigParameterGroup](./firebase-admin.remote-config.remoteconfigparametergroup.md#remoteconfigparametergroup_interface) | Interface representing a Remote Config parameter group. Grouping parameters is only for management purposes and does not affect client-side fetching of parameter values. |
|  [RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface) | Interface representing a Remote Config template. |
|  [RemoteConfigUser](./firebase-admin.remote-config.remoteconfiguser.md#remoteconfiguser_interface) | Interface representing a Remote Config user. |
|  [Version](./firebase-admin.remote-config.version.md#version_interface) | Interface representing a Remote Config template version. Output only, except for the version description. Contains metadata about a particular version of the Remote Config template. All fields are set at the time the specified Remote Config template is published. A version's description field may be specified in <code>publishTemplate</code> calls. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [RemoteConfigParameterValue](./firebase-admin.remote-config.md#remoteconfigparametervalue) | Type representing a Remote Config parameter value. A <code>RemoteConfigParameterValue</code> could be either an <code>ExplicitParameterValue</code> or an <code>InAppDefaultValue</code>. |
|  [TagColor](./firebase-admin.remote-config.md#tagcolor) | Colors that are associated with conditions for display purposes. |

## getRemoteConfig()

Gets the  service for the default app or a given app.

`getRemoteConfig()` can be called with no arguments to access the default app's  service or as `getRemoteConfig(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getRemoteConfig(app?: App): RemoteConfig;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app for which to return the <code>RemoteConfig</code> service. If not provided, the default <code>RemoteConfig</code> service is returned. The default <code>RemoteConfig</code> service if no app is provided, or the <code>RemoteConfig</code> service associated with the provided app. |

<b>Returns:</b>

[RemoteConfig](./firebase-admin.remote-config.remoteconfig.md#remoteconfig_class)

### Example 1


```javascript
// Get the `RemoteConfig` service for the default app
const defaultRemoteConfig = getRemoteConfig();

```

### Example 2


```javascript
// Get the `RemoteConfig` service for a given app
const otherRemoteConfig = getRemoteConfig(otherApp);

```

## RemoteConfigParameterValue

Type representing a Remote Config parameter value. A `RemoteConfigParameterValue` could be either an `ExplicitParameterValue` or an `InAppDefaultValue`<!-- -->.

<b>Signature:</b>

```typescript
export declare type RemoteConfigParameterValue = ExplicitParameterValue | InAppDefaultValue;
```

## TagColor

Colors that are associated with conditions for display purposes.

<b>Signature:</b>

```typescript
export declare type TagColor = 'BLUE' | 'BROWN' | 'CYAN' | 'DEEP_ORANGE' | 'GREEN' | 'INDIGO' | 'LIME' | 'ORANGE' | 'PINK' | 'PURPLE' | 'TEAL';
```

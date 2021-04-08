Interface representing a Remote Config template.

<b>Signature:</b>

```typescript
export interface RemoteConfigTemplate 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [conditions](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplateconditions) | [RemoteConfigCondition](./firebase-admin.remote-config.remoteconfigcondition.md#remoteconfigcondition_interface)<!-- -->\[\] | A list of conditions in descending order by priority. |
|  [etag](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplateetag) | string | ETag of the current Remote Config template (readonly). |
|  [parameterGroups](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplateparametergroups) | { \[key: string\]: [RemoteConfigParameterGroup](./firebase-admin.remote-config.remoteconfigparametergroup.md#remoteconfigparametergroup_interface)<!-- -->; } | Map of parameter group names to their parameter group objects. A group's name is mutable but must be unique among groups in the Remote Config template. The name is limited to 256 characters and intended to be human-readable. Any Unicode characters are allowed. |
|  [parameters](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplateparameters) | { \[key: string\]: [RemoteConfigParameter](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparameter_interface)<!-- -->; } | Map of parameter keys to their optional default values and optional conditional values. |
|  [version](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplateversion) | [Version](./firebase-admin.remote-config.version.md#version_interface) | Version information for the current Remote Config template. |

## RemoteConfigTemplate.conditions

A list of conditions in descending order by priority.

<b>Signature:</b>

```typescript
conditions: RemoteConfigCondition[];
```

## RemoteConfigTemplate.etag

ETag of the current Remote Config template (readonly).

<b>Signature:</b>

```typescript
readonly etag: string;
```

## RemoteConfigTemplate.parameterGroups

Map of parameter group names to their parameter group objects. A group's name is mutable but must be unique among groups in the Remote Config template. The name is limited to 256 characters and intended to be human-readable. Any Unicode characters are allowed.

<b>Signature:</b>

```typescript
parameterGroups: {
        [key: string]: RemoteConfigParameterGroup;
    };
```

## RemoteConfigTemplate.parameters

Map of parameter keys to their optional default values and optional conditional values.

<b>Signature:</b>

```typescript
parameters: {
        [key: string]: RemoteConfigParameter;
    };
```

## RemoteConfigTemplate.version

Version information for the current Remote Config template.

<b>Signature:</b>

```typescript
version?: Version;
```

{% extends "_internal/templates/reference.html" %}
{% block title %}RemoteConfigParameterGroup interface{% endblock title %}
{% block body %}
Interface representing a Remote Config parameter group. Grouping parameters is only for management purposes and does not affect client-side fetching of parameter values.

<b>Signature:</b>

```typescript
export interface RemoteConfigParameterGroup 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [description](./firebase-admin.remote-config.remoteconfigparametergroup.md#remoteconfigparametergroupdescription) | string | A description for the group. Its length must be less than or equal to 256 characters. A description may contain any Unicode characters. |
|  [parameters](./firebase-admin.remote-config.remoteconfigparametergroup.md#remoteconfigparametergroupparameters) | { \[key: string\]: [RemoteConfigParameter](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparameter_interface)<!-- -->; } | Map of parameter keys to their optional default values and optional conditional values for parameters that belong to this group. A parameter only appears once per Remote Config template. An ungrouped parameter appears at the top level, whereas a parameter organized within a group appears within its group's map of parameters. |

## RemoteConfigParameterGroup.description

A description for the group. Its length must be less than or equal to 256 characters. A description may contain any Unicode characters.

<b>Signature:</b>

```typescript
description?: string;
```

## RemoteConfigParameterGroup.parameters

Map of parameter keys to their optional default values and optional conditional values for parameters that belong to this group. A parameter only appears once per Remote Config template. An ungrouped parameter appears at the top level, whereas a parameter organized within a group appears within its group's map of parameters.

<b>Signature:</b>

```typescript
parameters: {
        [key: string]: RemoteConfigParameter;
    };
```
{% endblock body %}

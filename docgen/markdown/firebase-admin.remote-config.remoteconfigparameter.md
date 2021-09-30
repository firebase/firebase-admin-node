{% extends "_internal/templates/reference.html" %}
{% block title %}RemoteConfigParameter interface{% endblock title %}
{% block body %}
Interface representing a Remote Config parameter. At minimum, a `defaultValue` or a `conditionalValues` entry must be present for the parameter to have any effect.

<b>Signature:</b>

```typescript
export interface RemoteConfigParameter 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [conditionalValues](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparameterconditionalvalues) | { \[key: string\]: [RemoteConfigParameterValue](./firebase-admin.remote-config.md#remoteconfigparametervalue)<!-- -->; } | A <code>(condition name, value)</code> map. The condition name of the highest priority (the one listed first in the Remote Config template's conditions list) determines the value of this parameter. |
|  [defaultValue](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparameterdefaultvalue) | [RemoteConfigParameterValue](./firebase-admin.remote-config.md#remoteconfigparametervalue) | The value to set the parameter to, when none of the named conditions evaluate to <code>true</code>. |
|  [description](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparameterdescription) | string | A description for this parameter. Should not be over 100 characters and may contain any Unicode characters. |
|  [valueType](./firebase-admin.remote-config.remoteconfigparameter.md#remoteconfigparametervaluetype) | [ParameterValueType](./firebase-admin.remote-config.md#parametervaluetype) | The data type for all values of this parameter in the current version of the template. Defaults to <code>ParameterValueType.STRING</code> if unspecified. |

## RemoteConfigParameter.conditionalValues

A `(condition name, value)` map. The condition name of the highest priority (the one listed first in the Remote Config template's conditions list) determines the value of this parameter.

<b>Signature:</b>

```typescript
conditionalValues?: {
        [key: string]: RemoteConfigParameterValue;
    };
```

## RemoteConfigParameter.defaultValue

The value to set the parameter to, when none of the named conditions evaluate to `true`<!-- -->.

<b>Signature:</b>

```typescript
defaultValue?: RemoteConfigParameterValue;
```

## RemoteConfigParameter.description

A description for this parameter. Should not be over 100 characters and may contain any Unicode characters.

<b>Signature:</b>

```typescript
description?: string;
```

## RemoteConfigParameter.valueType

The data type for all values of this parameter in the current version of the template. Defaults to `ParameterValueType.STRING` if unspecified.

<b>Signature:</b>

```typescript
valueType?: ParameterValueType;
```
{% endblock body %}

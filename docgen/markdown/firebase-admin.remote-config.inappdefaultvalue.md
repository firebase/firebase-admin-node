{% extends "_internal/templates/reference.html" %}
{% block title %}InAppDefaultValue interface{% endblock title %}
{% block body %}
Interface representing an in-app-default value.

<b>Signature:</b>

```typescript
export interface InAppDefaultValue 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [useInAppDefault](./firebase-admin.remote-config.inappdefaultvalue.md#inappdefaultvalueuseinappdefault) | boolean | If <code>true</code>, the parameter is omitted from the parameter values returned to a client. |

## InAppDefaultValue.useInAppDefault

If `true`<!-- -->, the parameter is omitted from the parameter values returned to a client.

<b>Signature:</b>

```typescript
useInAppDefault: boolean;
```
{% endblock body %}

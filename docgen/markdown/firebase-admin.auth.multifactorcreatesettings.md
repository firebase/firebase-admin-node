{% extends "_internal/templates/reference.html" %}
{% block title %}MultiFactorCreateSettings interface{% endblock title %}
{% block body %}
The multi-factor related user settings for create operations.

<b>Signature:</b>

```typescript
export interface MultiFactorCreateSettings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [enrolledFactors](./firebase-admin.auth.multifactorcreatesettings.md#multifactorcreatesettingsenrolledfactors) | [CreateMultiFactorInfoRequest](./firebase-admin.auth.md#createmultifactorinforequest)<!-- -->\[\] | The created user's list of enrolled second factors. |

## MultiFactorCreateSettings.enrolledFactors

The created user's list of enrolled second factors.

<b>Signature:</b>

```typescript
enrolledFactors: CreateMultiFactorInfoRequest[];
```
{% endblock body %}

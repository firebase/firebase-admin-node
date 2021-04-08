{% extends "_internal/templates/reference.html" %}
{% block title %}MultiFactorSettings class{% endblock title %}
{% block body %}
The multi-factor related user settings.

<b>Signature:</b>

```typescript
export declare class MultiFactorSettings 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [enrolledFactors](./firebase-admin.auth.multifactorsettings.md#multifactorsettingsenrolledfactors) |  | [MultiFactorInfo](./firebase-admin.auth.multifactorinfo.md#multifactorinfo_class)<!-- -->\[\] | List of second factors enrolled with the current user. Currently only phone second factors are supported. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.multifactorsettings.md#multifactorsettingstojson) |  |  A JSON-serializable representation of this multi-factor object. |

## MultiFactorSettings.enrolledFactors

List of second factors enrolled with the current user. Currently only phone second factors are supported.

<b>Signature:</b>

```typescript
enrolledFactors: MultiFactorInfo[];
```

## MultiFactorSettings.toJSON()

 A JSON-serializable representation of this multi-factor object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}

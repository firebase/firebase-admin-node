{% extends "_internal/templates/reference.html" %}
{% block title %}PhoneMultiFactorInfo class{% endblock title %}
{% block body %}
Interface representing a phone specific user enrolled second factor.

<b>Signature:</b>

```typescript
export declare class PhoneMultiFactorInfo extends MultiFactorInfo 
```
<b>Extends:</b> [MultiFactorInfo](./firebase-admin.auth.multifactorinfo.md#multifactorinfo_class)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [phoneNumber](./firebase-admin.auth.phonemultifactorinfo.md#phonemultifactorinfophonenumber) |  | string | The phone number associated with a phone second factor. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.phonemultifactorinfo.md#phonemultifactorinfotojson) |  |  A JSON-serializable representation of this object. |

## PhoneMultiFactorInfo.phoneNumber

The phone number associated with a phone second factor.

<b>Signature:</b>

```typescript
readonly phoneNumber: string;
```

## PhoneMultiFactorInfo.toJSON()

 A JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}

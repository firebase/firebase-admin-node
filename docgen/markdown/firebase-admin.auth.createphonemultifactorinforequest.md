{% extends "_internal/templates/reference.html" %}
{% block title %}CreatePhoneMultiFactorInfoRequest interface{% endblock title %}
{% block body %}
Interface representing a phone specific user-enrolled second factor for a `CreateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface CreatePhoneMultiFactorInfoRequest extends BaseCreateMultiFactorInfoRequest 
```
<b>Extends:</b> [BaseCreateMultiFactorInfoRequest](./firebase-admin.auth.basecreatemultifactorinforequest.md#basecreatemultifactorinforequest_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [phoneNumber](./firebase-admin.auth.createphonemultifactorinforequest.md#createphonemultifactorinforequestphonenumber) | string | The phone number associated with a phone second factor. |

## CreatePhoneMultiFactorInfoRequest.phoneNumber

The phone number associated with a phone second factor.

<b>Signature:</b>

```typescript
phoneNumber: string;
```
{% endblock body %}

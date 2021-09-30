{% extends "_internal/templates/reference.html" %}
{% block title %}UpdatePhoneMultiFactorInfoRequest interface{% endblock title %}
{% block body %}
Interface representing a phone specific user-enrolled second factor for an `UpdateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface UpdatePhoneMultiFactorInfoRequest extends BaseUpdateMultiFactorInfoRequest 
```
<b>Extends:</b> [BaseUpdateMultiFactorInfoRequest](./firebase-admin.auth.baseupdatemultifactorinforequest.md#baseupdatemultifactorinforequest_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [phoneNumber](./firebase-admin.auth.updatephonemultifactorinforequest.md#updatephonemultifactorinforequestphonenumber) | string | The phone number associated with a phone second factor. |

## UpdatePhoneMultiFactorInfoRequest.phoneNumber

The phone number associated with a phone second factor.

<b>Signature:</b>

```typescript
phoneNumber: string;
```
{% endblock body %}

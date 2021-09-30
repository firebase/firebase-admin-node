{% extends "_internal/templates/reference.html" %}
{% block title %}BaseCreateMultiFactorInfoRequest interface{% endblock title %}
{% block body %}
Interface representing base properties of a user-enrolled second factor for a `CreateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface BaseCreateMultiFactorInfoRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.basecreatemultifactorinforequest.md#basecreatemultifactorinforequestdisplayname) | string | The optional display name for an enrolled second factor. |
|  [factorId](./firebase-admin.auth.basecreatemultifactorinforequest.md#basecreatemultifactorinforequestfactorid) | string | The type identifier of the second factor. For SMS second factors, this is <code>phone</code>. |

## BaseCreateMultiFactorInfoRequest.displayName

The optional display name for an enrolled second factor.

<b>Signature:</b>

```typescript
displayName?: string;
```

## BaseCreateMultiFactorInfoRequest.factorId

The type identifier of the second factor. For SMS second factors, this is `phone`<!-- -->.

<b>Signature:</b>

```typescript
factorId: string;
```
{% endblock body %}

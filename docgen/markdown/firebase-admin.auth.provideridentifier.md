{% extends "_internal/templates/reference.html" %}
{% block title %}ProviderIdentifier interface{% endblock title %}
{% block body %}
Used for looking up an account by federated provider.

See `auth.getUsers()`

<b>Signature:</b>

```typescript
export interface ProviderIdentifier 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [providerId](./firebase-admin.auth.provideridentifier.md#provideridentifierproviderid) | string |  |
|  [providerUid](./firebase-admin.auth.provideridentifier.md#provideridentifierprovideruid) | string |  |

## ProviderIdentifier.providerId

<b>Signature:</b>

```typescript
providerId: string;
```

## ProviderIdentifier.providerUid

<b>Signature:</b>

```typescript
providerUid: string;
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}ListTenantsResult interface{% endblock title %}
{% block body %}
Interface representing the object returned from a  operation. Contains the list of tenants for the current batch and the next page token if available.

<b>Signature:</b>

```typescript
export interface ListTenantsResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [pageToken](./firebase-admin.auth.listtenantsresult.md#listtenantsresultpagetoken) | string | The next page token if available. This is needed for the next batch download. |
|  [tenants](./firebase-admin.auth.listtenantsresult.md#listtenantsresulttenants) | [Tenant](./firebase-admin.auth.tenant.md#tenant_class)<!-- -->\[\] | The list of  objects for the downloaded batch. |

## ListTenantsResult.pageToken

The next page token if available. This is needed for the next batch download.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListTenantsResult.tenants

The list of  objects for the downloaded batch.

<b>Signature:</b>

```typescript
tenants: Tenant[];
```
{% endblock body %}

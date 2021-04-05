{% extends "_internal/templates/reference.html" %}
{% block title %}TenantManager class{% endblock title %}
{% block body %}
Defines the tenant manager used to help manage tenant related operations. This includes: <ul> <li>The ability to create, update, list, get and delete tenants for the underlying project.</li> <li>Getting a `TenantAwareAuth` instance for running Auth related operations (user management, provider configuration management, token verification, email link generation, etc) in the context of a specified tenant.</li> </ul>

<b>Signature:</b>

```typescript
export declare class TenantManager 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [authForTenant(tenantId)](./firebase-admin.auth.tenantmanager.md#tenantmanagerauthfortenant) |  | Returns a <code>TenantAwareAuth</code> instance bound to the given tenant ID. |
|  [createTenant(tenantOptions)](./firebase-admin.auth.tenantmanager.md#tenantmanagercreatetenant) |  | Creates a new tenant. When creating new tenants, tenants that use separate billing and quota will require their own project and must be defined as <code>full_service</code>. |
|  [deleteTenant(tenantId)](./firebase-admin.auth.tenantmanager.md#tenantmanagerdeletetenant) |  | Deletes an existing tenant. |
|  [getTenant(tenantId)](./firebase-admin.auth.tenantmanager.md#tenantmanagergettenant) |  | Gets the tenant configuration for the tenant corresponding to a given <code>tenantId</code>. |
|  [listTenants(maxResults, pageToken)](./firebase-admin.auth.tenantmanager.md#tenantmanagerlisttenants) |  | Retrieves a list of tenants (single batch only) with a size of <code>maxResults</code> starting from the offset as specified by <code>pageToken</code>. This is used to retrieve all the tenants of a specified project in batches. |
|  [updateTenant(tenantId, tenantOptions)](./firebase-admin.auth.tenantmanager.md#tenantmanagerupdatetenant) |  | Updates an existing tenant configuration. |

## TenantManager.authForTenant()

Returns a `TenantAwareAuth` instance bound to the given tenant ID.

<b>Signature:</b>

```typescript
authForTenant(tenantId: string): TenantAwareAuth;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The tenant ID whose <code>TenantAwareAuth</code> instance is to be returned. The <code>TenantAwareAuth</code> instance corresponding to this tenant identifier. |

<b>Returns:</b>

[TenantAwareAuth](./firebase-admin.auth.tenantawareauth.md#tenantawareauth_class)

## TenantManager.createTenant()

Creates a new tenant. When creating new tenants, tenants that use separate billing and quota will require their own project and must be defined as `full_service`<!-- -->.

<b>Signature:</b>

```typescript
createTenant(tenantOptions: CreateTenantRequest): Promise<Tenant>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantOptions | [CreateTenantRequest](./firebase-admin.auth.md#createtenantrequest) | The properties to set on the new tenant configuration to be created. A promise fulfilled with the tenant configuration corresponding to the newly created tenant. |

<b>Returns:</b>

Promise&lt;[Tenant](./firebase-admin.auth.tenant.md#tenant_class)<!-- -->&gt;

## TenantManager.deleteTenant()

Deletes an existing tenant.

<b>Signature:</b>

```typescript
deleteTenant(tenantId: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The <code>tenantId</code> corresponding to the tenant to delete. An empty promise fulfilled once the tenant has been deleted. |

<b>Returns:</b>

Promise&lt;void&gt;

## TenantManager.getTenant()

Gets the tenant configuration for the tenant corresponding to a given `tenantId`<!-- -->.

<b>Signature:</b>

```typescript
getTenant(tenantId: string): Promise<Tenant>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The tenant identifier corresponding to the tenant whose data to fetch. A promise fulfilled with the tenant configuration to the provided <code>tenantId</code>. |

<b>Returns:</b>

Promise&lt;[Tenant](./firebase-admin.auth.tenant.md#tenant_class)<!-- -->&gt;

## TenantManager.listTenants()

Retrieves a list of tenants (single batch only) with a size of `maxResults` starting from the offset as specified by `pageToken`<!-- -->. This is used to retrieve all the tenants of a specified project in batches.

<b>Signature:</b>

```typescript
listTenants(maxResults?: number, pageToken?: string): Promise<ListTenantsResult>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maxResults | number | The page size, 1000 if undefined. This is also the maximum allowed limit. |
|  pageToken | string | The next page token. If not specified, returns tenants starting without any offset. A promise that resolves with a batch of downloaded tenants and the next page token. |

<b>Returns:</b>

Promise&lt;[ListTenantsResult](./firebase-admin.auth.listtenantsresult.md#listtenantsresult_interface)<!-- -->&gt;

## TenantManager.updateTenant()

Updates an existing tenant configuration.

<b>Signature:</b>

```typescript
updateTenant(tenantId: string, tenantOptions: UpdateTenantRequest): Promise<Tenant>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The <code>tenantId</code> corresponding to the tenant to delete. |
|  tenantOptions | [UpdateTenantRequest](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequest_interface) | The properties to update on the provided tenant. A promise fulfilled with the update tenant data. |

<b>Returns:</b>

Promise&lt;[Tenant](./firebase-admin.auth.tenant.md#tenant_class)<!-- -->&gt;

{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}Auth class{% endblock title %}
{% block body %}
Auth service bound to the provided app. An Auth instance can have multiple tenants.

<b>Signature:</b>

```typescript
export declare class Auth extends BaseAuth 
```
<b>Extends:</b> [BaseAuth](./firebase-admin.auth.baseauth.md#baseauth_class)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.auth.auth.md#authapp) |  | App | Returns the app associated with this Auth instance. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [tenantManager()](./firebase-admin.auth.auth.md#authtenantmanager) |  | Returns the tenant manager instance associated with the current project. |

## Auth.app

Returns the app associated with this Auth instance.

<b>Signature:</b>

```typescript
get app(): App;
```

## Auth.tenantManager()

Returns the tenant manager instance associated with the current project.

<b>Signature:</b>

```typescript
tenantManager(): TenantManager;
```
<b>Returns:</b>

[TenantManager](./firebase-admin.auth.tenantmanager.md#tenantmanager_class)

The tenant manager instance associated with the current project.

{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}Tenant class{% endblock title %}
{% block body %}
Represents a tenant configuration.

Multi-tenancy support requires Google Cloud's Identity Platform (GCIP). To learn more about GCIP, including pricing and features, see the [GCIP documentation](https://cloud.google.com/identity-platform)<!-- -->.

Before multi-tenancy can be used on a Google Cloud Identity Platform project, tenants must be allowed on that project via the Cloud Console UI.

A tenant configuration provides information such as the display name, tenant identifier and email authentication configuration. For OIDC/SAML provider configuration management, `TenantAwareAuth` instances should be used instead of a `Tenant` to retrieve the list of configured IdPs on a tenant. When configuring these providers, note that tenants will inherit whitelisted domains and authenticated redirect URIs of their parent project.

All other settings of a tenant will also be inherited. These will need to be managed from the Cloud Console UI.

<b>Signature:</b>

```typescript
export declare class Tenant 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [anonymousSignInEnabled](./firebase-admin.auth.tenant.md#tenantanonymoussigninenabled) |  | boolean |  |
|  [displayName](./firebase-admin.auth.tenant.md#tenantdisplayname) |  | string | The tenant display name. |
|  [emailSignInConfig](./firebase-admin.auth.tenant.md#tenantemailsigninconfig) |  | [EmailSignInProviderConfig](./firebase-admin.auth.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) \| undefined | The email sign in provider configuration. |
|  [multiFactorConfig](./firebase-admin.auth.tenant.md#tenantmultifactorconfig) |  | [MultiFactorConfig](./firebase-admin.auth.multifactorconfig.md#multifactorconfig_interface) \| undefined | The multi-factor auth configuration on the current tenant. |
|  [tenantId](./firebase-admin.auth.tenant.md#tenanttenantid) |  | string | The tenant identifier. |
|  [testPhoneNumbers](./firebase-admin.auth.tenant.md#tenanttestphonenumbers) |  | { \[phoneNumber: string\]: string; } | The map containing the test phone number / code pairs for the tenant. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.tenant.md#tenanttojson) |  | Returns a JSON-serializable representation of this object. |

## Tenant.anonymousSignInEnabled

<b>Signature:</b>

```typescript
readonly anonymousSignInEnabled: boolean;
```

## Tenant.displayName

The tenant display name.

<b>Signature:</b>

```typescript
readonly displayName?: string;
```

## Tenant.emailSignInConfig

The email sign in provider configuration.

<b>Signature:</b>

```typescript
get emailSignInConfig(): EmailSignInProviderConfig | undefined;
```

## Tenant.multiFactorConfig

The multi-factor auth configuration on the current tenant.

<b>Signature:</b>

```typescript
get multiFactorConfig(): MultiFactorConfig | undefined;
```

## Tenant.tenantId

The tenant identifier.

<b>Signature:</b>

```typescript
readonly tenantId: string;
```

## Tenant.testPhoneNumbers

The map containing the test phone number / code pairs for the tenant.

<b>Signature:</b>

```typescript
readonly testPhoneNumbers?: {
        [phoneNumber: string]: string;
    };
```

## Tenant.toJSON()

Returns a JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

A JSON-serializable representation of this object.

{% endblock body %}

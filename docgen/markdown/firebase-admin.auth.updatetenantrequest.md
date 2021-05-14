{% extends "_internal/templates/reference.html" %}
{% block title %}UpdateTenantRequest interface{% endblock title %}
{% block body %}
Interface representing the properties to update on the provided tenant.

<b>Signature:</b>

```typescript
export interface UpdateTenantRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [anonymousSignInEnabled](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequestanonymoussigninenabled) | boolean | Whether the anonymous provider is enabled. |
|  [displayName](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequestdisplayname) | string | The tenant display name. |
|  [emailSignInConfig](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequestemailsigninconfig) | [EmailSignInProviderConfig](./firebase-admin.auth.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) | The email sign in configuration. |
|  [multiFactorConfig](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequestmultifactorconfig) | [MultiFactorConfig](./firebase-admin.auth.multifactorconfig.md#multifactorconfig_interface) | The multi-factor auth configuration to update on the tenant. |
|  [testPhoneNumbers](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequesttestphonenumbers) | { \[phoneNumber: string\]: string; } \| null | The updated map containing the test phone number / code pairs for the tenant. Passing null clears the previously save phone number / code pairs. |

## UpdateTenantRequest.anonymousSignInEnabled

Whether the anonymous provider is enabled.

<b>Signature:</b>

```typescript
anonymousSignInEnabled?: boolean;
```

## UpdateTenantRequest.displayName

The tenant display name.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UpdateTenantRequest.emailSignInConfig

The email sign in configuration.

<b>Signature:</b>

```typescript
emailSignInConfig?: EmailSignInProviderConfig;
```

## UpdateTenantRequest.multiFactorConfig

The multi-factor auth configuration to update on the tenant.

<b>Signature:</b>

```typescript
multiFactorConfig?: MultiFactorConfig;
```

## UpdateTenantRequest.testPhoneNumbers

The updated map containing the test phone number / code pairs for the tenant. Passing null clears the previously save phone number / code pairs.

<b>Signature:</b>

```typescript
testPhoneNumbers?: {
        [phoneNumber: string]: string;
    } | null;
```
{% endblock body %}

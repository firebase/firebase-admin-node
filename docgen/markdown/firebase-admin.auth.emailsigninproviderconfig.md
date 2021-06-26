{% extends "_internal/templates/reference.html" %}
{% block title %}EmailSignInProviderConfig interface{% endblock title %}
{% block body %}
The email sign in provider configuration.

<b>Signature:</b>

```typescript
export interface EmailSignInProviderConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [enabled](./firebase-admin.auth.emailsigninproviderconfig.md#emailsigninproviderconfigenabled) | boolean | Whether email provider is enabled. |
|  [passwordRequired](./firebase-admin.auth.emailsigninproviderconfig.md#emailsigninproviderconfigpasswordrequired) | boolean | Whether password is required for email sign-in. When not required, email sign-in can be performed with password or via email link sign-in. |

## EmailSignInProviderConfig.enabled

Whether email provider is enabled.

<b>Signature:</b>

```typescript
enabled: boolean;
```

## EmailSignInProviderConfig.passwordRequired

Whether password is required for email sign-in. When not required, email sign-in can be performed with password or via email link sign-in.

<b>Signature:</b>

```typescript
passwordRequired?: boolean;
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}BaseAuthProviderConfig interface{% endblock title %}
{% block body %}
The base Auth provider configuration interface.

<b>Signature:</b>

```typescript
export interface BaseAuthProviderConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.baseauthproviderconfig.md#baseauthproviderconfigdisplayname) | string | The user-friendly display name to the current configuration. This name is also used as the provider label in the Cloud Console. |
|  [enabled](./firebase-admin.auth.baseauthproviderconfig.md#baseauthproviderconfigenabled) | boolean | Whether the provider configuration is enabled or disabled. A user cannot sign in using a disabled provider. |
|  [providerId](./firebase-admin.auth.baseauthproviderconfig.md#baseauthproviderconfigproviderid) | string | The provider ID defined by the developer. For a SAML provider, this is always prefixed by <code>saml.</code>. For an OIDC provider, this is always prefixed by <code>oidc.</code>. |

## BaseAuthProviderConfig.displayName

The user-friendly display name to the current configuration. This name is also used as the provider label in the Cloud Console.

<b>Signature:</b>

```typescript
displayName?: string;
```

## BaseAuthProviderConfig.enabled

Whether the provider configuration is enabled or disabled. A user cannot sign in using a disabled provider.

<b>Signature:</b>

```typescript
enabled: boolean;
```

## BaseAuthProviderConfig.providerId

The provider ID defined by the developer. For a SAML provider, this is always prefixed by `saml.`<!-- -->. For an OIDC provider, this is always prefixed by `oidc.`<!-- -->.

<b>Signature:</b>

```typescript
providerId: string;
```
{% endblock body %}

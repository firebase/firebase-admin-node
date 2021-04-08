The base Auth provider configuration interface.

<b>Signature:</b>

```typescript
export interface AuthProviderConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.authproviderconfig.md#authproviderconfigdisplayname) | string | The user-friendly display name to the current configuration. This name is also used as the provider label in the Cloud Console. |
|  [enabled](./firebase-admin.auth.authproviderconfig.md#authproviderconfigenabled) | boolean | Whether the provider configuration is enabled or disabled. A user cannot sign in using a disabled provider. |
|  [providerId](./firebase-admin.auth.authproviderconfig.md#authproviderconfigproviderid) | string | The provider ID defined by the developer. For a SAML provider, this is always prefixed by <code>saml.</code>. For an OIDC provider, this is always prefixed by <code>oidc.</code>. |

## AuthProviderConfig.displayName

The user-friendly display name to the current configuration. This name is also used as the provider label in the Cloud Console.

<b>Signature:</b>

```typescript
displayName?: string;
```

## AuthProviderConfig.enabled

Whether the provider configuration is enabled or disabled. A user cannot sign in using a disabled provider.

<b>Signature:</b>

```typescript
enabled: boolean;
```

## AuthProviderConfig.providerId

The provider ID defined by the developer. For a SAML provider, this is always prefixed by `saml.`<!-- -->. For an OIDC provider, this is always prefixed by `oidc.`<!-- -->.

<b>Signature:</b>

```typescript
providerId: string;
```

The request interface for updating an OIDC Auth provider. This is used when updating an OIDC provider's configuration via .

<b>Signature:</b>

```typescript
export interface OIDCUpdateAuthProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [clientId](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestclientid) | string | The OIDC provider's updated client ID. If not provided, the existing configuration's value is not modified. |
|  [displayName](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestdisplayname) | string | The OIDC provider's updated display name. If not provided, the existing configuration's value is not modified. |
|  [enabled](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestenabled) | boolean | Whether the OIDC provider is enabled or not. If not provided, the existing configuration's setting is not modified. |
|  [issuer](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestissuer) | string | The OIDC provider's updated issuer. If not provided, the existing configuration's value is not modified. |

## OIDCUpdateAuthProviderRequest.clientId

The OIDC provider's updated client ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
clientId?: string;
```

## OIDCUpdateAuthProviderRequest.displayName

The OIDC provider's updated display name. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
displayName?: string;
```

## OIDCUpdateAuthProviderRequest.enabled

Whether the OIDC provider is enabled or not. If not provided, the existing configuration's setting is not modified.

<b>Signature:</b>

```typescript
enabled?: boolean;
```

## OIDCUpdateAuthProviderRequest.issuer

The OIDC provider's updated issuer. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
issuer?: string;
```

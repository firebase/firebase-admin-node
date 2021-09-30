{% extends "_internal/templates/reference.html" %}
{% block title %}OIDCUpdateAuthProviderRequest interface{% endblock title %}
{% block body %}
The request interface for updating an OIDC Auth provider. This is used when updating an OIDC provider's configuration via .

<b>Signature:</b>

```typescript
export interface OIDCUpdateAuthProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [clientId](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestclientid) | string | The OIDC provider's updated client ID. If not provided, the existing configuration's value is not modified. |
|  [clientSecret](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestclientsecret) | string | The OIDC provider's client secret to enable OIDC code flow. If not provided, the existing configuration's value is not modified. |
|  [displayName](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestdisplayname) | string | The OIDC provider's updated display name. If not provided, the existing configuration's value is not modified. |
|  [enabled](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestenabled) | boolean | Whether the OIDC provider is enabled or not. If not provided, the existing configuration's setting is not modified. |
|  [issuer](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestissuer) | string | The OIDC provider's updated issuer. If not provided, the existing configuration's value is not modified. |
|  [responseType](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestresponsetype) | [OAuthResponseType](./firebase-admin.auth.oauthresponsetype.md#oauthresponsetype_interface) | The OIDC provider's response object for OAuth authorization flow. |

## OIDCUpdateAuthProviderRequest.clientId

The OIDC provider's updated client ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
clientId?: string;
```

## OIDCUpdateAuthProviderRequest.clientSecret

The OIDC provider's client secret to enable OIDC code flow. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
clientSecret?: string;
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

## OIDCUpdateAuthProviderRequest.responseType

The OIDC provider's response object for OAuth authorization flow.

<b>Signature:</b>

```typescript
responseType?: OAuthResponseType;
```
{% endblock body %}

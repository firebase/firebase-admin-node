{% extends "_internal/templates/reference.html" %}
{% block title %}OIDCAuthProviderConfig interface{% endblock title %}
{% block body %}
The \[OIDC\](https://openid.net/specs/openid-connect-core-1\_0-final.html) Auth provider configuration interface. An OIDC provider can be created via .

<b>Signature:</b>

```typescript
export interface OIDCAuthProviderConfig extends BaseAuthProviderConfig 
```
<b>Extends:</b> [BaseAuthProviderConfig](./firebase-admin.auth.baseauthproviderconfig.md#baseauthproviderconfig_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [clientId](./firebase-admin.auth.oidcauthproviderconfig.md#oidcauthproviderconfigclientid) | string | This is the required client ID used to confirm the audience of an OIDC provider's \[ID token\](https://openid.net/specs/openid-connect-core-1\_0-final.html\#IDToken). |
|  [clientSecret](./firebase-admin.auth.oidcauthproviderconfig.md#oidcauthproviderconfigclientsecret) | string | The OIDC provider's client secret to enable OIDC code flow. |
|  [issuer](./firebase-admin.auth.oidcauthproviderconfig.md#oidcauthproviderconfigissuer) | string | This is the required provider issuer used to match the provider issuer of the ID token and to determine the corresponding OIDC discovery document, eg. \[<code>/.well-known/openid-configuration</code>\](https://openid.net/specs/openid-connect-discovery-1\_0.html\#ProviderConfig). This is needed for the following: <ul> <li>To verify the provided issuer.</li> <li>Determine the authentication/authorization endpoint during the OAuth <code>id_token</code> authentication flow.</li> <li>To retrieve the public signing keys via <code>jwks_uri</code> to verify the OIDC provider's ID token's signature.</li> <li>To determine the claims\_supported to construct the user attributes to be returned in the additional user info response.</li> </ul> ID token validation will be performed as defined in the \[spec\](https://openid.net/specs/openid-connect-core-1\_0.html\#IDTokenValidation). |
|  [responseType](./firebase-admin.auth.oidcauthproviderconfig.md#oidcauthproviderconfigresponsetype) | [OAuthResponseType](./firebase-admin.auth.oauthresponsetype.md#oauthresponsetype_interface) | The OIDC provider's response object for OAuth authorization flow. |

## OIDCAuthProviderConfig.clientId

This is the required client ID used to confirm the audience of an OIDC provider's \[ID token\](https://openid.net/specs/openid-connect-core-1\_0-final.html\#IDToken).

<b>Signature:</b>

```typescript
clientId: string;
```

## OIDCAuthProviderConfig.clientSecret

The OIDC provider's client secret to enable OIDC code flow.

<b>Signature:</b>

```typescript
clientSecret?: string;
```

## OIDCAuthProviderConfig.issuer

This is the required provider issuer used to match the provider issuer of the ID token and to determine the corresponding OIDC discovery document, eg. \[`/.well-known/openid-configuration`<!-- -->\](https://openid.net/specs/openid-connect-discovery-1\_0.html\#ProviderConfig). This is needed for the following: <ul> <li>To verify the provided issuer.</li> <li>Determine the authentication/authorization endpoint during the OAuth `id_token` authentication flow.</li> <li>To retrieve the public signing keys via `jwks_uri` to verify the OIDC provider's ID token's signature.</li> <li>To determine the claims\_supported to construct the user attributes to be returned in the additional user info response.</li> </ul> ID token validation will be performed as defined in the \[spec\](https://openid.net/specs/openid-connect-core-1\_0.html\#IDTokenValidation).

<b>Signature:</b>

```typescript
issuer: string;
```

## OIDCAuthProviderConfig.responseType

The OIDC provider's response object for OAuth authorization flow.

<b>Signature:</b>

```typescript
responseType?: OAuthResponseType;
```
{% endblock body %}

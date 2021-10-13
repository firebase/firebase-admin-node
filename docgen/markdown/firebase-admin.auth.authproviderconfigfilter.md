{% extends "_internal/templates/reference.html" %}
{% block title %}AuthProviderConfigFilter interface{% endblock title %}
{% block body %}
The filter interface used for listing provider configurations. This is used when specifying how to list configured identity providers via [BaseAuth.listProviderConfigs()](./firebase-admin.auth.baseauth.md#baseauthlistproviderconfigs)<!-- -->.

<b>Signature:</b>

```typescript
export interface AuthProviderConfigFilter 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [maxResults](./firebase-admin.auth.authproviderconfigfilter.md#authproviderconfigfiltermaxresults) | number | The maximum number of results to return per page. The default and maximum is 100. |
|  [pageToken](./firebase-admin.auth.authproviderconfigfilter.md#authproviderconfigfilterpagetoken) | string | The next page token. When not specified, the lookup starts from the beginning of the list. |
|  [type](./firebase-admin.auth.authproviderconfigfilter.md#authproviderconfigfiltertype) | 'saml' \| 'oidc' | The Auth provider configuration filter. This can be either <code>saml</code> or <code>oidc</code>. The former is used to look up SAML providers only, while the latter is used for OIDC providers. |

## AuthProviderConfigFilter.maxResults

The maximum number of results to return per page. The default and maximum is 100.

<b>Signature:</b>

```typescript
maxResults?: number;
```

## AuthProviderConfigFilter.pageToken

The next page token. When not specified, the lookup starts from the beginning of the list.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## AuthProviderConfigFilter.type

The Auth provider configuration filter. This can be either `saml` or `oidc`<!-- -->. The former is used to look up SAML providers only, while the latter is used for OIDC providers.

<b>Signature:</b>

```typescript
type: 'saml' | 'oidc';
```
{% endblock body %}

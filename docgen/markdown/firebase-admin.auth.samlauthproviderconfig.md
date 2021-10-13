{% extends "_internal/templates/reference.html" %}
{% block title %}SAMLAuthProviderConfig interface{% endblock title %}
{% block body %}
The \[SAML\](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) Auth provider configuration interface. A SAML provider can be created via [BaseAuth.createProviderConfig()](./firebase-admin.auth.baseauth.md#baseauthcreateproviderconfig)<!-- -->.

<b>Signature:</b>

```typescript
export interface SAMLAuthProviderConfig extends BaseAuthProviderConfig 
```
<b>Extends:</b> [BaseAuthProviderConfig](./firebase-admin.auth.baseauthproviderconfig.md#baseauthproviderconfig_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [callbackURL](./firebase-admin.auth.samlauthproviderconfig.md#samlauthproviderconfigcallbackurl) | string | This is fixed and must always be the same as the OAuth redirect URL provisioned by Firebase Auth, <code>https://project-id.firebaseapp.com/__/auth/handler</code> unless a custom <code>authDomain</code> is used. The callback URL should also be provided to the SAML IdP during configuration. |
|  [idpEntityId](./firebase-admin.auth.samlauthproviderconfig.md#samlauthproviderconfigidpentityid) | string | The SAML IdP entity identifier. |
|  [rpEntityId](./firebase-admin.auth.samlauthproviderconfig.md#samlauthproviderconfigrpentityid) | string | The SAML relying party (service provider) entity ID. This is defined by the developer but needs to be provided to the SAML IdP. |
|  [ssoURL](./firebase-admin.auth.samlauthproviderconfig.md#samlauthproviderconfigssourl) | string | The SAML IdP SSO URL. This must be a valid URL. |
|  [x509Certificates](./firebase-admin.auth.samlauthproviderconfig.md#samlauthproviderconfigx509certificates) | string\[\] | The list of SAML IdP X.509 certificates issued by CA for this provider. Multiple certificates are accepted to prevent outages during IdP key rotation (for example ADFS rotates every 10 days). When the Auth server receives a SAML response, it will match the SAML response with the certificate on record. Otherwise the response is rejected. Developers are expected to manage the certificate updates as keys are rotated. |

## SAMLAuthProviderConfig.callbackURL

This is fixed and must always be the same as the OAuth redirect URL provisioned by Firebase Auth, `https://project-id.firebaseapp.com/__/auth/handler` unless a custom `authDomain` is used. The callback URL should also be provided to the SAML IdP during configuration.

<b>Signature:</b>

```typescript
callbackURL?: string;
```

## SAMLAuthProviderConfig.idpEntityId

The SAML IdP entity identifier.

<b>Signature:</b>

```typescript
idpEntityId: string;
```

## SAMLAuthProviderConfig.rpEntityId

The SAML relying party (service provider) entity ID. This is defined by the developer but needs to be provided to the SAML IdP.

<b>Signature:</b>

```typescript
rpEntityId: string;
```

## SAMLAuthProviderConfig.ssoURL

The SAML IdP SSO URL. This must be a valid URL.

<b>Signature:</b>

```typescript
ssoURL: string;
```

## SAMLAuthProviderConfig.x509Certificates

The list of SAML IdP X.509 certificates issued by CA for this provider. Multiple certificates are accepted to prevent outages during IdP key rotation (for example ADFS rotates every 10 days). When the Auth server receives a SAML response, it will match the SAML response with the certificate on record. Otherwise the response is rejected. Developers are expected to manage the certificate updates as keys are rotated.

<b>Signature:</b>

```typescript
x509Certificates: string[];
```
{% endblock body %}

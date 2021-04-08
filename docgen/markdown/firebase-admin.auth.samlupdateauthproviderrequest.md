The request interface for updating a SAML Auth provider. This is used when updating a SAML provider's configuration via .

<b>Signature:</b>

```typescript
export interface SAMLUpdateAuthProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [callbackURL](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestcallbackurl) | string | The SAML provider's callback URL. If not provided, the existing configuration's value is not modified. |
|  [displayName](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestdisplayname) | string | The SAML provider's updated display name. If not provided, the existing configuration's value is not modified. |
|  [enabled](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestenabled) | boolean | Whether the SAML provider is enabled or not. If not provided, the existing configuration's setting is not modified. |
|  [idpEntityId](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestidpentityid) | string | The SAML provider's updated IdP entity ID. If not provided, the existing configuration's value is not modified. |
|  [rpEntityId](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestrpentityid) | string | The SAML provider's updated RP entity ID. If not provided, the existing configuration's value is not modified. |
|  [ssoURL](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestssourl) | string | The SAML provider's updated SSO URL. If not provided, the existing configuration's value is not modified. |
|  [x509Certificates](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestx509certificates) | string\[\] | The SAML provider's updated list of X.509 certificated. If not provided, the existing configuration list is not modified. |

## SAMLUpdateAuthProviderRequest.callbackURL

The SAML provider's callback URL. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
callbackURL?: string;
```

## SAMLUpdateAuthProviderRequest.displayName

The SAML provider's updated display name. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
displayName?: string;
```

## SAMLUpdateAuthProviderRequest.enabled

Whether the SAML provider is enabled or not. If not provided, the existing configuration's setting is not modified.

<b>Signature:</b>

```typescript
enabled?: boolean;
```

## SAMLUpdateAuthProviderRequest.idpEntityId

The SAML provider's updated IdP entity ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
idpEntityId?: string;
```

## SAMLUpdateAuthProviderRequest.rpEntityId

The SAML provider's updated RP entity ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
rpEntityId?: string;
```

## SAMLUpdateAuthProviderRequest.ssoURL

The SAML provider's updated SSO URL. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
ssoURL?: string;
```

## SAMLUpdateAuthProviderRequest.x509Certificates

The SAML provider's updated list of X.509 certificated. If not provided, the existing configuration list is not modified.

<b>Signature:</b>

```typescript
x509Certificates?: string[];
```

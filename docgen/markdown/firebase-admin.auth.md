{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/auth module{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [Auth](./firebase-admin.auth.auth.md#auth_class) | Auth service bound to the provided app. An Auth instance can have multiple tenants. |
|  [BaseAuth](./firebase-admin.auth.baseauth.md#baseauth_class) | Common parent interface for both <code>Auth</code> and <code>TenantAwareAuth</code> APIs. |
|  [MultiFactorInfo](./firebase-admin.auth.multifactorinfo.md#multifactorinfo_class) | Interface representing the common properties of a user enrolled second factor. |
|  [MultiFactorSettings](./firebase-admin.auth.multifactorsettings.md#multifactorsettings_class) | The multi-factor related user settings. |
|  [PhoneMultiFactorInfo](./firebase-admin.auth.phonemultifactorinfo.md#phonemultifactorinfo_class) | Interface representing a phone specific user enrolled second factor. |
|  [Tenant](./firebase-admin.auth.tenant.md#tenant_class) | Represents a tenant configuration.<!-- -->Multi-tenancy support requires Google Cloud's Identity Platform (GCIP). To learn more about GCIP, including pricing and features, see the [GCIP documentation](https://cloud.google.com/identity-platform)<!-- -->.<!-- -->Before multi-tenancy can be used on a Google Cloud Identity Platform project, tenants must be allowed on that project via the Cloud Console UI.<!-- -->A tenant configuration provides information such as the display name, tenant identifier and email authentication configuration. For OIDC/SAML provider configuration management, <code>TenantAwareAuth</code> instances should be used instead of a <code>Tenant</code> to retrieve the list of configured IdPs on a tenant. When configuring these providers, note that tenants will inherit whitelisted domains and authenticated redirect URIs of their parent project.<!-- -->All other settings of a tenant will also be inherited. These will need to be managed from the Cloud Console UI. |
|  [TenantAwareAuth](./firebase-admin.auth.tenantawareauth.md#tenantawareauth_class) | Tenant-aware <code>Auth</code> interface used for managing users, configuring SAML/OIDC providers, generating email links for password reset, email verification, etc for specific tenants.<!-- -->Multi-tenancy support requires Google Cloud's Identity Platform (GCIP). To learn more about GCIP, including pricing and features, see the [GCIP documentation](https://cloud.google.com/identity-platform)<!-- -->.<!-- -->Each tenant contains its own identity providers, settings and sets of users. Using <code>TenantAwareAuth</code>, users for a specific tenant and corresponding OIDC/SAML configurations can also be managed, ID tokens for users signed in to a specific tenant can be verified, and email action links can also be generated for users belonging to the tenant.<code>TenantAwareAuth</code> instances for a specific <code>tenantId</code> can be instantiated by calling [TenantManager.authForTenant()](./firebase-admin.auth.tenantmanager.md#tenantmanagerauthfortenant)<!-- -->. |
|  [TenantManager](./firebase-admin.auth.tenantmanager.md#tenantmanager_class) | Defines the tenant manager used to help manage tenant related operations. This includes: <ul> <li>The ability to create, update, list, get and delete tenants for the underlying project.</li> <li>Getting a <code>TenantAwareAuth</code> instance for running Auth related operations (user management, provider configuration management, token verification, email link generation, etc) in the context of a specified tenant.</li> </ul> |
|  [UserInfo](./firebase-admin.auth.userinfo.md#userinfo_class) | Represents a user's info from a third-party identity provider such as Google or Facebook. |
|  [UserMetadata](./firebase-admin.auth.usermetadata.md#usermetadata_class) | Represents a user's metadata. |
|  [UserRecord](./firebase-admin.auth.userrecord.md#userrecord_class) | Represents a user. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getAuth(app)](./firebase-admin.auth.md#getauth) | Gets the  service for the default app or a given app.<code>getAuth()</code> can be called with no arguments to access the default app's  service or as <code>getAuth(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ActionCodeSettings](./firebase-admin.auth.actioncodesettings.md#actioncodesettings_interface) | This is the interface that defines the required continue/state URL with optional Android and iOS bundle identifiers. |
|  [AuthProviderConfig](./firebase-admin.auth.authproviderconfig.md#authproviderconfig_interface) | The base Auth provider configuration interface. |
|  [AuthProviderConfigFilter](./firebase-admin.auth.authproviderconfigfilter.md#authproviderconfigfilter_interface) | The filter interface used for listing provider configurations. This is used when specifying how to list configured identity providers via . |
|  [CreateMultiFactorInfoRequest](./firebase-admin.auth.createmultifactorinforequest.md#createmultifactorinforequest_interface) | Interface representing base properties of a user enrolled second factor for a <code>CreateRequest</code>. |
|  [CreatePhoneMultiFactorInfoRequest](./firebase-admin.auth.createphonemultifactorinforequest.md#createphonemultifactorinforequest_interface) | Interface representing a phone specific user enrolled second factor for a <code>CreateRequest</code>. |
|  [CreateRequest](./firebase-admin.auth.createrequest.md#createrequest_interface) | Interface representing the properties to set on a new user record to be created. |
|  [DecodedIdToken](./firebase-admin.auth.decodedidtoken.md#decodedidtoken_interface) | Interface representing a decoded Firebase ID token, returned from the  method.<!-- -->Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs). See the \[ID Token section of the OpenID Connect spec\](http://openid.net/specs/openid-connect-core-1\_0.html\#IDToken) for more information about the specific properties below. |
|  [DeleteUsersResult](./firebase-admin.auth.deleteusersresult.md#deleteusersresult_interface) | Represents the result of the [BaseAuth.deleteUsers()](./firebase-admin.auth.baseauth.md#baseauthdeleteusers)<!-- -->. API. |
|  [EmailIdentifier](./firebase-admin.auth.emailidentifier.md#emailidentifier_interface) | Used for looking up an account by email.<!-- -->See [BaseAuth.getUsers()](./firebase-admin.auth.baseauth.md#baseauthgetusers)<!-- -->. |
|  [EmailSignInProviderConfig](./firebase-admin.auth.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) | The email sign in provider configuration. |
|  [GetUsersResult](./firebase-admin.auth.getusersresult.md#getusersresult_interface) | Represents the result of the [BaseAuth.getUsers()](./firebase-admin.auth.baseauth.md#baseauthgetusers) API. |
|  [ListProviderConfigResults](./firebase-admin.auth.listproviderconfigresults.md#listproviderconfigresults_interface) | The response interface for listing provider configs. This is only available when listing all identity providers' configurations via . |
|  [ListTenantsResult](./firebase-admin.auth.listtenantsresult.md#listtenantsresult_interface) | Interface representing the object returned from a [TenantManager.listTenants()](./firebase-admin.auth.tenantmanager.md#tenantmanagerlisttenants) operation. Contains the list of tenants for the current batch and the next page token if available. |
|  [ListUsersResult](./firebase-admin.auth.listusersresult.md#listusersresult_interface) | Interface representing the object returned from a  operation. Contains the list of users for the current batch and the next page token if available. |
|  [MultiFactorConfig](./firebase-admin.auth.multifactorconfig.md#multifactorconfig_interface) | Interface representing a multi-factor configuration. This can be used to define whether multi-factor authentication is enabled or disabled and the list of second factor challenges that are supported. |
|  [MultiFactorCreateSettings](./firebase-admin.auth.multifactorcreatesettings.md#multifactorcreatesettings_interface) | The multi-factor related user settings for create operations. |
|  [MultiFactorUpdateSettings](./firebase-admin.auth.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The multi-factor related user settings for update operations. |
|  [OIDCAuthProviderConfig](./firebase-admin.auth.oidcauthproviderconfig.md#oidcauthproviderconfig_interface) | The \[OIDC\](https://openid.net/specs/openid-connect-core-1\_0-final.html) Auth provider configuration interface. An OIDC provider can be created via . |
|  [OIDCUpdateAuthProviderRequest](./firebase-admin.auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequest_interface) | The request interface for updating an OIDC Auth provider. This is used when updating an OIDC provider's configuration via . |
|  [PhoneIdentifier](./firebase-admin.auth.phoneidentifier.md#phoneidentifier_interface) | Used for looking up an account by phone number.<!-- -->See [BaseAuth.getUsers()](./firebase-admin.auth.baseauth.md#baseauthgetusers)<!-- -->. |
|  [ProviderIdentifier](./firebase-admin.auth.provideridentifier.md#provideridentifier_interface) | Used for looking up an account by federated provider.<!-- -->See [BaseAuth.getUsers()](./firebase-admin.auth.baseauth.md#baseauthgetusers)<!-- -->. |
|  [SAMLAuthProviderConfig](./firebase-admin.auth.samlauthproviderconfig.md#samlauthproviderconfig_interface) | The \[SAML\](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) Auth provider configuration interface. A SAML provider can be created via . |
|  [SAMLUpdateAuthProviderRequest](./firebase-admin.auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequest_interface) | The request interface for updating a SAML Auth provider. This is used when updating a SAML provider's configuration via . |
|  [SessionCookieOptions](./firebase-admin.auth.sessioncookieoptions.md#sessioncookieoptions_interface) | Interface representing the session cookie options needed for the [BaseAuth.createSessionCookie()](./firebase-admin.auth.baseauth.md#baseauthcreatesessioncookie) method. |
|  [UidIdentifier](./firebase-admin.auth.uididentifier.md#uididentifier_interface) | Used for looking up an account by uid.<!-- -->See [BaseAuth.getUsers()](./firebase-admin.auth.baseauth.md#baseauthgetusers)<!-- -->. |
|  [UpdateMultiFactorInfoRequest](./firebase-admin.auth.updatemultifactorinforequest.md#updatemultifactorinforequest_interface) | Interface representing common properties of a user enrolled second factor for an <code>UpdateRequest</code>. |
|  [UpdatePhoneMultiFactorInfoRequest](./firebase-admin.auth.updatephonemultifactorinforequest.md#updatephonemultifactorinforequest_interface) | Interface representing a phone specific user enrolled second factor for an <code>UpdateRequest</code>. |
|  [UpdateRequest](./firebase-admin.auth.updaterequest.md#updaterequest_interface) | Interface representing the properties to update on the provided user. |
|  [UpdateTenantRequest](./firebase-admin.auth.updatetenantrequest.md#updatetenantrequest_interface) | Interface representing the properties to update on the provided tenant. |
|  [UserImportOptions](./firebase-admin.auth.userimportoptions.md#userimportoptions_interface) | Interface representing the user import options needed for  method. This is used to provide the password hashing algorithm information. |
|  [UserImportRecord](./firebase-admin.auth.userimportrecord.md#userimportrecord_interface) | Interface representing a user to import to Firebase Auth via the  method. |
|  [UserImportResult](./firebase-admin.auth.userimportresult.md#userimportresult_interface) | Interface representing the response from the  method for batch importing users to Firebase Auth. |
|  [UserMetadataRequest](./firebase-admin.auth.usermetadatarequest.md#usermetadatarequest_interface) | User metadata to include when importing a user. |
|  [UserProvider](./firebase-admin.auth.userprovider.md#userprovider_interface) | Represents a user identity provider that can be associated with a Firebase user. |
|  [UserProviderRequest](./firebase-admin.auth.userproviderrequest.md#userproviderrequest_interface) | User provider data to include when importing a user. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [AuthFactorType](./firebase-admin.auth.md#authfactortype) | Identifies a second factor type. |
|  [CreateTenantRequest](./firebase-admin.auth.md#createtenantrequest) | Interface representing the properties to set on a new tenant. |
|  [HashAlgorithmType](./firebase-admin.auth.md#hashalgorithmtype) |  |
|  [MultiFactorConfigState](./firebase-admin.auth.md#multifactorconfigstate) | Identifies a multi-factor configuration state. |
|  [UpdateAuthProviderRequest](./firebase-admin.auth.md#updateauthproviderrequest) |  |
|  [UserIdentifier](./firebase-admin.auth.md#useridentifier) | Identifies a user to be looked up. |

## getAuth()

Gets the  service for the default app or a given app.

`getAuth()` can be called with no arguments to access the default app's  service or as `getAuth(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getAuth(app?: App): Auth;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App |  |

<b>Returns:</b>

[Auth](./firebase-admin.auth.auth.md#auth_class)

### Example 1


```javascript
// Get the Auth service for the default app
const defaultAuth = getAuth();

```

### Example 2


```javascript
// Get the Auth service for a given app
const otherAuth = getAuth(otherApp);

```

## AuthFactorType

Identifies a second factor type.

<b>Signature:</b>

```typescript
export declare type AuthFactorType = 'phone';
```

## CreateTenantRequest

Interface representing the properties to set on a new tenant.

<b>Signature:</b>

```typescript
export declare type CreateTenantRequest = UpdateTenantRequest;
```

## HashAlgorithmType

<b>Signature:</b>

```typescript
export declare type HashAlgorithmType = 'SCRYPT' | 'STANDARD_SCRYPT' | 'HMAC_SHA512' | 'HMAC_SHA256' | 'HMAC_SHA1' | 'HMAC_MD5' | 'MD5' | 'PBKDF_SHA1' | 'BCRYPT' | 'PBKDF2_SHA256' | 'SHA512' | 'SHA256' | 'SHA1';
```

## MultiFactorConfigState

Identifies a multi-factor configuration state.

<b>Signature:</b>

```typescript
export declare type MultiFactorConfigState = 'ENABLED' | 'DISABLED';
```

## UpdateAuthProviderRequest

<b>Signature:</b>

```typescript
export declare type UpdateAuthProviderRequest = SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest;
```

## UserIdentifier

Identifies a user to be looked up.

<b>Signature:</b>

```typescript
export declare type UserIdentifier = UidIdentifier | EmailIdentifier | PhoneIdentifier | ProviderIdentifier;
```
{% endblock body %}
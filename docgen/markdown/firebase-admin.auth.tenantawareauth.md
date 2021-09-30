{% extends "_internal/templates/reference.html" %}
{% block title %}TenantAwareAuth class{% endblock title %}
{% block body %}
Tenant-aware `Auth` interface used for managing users, configuring SAML/OIDC providers, generating email links for password reset, email verification, etc for specific tenants.

Multi-tenancy support requires Google Cloud's Identity Platform (GCIP). To learn more about GCIP, including pricing and features, see the [GCIP documentation](https://cloud.google.com/identity-platform)<!-- -->.

Each tenant contains its own identity providers, settings and sets of users. Using `TenantAwareAuth`<!-- -->, users for a specific tenant and corresponding OIDC/SAML configurations can also be managed, ID tokens for users signed in to a specific tenant can be verified, and email action links can also be generated for users belonging to the tenant.

`TenantAwareAuth` instances for a specific `tenantId` can be instantiated by calling [TenantManager.authForTenant()](./firebase-admin.auth.tenantmanager.md#tenantmanagerauthfortenant)<!-- -->.

<b>Signature:</b>

```typescript
export declare class TenantAwareAuth extends BaseAuth 
```
<b>Extends:</b> [BaseAuth](./firebase-admin.auth.baseauth.md#baseauth_class)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [tenantId](./firebase-admin.auth.tenantawareauth.md#tenantawareauthtenantid) |  | string | The tenant identifier corresponding to this <code>TenantAwareAuth</code> instance. All calls to the user management APIs, OIDC/SAML provider management APIs, email link generation APIs, etc will only be applied within the scope of this tenant. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [createSessionCookie(idToken, sessionCookieOptions)](./firebase-admin.auth.tenantawareauth.md#tenantawareauthcreatesessioncookie) |  | Creates a new Firebase session cookie with the specified options. The created JWT string can be set as a server-side session cookie with a custom cookie policy, and be used for session management. The session cookie JWT will have the same payload claims as the provided ID token.<!-- -->See [Manage Session Cookies](https://firebase.google.com/docs/auth/admin/manage-cookies) for code samples and detailed documentation. |
|  [verifyIdToken(idToken, checkRevoked)](./firebase-admin.auth.tenantawareauth.md#tenantawareauthverifyidtoken) |  | Verifies a Firebase ID token (JWT). If the token is valid, the promise is fulfilled with the token's decoded claims; otherwise, the promise is rejected.<!-- -->If <code>checkRevoked</code> is set to true, first verifies whether the corresponding user is disabled. If yes, an <code>auth/user-disabled</code> error is thrown. If no, verifies if the session corresponding to the ID token was revoked. If the corresponding user's session was invalidated, an <code>auth/id-token-revoked</code> error is thrown. If not specified the check is not applied.<!-- -->See [Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) for code samples and detailed documentation. |
|  [verifySessionCookie(sessionCookie, checkRevoked)](./firebase-admin.auth.tenantawareauth.md#tenantawareauthverifysessioncookie) |  | Verifies a Firebase session cookie. Returns a Promise with the cookie claims. Rejects the promise if the cookie could not be verified.<!-- -->If <code>checkRevoked</code> is set to true, first verifies whether the corresponding user is disabled: If yes, an <code>auth/user-disabled</code> error is thrown. If no, verifies if the session corresponding to the session cookie was revoked. If the corresponding user's session was invalidated, an <code>auth/session-cookie-revoked</code> error is thrown. If not specified the check is not performed.<!-- -->See [Verify Session Cookies](https://firebase.google.com/docs/auth/admin/manage-cookies#verify_session_cookie_and_check_permissions) for code samples and detailed documentation |

## TenantAwareAuth.tenantId

The tenant identifier corresponding to this `TenantAwareAuth` instance. All calls to the user management APIs, OIDC/SAML provider management APIs, email link generation APIs, etc will only be applied within the scope of this tenant.

<b>Signature:</b>

```typescript
readonly tenantId: string;
```

## TenantAwareAuth.createSessionCookie()

Creates a new Firebase session cookie with the specified options. The created JWT string can be set as a server-side session cookie with a custom cookie policy, and be used for session management. The session cookie JWT will have the same payload claims as the provided ID token.

See [Manage Session Cookies](https://firebase.google.com/docs/auth/admin/manage-cookies) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
createSessionCookie(idToken: string, sessionCookieOptions: SessionCookieOptions): Promise<string>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  idToken | string | The Firebase ID token to exchange for a session cookie. |
|  sessionCookieOptions | [SessionCookieOptions](./firebase-admin.auth.sessioncookieoptions.md#sessioncookieoptions_interface) | The session cookie options which includes custom session duration. |

<b>Returns:</b>

Promise&lt;string&gt;

A promise that resolves on success with the created session cookie.

## TenantAwareAuth.verifyIdToken()

Verifies a Firebase ID token (JWT). If the token is valid, the promise is fulfilled with the token's decoded claims; otherwise, the promise is rejected.

If `checkRevoked` is set to true, first verifies whether the corresponding user is disabled. If yes, an `auth/user-disabled` error is thrown. If no, verifies if the session corresponding to the ID token was revoked. If the corresponding user's session was invalidated, an `auth/id-token-revoked` error is thrown. If not specified the check is not applied.

See [Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  idToken | string | The ID token to verify. |
|  checkRevoked | boolean | Whether to check if the ID token was revoked. This requires an extra request to the Firebase Auth backend to check the <code>tokensValidAfterTime</code> time for the corresponding user. When not specified, this additional check is not applied. |

<b>Returns:</b>

Promise&lt;[DecodedIdToken](./firebase-admin.auth.decodedidtoken.md#decodedidtoken_interface)<!-- -->&gt;

A promise fulfilled with the token's decoded claims if the ID token is valid; otherwise, a rejected promise.

## TenantAwareAuth.verifySessionCookie()

Verifies a Firebase session cookie. Returns a Promise with the cookie claims. Rejects the promise if the cookie could not be verified.

If `checkRevoked` is set to true, first verifies whether the corresponding user is disabled: If yes, an `auth/user-disabled` error is thrown. If no, verifies if the session corresponding to the session cookie was revoked. If the corresponding user's session was invalidated, an `auth/session-cookie-revoked` error is thrown. If not specified the check is not performed.

See [Verify Session Cookies](https://firebase.google.com/docs/auth/admin/manage-cookies#verify_session_cookie_and_check_permissions) for code samples and detailed documentation

<b>Signature:</b>

```typescript
verifySessionCookie(sessionCookie: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  sessionCookie | string | The session cookie to verify. |
|  checkRevoked | boolean |  |

<b>Returns:</b>

Promise&lt;[DecodedIdToken](./firebase-admin.auth.decodedidtoken.md#decodedidtoken_interface)<!-- -->&gt;

A promise fulfilled with the session cookie's decoded claims if the session cookie is valid; otherwise, a rejected promise.

{% endblock body %}

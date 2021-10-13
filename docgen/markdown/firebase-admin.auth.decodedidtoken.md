{% extends "_internal/templates/reference.html" %}
{% block title %}DecodedIdToken interface{% endblock title %}
{% block body %}
Interface representing a decoded Firebase ID token, returned from the [BaseAuth.verifyIdToken()](./firebase-admin.auth.baseauth.md#baseauthverifyidtoken) method.

Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs). See the \[ID Token section of the OpenID Connect spec\](http://openid.net/specs/openid-connect-core-1\_0.html\#IDToken) for more information about the specific properties below.

<b>Signature:</b>

```typescript
export interface DecodedIdToken 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [aud](./firebase-admin.auth.decodedidtoken.md#decodedidtokenaud) | string | The audience for which this token is intended.<!-- -->This value is a string equal to your Firebase project ID, the unique identifier for your Firebase project, which can be found in \[your project's settings\](https://console.firebase.google.com/project/\_/settings/general/android:com.random.android). |
|  [auth\_time](./firebase-admin.auth.decodedidtoken.md#decodedidtokenauth_time) | number | Time, in seconds since the Unix epoch, when the end-user authentication occurred.<!-- -->This value is not set when this particular ID token was created, but when the user initially logged in to this session. In a single session, the Firebase SDKs will refresh a user's ID tokens every hour. Each ID token will have a different \[<code>iat</code>\](\#iat) value, but the same <code>auth_time</code> value. |
|  [email\_verified](./firebase-admin.auth.decodedidtoken.md#decodedidtokenemail_verified) | boolean | Whether or not the email of the user to whom the ID token belongs is verified, provided the user has an email. |
|  [email](./firebase-admin.auth.decodedidtoken.md#decodedidtokenemail) | string | The email of the user to whom the ID token belongs, if available. |
|  [exp](./firebase-admin.auth.decodedidtoken.md#decodedidtokenexp) | number | The ID token's expiration time, in seconds since the Unix epoch. That is, the time at which this ID token expires and should no longer be considered valid.<!-- -->The Firebase SDKs transparently refresh ID tokens every hour, issuing a new ID token with up to a one hour expiration. |
|  [firebase](./firebase-admin.auth.decodedidtoken.md#decodedidtokenfirebase) | { identities: { \[key: string\]: any; }; sign\_in\_provider: string; sign\_in\_second\_factor?: string; second\_factor\_identifier?: string; tenant?: string; \[key: string\]: any; } | Information about the sign in event, including which sign in provider was used and provider-specific identity details.<!-- -->This data is provided by the Firebase Authentication service and is a reserved claim in the ID token. |
|  [iat](./firebase-admin.auth.decodedidtoken.md#decodedidtokeniat) | number | The ID token's issued-at time, in seconds since the Unix epoch. That is, the time at which this ID token was issued and should start to be considered valid.<!-- -->The Firebase SDKs transparently refresh ID tokens every hour, issuing a new ID token with a new issued-at time. If you want to get the time at which the user session corresponding to the ID token initially occurred, see the \[<code>auth_time</code>\](\#auth\_time) property. |
|  [iss](./firebase-admin.auth.decodedidtoken.md#decodedidtokeniss) | string | The issuer identifier for the issuer of the response.<!-- -->This value is a URL with the format <code>https://securetoken.google.com/&lt;PROJECT_ID&gt;</code>, where <code>&lt;PROJECT_ID&gt;</code> is the same project ID specified in the \[<code>aud</code>\](\#aud) property. |
|  [phone\_number](./firebase-admin.auth.decodedidtoken.md#decodedidtokenphone_number) | string | The phone number of the user to whom the ID token belongs, if available. |
|  [picture](./firebase-admin.auth.decodedidtoken.md#decodedidtokenpicture) | string | The photo URL for the user to whom the ID token belongs, if available. |
|  [sub](./firebase-admin.auth.decodedidtoken.md#decodedidtokensub) | string | The <code>uid</code> corresponding to the user who the ID token belonged to.<!-- -->As a convenience, this value is copied over to the \[<code>uid</code>\](\#uid) property. |
|  [uid](./firebase-admin.auth.decodedidtoken.md#decodedidtokenuid) | string | The <code>uid</code> corresponding to the user who the ID token belonged to.<!-- -->This value is not actually in the JWT token claims itself. It is added as a convenience, and is set as the value of the \[<code>sub</code>\](\#sub) property. |

## DecodedIdToken.aud

The audience for which this token is intended.

This value is a string equal to your Firebase project ID, the unique identifier for your Firebase project, which can be found in \[your project's settings\](https://console.firebase.google.com/project/\_/settings/general/android:com.random.android).

<b>Signature:</b>

```typescript
aud: string;
```

## DecodedIdToken.auth\_time

Time, in seconds since the Unix epoch, when the end-user authentication occurred.

This value is not set when this particular ID token was created, but when the user initially logged in to this session. In a single session, the Firebase SDKs will refresh a user's ID tokens every hour. Each ID token will have a different \[`iat`<!-- -->\](\#iat) value, but the same `auth_time` value.

<b>Signature:</b>

```typescript
auth_time: number;
```

## DecodedIdToken.email\_verified

Whether or not the email of the user to whom the ID token belongs is verified, provided the user has an email.

<b>Signature:</b>

```typescript
email_verified?: boolean;
```

## DecodedIdToken.email

The email of the user to whom the ID token belongs, if available.

<b>Signature:</b>

```typescript
email?: string;
```

## DecodedIdToken.exp

The ID token's expiration time, in seconds since the Unix epoch. That is, the time at which this ID token expires and should no longer be considered valid.

The Firebase SDKs transparently refresh ID tokens every hour, issuing a new ID token with up to a one hour expiration.

<b>Signature:</b>

```typescript
exp: number;
```

## DecodedIdToken.firebase

Information about the sign in event, including which sign in provider was used and provider-specific identity details.

This data is provided by the Firebase Authentication service and is a reserved claim in the ID token.

<b>Signature:</b>

```typescript
firebase: {
        identities: {
            [key: string]: any;
        };
        sign_in_provider: string;
        sign_in_second_factor?: string;
        second_factor_identifier?: string;
        tenant?: string;
        [key: string]: any;
    };
```

## DecodedIdToken.iat

The ID token's issued-at time, in seconds since the Unix epoch. That is, the time at which this ID token was issued and should start to be considered valid.

The Firebase SDKs transparently refresh ID tokens every hour, issuing a new ID token with a new issued-at time. If you want to get the time at which the user session corresponding to the ID token initially occurred, see the \[`auth_time`<!-- -->\](\#auth\_time) property.

<b>Signature:</b>

```typescript
iat: number;
```

## DecodedIdToken.iss

The issuer identifier for the issuer of the response.

This value is a URL with the format `https://securetoken.google.com/<PROJECT_ID>`<!-- -->, where `<PROJECT_ID>` is the same project ID specified in the \[`aud`<!-- -->\](\#aud) property.

<b>Signature:</b>

```typescript
iss: string;
```

## DecodedIdToken.phone\_number

The phone number of the user to whom the ID token belongs, if available.

<b>Signature:</b>

```typescript
phone_number?: string;
```

## DecodedIdToken.picture

The photo URL for the user to whom the ID token belongs, if available.

<b>Signature:</b>

```typescript
picture?: string;
```

## DecodedIdToken.sub

The `uid` corresponding to the user who the ID token belonged to.

As a convenience, this value is copied over to the \[`uid`<!-- -->\](\#uid) property.

<b>Signature:</b>

```typescript
sub: string;
```

## DecodedIdToken.uid

The `uid` corresponding to the user who the ID token belonged to.

This value is not actually in the JWT token claims itself. It is added as a convenience, and is set as the value of the \[`sub`<!-- -->\](\#sub) property.

<b>Signature:</b>

```typescript
uid: string;
```
{% endblock body %}

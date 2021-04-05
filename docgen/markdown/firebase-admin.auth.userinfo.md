{% extends "_internal/templates/reference.html" %}
{% block title %}UserInfo class{% endblock title %}
{% block body %}
Represents a user's info from a third-party identity provider such as Google or Facebook.

<b>Signature:</b>

```typescript
export declare class UserInfo 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [displayName](./firebase-admin.auth.userinfo.md#userinfodisplayname) |  | string | The display name for the linked provider. |
|  [email](./firebase-admin.auth.userinfo.md#userinfoemail) |  | string | The email for the linked provider. |
|  [phoneNumber](./firebase-admin.auth.userinfo.md#userinfophonenumber) |  | string | The phone number for the linked provider. |
|  [photoURL](./firebase-admin.auth.userinfo.md#userinfophotourl) |  | string | The photo URL for the linked provider. |
|  [providerId](./firebase-admin.auth.userinfo.md#userinfoproviderid) |  | string | The linked provider ID (for example, "google.com" for the Google provider). |
|  [uid](./firebase-admin.auth.userinfo.md#userinfouid) |  | string | The user identifier for the linked provider. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.auth.userinfo.md#userinfotojson) |  |  A JSON-serializable representation of this object. |

## UserInfo.displayName

The display name for the linked provider.

<b>Signature:</b>

```typescript
readonly displayName: string;
```

## UserInfo.email

The email for the linked provider.

<b>Signature:</b>

```typescript
readonly email: string;
```

## UserInfo.phoneNumber

The phone number for the linked provider.

<b>Signature:</b>

```typescript
readonly phoneNumber: string;
```

## UserInfo.photoURL

The photo URL for the linked provider.

<b>Signature:</b>

```typescript
readonly photoURL: string;
```

## UserInfo.providerId

The linked provider ID (for example, "google.com" for the Google provider).

<b>Signature:</b>

```typescript
readonly providerId: string;
```

## UserInfo.uid

The user identifier for the linked provider.

<b>Signature:</b>

```typescript
readonly uid: string;
```

## UserInfo.toJSON()

 A JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}

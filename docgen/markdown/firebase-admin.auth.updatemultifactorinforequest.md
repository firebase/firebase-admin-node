{% extends "_internal/templates/reference.html" %}
{% block title %}UpdateMultiFactorInfoRequest interface{% endblock title %}
{% block body %}
Interface representing common properties of a user enrolled second factor for an `UpdateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface UpdateMultiFactorInfoRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin.auth.updatemultifactorinforequest.md#updatemultifactorinforequestdisplayname) | string | The optional display name for an enrolled second factor. |
|  [enrollmentTime](./firebase-admin.auth.updatemultifactorinforequest.md#updatemultifactorinforequestenrollmenttime) | string | The optional date the second factor was enrolled, formatted as a UTC string. |
|  [factorId](./firebase-admin.auth.updatemultifactorinforequest.md#updatemultifactorinforequestfactorid) | string | The type identifier of the second factor. For SMS second factors, this is <code>phone</code>. |
|  [uid](./firebase-admin.auth.updatemultifactorinforequest.md#updatemultifactorinforequestuid) | string | The ID of the enrolled second factor. This ID is unique to the user. When not provided, a new one is provisioned by the Auth server. |

## UpdateMultiFactorInfoRequest.displayName

The optional display name for an enrolled second factor.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UpdateMultiFactorInfoRequest.enrollmentTime

The optional date the second factor was enrolled, formatted as a UTC string.

<b>Signature:</b>

```typescript
enrollmentTime?: string;
```

## UpdateMultiFactorInfoRequest.factorId

The type identifier of the second factor. For SMS second factors, this is `phone`<!-- -->.

<b>Signature:</b>

```typescript
factorId: string;
```

## UpdateMultiFactorInfoRequest.uid

The ID of the enrolled second factor. This ID is unique to the user. When not provided, a new one is provisioned by the Auth server.

<b>Signature:</b>

```typescript
uid?: string;
```
{% endblock body %}

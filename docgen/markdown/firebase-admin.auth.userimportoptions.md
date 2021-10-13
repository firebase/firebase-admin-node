{% extends "_internal/templates/reference.html" %}
{% block title %}UserImportOptions interface{% endblock title %}
{% block body %}
Interface representing the user import options needed for [BaseAuth.importUsers()](./firebase-admin.auth.baseauth.md#baseauthimportusers) method. This is used to provide the password hashing algorithm information.

<b>Signature:</b>

```typescript
export interface UserImportOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [hash](./firebase-admin.auth.userimportoptions.md#userimportoptionshash) | { algorithm: [HashAlgorithmType](./firebase-admin.auth.md#hashalgorithmtype)<!-- -->; key?: Buffer; saltSeparator?: Buffer; rounds?: number; memoryCost?: number; parallelization?: number; blockSize?: number; derivedKeyLength?: number; } | The password hashing information. |

## UserImportOptions.hash

The password hashing information.

<b>Signature:</b>

```typescript
hash: {
        algorithm: HashAlgorithmType;
        key?: Buffer;
        saltSeparator?: Buffer;
        rounds?: number;
        memoryCost?: number;
        parallelization?: number;
        blockSize?: number;
        derivedKeyLength?: number;
    };
```
{% endblock body %}

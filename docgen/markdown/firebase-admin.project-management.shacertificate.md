A SHA-1 or SHA-256 certificate.

Do not call this constructor directly. Instead, use \[`projectManagement.shaCertificate()`<!-- -->\](projectManagement.ProjectManagement\#shaCertificate).

<b>Signature:</b>

```typescript
export declare class ShaCertificate 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [certType](./firebase-admin.project-management.shacertificate.md#shacertificatecerttype) |  | ('sha1' \| 'sha256') | The SHA certificate type. |
|  [resourceName](./firebase-admin.project-management.shacertificate.md#shacertificateresourcename) |  | string \| undefined |  |
|  [shaHash](./firebase-admin.project-management.shacertificate.md#shacertificateshahash) |  | string |  |

## ShaCertificate.certType

The SHA certificate type.

<b>Signature:</b>

```typescript
readonly certType: ('sha1' | 'sha256');
```

### Example


```javascript
var certType = shaCertificate.certType;

```

## ShaCertificate.resourceName

<b>Signature:</b>

```typescript
readonly resourceName?: string | undefined;
```

## ShaCertificate.shaHash

<b>Signature:</b>

```typescript
readonly shaHash: string;
```

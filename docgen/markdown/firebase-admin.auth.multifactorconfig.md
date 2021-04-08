Interface representing a multi-factor configuration. This can be used to define whether multi-factor authentication is enabled or disabled and the list of second factor challenges that are supported.

<b>Signature:</b>

```typescript
export interface MultiFactorConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [factorIds](./firebase-admin.auth.multifactorconfig.md#multifactorconfigfactorids) | [AuthFactorType](./firebase-admin.auth.md#authfactortype)<!-- -->\[\] | The list of identifiers for enabled second factors. Currently only ‘phone’ is supported. |
|  [state](./firebase-admin.auth.multifactorconfig.md#multifactorconfigstate) | [MultiFactorConfigState](./firebase-admin.auth.md#multifactorconfigstate) | The multi-factor config state. |

## MultiFactorConfig.factorIds

The list of identifiers for enabled second factors. Currently only ‘phone’ is supported.

<b>Signature:</b>

```typescript
factorIds?: AuthFactorType[];
```

## MultiFactorConfig.state

The multi-factor config state.

<b>Signature:</b>

```typescript
state: MultiFactorConfigState;
```

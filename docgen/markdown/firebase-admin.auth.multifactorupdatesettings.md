The multi-factor related user settings for update operations.

<b>Signature:</b>

```typescript
export interface MultiFactorUpdateSettings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [enrolledFactors](./firebase-admin.auth.multifactorupdatesettings.md#multifactorupdatesettingsenrolledfactors) | [UpdateMultiFactorInfoRequest](./firebase-admin.auth.updatemultifactorinforequest.md#updatemultifactorinforequest_interface)<!-- -->\[\] \| null | The updated list of enrolled second factors. The provided list overwrites the user's existing list of second factors. When null is passed, all of the user's existing second factors are removed. |

## MultiFactorUpdateSettings.enrolledFactors

The updated list of enrolled second factors. The provided list overwrites the user's existing list of second factors. When null is passed, all of the user's existing second factors are removed.

<b>Signature:</b>

```typescript
enrolledFactors: UpdateMultiFactorInfoRequest[] | null;
```

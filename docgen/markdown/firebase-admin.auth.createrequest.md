Interface representing the properties to set on a new user record to be created.

<b>Signature:</b>

```typescript
export interface CreateRequest extends UpdateRequest 
```
<b>Extends:</b> [UpdateRequest](./firebase-admin.auth.updaterequest.md#updaterequest_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [multiFactor](./firebase-admin.auth.createrequest.md#createrequestmultifactor) | [MultiFactorCreateSettings](./firebase-admin.auth.multifactorcreatesettings.md#multifactorcreatesettings_interface) | The user's multi-factor related properties. |
|  [uid](./firebase-admin.auth.createrequest.md#createrequestuid) | string | The user's <code>uid</code>. |

## CreateRequest.multiFactor

The user's multi-factor related properties.

<b>Signature:</b>

```typescript
multiFactor?: MultiFactorCreateSettings;
```

## CreateRequest.uid

The user's `uid`<!-- -->.

<b>Signature:</b>

```typescript
uid?: string;
```

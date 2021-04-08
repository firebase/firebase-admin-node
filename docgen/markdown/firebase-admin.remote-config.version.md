Interface representing a Remote Config template version. Output only, except for the version description. Contains metadata about a particular version of the Remote Config template. All fields are set at the time the specified Remote Config template is published. A version's description field may be specified in `publishTemplate` calls.

<b>Signature:</b>

```typescript
export interface Version 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [description](./firebase-admin.remote-config.version.md#versiondescription) | string | The user-provided description of the corresponding Remote Config template. |
|  [isLegacy](./firebase-admin.remote-config.version.md#versionislegacy) | boolean | Indicates whether this Remote Config template was published before version history was supported. |
|  [rollbackSource](./firebase-admin.remote-config.version.md#versionrollbacksource) | string | The version number of the Remote Config template that has become the current version due to a rollback. Only present if this version is the result of a rollback. |
|  [updateOrigin](./firebase-admin.remote-config.version.md#versionupdateorigin) | ('REMOTE\_CONFIG\_UPDATE\_ORIGIN\_UNSPECIFIED' \| 'CONSOLE' \| 'REST\_API' \| 'ADMIN\_SDK\_NODE') | The origin of the template update action. |
|  [updateTime](./firebase-admin.remote-config.version.md#versionupdatetime) | string | The timestamp of when this version of the Remote Config template was written to the Remote Config backend. |
|  [updateType](./firebase-admin.remote-config.version.md#versionupdatetype) | ('REMOTE\_CONFIG\_UPDATE\_TYPE\_UNSPECIFIED' \| 'INCREMENTAL\_UPDATE' \| 'FORCED\_UPDATE' \| 'ROLLBACK') | The type of the template update action. |
|  [updateUser](./firebase-admin.remote-config.version.md#versionupdateuser) | [RemoteConfigUser](./firebase-admin.remote-config.remoteconfiguser.md#remoteconfiguser_interface) | Aggregation of all metadata fields about the account that performed the update. |
|  [versionNumber](./firebase-admin.remote-config.version.md#versionversionnumber) | string | The version number of a Remote Config template. |

## Version.description

The user-provided description of the corresponding Remote Config template.

<b>Signature:</b>

```typescript
description?: string;
```

## Version.isLegacy

Indicates whether this Remote Config template was published before version history was supported.

<b>Signature:</b>

```typescript
isLegacy?: boolean;
```

## Version.rollbackSource

The version number of the Remote Config template that has become the current version due to a rollback. Only present if this version is the result of a rollback.

<b>Signature:</b>

```typescript
rollbackSource?: string;
```

## Version.updateOrigin

The origin of the template update action.

<b>Signature:</b>

```typescript
updateOrigin?: ('REMOTE_CONFIG_UPDATE_ORIGIN_UNSPECIFIED' | 'CONSOLE' | 'REST_API' | 'ADMIN_SDK_NODE');
```

## Version.updateTime

The timestamp of when this version of the Remote Config template was written to the Remote Config backend.

<b>Signature:</b>

```typescript
updateTime?: string;
```

## Version.updateType

The type of the template update action.

<b>Signature:</b>

```typescript
updateType?: ('REMOTE_CONFIG_UPDATE_TYPE_UNSPECIFIED' | 'INCREMENTAL_UPDATE' | 'FORCED_UPDATE' | 'ROLLBACK');
```

## Version.updateUser

Aggregation of all metadata fields about the account that performed the update.

<b>Signature:</b>

```typescript
updateUser?: RemoteConfigUser;
```

## Version.versionNumber

The version number of a Remote Config template.

<b>Signature:</b>

```typescript
versionNumber?: string;
```

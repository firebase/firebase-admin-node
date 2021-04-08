Interface representing options for Remote Config list versions operation.

<b>Signature:</b>

```typescript
export interface ListVersionsOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [endTime](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptionsendtime) | Date \| string | Specifies the latest update time to include in the results. Any entries updated on or after this time are omitted. |
|  [endVersionNumber](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptionsendversionnumber) | string \| number | Specifies the newest version number to include in the results. If specified, must be greater than zero. Defaults to the newest version. |
|  [pageSize](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptionspagesize) | number | The maximum number of items to return per page. |
|  [pageToken](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptionspagetoken) | string | The <code>nextPageToken</code> value returned from a previous list versions request, if any. |
|  [startTime](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptionsstarttime) | Date \| string | Specifies the earliest update time to include in the results. Any entries updated before this time are omitted. |

## ListVersionsOptions.endTime

Specifies the latest update time to include in the results. Any entries updated on or after this time are omitted.

<b>Signature:</b>

```typescript
endTime?: Date | string;
```

## ListVersionsOptions.endVersionNumber

Specifies the newest version number to include in the results. If specified, must be greater than zero. Defaults to the newest version.

<b>Signature:</b>

```typescript
endVersionNumber?: string | number;
```

## ListVersionsOptions.pageSize

The maximum number of items to return per page.

<b>Signature:</b>

```typescript
pageSize?: number;
```

## ListVersionsOptions.pageToken

The `nextPageToken` value returned from a previous list versions request, if any.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListVersionsOptions.startTime

Specifies the earliest update time to include in the results. Any entries updated before this time are omitted.

<b>Signature:</b>

```typescript
startTime?: Date | string;
```

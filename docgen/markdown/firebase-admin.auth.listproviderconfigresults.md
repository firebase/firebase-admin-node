The response interface for listing provider configs. This is only available when listing all identity providers' configurations via .

<b>Signature:</b>

```typescript
export interface ListProviderConfigResults 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [pageToken](./firebase-admin.auth.listproviderconfigresults.md#listproviderconfigresultspagetoken) | string | The next page token, if available. |
|  [providerConfigs](./firebase-admin.auth.listproviderconfigresults.md#listproviderconfigresultsproviderconfigs) | [AuthProviderConfig](./firebase-admin.auth.authproviderconfig.md#authproviderconfig_interface)<!-- -->\[\] | The list of providers for the specified type in the current page. |

## ListProviderConfigResults.pageToken

The next page token, if available.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListProviderConfigResults.providerConfigs

The list of providers for the specified type in the current page.

<b>Signature:</b>

```typescript
providerConfigs: AuthProviderConfig[];
```

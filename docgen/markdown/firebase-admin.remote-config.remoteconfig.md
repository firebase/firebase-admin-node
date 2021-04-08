The Firebase `RemoteConfig` service interface.

<b>Signature:</b>

```typescript
export declare class RemoteConfig 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.remote-config.remoteconfig.md#remoteconfigapp) |  | App |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [createTemplateFromJSON(json)](./firebase-admin.remote-config.remoteconfig.md#remoteconfigcreatetemplatefromjson) |  | Creates and returns a new Remote Config template from a JSON string. |
|  [getTemplate()](./firebase-admin.remote-config.remoteconfig.md#remoteconfiggettemplate) |  | Gets the current active version of the  of the project. A promise that fulfills with a <code>RemoteConfigTemplate</code>. |
|  [getTemplateAtVersion(versionNumber)](./firebase-admin.remote-config.remoteconfig.md#remoteconfiggettemplateatversion) |  | Gets the requested version of the  of the project. |
|  [listVersions(options)](./firebase-admin.remote-config.remoteconfig.md#remoteconfiglistversions) |  | Gets a list of Remote Config template versions that have been published, sorted in reverse chronological order. Only the last 300 versions are stored. All versions that correspond to non-active Remote Config templates (i.e., all except the template that is being fetched by clients) are also deleted if they are older than 90 days. |
|  [publishTemplate(template, options)](./firebase-admin.remote-config.remoteconfig.md#remoteconfigpublishtemplate) |  | Publishes a Remote Config template. |
|  [rollback(versionNumber)](./firebase-admin.remote-config.remoteconfig.md#remoteconfigrollback) |  | Rolls back a project's published Remote Config template to the specified version. A rollback is equivalent to getting a previously published Remote Config template and re-publishing it using a force update. |
|  [validateTemplate(template)](./firebase-admin.remote-config.remoteconfig.md#remoteconfigvalidatetemplate) |  | Validates a . |

## RemoteConfig.app

<b>Signature:</b>

```typescript
readonly app: App;
```

## RemoteConfig.createTemplateFromJSON()

Creates and returns a new Remote Config template from a JSON string.

<b>Signature:</b>

```typescript
createTemplateFromJSON(json: string): RemoteConfigTemplate;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  json | string | The JSON string to populate a Remote Config template. A new template instance. |

<b>Returns:</b>

[RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface)

## RemoteConfig.getTemplate()

Gets the current active version of the  of the project.

 A promise that fulfills with a `RemoteConfigTemplate`<!-- -->.

<b>Signature:</b>

```typescript
getTemplate(): Promise<RemoteConfigTemplate>;
```
<b>Returns:</b>

Promise&lt;[RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface)<!-- -->&gt;

## RemoteConfig.getTemplateAtVersion()

Gets the requested version of the  of the project.

<b>Signature:</b>

```typescript
getTemplateAtVersion(versionNumber: number | string): Promise<RemoteConfigTemplate>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  versionNumber | number \| string | Version number of the Remote Config template to look up. A promise that fulfills with a <code>RemoteConfigTemplate</code>. |

<b>Returns:</b>

Promise&lt;[RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface)<!-- -->&gt;

## RemoteConfig.listVersions()

Gets a list of Remote Config template versions that have been published, sorted in reverse chronological order. Only the last 300 versions are stored. All versions that correspond to non-active Remote Config templates (i.e., all except the template that is being fetched by clients) are also deleted if they are older than 90 days.

<b>Signature:</b>

```typescript
listVersions(options?: ListVersionsOptions): Promise<ListVersionsResult>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [ListVersionsOptions](./firebase-admin.remote-config.listversionsoptions.md#listversionsoptions_interface) | Optional options object for getting a list of versions.  A promise that fulfills with a <code>ListVersionsResult</code>. |

<b>Returns:</b>

Promise&lt;[ListVersionsResult](./firebase-admin.remote-config.listversionsresult.md#listversionsresult_interface)<!-- -->&gt;

## RemoteConfig.publishTemplate()

Publishes a Remote Config template.

<b>Signature:</b>

```typescript
publishTemplate(template: RemoteConfigTemplate, options?: {
        force: boolean;
    }): Promise<RemoteConfigTemplate>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  template | [RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface) | The Remote Config template to be published. |
|  options | { force: boolean; } | Optional options object when publishing a Remote Config template: - {<!-- -->boolean<!-- -->} <code>force</code> Setting this to <code>true</code> forces the Remote Config template to be updated and circumvent the ETag. This approach is not recommended because it risks causing the loss of updates to your Remote Config template if multiple clients are updating the Remote Config template. See . A Promise that fulfills with the published <code>RemoteConfigTemplate</code>. |

<b>Returns:</b>

Promise&lt;[RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface)<!-- -->&gt;

## RemoteConfig.rollback()

Rolls back a project's published Remote Config template to the specified version. A rollback is equivalent to getting a previously published Remote Config template and re-publishing it using a force update.

<b>Signature:</b>

```typescript
rollback(versionNumber: number | string): Promise<RemoteConfigTemplate>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  versionNumber | number \| string | The version number of the Remote Config template to roll back to. The specified version number must be lower than the current version number, and not have been deleted due to staleness. Only the last 300 versions are stored. All versions that correspond to non-active Remote Config templates (that is, all except the template that is being fetched by clients) are also deleted if they are more than 90 days old.  A promise that fulfills with the published <code>RemoteConfigTemplate</code>. |

<b>Returns:</b>

Promise&lt;[RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface)<!-- -->&gt;

## RemoteConfig.validateTemplate()

Validates a .

<b>Signature:</b>

```typescript
validateTemplate(template: RemoteConfigTemplate): Promise<RemoteConfigTemplate>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  template | [RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface) | The Remote Config template to be validated. |

<b>Returns:</b>

Promise&lt;[RemoteConfigTemplate](./firebase-admin.remote-config.remoteconfigtemplate.md#remoteconfigtemplate_interface)<!-- -->&gt;

A promise that fulfills with the validated `RemoteConfigTemplate`<!-- -->.


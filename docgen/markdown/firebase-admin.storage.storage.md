{% extends "_internal/templates/reference.html" %}
{% block title %}Storage class{% endblock title %}
{% block body %}
The default `Storage` service if no app is provided or the `Storage` service associated with the provided app.

<b>Signature:</b>

```typescript
export declare class Storage 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.storage.storage.md#storageapp) |  | App | Optional app whose <code>Storage</code> service to return. If not provided, the default <code>Storage</code> service will be returned. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [bucket(name)](./firebase-admin.storage.storage.md#storagebucket) |  | Gets a reference to a Cloud Storage bucket. |

## Storage.app

Optional app whose `Storage` service to return. If not provided, the default `Storage` service will be returned.

<b>Signature:</b>

```typescript
get app(): App;
```

## Storage.bucket()

Gets a reference to a Cloud Storage bucket.

<b>Signature:</b>

```typescript
bucket(name?: string): Bucket;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | string | Optional name of the bucket to be retrieved. If name is not specified, retrieves a reference to the default bucket. |

<b>Returns:</b>

Bucket

A [Bucket](https://cloud.google.com/nodejs/docs/reference/storage/latest/Bucket) instance as defined in the `@google-cloud/storage` package.

{% endblock body %}

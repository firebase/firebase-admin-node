{% extends "_internal/templates/reference.html" %}
{% block title %}Model class{% endblock title %}
{% block body %}
A Firebase ML Model output object.

<b>Signature:</b>

```typescript
export declare class Model 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [createTime](./firebase-admin.machine-learning.model.md#modelcreatetime) |  | string | The timestamp of the model's creation. |
|  [displayName](./firebase-admin.machine-learning.model.md#modeldisplayname) |  | string | The model's name. This is the name you use from your app to load the model. |
|  [etag](./firebase-admin.machine-learning.model.md#modeletag) |  | string | The ETag identifier of the current version of the model. This value changes whenever you update any of the model's properties. |
|  [locked](./firebase-admin.machine-learning.model.md#modellocked) |  | boolean | True if the model is locked by a server-side operation. You can't make changes to a locked model. See [Model.waitForUnlocked()](./firebase-admin.machine-learning.model.md#modelwaitforunlocked)<!-- -->. |
|  [modelHash](./firebase-admin.machine-learning.model.md#modelmodelhash) |  | string \| undefined | The hash of the model's <code>tflite</code> file. This value changes only when you upload a new TensorFlow Lite model. |
|  [modelId](./firebase-admin.machine-learning.model.md#modelmodelid) |  | string | The ID of the model. |
|  [published](./firebase-admin.machine-learning.model.md#modelpublished) |  | boolean | True if the model is published. |
|  [tags](./firebase-admin.machine-learning.model.md#modeltags) |  | string\[\] | The model's tags, which can be used to group or filter models in list operations. |
|  [tfliteModel](./firebase-admin.machine-learning.model.md#modeltflitemodel) |  | [TFLiteModel](./firebase-admin.machine-learning.tflitemodel.md#tflitemodel_interface) \| undefined | Metadata about the model's TensorFlow Lite model file. |
|  [updateTime](./firebase-admin.machine-learning.model.md#modelupdatetime) |  | string | The timestamp of the model's most recent update. |
|  [validationError](./firebase-admin.machine-learning.model.md#modelvalidationerror) |  | string \| undefined | Error message when model validation fails. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin.machine-learning.model.md#modeltojson) |  | Return the model as a JSON object. |
|  [waitForUnlocked(maxTimeMillis)](./firebase-admin.machine-learning.model.md#modelwaitforunlocked) |  | Wait for the model to be unlocked. |

## Model.createTime

The timestamp of the model's creation.

<b>Signature:</b>

```typescript
get createTime(): string;
```

## Model.displayName

The model's name. This is the name you use from your app to load the model.

<b>Signature:</b>

```typescript
get displayName(): string;
```

## Model.etag

The ETag identifier of the current version of the model. This value changes whenever you update any of the model's properties.

<b>Signature:</b>

```typescript
get etag(): string;
```

## Model.locked

True if the model is locked by a server-side operation. You can't make changes to a locked model. See [Model.waitForUnlocked()](./firebase-admin.machine-learning.model.md#modelwaitforunlocked)<!-- -->.

<b>Signature:</b>

```typescript
get locked(): boolean;
```

## Model.modelHash

The hash of the model's `tflite` file. This value changes only when you upload a new TensorFlow Lite model.

<b>Signature:</b>

```typescript
get modelHash(): string | undefined;
```

## Model.modelId

The ID of the model.

<b>Signature:</b>

```typescript
get modelId(): string;
```

## Model.published

True if the model is published.

<b>Signature:</b>

```typescript
get published(): boolean;
```

## Model.tags

The model's tags, which can be used to group or filter models in list operations.

<b>Signature:</b>

```typescript
get tags(): string[];
```

## Model.tfliteModel

Metadata about the model's TensorFlow Lite model file.

<b>Signature:</b>

```typescript
get tfliteModel(): TFLiteModel | undefined;
```

## Model.updateTime

The timestamp of the model's most recent update.

<b>Signature:</b>

```typescript
get updateTime(): string;
```

## Model.validationError

Error message when model validation fails.

<b>Signature:</b>

```typescript
get validationError(): string | undefined;
```

## Model.toJSON()

Return the model as a JSON object.

<b>Signature:</b>

```typescript
toJSON(): {
        [key: string]: any;
    };
```
<b>Returns:</b>

{ \[key: string\]: any; }

## Model.waitForUnlocked()

Wait for the model to be unlocked.

<b>Signature:</b>

```typescript
waitForUnlocked(maxTimeMillis?: number): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maxTimeMillis | number | The maximum time in milliseconds to wait. If not specified, a default maximum of 2 minutes is used. |

<b>Returns:</b>

Promise&lt;void&gt;

A promise that resolves when the model is unlocked or the maximum wait time has passed.

{% endblock body %}

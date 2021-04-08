A TensorFlow Lite Model output object

One of either the `gcsTfliteUri` or `automlModel` properties will be defined.

<b>Signature:</b>

```typescript
export interface TFLiteModel 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [automlModel](./firebase-admin.machine-learning.tflitemodel.md#tflitemodelautomlmodel) | string | The AutoML model reference from which the model was originally provided to Firebase. |
|  [gcsTfliteUri](./firebase-admin.machine-learning.tflitemodel.md#tflitemodelgcstfliteuri) | string | The URI from which the model was originally provided to Firebase. |
|  [sizeBytes](./firebase-admin.machine-learning.tflitemodel.md#tflitemodelsizebytes) | number | The size of the model. |

## TFLiteModel.automlModel

The AutoML model reference from which the model was originally provided to Firebase.

<b>Signature:</b>

```typescript
readonly automlModel?: string;
```

## TFLiteModel.gcsTfliteUri

The URI from which the model was originally provided to Firebase.

<b>Signature:</b>

```typescript
readonly gcsTfliteUri?: string;
```

## TFLiteModel.sizeBytes

The size of the model.

<b>Signature:</b>

```typescript
readonly sizeBytes: number;
```

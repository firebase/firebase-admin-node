{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin.machine-learning package{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [MachineLearning](./firebase-admin.machine-learning.machinelearning.md#machinelearning_class) | The Firebase <code>MachineLearning</code> service interface. |
|  [Model](./firebase-admin.machine-learning.model.md#model_class) | A Firebase ML Model output object. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getMachineLearning(app)](./firebase-admin.machine-learning.md#getmachinelearning) | Gets the [MachineLearning](./firebase-admin.machine-learning.machinelearning.md#machinelearning_class) service for the default app or a given app.<code>getMachineLearning()</code> can be called with no arguments to access the default app's {<code>MachineLearning</code> service or as <code>getMachineLearning(app)</code> to access the <code>MachineLearning</code> service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AutoMLTfliteModelOptions](./firebase-admin.machine-learning.automltflitemodeloptions.md#automltflitemodeloptions_interface) |  |
|  [GcsTfliteModelOptions](./firebase-admin.machine-learning.gcstflitemodeloptions.md#gcstflitemodeloptions_interface) |  |
|  [ListModelsOptions](./firebase-admin.machine-learning.listmodelsoptions.md#listmodelsoptions_interface) | Interface representing options for listing Models. |
|  [ListModelsResult](./firebase-admin.machine-learning.listmodelsresult.md#listmodelsresult_interface) | Response object for a listModels operation. |
|  [ModelOptionsBase](./firebase-admin.machine-learning.modeloptionsbase.md#modeloptionsbase_interface) | Firebase ML Model input objects |
|  [TFLiteModel](./firebase-admin.machine-learning.tflitemodel.md#tflitemodel_interface) | A TensorFlow Lite Model output object<!-- -->One of either the <code>gcsTfliteUri</code> or <code>automlModel</code> properties will be defined. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [ModelOptions](./firebase-admin.machine-learning.md#modeloptions) |  |

## getMachineLearning()

Gets the [MachineLearning](./firebase-admin.machine-learning.machinelearning.md#machinelearning_class) service for the default app or a given app.

`getMachineLearning()` can be called with no arguments to access the default app's {`MachineLearning` service or as `getMachineLearning(app)` to access the `MachineLearning` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getMachineLearning(app?: App): MachineLearning;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app whose <code>MachineLearning</code> service to return. If not provided, the default <code>MachineLearning</code> service will be returned. |

<b>Returns:</b>

[MachineLearning](./firebase-admin.machine-learning.machinelearning.md#machinelearning_class)

The default `MachineLearning` service if no app is provided or the `MachineLearning` service associated with the provided app.

### Example 1


```javascript
// Get the MachineLearning service for the default app
const defaultMachineLearning = getMachineLearning();

```

### Example 2


```javascript
// Get the MachineLearning service for a given app
const otherMachineLearning = getMachineLearning(otherApp);

```

## ModelOptions

<b>Signature:</b>

```typescript
export declare type ModelOptions = ModelOptionsBase | GcsTfliteModelOptions | AutoMLTfliteModelOptions;
```
{% endblock body %}

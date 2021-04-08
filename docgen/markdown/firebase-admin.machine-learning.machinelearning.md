The Firebase `MachineLearning` service interface.

<b>Signature:</b>

```typescript
export declare class MachineLearning 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.machine-learning.machinelearning.md#machinelearningapp) |  | App | The  associated with the current <code>MachineLearning</code> service instance. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [createModel(model)](./firebase-admin.machine-learning.machinelearning.md#machinelearningcreatemodel) |  | Creates a model in the current Firebase project. |
|  [deleteModel(modelId)](./firebase-admin.machine-learning.machinelearning.md#machinelearningdeletemodel) |  | Deletes a model from the current project. |
|  [getModel(modelId)](./firebase-admin.machine-learning.machinelearning.md#machinelearninggetmodel) |  | Gets the model specified by the given ID. |
|  [listModels(options)](./firebase-admin.machine-learning.machinelearning.md#machinelearninglistmodels) |  | Lists the current project's models. |
|  [publishModel(modelId)](./firebase-admin.machine-learning.machinelearning.md#machinelearningpublishmodel) |  | Publishes a Firebase ML model.<!-- -->A published model can be downloaded to client apps. |
|  [unpublishModel(modelId)](./firebase-admin.machine-learning.machinelearning.md#machinelearningunpublishmodel) |  | Unpublishes a Firebase ML model. |
|  [updateModel(modelId, model)](./firebase-admin.machine-learning.machinelearning.md#machinelearningupdatemodel) |  | Updates a model's metadata or model file. |

## MachineLearning.app

The  associated with the current `MachineLearning` service instance.

<b>Signature:</b>

```typescript
get app(): App;
```

## MachineLearning.createModel()

Creates a model in the current Firebase project.

<b>Signature:</b>

```typescript
createModel(model: ModelOptions): Promise<Model>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  model | [ModelOptions](./firebase-admin.machine-learning.md#modeloptions) | The model to create. A Promise fulfilled with the created model. |

<b>Returns:</b>

Promise&lt;[Model](./firebase-admin.machine-learning.model.md#model_class)<!-- -->&gt;

## MachineLearning.deleteModel()

Deletes a model from the current project.

<b>Signature:</b>

```typescript
deleteModel(modelId: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelId | string | The ID of the model to delete. |

<b>Returns:</b>

Promise&lt;void&gt;

## MachineLearning.getModel()

Gets the model specified by the given ID.

<b>Signature:</b>

```typescript
getModel(modelId: string): Promise<Model>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelId | string | The ID of the model to get. A Promise fulfilled with the model object. |

<b>Returns:</b>

Promise&lt;[Model](./firebase-admin.machine-learning.model.md#model_class)<!-- -->&gt;

## MachineLearning.listModels()

Lists the current project's models.

<b>Signature:</b>

```typescript
listModels(options?: ListModelsOptions): Promise<ListModelsResult>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [ListModelsOptions](./firebase-admin.machine-learning.listmodelsoptions.md#listmodelsoptions_interface) | The listing options. A promise that resolves with the current (filtered) list of models and the next page token. For the last page, an empty list of models and no page token are returned. |

<b>Returns:</b>

Promise&lt;[ListModelsResult](./firebase-admin.machine-learning.listmodelsresult.md#listmodelsresult_interface)<!-- -->&gt;

## MachineLearning.publishModel()

Publishes a Firebase ML model.

A published model can be downloaded to client apps.

<b>Signature:</b>

```typescript
publishModel(modelId: string): Promise<Model>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelId | string | The ID of the model to publish. A Promise fulfilled with the published model. |

<b>Returns:</b>

Promise&lt;[Model](./firebase-admin.machine-learning.model.md#model_class)<!-- -->&gt;

## MachineLearning.unpublishModel()

Unpublishes a Firebase ML model.

<b>Signature:</b>

```typescript
unpublishModel(modelId: string): Promise<Model>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelId | string | The ID of the model to unpublish. A Promise fulfilled with the unpublished model. |

<b>Returns:</b>

Promise&lt;[Model](./firebase-admin.machine-learning.model.md#model_class)<!-- -->&gt;

## MachineLearning.updateModel()

Updates a model's metadata or model file.

<b>Signature:</b>

```typescript
updateModel(modelId: string, model: ModelOptions): Promise<Model>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelId | string | The ID of the model to update. |
|  model | [ModelOptions](./firebase-admin.machine-learning.md#modeloptions) | The model fields to update. A Promise fulfilled with the updated model. |

<b>Returns:</b>

Promise&lt;[Model](./firebase-admin.machine-learning.model.md#model_class)<!-- -->&gt;


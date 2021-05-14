{% extends "_internal/templates/reference.html" %}
{% block title %}ListModelsResult interface{% endblock title %}
{% block body %}
Response object for a listModels operation.

<b>Signature:</b>

```typescript
export interface ListModelsResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [models](./firebase-admin.machine-learning.listmodelsresult.md#listmodelsresultmodels) | [Model](./firebase-admin.machine-learning.model.md#model_class)<!-- -->\[\] | A list of models in your project. |
|  [pageToken](./firebase-admin.machine-learning.listmodelsresult.md#listmodelsresultpagetoken) | string | A token you can use to retrieve the next page of results. If null, the current page is the final page. |

## ListModelsResult.models

A list of models in your project.

<b>Signature:</b>

```typescript
readonly models: Model[];
```

## ListModelsResult.pageToken

A token you can use to retrieve the next page of results. If null, the current page is the final page.

<b>Signature:</b>

```typescript
readonly pageToken?: string;
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}ListModelsOptions interface{% endblock title %}
{% block body %}
Interface representing options for listing Models.

<b>Signature:</b>

```typescript
export interface ListModelsOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [filter](./firebase-admin.machine-learning.listmodelsoptions.md#listmodelsoptionsfilter) | string | An expression that specifies how to filter the results.<!-- -->Examples:
```
display_name = your_model
display_name : experimental_*
tags: face_detector AND tags: experimental
state.published = true

```
See https://firebase.google.com/docs/ml/manage-hosted-models\#list\_your\_projects\_models |
|  [pageSize](./firebase-admin.machine-learning.listmodelsoptions.md#listmodelsoptionspagesize) | number | The number of results to return in each page. |
|  [pageToken](./firebase-admin.machine-learning.listmodelsoptions.md#listmodelsoptionspagetoken) | string | A token that specifies the result page to return. |

## ListModelsOptions.filter

An expression that specifies how to filter the results.

Examples:

```
display_name = your_model
display_name : experimental_*
tags: face_detector AND tags: experimental
state.published = true

```
See https://firebase.google.com/docs/ml/manage-hosted-models\#list\_your\_projects\_models

<b>Signature:</b>

```typescript
filter?: string;
```

## ListModelsOptions.pageSize

The number of results to return in each page.

<b>Signature:</b>

```typescript
pageSize?: number;
```

## ListModelsOptions.pageToken

A token that specifies the result page to return.

<b>Signature:</b>

```typescript
pageToken?: string;
```
{% endblock body %}

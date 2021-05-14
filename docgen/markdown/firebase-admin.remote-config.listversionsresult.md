{% extends "_internal/templates/reference.html" %}
{% block title %}ListVersionsResult interface{% endblock title %}
{% block body %}
Interface representing a list of Remote Config template versions.

<b>Signature:</b>

```typescript
export interface ListVersionsResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [nextPageToken](./firebase-admin.remote-config.listversionsresult.md#listversionsresultnextpagetoken) | string | Token to retrieve the next page of results, or empty if there are no more results in the list. |
|  [versions](./firebase-admin.remote-config.listversionsresult.md#listversionsresultversions) | [Version](./firebase-admin.remote-config.version.md#version_interface)<!-- -->\[\] | A list of version metadata objects, sorted in reverse chronological order. |

## ListVersionsResult.nextPageToken

Token to retrieve the next page of results, or empty if there are no more results in the list.

<b>Signature:</b>

```typescript
nextPageToken?: string;
```

## ListVersionsResult.versions

A list of version metadata objects, sorted in reverse chronological order.

<b>Signature:</b>

```typescript
versions: Version[];
```
{% endblock body %}

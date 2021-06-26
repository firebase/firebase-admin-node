{% extends "_internal/templates/reference.html" %}
{% block title %}RulesetMetadataList class{% endblock title %}
{% block body %}
A page of ruleset metadata.

<b>Signature:</b>

```typescript
export declare class RulesetMetadataList 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [nextPageToken](./firebase-admin.security-rules.rulesetmetadatalist.md#rulesetmetadatalistnextpagetoken) |  | string | The next page token if available. This is needed to retrieve the next batch. |
|  [rulesets](./firebase-admin.security-rules.rulesetmetadatalist.md#rulesetmetadatalistrulesets) |  | [RulesetMetadata](./firebase-admin.security-rules.rulesetmetadata.md#rulesetmetadata_interface)<!-- -->\[\] | A batch of ruleset metadata. |

## RulesetMetadataList.nextPageToken

The next page token if available. This is needed to retrieve the next batch.

<b>Signature:</b>

```typescript
readonly nextPageToken?: string;
```

## RulesetMetadataList.rulesets

A batch of ruleset metadata.

<b>Signature:</b>

```typescript
readonly rulesets: RulesetMetadata[];
```
{% endblock body %}

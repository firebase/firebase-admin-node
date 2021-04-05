{% extends "_internal/templates/reference.html" %}
{% block title %}Ruleset class{% endblock title %}
{% block body %}
A set of Firebase security rules.

<b>Signature:</b>

```typescript
export declare class Ruleset implements RulesetMetadata 
```
<b>Implements:</b> [RulesetMetadata](./firebase-admin.security-rules.rulesetmetadata.md#rulesetmetadata_interface)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [createTime](./firebase-admin.security-rules.ruleset.md#rulesetcreatetime) |  | string | Creation time of the <code>Ruleset</code> as a UTC timestamp string. |
|  [name](./firebase-admin.security-rules.ruleset.md#rulesetname) |  | string | Name of the <code>Ruleset</code> as a short string. This can be directly passed into APIs like  and . |
|  [source](./firebase-admin.security-rules.ruleset.md#rulesetsource) |  | [RulesFile](./firebase-admin.security-rules.rulesfile.md#rulesfile_interface)<!-- -->\[\] |  |

## Ruleset.createTime

Creation time of the `Ruleset` as a UTC timestamp string.

<b>Signature:</b>

```typescript
readonly createTime: string;
```

## Ruleset.name

Name of the `Ruleset` as a short string. This can be directly passed into APIs like  and .

<b>Signature:</b>

```typescript
readonly name: string;
```

## Ruleset.source

<b>Signature:</b>

```typescript
readonly source: RulesFile[];
```
{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}RulesetMetadata interface{% endblock title %}
{% block body %}
Required metadata associated with a ruleset.

<b>Signature:</b>

```typescript
export interface RulesetMetadata 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [createTime](./firebase-admin.security-rules.rulesetmetadata.md#rulesetmetadatacreatetime) | string | Creation time of the <code>Ruleset</code> as a UTC timestamp string. |
|  [name](./firebase-admin.security-rules.rulesetmetadata.md#rulesetmetadataname) | string | Name of the <code>Ruleset</code> as a short string. This can be directly passed into APIs like [SecurityRules.getRuleset()](./firebase-admin.security-rules.securityrules.md#securityrulesgetruleset) and [SecurityRules.deleteRuleset()](./firebase-admin.security-rules.securityrules.md#securityrulesdeleteruleset)<!-- -->. |

## RulesetMetadata.createTime

Creation time of the `Ruleset` as a UTC timestamp string.

<b>Signature:</b>

```typescript
readonly createTime: string;
```

## RulesetMetadata.name

Name of the `Ruleset` as a short string. This can be directly passed into APIs like [SecurityRules.getRuleset()](./firebase-admin.security-rules.securityrules.md#securityrulesgetruleset) and [SecurityRules.deleteRuleset()](./firebase-admin.security-rules.securityrules.md#securityrulesdeleteruleset)<!-- -->.

<b>Signature:</b>

```typescript
readonly name: string;
```
{% endblock body %}

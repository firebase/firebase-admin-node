{% extends "_internal/templates/reference.html" %}
{% block title %}RulesFile interface{% endblock title %}
{% block body %}
A source file containing some Firebase security rules. The content includes raw source code including text formatting, indentation and comments. Use the [SecurityRules.createRulesFileFromSource()](./firebase-admin.security-rules.securityrules.md#securityrulescreaterulesfilefromsource) method to create new instances of this type.

<b>Signature:</b>

```typescript
export interface RulesFile 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [content](./firebase-admin.security-rules.rulesfile.md#rulesfilecontent) | string |  |
|  [name](./firebase-admin.security-rules.rulesfile.md#rulesfilename) | string |  |

## RulesFile.content

<b>Signature:</b>

```typescript
readonly content: string;
```

## RulesFile.name

<b>Signature:</b>

```typescript
readonly name: string;
```
{% endblock body %}

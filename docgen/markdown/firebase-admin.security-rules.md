{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin.security-rules package{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [Ruleset](./firebase-admin.security-rules.ruleset.md#ruleset_class) | A set of Firebase security rules. |
|  [RulesetMetadataList](./firebase-admin.security-rules.rulesetmetadatalist.md#rulesetmetadatalist_class) | A page of ruleset metadata. |
|  [SecurityRules](./firebase-admin.security-rules.securityrules.md#securityrules_class) | The Firebase <code>SecurityRules</code> service interface. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getSecurityRules(app)](./firebase-admin.security-rules.md#getsecurityrules) | Gets the  service for the default app or a given app.<code>admin.securityRules()</code> can be called with no arguments to access the default app's  service, or as <code>admin.securityRules(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [RulesetMetadata](./firebase-admin.security-rules.rulesetmetadata.md#rulesetmetadata_interface) | Required metadata associated with a ruleset. |
|  [RulesFile](./firebase-admin.security-rules.rulesfile.md#rulesfile_interface) | A source file containing some Firebase security rules. The content includes raw source code including text formatting, indentation and comments. Use the \[<code>securityRules.createRulesFileFromSource()</code>\](securityRules.SecurityRules\#createRulesFileFromSource) method to create new instances of this type. |

## getSecurityRules()

Gets the  service for the default app or a given app.

`admin.securityRules()` can be called with no arguments to access the default app's  service, or as `admin.securityRules(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getSecurityRules(app?: App): SecurityRules;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app to return the <code>SecurityRules</code> service for. If not provided, the default <code>SecurityRules</code> service is returned.  The default <code>SecurityRules</code> service if no app is provided, or the <code>SecurityRules</code> service associated with the provided app. |

<b>Returns:</b>

[SecurityRules](./firebase-admin.security-rules.securityrules.md#securityrules_class)

### Example 1


```javascript
// Get the SecurityRules service for the default app
const defaultSecurityRules = getSecurityRules();

```

### Example 2

\`\`\`<!-- -->javascript // Get the SecurityRules service for a given app const otherSecurityRules = getSecurityRules(otherApp); \`\`\`

{% endblock body %}

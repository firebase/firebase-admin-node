{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin/security-rules module{% endblock title %}
{% block body %}
Security Rules for Cloud Firestore and Cloud Storage.

## Classes

|  Class | Description |
|  --- | --- |
|  [Ruleset](./firebase-admin.security-rules.ruleset.md#ruleset_class) | A set of Firebase security rules. |
|  [RulesetMetadataList](./firebase-admin.security-rules.rulesetmetadatalist.md#rulesetmetadatalist_class) | A page of ruleset metadata. |
|  [SecurityRules](./firebase-admin.security-rules.securityrules.md#securityrules_class) | The Firebase <code>SecurityRules</code> service interface. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getSecurityRules(app)](./firebase-admin.security-rules.md#getsecurityrules) | Gets the [SecurityRules](./firebase-admin.security-rules.securityrules.md#securityrules_class) service for the default app or a given app.<code>admin.securityRules()</code> can be called with no arguments to access the default app's <code>SecurityRules</code> service, or as <code>admin.securityRules(app)</code> to access the <code>SecurityRules</code> service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [RulesetMetadata](./firebase-admin.security-rules.rulesetmetadata.md#rulesetmetadata_interface) | Required metadata associated with a ruleset. |
|  [RulesFile](./firebase-admin.security-rules.rulesfile.md#rulesfile_interface) | A source file containing some Firebase security rules. The content includes raw source code including text formatting, indentation and comments. Use the [SecurityRules.createRulesFileFromSource()](./firebase-admin.security-rules.securityrules.md#securityrulescreaterulesfilefromsource) method to create new instances of this type. |

## getSecurityRules()

Gets the [SecurityRules](./firebase-admin.security-rules.securityrules.md#securityrules_class) service for the default app or a given app.

`admin.securityRules()` can be called with no arguments to access the default app's `SecurityRules` service, or as `admin.securityRules(app)` to access the `SecurityRules` service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getSecurityRules(app?: App): SecurityRules;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app to return the <code>SecurityRules</code> service for. If not provided, the default <code>SecurityRules</code> service is returned. |

<b>Returns:</b>

[SecurityRules](./firebase-admin.security-rules.securityrules.md#securityrules_class)

The default `SecurityRules` service if no app is provided, or the `SecurityRules` service associated with the provided app.

### Example 1


```javascript
// Get the SecurityRules service for the default app
const defaultSecurityRules = getSecurityRules();

```

### Example 2


```javascript
// Get the SecurityRules service for a given app
const otherSecurityRules = getSecurityRules(otherApp);

```

{% endblock body %}
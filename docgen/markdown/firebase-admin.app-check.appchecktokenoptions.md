{% extends "_internal/templates/reference.html" %}
{% block title %}AppCheckTokenOptions interface{% endblock title %}
{% block body %}
Interface representing App Check token options.

<b>Signature:</b>

```typescript
export interface AppCheckTokenOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [ttlMillis](./firebase-admin.app-check.appchecktokenoptions.md#appchecktokenoptionsttlmillis) | number | The length of time, in milliseconds, for which the App Check token will be valid. This value must be between 30 minutes and 7 days, inclusive. |

## AppCheckTokenOptions.ttlMillis

The length of time, in milliseconds, for which the App Check token will be valid. This value must be between 30 minutes and 7 days, inclusive.

<b>Signature:</b>

```typescript
ttlMillis?: number;
```
{% endblock body %}

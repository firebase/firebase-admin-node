{% extends "_internal/templates/reference.html" %}
{% block title %}FirebaseArrayIndexError interface{% endblock title %}
{% block body %}
Composite type which includes both a `FirebaseError` object and an index which can be used to get the errored item.

<b>Signature:</b>

```typescript
export interface FirebaseArrayIndexError 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [error](./firebase-admin.firebasearrayindexerror.md#firebasearrayindexerrorerror) | [FirebaseError](./firebase-admin.firebaseerror.md#firebaseerror_interface) | The error object. |
|  [index](./firebase-admin.firebasearrayindexerror.md#firebasearrayindexerrorindex) | number | The index of the errored item within the original array passed as part of the called API method. |

## FirebaseArrayIndexError.error

The error object.

<b>Signature:</b>

```typescript
error: FirebaseError;
```

## FirebaseArrayIndexError.index

The index of the errored item within the original array passed as part of the called API method.

<b>Signature:</b>

```typescript
index: number;
```

### Example


```javascript
var registrationTokens = [token1, token2, token3];
admin.messaging().subscribeToTopic(registrationTokens, 'topic-name')
  .then(function(response) {
    if (response.failureCount > 0) {
      console.log("Following devices unsucessfully subscribed to topic:");
      response.errors.forEach(function(error) {
        var invalidToken = registrationTokens[error.index];
        console.log(invalidToken, error.error);
      });
    } else {
      console.log("All devices successfully subscribed to topic:", response);
    }
  })
  .catch(function(error) {
    console.log("Error subscribing to topic:", error);
  });

```

{% endblock body %}

{% extends "_internal/templates/reference.html" %}
{% block title %}FirebaseError interface{% endblock title %}
{% block body %}
`FirebaseError` is a subclass of the standard JavaScript `Error` object. In addition to a message string and stack trace, it contains a string code.

<b>Signature:</b>

```typescript
export interface FirebaseError 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [code](./firebase-admin.firebaseerror.md#firebaseerrorcode) | string | Error codes are strings using the following format: <code>&quot;service/string-code&quot;</code>. Some examples include <code>&quot;auth/invalid-uid&quot;</code> and <code>&quot;messaging/invalid-recipient&quot;</code>.<!-- -->While the message for a given error can change, the code will remain the same between backward-compatible versions of the Firebase SDK. |
|  [message](./firebase-admin.firebaseerror.md#firebaseerrormessage) | string | An explanatory message for the error that just occurred.<!-- -->This message is designed to be helpful to you, the developer. Because it generally does not convey meaningful information to end users, this message should not be displayed in your application. |
|  [stack](./firebase-admin.firebaseerror.md#firebaseerrorstack) | string | A string value containing the execution backtrace when the error originally occurred.<!-- -->This information can be useful to you and can be sent to [Firebase Support](https://firebase.google.com/support) to help explain the cause of an error. |

## Methods

|  Method | Description |
|  --- | --- |
|  [toJSON()](./firebase-admin.firebaseerror.md#firebaseerrortojson) | Returns a JSON-serializable object representation of this error. |

## FirebaseError.code

Error codes are strings using the following format: `"service/string-code"`<!-- -->. Some examples include `"auth/invalid-uid"` and `"messaging/invalid-recipient"`<!-- -->.

While the message for a given error can change, the code will remain the same between backward-compatible versions of the Firebase SDK.

<b>Signature:</b>

```typescript
code: string;
```

## FirebaseError.message

An explanatory message for the error that just occurred.

This message is designed to be helpful to you, the developer. Because it generally does not convey meaningful information to end users, this message should not be displayed in your application.

<b>Signature:</b>

```typescript
message: string;
```

## FirebaseError.stack

A string value containing the execution backtrace when the error originally occurred.

This information can be useful to you and can be sent to [Firebase Support](https://firebase.google.com/support) to help explain the cause of an error.

<b>Signature:</b>

```typescript
stack?: string;
```

## FirebaseError.toJSON()

Returns a JSON-serializable object representation of this error.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

A JSON-serializable representation of this object.

{% endblock body %}

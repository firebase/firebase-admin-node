{% extends "_internal/templates/reference.html" %}
{% block title %}RemoteConfigCondition interface{% endblock title %}
{% block body %}
Interface representing a Remote Config condition. A condition targets a specific group of users. A list of these conditions make up part of a Remote Config template.

<b>Signature:</b>

```typescript
export interface RemoteConfigCondition 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [expression](./firebase-admin.remote-config.remoteconfigcondition.md#remoteconfigconditionexpression) | string | The logic of this condition. See the documentation on  for the expected syntax of this field. |
|  [name](./firebase-admin.remote-config.remoteconfigcondition.md#remoteconfigconditionname) | string | A non-empty and unique name of this condition. |
|  [tagColor](./firebase-admin.remote-config.remoteconfigcondition.md#remoteconfigconditiontagcolor) | [TagColor](./firebase-admin.remote-config.md#tagcolor) | The color associated with this condition for display purposes in the Firebase Console. Not specifying this value results in the console picking an arbitrary color to associate with the condition. |

## RemoteConfigCondition.expression

The logic of this condition. See the documentation on  for the expected syntax of this field.

<b>Signature:</b>

```typescript
expression: string;
```

## RemoteConfigCondition.name

A non-empty and unique name of this condition.

<b>Signature:</b>

```typescript
name: string;
```

## RemoteConfigCondition.tagColor

The color associated with this condition for display purposes in the Firebase Console. Not specifying this value results in the console picking an arbitrary color to associate with the condition.

<b>Signature:</b>

```typescript
tagColor?: TagColor;
```
{% endblock body %}

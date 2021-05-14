{% extends "_internal/templates/reference.html" %}
{% block title %}MulticastMessage interface{% endblock title %}
{% block body %}
Payload for the [Messaging.sendMulticast()](./firebase-admin.messaging.messaging.md#messagingsendmulticast) method. The payload contains all the fields in the BaseMessage type, and a list of tokens.

<b>Signature:</b>

```typescript
export interface MulticastMessage extends BaseMessage 
```
<b>Extends:</b> [BaseMessage](./firebase-admin.messaging.basemessage.md#basemessage_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [tokens](./firebase-admin.messaging.multicastmessage.md#multicastmessagetokens) | string\[\] |  |

## MulticastMessage.tokens

<b>Signature:</b>

```typescript
tokens: string[];
```
{% endblock body %}

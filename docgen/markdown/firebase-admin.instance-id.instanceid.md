{% extends "_internal/templates/reference.html" %}
{% block title %}InstanceId class{% endblock title %}
{% block body %}
The `InstanceId` service enables deleting the Firebase instance IDs associated with Firebase client app instances.

<b>Signature:</b>

```typescript
export declare class InstanceId 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin.instance-id.instanceid.md#instanceidapp) |  | App | Returns the app associated with this InstanceId instance. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [deleteInstanceId(instanceId)](./firebase-admin.instance-id.instanceid.md#instanceiddeleteinstanceid) |  | Deletes the specified instance ID and the associated data from Firebase.<!-- -->Note that Google Analytics for Firebase uses its own form of Instance ID to keep track of analytics data. Therefore deleting a Firebase Instance ID does not delete Analytics data. See [Delete an Instance ID](https://firebase.google.com/support/privacy/manage-iids#delete_an_instance_id) for more information. |

## InstanceId.app

Returns the app associated with this InstanceId instance.

<b>Signature:</b>

```typescript
get app(): App;
```

## InstanceId.deleteInstanceId()

Deletes the specified instance ID and the associated data from Firebase.

Note that Google Analytics for Firebase uses its own form of Instance ID to keep track of analytics data. Therefore deleting a Firebase Instance ID does not delete Analytics data. See [Delete an Instance ID](https://firebase.google.com/support/privacy/manage-iids#delete_an_instance_id) for more information.

<b>Signature:</b>

```typescript
deleteInstanceId(instanceId: string): Promise<void>;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  instanceId | string | The instance ID to be deleted. |

<b>Returns:</b>

Promise&lt;void&gt;

A promise fulfilled when the instance ID is deleted.

{% endblock body %}

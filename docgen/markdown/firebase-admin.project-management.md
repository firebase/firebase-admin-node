{% extends "_internal/templates/reference.html" %}
{% block title %}firebase-admin.project-management package{% endblock title %}
{% block body %}

## Classes

|  Class | Description |
|  --- | --- |
|  [AndroidApp](./firebase-admin.project-management.androidapp.md#androidapp_class) | A reference to a Firebase Android app.<!-- -->Do not call this constructor directly. Instead, use \[<code>projectManagement.androidApp()</code>\](projectManagement.ProjectManagement\#androidApp). |
|  [IosApp](./firebase-admin.project-management.iosapp.md#iosapp_class) | A reference to a Firebase iOS app.<!-- -->Do not call this constructor directly. Instead, use \[<code>projectManagement.iosApp()</code>\](projectManagement.ProjectManagement\#iosApp). |
|  [ProjectManagement](./firebase-admin.project-management.projectmanagement.md#projectmanagement_class) | The Firebase ProjectManagement service interface.<!-- -->Do not call this constructor directly. Instead, use \[<code>admin.projectManagement()</code>\](projectManagement\#projectManagement). |
|  [ShaCertificate](./firebase-admin.project-management.shacertificate.md#shacertificate_class) | A SHA-1 or SHA-256 certificate.<!-- -->Do not call this constructor directly. Instead, use \[<code>projectManagement.shaCertificate()</code>\](projectManagement.ProjectManagement\#shaCertificate). |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [AppPlatform](./firebase-admin.project-management.md#appplatform) | Platforms with which a Firebase App can be associated. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getProjectManagement(app)](./firebase-admin.project-management.md#getprojectmanagement) | Gets the  service for the default app or a given app.<code>getProjectManagement()</code> can be called with no arguments to access the default app's  service, or as <code>getProjectManagement(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AndroidAppMetadata](./firebase-admin.project-management.androidappmetadata.md#androidappmetadata_interface) | Metadata about a Firebase Android App. |
|  [AppMetadata](./firebase-admin.project-management.appmetadata.md#appmetadata_interface) | Metadata about a Firebase app. |
|  [IosAppMetadata](./firebase-admin.project-management.iosappmetadata.md#iosappmetadata_interface) | Metadata about a Firebase iOS App. |

## getProjectManagement()

Gets the  service for the default app or a given app.

`getProjectManagement()` can be called with no arguments to access the default app's  service, or as `getProjectManagement(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function getProjectManagement(app?: App): ProjectManagement;
```

### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | App | Optional app whose <code>ProjectManagement</code> service to return. If not provided, the default <code>ProjectManagement</code> service will be returned. \*  The default <code>ProjectManagement</code> service if no app is provided or the <code>ProjectManagement</code> service associated with the provided app. |

<b>Returns:</b>

[ProjectManagement](./firebase-admin.project-management.projectmanagement.md#projectmanagement_class)

### Example 1


```javascript
// Get the ProjectManagement service for the default app
const defaultProjectManagement = getProjectManagement();

```

### Example 2


```javascript
// Get the ProjectManagement service for a given app
const otherProjectManagement = getProjectManagement(otherApp);

```

## AppPlatform

Platforms with which a Firebase App can be associated.

<b>Signature:</b>

```typescript
export declare enum AppPlatform 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  ANDROID | <code>&quot;ANDROID&quot;</code> | The Firebase App is associated with Android. |
|  IOS | <code>&quot;IOS&quot;</code> | The Firebase App is associated with iOS. |
|  PLATFORM\_UNKNOWN | <code>&quot;PLATFORM_UNKNOWN&quot;</code> | Unknown state. This is only used for distinguishing unset values. |

{% endblock body %}

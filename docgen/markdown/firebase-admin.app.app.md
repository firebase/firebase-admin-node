{% extends "_internal/templates/reference.html" %}
{% block title %}App interface{% endblock title %}
{% block body %}
A Firebase app holds the initialization information for a collection of services.

Do not call this constructor directly. Instead, use  to create an app.

<b>Signature:</b>

```typescript
export interface App 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [name](./firebase-admin.app.app.md#appname) | string | The (read-only) name for this app.<!-- -->The default app's name is <code>&quot;[DEFAULT]&quot;</code>. |
|  [options](./firebase-admin.app.app.md#appoptions) | [AppOptions](./firebase-admin.app.appoptions.md#appoptions_interface) | The (read-only) configuration options for this app. These are the original parameters given in . |

## App.name

The (read-only) name for this app.

The default app's name is `"[DEFAULT]"`<!-- -->.

<b>Signature:</b>

```typescript
name: string;
```

### Example 1


```javascript
// The default app's name is "[DEFAULT]"
initializeApp(defaultAppConfig);
console.log(admin.app().name);  // "[DEFAULT]"

```

### Example 2


```javascript
// A named app's name is what you provide to initializeApp()
const otherApp = initializeApp(otherAppConfig, "other");
console.log(otherApp.name);  // "other"

```

## App.options

The (read-only) configuration options for this app. These are the original parameters given in .

<b>Signature:</b>

```typescript
options: AppOptions;
```

### Example


```javascript
const app = initializeApp(config);
console.log(app.options.credential === config.credential);  // true
console.log(app.options.databaseURL === config.databaseURL);  // true

```

{% endblock body %}

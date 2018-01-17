# Unreleased

# v5.8.0
- [added] Initialization - The `admin.initializeApp()` method can now be invoked without any arguments. This initializes an app using Google Application Default Credentials, and other `AppOptions` loaded from the `FIREBASE_CONFIG` environment variable.
- [changed] Auth - Upgraded the `jsonwebtoken` library to 8.1.0.

# v5.7.0
- [added] Auth - A new `revokeRefreshTokens()` method for revoking refresh tokens issued to a user.
- [added] Auth - The `verifyIdToken()` method now accepts an optional `checkRevoked` argument, which can be used to check if a given ID token has been revoked.

# v5.6.0
- [added] A new `admin.instanceId()` API that facilitates deleting instance IDs and associated user data from Firebase projects.
- [changed] Updated the TypeScript typings for `admin.AppOptions` to reflect the
  introduction of the `projectId` option.
- [changed] Removed some unused third party dependencies.

# v5.5.1
- [changed] Cloud Firestore - Upgraded the Cloud Firestore client to the latest available version, which adds input validation to several operations, and retry logic to handle network errors.
- [changed] Database - Fixed an issue in the TypeScript typings of the {{database}} API.

# v5.5.0
- [added] Database - `app.database()`  method now optionally accepts a database URL. This feature can be used to access multiple Realtime Database instances from the same app.
- [changed] Database - Upgraded the Realtime Database client to the latest available version.
- [changed] Cloud Firestore - Upgraded the Cloud Firestore client to the latest available
  version.

# v5.4.3
- [changed] Fixed a regression in module loading that prevented using the Admin SDK in environments like AWS Lambda. This regression was introduced in the 5.4.0 release, which added a new dependency to Firestore and gRPC. This fix lazily loads Firestore and gRPC, thus enabling Admin SDK usage in the affected environments as long as no explicit attempts are made to use the Firestore API.

# v5.4.2
- [changed] Upgraded the Cloud Firestore client dependency to 0.8.2, which resolves an issue with saving objects with nested document references.

# v5.4.1
- [changed] Upgraded the Firestore client dependency to 0.8.1, which resolves the installation issues reported in the Yarn environment.

# v5.4.0
- [added] A new `admin.firestore()` API that facilitates accessing Google Cloud Firestore  databases using the `@google-cloud/firestore` library. 

# v5.3.0
- [changed] SDK now retries outbound HTTP calls on all low-level I/O errors.

### {{auth}}

- [added] A new [`setCustomUserClaims()`](/docs/reference/admin/node/admin.auth.Auth#setCustomUserClaims)
  method for setting custom claims on user accounts. Custom claims set via this
  method become available on the ID tokens of the corresponding users when they
  sign in. To learn how to use this API for controlling access to Firebase
  resources, see
  [Control Access with Custom Claims and Security Rules](/docs/auth/admin/custom-claims).
- [added] A new [`listUsers()`](/docs/reference/admin/node/admin.auth.Auth#listUsers)
  method for listing all the users in a Firebase project in batches.

### {{storage}}

- [changed] Declared a more concrete TypeScript return type (`Bucket`) for the
  [`bucket()`](/docs/reference/admin/node/admin.storage.Storage#bucket) method
  in the {{storage}} API.

# v5.2.1

- [changed] A bug in the TypeScript type declarations that come bundled with the
  SDK (`index.d.ts`) has been fixed.

# v5.2.0

- [added] A new [{{firebase_storage}} API](/docs/reference/admin/node/admin.storage)
  that facilitates accessing Google Cloud Storage buckets using the
  [`@google-cloud/storage`](https://googlecloudplatform.github.io/google-cloud-node/#/docs/storage/latest/storage)
  library.

### {{auth}}

- [changed] New type definitions for the arguments of `createUser()` and
  `updateUser()` methods.

### {{messaging_longer}}

- [changed] Redefined the arguments of `sendToDevice()` using intersection
  instead of overloading.

# v5.1.0
### {{auth}}

- [added] Added the method
  [`getUserByPhoneNumber()`](/docs/reference/admin/node/admin.auth.Auth#getUserByPhoneNumber)
  to the [`admin.auth`](/docs/reference/admin/node/admin.auth) interface. This method
  enables retrieving user profile information by a phone number.
- [added] [`createUser()`](/docs/reference/admin/node/admin.auth.Auth#createUser)
  and [`updateUser()`](/docs/reference/admin/node/admin.auth.Auth#updateUser) methods
  now accept a `phoneNumber` property, which can be used to create users with a phone
  number field and/or update the phone number associated with a user.
- [added] Added the `phoneNumber` field to
  [`admin.auth.UserRecord`](/docs/reference/admin/node/admin.auth.UserRecord),
  which exposes the phone number associated with a user account.
- [added] Added the `phoneNumber` field to
  [`admin.auth.UserInfo`](/docs/reference/admin/node/admin.auth.UserInfo),
  which exposes the phone number associated with a user account by a linked
  identity provider.

# v5.0.1
- [changed] Improved the error messages thrown in the case of network and RPC
  errors. These errors now include outgoing HTTP request details that make
  it easier to localize and debug issues.

### {{auth}}

- [changed] Implemented support in the user management API for handling photo
  URLs with special characters.

# v5.0.0

### Initialization

- [changed] The deprecated `serviceAccount` property in the
  [`admin.App.Options`](/docs/reference/admin/node/admin.app.AppOptions)
  type has been removed in favor of the `credential` property.
- [changed] Initializing the SDK without setting a credential
  results in an exception.
- [changed] Initializing the SDK with a malformed private key string
  results in an exception.

### {{auth}}

- [changed] `createdAt` and `lastSignedInAt` properties in
  [`admin.auth.UserMetadata`](/docs/reference/admin/node/admin.auth.UserMetadata)
  have been renamed to `creationTime` and `lastSignInTime`. Also these
  properties now provide UTC formatted strings instead of `Date` values.

# v4.2.1

- [changed] Updated the SDK to periodically refresh the OAuth access token
  internally used by `FirebaseApp`. This reduces the number of authentication
  failures encountered at runtime by SDK components like {{database}}.

# v4.2.0

### {{messaging_longer}}

- [added] Added the methods
  [`subscribeToTopic()`](/docs/reference/admin/node/admin.messaging.Messaging#subscribeToTopic)
  and
  [`unsubscribeFromTopic()`](/docs/reference/admin/node/admin.messaging.Messaging#unsubscribeFromTopic)
  to the [`admin.messaging()`](/docs/reference/admin/node/admin.messaging)
  service. The new methods allow subscribing to and unsubscribing from {{messaging}}
  topics via registration tokens.

# v4.1.4

### {{auth}}

- [changed] Cleaned up a number of types to improve the log output, thereby
  making debugging easier.

### {{database}}

- [changed] Fixed an issue which could cause infinite loops when using `push()`
  with no arguments.

# v4.1.3
- [changed] Fixed incorrect usage of `undefined` - as opposed to `void` - in
  several places in the TypeScript typings.
- [changed] Added missing properties to the TypeScript typings for
  [`DecodedIdToken`](/docs/reference/admin/node/admin.auth.DecodedIdToken).
- [changed] Fixed issues when using some types with the TypeScript
  `strictNullChecks` option enabled.
- [changed] Removed incorrect `admin.Promise` type from the TypeScript typings
  in favor of the Node.js built-in `Promise` type, which the SDK actually uses.
- [changed] Added error codes to all app-level errors. All errors in the SDK
  now properly implement the
  [`FirebaseError`](/docs/reference/admin/node/admin.FirebaseError) interface.
- [changed] Improved error handling when initializing the SDK with a credential
  that cannot generate valid access tokens.
- [added] Added new `admin.database.EventType` to the TypeScript typings.

### {{database}}

- [changed] Improved how the {{database}} reports errors when provided with
  various types of invalid credentials.


# v4.1.2
### {{auth}}

- [changed] Improved input validation and error messages for all user
  management methods.
- [changed]
  [`verifyIdToken()`](/docs/reference/admin/node/admin.auth.Auth#verifyIdToken)
  now works with non-cert credentials, assuming the `GCLOUD_PROJECT` environment
  variable is set to your project ID, which is the case when running on Google
  infrastructure such as Google App Engine and Google Compute Engine.

### {{database}}

- [changed] Added `toJSON()` methods to the `DataSnapshot` and `Query` objects
  to make them properly JSON-serializable.

### {{messaging_longer}}

- [changed] Improved response parsing when
  [`sendToDevice()`](/docs/reference/admin/node/admin.messaging.Messaging#sendToDevice)
  and
  [`sendToDeviceGroup()`](/docs/reference/admin/node/admin.messaging.Messaging#sendToDeviceGroup)
  are provided with unexpected inputs.


# v4.1.1
- [changed] Added in missing TypeScript typings for the `FirebaseError.toJSON()`
  method.

### {{auth}}

- [changed] Fixed issue with
  [`createUser()`](/docs/reference/admin/node/admin.auth.Auth#createUser)
  which sometimes caused multiple users to share the same email.


# v4.1.0
- [changed] Added in missing TypeScript typings for the `toJSON()` method off
  of several objects.

### {{messaging_longer}}

- [added] A new
  [`admin.messaging()`](/docs/reference/admin/node/admin.messaging) service
  allows you to send messages through
  [Firebase Cloud Messaging](/docs/cloud-messaging/admin/). The new service
  includes the
  [`sendToDevice()`](/docs/reference/admin/node/admin.messaging.Messaging#sendToDevice),
  [`sendToDeviceGroup()`](/docs/reference/admin/node/admin.messaging.Messaging#sendToDeviceGroup),
  [`sendToTopic()`](/docs/reference/admin/node/admin.messaging.Messaging#sendToTopic),
  and
  [`sendToCondition()`](/docs/reference/admin/node/admin.messaging.Messaging#sendToCondition)
  methods.


# v4.0.6
### Initialization

- [changed] Fixed an issue which caused importing the library via the ES2015
  import syntax (`import * as admin from "firebase-admin"`) to not work
  properly.


# v4.0.5
- [changed] TypeScript support has been greatly improved. Typings for the
  {{database}} are now available and all other known issues with incorrect or
  incomplete type information have been resolved.

### Initialization

- [changed] Fixed an issue which caused the SDK to appear to hang when provided
  with a credential that generated invalid access tokens. The most common cause
  of this was using a credential whose access had been revoked. Now, an error
  will be logged to the console in this scenario.

### {{auth}}

- [added] The error message for an `auth/internal-error` error now includes
  the raw server response to more easily debug and track down unhandled errors.
- [changed] Fixed an issue that caused an `auth/internal-error` error to be
  thrown when calling
  [`getUser()`](/docs/reference/admin/node/admin.auth.Auth#getUser) or
  [`getUserByEmail()`](/docs/reference/admin/node/admin.auth.Auth#getUserByEmail)
  for a user without a creation date.
- [changed] Fixed an issue which caused an `auth/internal-error` error to be
  thrown when calling
  [`createUser()`](/docs/reference/admin/node/admin.auth.Auth#createUser) with
  an email that corresponds to an existing user.
- [changed] Fixed an issue which caused an `auth/internal-error` error to be
  thrown when calling {{auth}} methods with a credential with insufficient
  permission. Now, an `auth/insufficient-permission` error will be thrown
  instead.


# v4.0.4
### {{auth}}

- [changed] Fixed an issue that caused several {{auth}} methods to throw
  an error when provided with inputs containing Unicode characters.


# v4.0.3
### Initialization

- [changed] Fixed an issue that caused a `null` value for the
  `databaseAuthVariableOverride` property to be ignored when passed as part
  of the first argument to
  [`initializeApp()`](/docs/reference/admin/node/admin#.initializeApp), which
  caused the app to still have full admin access. Now, passing this value has
  the expected behavior: the app has unauthenticated access to the
  {{database}}, and behaves as if no user is logged into the app.

### {{auth}}

- [changed] Fixed an issue that caused an `auth/invalid-uid` error to
  be thrown for valid `uid` values passed to several {{auth}} methods.


# v4.0.2
- [added] Improved error messages throughout the Admin Node.js SDK.
- [changed] Upgraded dependencies so that the Admin Node.js SDK no longer
  throws warnings for using deprecated `Buffer` APIs in Node.js `7.x.x`.


# v4.0.1
- [changed] Fixed issue which caused the [`4.0.0`](#4.0.0) release to not
  include the `README.md` and `npm-shrinkwrap.json` files.


# v4.0.0
- [added] The Admin Node.js SDK (available on npm as `firebase-admin`) is a
  new SDK which replaces and expands the admin capabilities of the standard
  `firebase` npm module. See
  [Add the Firebase Admin SDK to your Server](/docs/admin/setup/) to get
  started.
- {{issue}} This version does not include the `README.md` and
  `npm-shrinkwrap.json` files. This was fixed in version [`4.0.1`](#4.0.1).

### Initialization

- {{deprecated}} The `serviceAccount` property of the options passed as the
  first argument to
  [`initializeApp()`](/docs/reference/admin/node/admin#.initializeApp) has been
  deprecated in favor of a new `credential` property. See
  [Initialize the SDK](/docs/admin/setup/#initialize_the_sdk) for more details.
- [added] The new
  [`admin.credential.cert()`](/docs/reference/admin/node/admin.credential#.cert)
  method allows you to authenticate the SDK with a service account key file.
- [added] The new
  [`admin.credential.refreshToken()`](/docs/reference/admin/node/admin.credential#.refreshToken)
  method allows you to authenticate the SDK with a Google OAuth2 refresh token.
- [added] The new
  [`admin.credential.applicationDefault()`](/docs/reference/admin/node/admin.credential#.applicationDefault)
  method allows you to authenticate the SDK with Google Application Default
  Credentials.

### {{auth}}

- [added] A new Admin API for managing your {{firebase_auth}} users is now
  available. This API lets you manage your users without using their existing
  credentials, and without worrying about client-side rate limiting. The new
  methods included in this API are
  [`getUser()`](/docs/reference/admin/node/admin.auth.Auth#getUser),
  [`getUserByEmail()`](/docs/reference/admin/node/admin.auth.Auth#getUserByEmail),
  [`createUser()`](/docs/reference/admin/node/admin.auth.Auth#createUser),
  [`updateUser()`](/docs/reference/admin/node/admin.auth.Auth#updateUser), and
  [`deleteUser()`](/docs/reference/admin/node/admin.auth.Auth#deleteUser). See
  [Manage Users](/docs/auth/admin/manage-users) for more details.
- {{changed}} The
  [`createCustomToken()`](/docs/reference/admin/node/admin.auth.Auth#createCustomToken)
  method is now asynchronous, returning a `Promise<string>` instead of a
  `string`.

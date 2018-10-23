# Unreleased

-

# v6.1.0

- [added] Exposed the `CollectionReference`, `WriteBatch`, `WriteResult` and
  `QueryDocumentSnapshot` types from the `admin.firestore` namespace.

# v6.0.0

- [changed] Upgraded Cloud Firestore client to v0.16.0.
- [changed] Firestore and Storage client libraries are now defined as optional
  dependencies.
- [changed] Dropped support for Node.js 4.

# v5.13.1

- [changed] Upgraded Cloud Firestore client to v0.15.4.
- [changed] Exposed the Firestore `Timestamp` type from the `admin.firestore`
  namespace.

# v5.13.0

- [changed] Admin SDK can now create custom tokens without being initialized
  with service account credentials. When a service account private key is not
  available, the SDK uses the remote IAM service to sign JWTs in the cloud.
- [changed] Updated the typings of the `admin.database.Query.once()`
  method to return a more specific type.
- [changed] Admin SDK can now read the Firebase/GCP project ID from both
  `GCLOUD_PROJECT` and `GOOGLE_CLOUD_PROJECT` environment variables.
- [changed] Updated the `WebpushNotification` typings to match
  [the current API](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#webpushconfig).
- [changed] Upgraded Cloud Firestore client to v0.15.2.

# v5.12.1

- [changed] Admin SDK now lazy loads all child namespaces and certain heavy
  dependencies for faster load times. This change also ensures that only
  the sources for namespaces that are actually used get loaded into the
  Node.js process.
- [changed] Upgraded Cloud Firestore client to v0.14.0.

# v5.12.0

- [feature] Added the session cookie management APIs for creating and verifying
  session cookies, via `auth.createSessionCookie()` and
  `auth.verifySessionCookie()`.
- [added] Added the `mutableContent` optional field to the `Aps` type of
  the FCM API.
- [added] Added the support for specifying arbitrary custom key-value
  fields in the `Aps` type.

# v5.11.0

- [changed] Added the `auth.importUsers()` method for importing users to
  Firebase Auth in bulk.

# v5.10.0

- [changed] Upgraded Realtime Database client to v0.2.0. With this upgrade
  developers can call the `admin.database().ref()` method with another
  `Reference` instance as the argument.
- [changed] Upgraded Cloud Firestore client to v0.13.0.

# v5.9.1

- [changed] The `admin.initializeApp()` method can now be invoked without an
  explicit `credential` option. In that case the SDK will get initialized with
  Google application default credentials.
- [changed] Upgraded Realtime Database client to v0.1.11.
- [changed] Modified the Realtime Database client integration to report the
  correct user agent header.
- [changed] Upgraded Cloud Firestire client to v0.12.0.
- [changed] Improved error handling in FCM by mapping more server-side errors
  to client-side error codes.

# v5.9.0

- [added] Added the `messaging.send()` method and the new `Message` type for
  sending Cloud Messaging notifications via the
  [new FCM REST endpoint](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages).

# v5.8.2

- [changed] Exposed `admin.firestore.DocumentReference` and
  `admin.firestore.DocumentSnapshot` types from the Admin SDK typings.
- [changed] Upgraded Firestore dependency version to
  [0.11.2](https://github.com/googleapis/nodejs-firestore/releases/tag/v0.11.2).

# v5.8.1

- [changed] Upgraded Firestore dependency version from 0.10.0 to 0.11.1.
  This includes several bug fixes in Cloud Firestore.

# v5.8.0

### Initialization

- [added] The [`admin.initializeApp()`](https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp)
  method can now be invoked without any arguments. This initializes an app
  using Google Application Default Credentials, and other
  [`AppOptions`](https://firebase.google.com/docs/reference/admin/node/admin.app.AppOptions) loaded from
  the `FIREBASE_CONFIG` environment variable.

### Authentication

- [changed] Upgraded the `jsonwebtoken` library to 8.1.0.

# v5.7.0

### Authentication

- [added] A new [`revokeRefreshTokens()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#revokeRefreshTokens)
  method for revoking refresh tokens issued to a user.
- [added] The [`verifyIdToken()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#verifyIdToken)
  method now accepts an optional `checkRevoked` argument, which can be used to
  check if a given ID token has been revoked.

# v5.6.0

- [added] A new [`admin.instanceId()`](https://firebase.google.com/docs/reference/admin/node/admin.instanceId)
  API that facilitates deleting instance IDs and associated user data from
  Firebase projects.
- [changed] Updated the TypeScript typings for `admin.AppOptions` to reflect the
  introduction of the `projectId` option.
- [changed] Removed some unused third party dependencies.

# v5.5.1

### Cloud Firestore

- [changed] Upgraded the Cloud Firestore client to the latest available
  version, which adds input validation to several operations, and retry logic
  to handle network errors.

### Realtime Database

- [changed] Fixed an issue in the TypeScript typings of the Realtime Database API.

# v5.5.0

### Realtime Database

- [added] [`app.database()`](https://firebase.google.com/docs/reference/admin/node/admin.app.App#database)
  method now optionally accepts a database URL. This feature can be used to
  access multiple Realtime Database instances from the same app.
- [changed] Upgraded the Realtime Database client to the latest available
  version.

### Cloud Firestore

- [changed] Upgraded the Cloud Firestore client to the latest available
  version.

# v5.4.3

- [changed] Fixed a regression in module loading that prevented using
  the Admin SDK in environments like AWS Lambda. This regression was
  introduced in the 5.4.0 release, which added a new dependency to Firestore
  and gRPC. This fix lazily loads Firestore and gRPC, thus enabling
  Admin SDK usage in the affected environments as long as no explicit
  attempts are made to use the Firestore API.


# v5.4.2

- [changed] Upgraded the Cloud Firestore client dependency to 0.8.2, which
  resolves an issue with saving objects with nested document references.

# v5.4.1

- [changed] Upgraded the Firestore client dependency to 0.8.1, which resolves
  the installation issues reported in the Yarn environment.

# v5.4.0

- [added] A new [`admin.firestore()`](https://firebase.google.com/docs/reference/admin/node/admin.firestore)
  API that facilitates accessing [Google Cloud Firestore](https://firebase.google.com/docs/firestore)
  databases using the
  [`@google-cloud/firestore`](https://cloud.google.com/nodejshttps://firebase.google.com/docs/reference/firestore/latest/)
  library. See [Set Up Your Node.js App for Cloud Firestore](https://firebase.google.com/docs/firestore/server/setup-node)
  to get started.

# v5.3.0

- [changed] SDK now retries outbound HTTP calls on all low-level I/O errors.

### Authentication

- [added] A new [`setCustomUserClaims()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#setCustomUserClaims)
  method for setting custom claims on user accounts. Custom claims set via this
  method become available on the ID tokens of the corresponding users when they
  sign in. To learn how to use this API for controlling access to Firebase
  resources, see
  [Control Access with Custom Claims and Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims).
- [added] A new [`listUsers()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listUsers)
  method for listing all the users in a Firebase project in batches.

### Storage

- [changed] Declared a more concrete TypeScript return type (`Bucket`) for the
  [`bucket()`](https://firebase.google.com/docs/reference/admin/node/admin.storage.Storage#bucket) method
  in the Storage API.

# v5.2.1

- [changed] A bug in the TypeScript type declarations that come bundled with the
  SDK (`index.d.ts`) has been fixed.

# v5.2.0
- [added] A new [Cloud Storage API](https://firebase.google.com/docs/reference/admin/node/admin.storage)
  that facilitates accessing Google Cloud Storage buckets using the
  [`@google-cloud/storage`](https://googlecloudplatform.github.io/google-cloud-node/#https://firebase.google.com/docs/storage/latest/storage)
  library.

### Authentication

- [changed] New type definitions for the arguments of `createUser()` and
  `updateUser()` methods.

### Cloud Messaging

- [changed] Redefined the arguments of `sendToDevice()` using intersection
  instead of overloading.

# v5.1.0

### Authentication

- [added] Added the method
  [`getUserByPhoneNumber()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#getUserByPhoneNumber)
  to the [`admin.auth`](https://firebase.google.com/docs/reference/admin/node/admin.auth) interface. This method
  enables retrieving user profile information by a phone number.
- [added] [`createUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createUser)
  and [`updateUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#updateUser) methods
  now accept a `phoneNumber` property, which can be used to create users with a phone
  number field and/or update the phone number associated with a user.
- [added] Added the `phoneNumber` field to
  [`admin.auth.UserRecord`](https://firebase.google.com/docs/reference/admin/node/admin.auth.UserRecord),
  which exposes the phone number associated with a user account.
- [added] Added the `phoneNumber` field to
  [`admin.auth.UserInfo`](https://firebase.google.com/docs/reference/admin/node/admin.auth.UserInfo),
  which exposes the phone number associated with a user account by a linked
  identity provider.

# v5.0.1

- [changed] Improved the error messages thrown in the case of network and RPC
  errors. These errors now include outgoing HTTP request details that make
  it easier to localize and debug issues.

### Authentication

- [changed] Implemented support in the user management API for handling photo
  URLs with special characters.

# v5.0.0

### Initialization

- [changed] The deprecated `serviceAccount` property in the
  [`admin.App.Options`](https://firebase.google.com/docs/reference/admin/node/admin.app.AppOptions)
  type has been removed in favor of the `credential` property.
- [changed] Initializing the SDK without setting a credential
  results in an exception.
- [changed] Initializing the SDK with a malformed private key string
  results in an exception.

### Authentication

- [changed] `createdAt` and `lastSignedInAt` properties in
  [`admin.auth.UserMetadata`](https://firebase.google.com/docs/reference/admin/node/admin.auth.UserMetadata)
  have been renamed to `creationTime` and `lastSignInTime`. Also these
  properties now provide UTC formatted strings instead of `Date` values.

# v4.2.1

- [changed] Updated the SDK to periodically refresh the OAuth access token
  internally used by `FirebaseApp`. This reduces the number of authentication
  failures encountered at runtime by SDK components like Realtime Database.

# v4.2.0

### Cloud Messaging

- [added] Added the methods
  [`subscribeToTopic()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#subscribeToTopic)
  and
  [`unsubscribeFromTopic()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#unsubscribeFromTopic)
  to the [`admin.messaging()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging)
  service. The new methods allow subscribing to and unsubscribing from {{messaging}}
  topics via registration tokens.

# v4.1.4

### Authentication

- [changed] Cleaned up a number of types to improve the log output, thereby
  making debugging easier.

### Realtime Database

- [changed] Fixed an issue which could cause infinite loops when using `push()`
  with no arguments.

# v4.1.3

- [changed] Fixed incorrect usage of `undefined` - as opposed to `void` - in
  several places in the TypeScript typings.
- [changed] Added missing properties to the TypeScript typings for
  [`DecodedIdToken`](https://firebase.google.com/docs/reference/admin/node/admin.auth.DecodedIdToken).
- [changed] Fixed issues when using some types with the TypeScript
  `strictNullChecks` option enabled.
- [changed] Removed incorrect `admin.Promise` type from the TypeScript typings
  in favor of the Node.js built-in `Promise` type, which the SDK actually uses.
- [changed] Added error codes to all app-level errors. All errors in the SDK
  now properly implement the
  [`FirebaseError`](https://firebase.google.com/docs/reference/admin/node/admin.FirebaseError) interface.
- [changed] Improved error handling when initializing the SDK with a credential
  that cannot generate valid access tokens.
- [added] Added new `admin.database.EventType` to the TypeScript typings.

### Realtime Database

- [changed] Improved how the Realtime Database reports errors when provided with
  various types of invalid credentials.

# v4.1.2

### Authentication

- [changed] Improved input validation and error messages for all user
  management methods.
- [changed]
  [`verifyIdToken()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#verifyIdToken)
  now works with non-cert credentials, assuming the `GCLOUD_PROJECT` environment
  variable is set to your project ID, which is the case when running on Google
  infrastructure such as Google App Engine and Google Compute Engine.

### Realtime Database

- [changed] Added `toJSON()` methods to the `DataSnapshot` and `Query` objects
  to make them properly JSON-serializable.

### Cloud Messaging

- [changed] Improved response parsing when
  [`sendToDevice()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToDevice)
  and
  [`sendToDeviceGroup()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToDeviceGroup)
  are provided with unexpected inputs.


# v4.1.1

- [changed] Added in missing TypeScript typings for the `FirebaseError.toJSON()`
  method.

### Authentication

- [changed] Fixed issue with
  [`createUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createUser)
  which sometimes caused multiple users to share the same email.


# v4.1.0

- [changed] Added in missing TypeScript typings for the `toJSON()` method off
  of several objects.

### Cloud Messaging

- [added] A new
  [`admin.messaging()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging) service
  allows you to send messages through
  [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/admin/). The new service
  includes the
  [`sendToDevice()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToDevice),
  [`sendToDeviceGroup()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToDeviceGroup),
  [`sendToTopic()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToTopic),
  and
  [`sendToCondition()`](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Messaging#sendToCondition)
  methods.


# v4.0.6

### Initialization

- [changed] Fixed an issue which caused importing the library via the ES2015
  import syntax (`import * as admin from "firebase-admin"`) to not work
  properly.


# v4.0.5

- [changed] TypeScript support has been greatly improved. Typings for the
  Realtime Database are now available and all other known issues with incorrect or
  incomplete type information have been resolved.

### Initialization

- [changed] Fixed an issue which caused the SDK to appear to hang when provided
  with a credential that generated invalid access tokens. The most common cause
  of this was using a credential whose access had been revoked. Now, an error
  will be logged to the console in this scenario.

### Authentication

- [added] The error message for an `auth/internal-error` error now includes
  the raw server response to more easily debug and track down unhandled errors.
- [changed] Fixed an issue that caused an `auth/internal-error` error to be
  thrown when calling
  [`getUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#getUser) or
  [`getUserByEmail()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#getUserByEmail)
  for a user without a creation date.
- [changed] Fixed an issue which caused an `auth/internal-error` error to be
  thrown when calling
  [`createUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createUser) with
  an email that corresponds to an existing user.
- [changed] Fixed an issue which caused an `auth/internal-error` error to be
  thrown when calling Authentication methods with a credential with insufficient
  permission. Now, an `auth/insufficient-permission` error will be thrown
  instead.


# v4.0.4

### Authentication

- [changed] Fixed an issue that caused several Authentication methods to throw
  an error when provided with inputs containing Unicode characters.


# v4.0.3

### Initialization

- [changed] Fixed an issue that caused a `null` value for the
  `databaseAuthVariableOverride` property to be ignored when passed as part
  of the first argument to
  [`initializeApp()`](https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp), which
  caused the app to still have full admin access. Now, passing this value has
  the expected behavior: the app has unauthenticated access to the
  Realtime Database, and behaves as if no user is logged into the app.

### Authentication

- [changed] Fixed an issue that caused an `auth/invalid-uid` error to
  be thrown for valid `uid` values passed to several Authentication methods.


# v4.0.2

- [added] Improved error messages throughout the Admin Node.js SDK.
- [changed] Upgraded dependencies so that the Admin Node.js SDK no longer
  throws warnings for using deprecated `Buffer` APIs in Node.js `7.x.x`.


# v4.0.1

- [changed] Fixed issue which caused the 4.0.0 release to not
  include the `README.md` and `npm-shrinkwrap.json` files.


# v4.0.0

- [added] The Admin Node.js SDK (available on npm as `firebase-admin`) is a
  new SDK which replaces and expands the admin capabilities of the standard
  `firebase` npm module. See
  [Add the Firebase Admin SDK to your Server](https://firebase.google.com/docs/admin/setup/) to get
  started.
- [issue] This version does not include the `README.md` and
  `npm-shrinkwrap.json` files. This was fixed in version 4.0.1.

### Initialization

- [deprecated] The `serviceAccount` property of the options passed as the
  first argument to
  [`initializeApp()`](https://firebase.google.com/docs/reference/admin/node/admin#.initializeApp) has been
  deprecated in favor of a new `credential` property. See
  [Initialize the SDK](https://firebase.google.com/docs/admin/setup/#initialize_the_sdk) for more details.
- [added] The new
  [`admin.credential.cert()`](https://firebase.google.com/docs/reference/admin/node/admin.credential#.cert)
  method allows you to authenticate the SDK with a service account key file.
- [added] The new
  [`admin.credential.refreshToken()`](https://firebase.google.com/docs/reference/admin/node/admin.credential#.refreshToken)
  method allows you to authenticate the SDK with a Google OAuth2 refresh token.
- [added] The new
  [`admin.credential.applicationDefault()`](https://firebase.google.com/docs/reference/admin/node/admin.credential#.applicationDefault)
  method allows you to authenticate the SDK with Google Application Default
  Credentials.

### Authentication

- [added] A new Admin API for managing your Firebase Authentication users is now
  available. This API lets you manage your users without using their existing
  credentials, and without worrying about client-side rate limiting. The new
  methods included in this API are
  [`getUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#getUser),
  [`getUserByEmail()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#getUserByEmail),
  [`createUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createUser),
  [`updateUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#updateUser), and
  [`deleteUser()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#deleteUser). See
  [Manage Users](https://firebase.google.com/docs/auth/admin/manage-users) for more details.
- [changed] The
  [`createCustomToken()`](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#createCustomToken)
  method is now asynchronous, returning a `Promise<string>` instead of a
  `string`.

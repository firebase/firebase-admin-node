Posted with additional links and information to https://firebase.google.com/support/release-notes/admin/node

# Unreleased
- 

# v5.8.0
- [added] Initialization - The `admin.initializeApp()` method can now be invoked without any arguments. This initializes an app using Google Application Default Credentials, and other `AppOptions` loaded from the `FIREBASE_CONFIG` environment variable.
- [changed] Auth - Upgraded the `jsonwebtoken` library to 8.1.0.

# v5.7.0
- [added] Auth - A new `revokeRefreshTokens()` method for revoking refresh tokens issued to a user.
- [added] Auth - The `verifyIdToken()` method now accepts an optional `checkRevoked` argument, which can be used to check if a given ID token has been revoked.

# v5.6.0
- [added] A new `admin.instanceId()` API that facilitates deleting instance IDs and associated user data from Firebase projects.
- [changed] Updated the TypeScript typings for `admin.AppOptions` to reflect the introduction of the `projectId` option.
- [changed] Removed some unused third party dependencies.

# v5.5.1
- [changed] Cloud Firestore - Upgraded the Cloud Firestore client to the latest available version, which adds input validation to several operations, and retry logic to handle network errors.
- [changed] Realtime Database - Fixed an issue in the TypeScript typings of the Realtime Database API.

# v5.5.0
- [added] Realtime Database - `app.database()` method now optionally accepts a database URL. This feature can be used to access multiple Realtime Database instances from the same app.
- [changed] Realtime Database - Upgraded the Realtime Database client to the latest available version.
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
- [added] Auth - A new `setCustomUserClaims()` method for setting custom claims on user accounts. Custom claims set via this  method become available on the ID tokens of the corresponding users when they sign in. 
- [added] Auth - A new `listUsers()` method for listing all the users in a Firebase project in batches.
- [changed] Storage - Declared a more concrete TypeScript return type (`Bucket`) for the `bucket()` method in the Storage API.

# v5.2.1
- [changed] A bug in the TypeScript type declarations that come bundled with the SDK (`index.d.ts`) has been fixed.

# v5.2.0
- [added] A new Firebase Storage API that facilitates accessing Google Cloud Storage buckets using the `@google-cloud/storage` library.
- [changed] Auth - New type definitions for the arguments of `createUser()` and `updateUser()` methods.
- [changed] Cloud Messaging - Redefined the arguments of `sendToDevice()` using intersection instead of overloading.

# v5.1.0
- [added] Auth - Added the method `getUserByPhoneNumber()` to the `admin.auth` interface. This method enables retrieving user profile information by a phone number.
- [added] Auth - `createUser()` and `updateUser()` methods now accept a `phoneNumber` property, which can be used to create users with a phone number field and/or update the phone number associated with a user.
- [added] Auth - Added the `phoneNumber` field to `admin.auth.UserRecord` which exposes the phone number associated with a user account.
- [added] Auth - Added the `phoneNumber` field to `admin.auth.UserInfo` which exposes the phone number associated with a user account by a linked identity provider.

# v5.0.1
- [changed] Improved the error messages thrown in the case of network and RPC errors. These errors now include outgoing HTTP request details that make it easier to localize and debug issues.
- [changed] Auth - Implemented support in the user management API for handling photo URLs with special characters.

# v5.0.0
- [changed] The deprecated `serviceAccount` property in the `admin.App.Options` type has been removed in favor of the `credential` property.
- [changed] Initializing the SDK without setting a credential results in an exception.
- [changed] Initializing the SDK with a malformed private key string results in an exception.
- [changed] Auth - `createdAt` and `lastSignedInAt` properties in `admin.auth.UserMetadata` have been renamed to `creationTime` and `lastSignInTime`. Also these properties now provide UTC formatted strings instead of `Date` values.

# v4.2.1
- [changed] Updated the SDK to periodically refresh the OAuth access token internally used by `FirebaseApp`. This reduces the number of authentication failures encountered at runtime by SDK components like Realtime Database.

# v4.2.0
- [added] Cloud Messaging - Added the methods `subscribeToTopic()` and `unsubscribeFromTopic()` to the `admin.messaging()`  service. The new methods allow subscribing to and unsubscribing from FCM topics via registration tokens.

# v4.1.4
- [changed] Auth - Cleaned up a number of types to improve the log output, thereby making debugging easier.
- [changed] Realtime Database - Fixed an issue which could cause infinite loops when using `push()` with no arguments.

# v4.1.3
- [changed] Fixed incorrect usage of `undefined` - as opposed to `void` - in several places in the TypeScript typings.
- [changed] Added missing properties to the TypeScript typings for `DecodedIdToken`.
- [changed] Fixed issues when using some types with the TypeScript `strictNullChecks` option enabled.
- [changed] Removed incorrect `admin.Promise` type from the TypeScript typings in favor of the Node.js built-in `Promise` type, which the SDK actually uses.
- [changed] Added error codes to all app-level errors. All errors in the SDK now properly implement the `FirebaseError` interface.
- [changed] Improved error handling when initializing the SDK with a credential that cannot generate valid access tokens.
- [added] Added new `admin.database.EventType` to the TypeScript typings.
- [changed] Realtime Database - Improved how the Realtime Database reports errors when provided with various types of invalid credentials.

# v4.1.2
- [changed] Auth - Improved input validation and error messages for all user management methods.
- [changed] Auth - `verifyIdToken()` now works with non-cert credentials, assuming the `GCLOUD_PROJECT` environment  variable is set to your project ID, which is the case when running on Google infrastructure such as Google App Engine and Google Compute Engine.
- [changed] Realtime Database - Added `toJSON()` methods to the `DataSnapshot` and `Query` objects to make them properly JSON-serializable.
- [changed] Cloud Messaging - Improved response parsing when `sendToDevice()` and `sendToDeviceGroup()` are provided with unexpected inputs.

# v4.1.1
- [changed] Added in missing TypeScript typings for the `FirebaseError.toJSON()` method.
- [changed] Auth - Fixed issue with `createUser()` which sometimes caused multiple users to share the same email.

# v4.1.0
- [changed] Added in missing TypeScript typings for the `toJSON()` method off of several objects.
- [added] Cloud Messaging - A new `admin.messaging()` service allows you to send messages through Firebase Cloud Messaging. The new service includes the `sendToDevice()`, `sendToDeviceGroup()`, `sendToTopic()`, and `sendToCondition()` methods.

# v4.0.6
- [changed] Fixed an issue which caused importing the library via the ES2015 import syntax (`import * as admin from "firebase-admin"`) to not work properly.

# v4.0.5
- [changed] TypeScript support has been greatly improved. Typings for the Realtime Database are now available and all other known issues with incorrect or incomplete type information have been resolved.
- [changed] Fixed an issue which caused the SDK to appear to hang when provided with a credential that generated invalid access tokens. The most common cause of this was using a credential whose access had been revoked. Now, an error will be logged to the console in this scenario.
- [added] Auth - The error message for an `auth/internal-error` error now includes the raw server response to more easily debug and track down unhandled errors.
- [changed] Auth - Fixed an issue that caused an `auth/internal-error` error to be thrown when calling `getUser()` or `getUserByEmail()` for a user without a creation date.
- [changed] Auth - Fixed an issue which caused an `auth/internal-error` error to be  thrown when calling `createUser()` with  an email that corresponds to an existing user.
- [changed] Auth Fixed an issue which caused an `auth/internal-error` error to be  thrown when calling Authentication methods with a credential with insufficient permission. Now, an `auth/insufficient-permission` error will be thrown  instead.

# v4.0.4
- [changed] Auth - Fixed an issue that caused several Authentication methods to throw an error when provided with inputs containing Unicode characters.

# v4.0.3
- [changed] Fixed an issue that caused a `null` value for the `databaseAuthVariableOverride` property to be ignored when passed as part of the first argument to `initializeApp()`, which caused the app to still have full admin access. Now, passing this value has the expected behavior: the app has unauthenticated access to the Realtime Database, and behaves as if no user is logged into the app.
- [changed] Auth - Fixed an issue that caused an `auth/invalid-uid` error to be thrown for valid `uid` values passed to several Authentication methods.

# v4.0.2
- [added] Improved error messages throughout the Admin Node.js SDK.
- [changed] Upgraded dependencies so that the Admin Node.js SDK no longer throws warnings for using deprecated `Buffer` APIs in Node.js `7.x.x`.

# v4.0.1
- [changed] Fixed issue which caused the v4.0.0 release to not include the `README.md` and `npm-shrinkwrap.json` files.

# v4.0.0
- [added] The Admin Node.js SDK (available on npm as `firebase-admin`) is a new SDK which replaces and expands the admin capabilities of the standard `firebase` npm module.
- [issue] This version does not include the `README.md` and `npm-shrinkwrap.json` files. This was fixed in v4.0.1.
- [deprecated] The `serviceAccount` property of the options passed as the first argument to `initializeApp()` has been
  deprecated in favor of a new `credential` property. 
- [added] The new `admin.credential.cert()` method allows you to authenticate the SDK with a service account key file.
- [added] The new `admin.credential.refreshToken()` method allows you to authenticate the SDK with a Google OAuth2 refresh token.
- [added] The new `admin.credential.applicationDefault()` method allows you to authenticate the SDK with Google Application Default Credentials.
- [added] Auth - A new Admin API for managing your Firebase Authentication users is now available. This API lets you manage your users without using their existing credentials, and without worrying about client-side rate limiting. The new methods included in this API are`getUser()`, `getUserByEmail()`, `createUser()`, `updateUser()`, and`deleteUser()`. 
- [changed] Auth - The `createCustomToken()` method is now asynchronous, returning a `Promise<string>` instead of a `string`.

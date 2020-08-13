/*!
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { UserRecord } from './user-record';
import { UserIdentifier } from './identifier';
import { FirebaseArrayIndexError } from '../utils/error';
import { BaseAuth } from './auth-internal';


/** Represents the result of the {@link admin.auth.getUsers()} API. */
export interface GetUsersResult {
  /**
   * Set of user records, corresponding to the set of users that were
   * requested. Only users that were found are listed here. The result set is
   * unordered.
   */
  users: UserRecord[];

  /** Set of identifiers that were requested, but not found. */
  notFound: UserIdentifier[];
}


/**
 * Interface representing the object returned from a
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listUsers `listUsers()`} operation. Contains the list
 * of users for the current batch and the next page token if available.
 */
export interface ListUsersResult {
  /**
   * The list of {@link admin.auth.UserRecord `UserRecord`} objects for the
   * current downloaded batch.
   */
  users: UserRecord[];
  /**
   * The next page token if available. This is needed for the next batch download.
   */
  pageToken?: string;
}

/**
 * Represents the result of the
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#deleteUsers `deleteUsers()`}
 * API.
 */
export interface DeleteUsersResult {
  /**
   * The number of user records that failed to be deleted (possibly zero).
   */
  failureCount: number;
  /**
   * The number of users that were deleted successfully (possibly zero).
   * Users that did not exist prior to calling `deleteUsers()` are
   * considered to be successfully deleted.
   */
  successCount: number;
  /**
   * A list of `FirebaseArrayIndexError` instances describing the errors that
   * were encountered during the deletion. Length of this list is equal to
   * the return value of [`failureCount`](#failureCount).
   */
  errors: FirebaseArrayIndexError[];
}


/**
 * Interface representing a decoded Firebase ID token, returned from the
 * {@link https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#verifyidtoken `verifyIdToken()`} method.
 *
 * Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs).
 * See the
 * [ID Token section of the OpenID Connect spec](http://openid.net/specs/openid-connect-core-1_0.html#IDToken)
 * for more information about the specific properties below.
 */
export interface DecodedIdToken {

  /**
   * The audience for which this token is intended.
   *
   * This value is a string equal to your Firebase project ID, the unique
   * identifier for your Firebase project, which can be found in [your project's
   * settings](https://console.firebase.google.com/project/_/settings/general/android:com.random.android).
   */
  aud: string;

  /**
   * Time, in seconds since the Unix epoch, when the end-user authentication
   * occurred.
   *
   * This value is not set when this particular ID token was created, but when the
   * user initially logged in to this session. In a single session, the Firebase
   * SDKs will refresh a user's ID tokens every hour. Each ID token will have a
   * different [`iat`](#iat) value, but the same `auth_time` value.
   */
  auth_time: number;
  /**
   * The email of the user to whom the ID token belongs, if available.
   */
  email?: string;

  /**
   * Whether or not the email of the user to whom the ID token belongs is
   * verified, provided the user has an email.
   */
  email_verified?: boolean;

  /**
   * The ID token's expiration time, in seconds since the Unix epoch. That is, the
   * time at which this ID token expires and should no longer be considered valid.
   *
   * The Firebase SDKs transparently refresh ID tokens every hour, issuing a new
   * ID token with up to a one hour expiration.
   */
  exp: number;

  /**
   * Information about the sign in event, including which sign in provider was
   * used and provider-specific identity details.
   *
   * This data is provided by the Firebase Authentication service and is a
   * reserved claim in the ID token.
   */
  firebase: {
    /**
     * Provider-specific identity details corresponding
     * to the provider used to sign in the user.
     */
    identities: {
      [key: string]: any;
    };

    /**
     * The ID of the provider used to sign in the user.
     * One of `"anonymous"`, `"password"`, `"facebook.com"`, `"github.com"`,
     * `"google.com"`, `"twitter.com"`, or `"custom"`.
     */
    sign_in_provider: string;

    /**
     * The type identifier or `factorId` of the second factor, provided the
     * ID token was obtained from a multi-factor authenticated user.
     * For phone, this is `"phone"`.
     */
    sign_in_second_factor?: string;

    /**
     * The `uid` of the second factor used to sign in, provided the
     * ID token was obtained from a multi-factor authenticated user.
     */
    second_factor_identifier?: string;
    [key: string]: any;
  };

  /**
   * The ID token's issued-at time, in seconds since the Unix epoch. That is, the
   * time at which this ID token was issued and should start to be considered
   * valid.
   *
   * The Firebase SDKs transparently refresh ID tokens every hour, issuing a new
   * ID token with a new issued-at time. If you want to get the time at which the
   * user session corresponding to the ID token initially occurred, see the
   * [`auth_time`](#auth_time) property.
   */
  iat: number;

  /**
   * The issuer identifier for the issuer of the response.
   *
   * This value is a URL with the format
   * `https://securetoken.google.com/<PROJECT_ID>`, where `<PROJECT_ID>` is the
   * same project ID specified in the [`aud`](#aud) property.
   */
  iss: string;

  /**
   * The phone number of the user to whom the ID token belongs, if available.
   */
  phone_number?: string;

  /**
   * The photo URL for the user to whom the ID token belongs, if available.
   */
  picture?: string;

  /**
   * The `uid` corresponding to the user who the ID token belonged to.
   *
   * As a convenience, this value is copied over to the [`uid`](#uid) property.
   */
  sub: string;
  tenant?: string;

  /**
   * The `uid` corresponding to the user who the ID token belonged to.
   *
   * This value is not actually in the JWT token claims itself. It is added as a
   * convenience, and is set as the value of the [`sub`](#sub) property.
   */
  uid: string;
  [key: string]: any;
}

/** Interface representing the session cookie options. */
export interface SessionCookieOptions {
  expiresIn: number;
}


/**
 * Tenant-aware `Auth` interface used for managing users, configuring SAML/OIDC providers,
 * generating email links for password reset, email verification, etc for specific tenants.
 *
 * Multi-tenancy support requires Google Cloud's Identity Platform
 * (GCIP). To learn more about GCIP, including pricing and features,
 * see the [GCIP documentation](https://cloud.google.com/identity-platform)
 *
 * Each tenant contains its own identity providers, settings and sets of users.
 * Using `TenantAwareAuth`, users for a specific tenant and corresponding OIDC/SAML
 * configurations can also be managed, ID tokens for users signed in to a specific tenant
 * can be verified, and email action links can also be generated for users belonging to the
 * tenant.
 *
 * `TenantAwareAuth` instances for a specific `tenantId` can be instantiated by calling
 * `auth.tenantManager().authForTenant(tenantId)`.
 */
export interface TenantAwareAuth extends BaseAuth {

  /**
   * The tenant identifier corresponding to this `TenantAwareAuth` instance.
   * All calls to the user management APIs, OIDC/SAML provider management APIs, email link
   * generation APIs, etc will only be applied within the scope of this tenant.
   */
  tenantId: string;
}

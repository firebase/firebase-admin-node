/*!
 * @license
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

import { deepCopy } from '../utils/deep-copy';
import { isNonNullObject } from '../utils/validator';
import * as utils from '../utils';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';

/**
 * 'REDACTED', encoded as a base64 string.
 */
const B64_REDACTED = Buffer.from('REDACTED').toString('base64');

/**
 * Parses a time stamp string or number and returns the corresponding date if valid.
 *
 * @param time - The unix timestamp string or number in milliseconds.
 * @returns The corresponding date as a UTC string, if valid. Otherwise, null.
 */
function parseDate(time: any): string | null {
  try {
    const date = new Date(parseInt(time, 10));
    if (!isNaN(date.getTime())) {
      return date.toUTCString();
    }
  } catch (e) {
    // Do nothing. null will be returned.
  }
  return null;
}

export interface MultiFactorInfoResponse {
  mfaEnrollmentId: string;
  displayName?: string;
  phoneInfo?: string;
  enrolledAt?: string;
  [key: string]: any;
}

export interface ProviderUserInfoResponse {
  rawId: string;
  displayName?: string;
  email?: string;
  photoUrl?: string;
  phoneNumber?: string;
  providerId: string;
  federatedId?: string;
}

export interface GetAccountInfoUserResponse {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  displayName?: string;
  photoUrl?: string;
  disabled?: boolean;
  passwordHash?: string;
  salt?: string;
  customAttributes?: string;
  validSince?: string;
  tenantId?: string;
  providerUserInfo?: ProviderUserInfoResponse[];
  mfaInfo?: MultiFactorInfoResponse[];
  createdAt?: string;
  lastLoginAt?: string;
  lastRefreshAt?: string;
  [key: string]: any;
}

enum MultiFactorId {
  Phone = 'phone',
}

/**
 * Interface representing the common properties of a user-enrolled second factor.
 */
export abstract class MultiFactorInfo {

  /**
   * The ID of the enrolled second factor. This ID is unique to the user.
   */
  public readonly uid: string;

  /**
   * The optional display name of the enrolled second factor.
   */
  public readonly displayName?: string;

  /**
   * The type identifier of the second factor. For SMS second factors, this is `phone`.
   */
  public readonly factorId: string;

  /**
   * The optional date the second factor was enrolled, formatted as a UTC string.
   */
  public readonly enrollmentTime?: string;

  /**
   * Initializes the MultiFactorInfo associated subclass using the server side.
   * If no MultiFactorInfo is associated with the response, null is returned.
   *
   * @param response - The server side response.
   * @internal
   */
  public static initMultiFactorInfo(response: MultiFactorInfoResponse): MultiFactorInfo | null {
    let multiFactorInfo: MultiFactorInfo | null = null;
    // Only PhoneMultiFactorInfo currently available.
    try {
      multiFactorInfo = new PhoneMultiFactorInfo(response);
    } catch (e) {
      // Ignore error.
    }
    return multiFactorInfo;
  }

  /**
   * Initializes the MultiFactorInfo object using the server side response.
   *
   * @param response - The server side response.
   * @constructor
   * @internal
   */
  constructor(response: MultiFactorInfoResponse) {
    this.initFromServerResponse(response);
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    return {
      uid: this.uid,
      displayName: this.displayName,
      factorId: this.factorId,
      enrollmentTime: this.enrollmentTime,
    };
  }

  /**
   * Returns the factor ID based on the response provided.
   *
   * @param response - The server side response.
   * @returns The multi-factor ID associated with the provided response. If the response is
   *     not associated with any known multi-factor ID, null is returned.
   *
   * @internal
   */
  protected abstract getFactorId(response: MultiFactorInfoResponse): string | null;

  /**
   * Initializes the MultiFactorInfo object using the provided server response.
   *
   * @param response - The server side response.
   */
  private initFromServerResponse(response: MultiFactorInfoResponse): void {
    const factorId = response && this.getFactorId(response);
    if (!factorId || !response || !response.mfaEnrollmentId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid multi-factor info response');
    }
    utils.addReadonlyGetter(this, 'uid', response.mfaEnrollmentId);
    utils.addReadonlyGetter(this, 'factorId', factorId);
    utils.addReadonlyGetter(this, 'displayName', response.displayName);
    // Encoded using [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) format.
    // For example, "2017-01-15T01:30:15.01Z".
    // This can be parsed directly via Date constructor.
    // This can be computed using Data.prototype.toISOString.
    if (response.enrolledAt) {
      utils.addReadonlyGetter(
        this, 'enrollmentTime', new Date(response.enrolledAt).toUTCString());
    } else {
      utils.addReadonlyGetter(this, 'enrollmentTime', null);
    }
  }
}

/**
 * Interface representing a phone specific user-enrolled second factor.
 */
export class PhoneMultiFactorInfo extends MultiFactorInfo {

  /**
   * The phone number associated with a phone second factor.
   */
  public readonly phoneNumber: string;

  /**
   * Initializes the PhoneMultiFactorInfo object using the server side response.
   *
   * @param response - The server side response.
   * @constructor
   * @internal
   */
  constructor(response: MultiFactorInfoResponse) {
    super(response);
    utils.addReadonlyGetter(this, 'phoneNumber', response.phoneInfo);
  }

  /**
   * {@inheritdoc MultiFactorInfo.toJSON}
   */
  public toJSON(): object {
    return Object.assign(
      super.toJSON(),
      {
        phoneNumber: this.phoneNumber,
      });
  }

  /**
   * Returns the factor ID based on the response provided.
   *
   * @param response - The server side response.
   * @returns The multi-factor ID associated with the provided response. If the response is
   *     not associated with any known multi-factor ID, null is returned.
   *
   * @internal
   */
  protected getFactorId(response: MultiFactorInfoResponse): string | null {
    return (response && response.phoneInfo) ? MultiFactorId.Phone : null;
  }
}

/**
 * The multi-factor related user settings.
 */
export class MultiFactorSettings {

  /**
   * List of second factors enrolled with the current user.
   * Currently only phone second factors are supported.
   */
  public enrolledFactors: MultiFactorInfo[];

  /**
   * Initializes the MultiFactor object using the server side or JWT format response.
   *
   * @param response - The server side response.
   * @constructor
   * @internal
   */
  constructor(response: GetAccountInfoUserResponse) {
    const parsedEnrolledFactors: MultiFactorInfo[] = [];
    if (!isNonNullObject(response)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid multi-factor response');
    } else if (response.mfaInfo) {
      response.mfaInfo.forEach((factorResponse) => {
        const multiFactorInfo = MultiFactorInfo.initMultiFactorInfo(factorResponse);
        if (multiFactorInfo) {
          parsedEnrolledFactors.push(multiFactorInfo);
        }
      });
    }
    // Make enrolled factors immutable.
    utils.addReadonlyGetter(
      this, 'enrolledFactors', Object.freeze(parsedEnrolledFactors));
  }

  /**
   * Returns a JSON-serializable representation of this multi-factor object.
   *
   * @returns A JSON-serializable representation of this multi-factor object.
   */
  public toJSON(): object {
    return {
      enrolledFactors: this.enrolledFactors.map((info) => info.toJSON()),
    };
  }
}

/**
 * Represents a user's metadata.
 */
export class UserMetadata {

  /**
   * The date the user was created, formatted as a UTC string.
   */
  public readonly creationTime: string;

  /**
   * The date the user last signed in, formatted as a UTC string.
   */
  public readonly lastSignInTime: string;

  /**
   * The time at which the user was last active (ID token refreshed),
   * formatted as a UTC Date string (eg 'Sat, 03 Feb 2001 04:05:06 GMT').
   * Returns null if the user was never active.
   */
  public readonly lastRefreshTime?: string | null;

  /**
   * @param response - The server side response returned from the getAccountInfo
   *     endpoint.
   * @constructor
   * @internal
   */
  constructor(response: GetAccountInfoUserResponse) {
    // Creation date should always be available but due to some backend bugs there
    // were cases in the past where users did not have creation date properly set.
    // This included legacy Firebase migrating project users and some anonymous users.
    // These bugs have already been addressed since then.
    utils.addReadonlyGetter(this, 'creationTime', parseDate(response.createdAt));
    utils.addReadonlyGetter(this, 'lastSignInTime', parseDate(response.lastLoginAt));
    const lastRefreshAt = response.lastRefreshAt ? new Date(response.lastRefreshAt).toUTCString() : null;
    utils.addReadonlyGetter(this, 'lastRefreshTime', lastRefreshAt);
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    return {
      lastSignInTime: this.lastSignInTime,
      creationTime: this.creationTime,
    };
  }
}

/**
 * Represents a user's info from a third-party identity provider
 * such as Google or Facebook.
 */
export class UserInfo {

  /**
   * The user identifier for the linked provider.
   */
  public readonly uid: string;

  /**
   * The display name for the linked provider.
   */
  public readonly displayName: string;

  /**
   * The email for the linked provider.
   */
  public readonly email: string;

  /**
   * The photo URL for the linked provider.
   */
  public readonly photoURL: string;

  /**
   * The linked provider ID (for example, "google.com" for the Google provider).
   */
  public readonly providerId: string;

  /**
   * The phone number for the linked provider.
   */
  public readonly phoneNumber: string;


  /**
   * @param response - The server side response returned from the `getAccountInfo`
   *     endpoint.
   * @constructor
   * @internal
   */
  constructor(response: ProviderUserInfoResponse) {
    // Provider user id and provider id are required.
    if (!response.rawId || !response.providerId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid user info response');
    }

    utils.addReadonlyGetter(this, 'uid', response.rawId);
    utils.addReadonlyGetter(this, 'displayName', response.displayName);
    utils.addReadonlyGetter(this, 'email', response.email);
    utils.addReadonlyGetter(this, 'photoURL', response.photoUrl);
    utils.addReadonlyGetter(this, 'providerId', response.providerId);
    utils.addReadonlyGetter(this, 'phoneNumber', response.phoneNumber);
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    return {
      uid: this.uid,
      displayName: this.displayName,
      email: this.email,
      photoURL: this.photoURL,
      providerId: this.providerId,
      phoneNumber: this.phoneNumber,
    };
  }
}

/**
 * Represents a user.
 */
export class UserRecord {

  /**
   * The user's `uid`.
   */
  public readonly uid: string;

  /**
   * The user's primary email, if set.
   */
  public readonly email?: string;

  /**
   * Whether or not the user's primary email is verified.
   */
  public readonly emailVerified: boolean;

  /**
   * The user's display name.
   */
  public readonly displayName?: string;

  /**
   * The user's photo URL.
   */
  public readonly photoURL?: string;

  /**
   * The user's primary phone number, if set.
   */
  public readonly phoneNumber?: string;

  /**
   * Whether or not the user is disabled: `true` for disabled; `false` for
   * enabled.
   */
  public readonly disabled: boolean;

  /**
   * Additional metadata about the user.
   */
  public readonly metadata: UserMetadata;

  /**
   * An array of providers (for example, Google, Facebook) linked to the user.
   */
  public readonly providerData: UserInfo[];

  /**
   * The user's hashed password (base64-encoded), only if Firebase Auth hashing
   * algorithm (SCRYPT) is used. If a different hashing algorithm had been used
   * when uploading this user, as is typical when migrating from another Auth
   * system, this will be an empty string. If no password is set, this is
   * null. This is only available when the user is obtained from
   * {@link BaseAuth.listUsers}.
   */
  public readonly passwordHash?: string;

  /**
   * The user's password salt (base64-encoded), only if Firebase Auth hashing
   * algorithm (SCRYPT) is used. If a different hashing algorithm had been used to
   * upload this user, typical when migrating from another Auth system, this will
   * be an empty string. If no password is set, this is null. This is only
   * available when the user is obtained from {@link BaseAuth.listUsers}.
   */
  public readonly passwordSalt?: string;

  /**
   * The user's custom claims object if available, typically used to define
   * user roles and propagated to an authenticated user's ID token.
   * This is set via {@link BaseAuth.setCustomUserClaims}
   */
  public readonly customClaims?: {[key: string]: any};

  /**
   * The ID of the tenant the user belongs to, if available.
   */
  public readonly tenantId?: string | null;

  /**
   * The date the user's tokens are valid after, formatted as a UTC string.
   * This is updated every time the user's refresh token are revoked either
   * from the {@link BaseAuth.revokeRefreshTokens}
   * API or from the Firebase Auth backend on big account changes (password
   * resets, password or email updates, etc).
   */
  public readonly tokensValidAfterTime?: string;

  /**
   * The multi-factor related properties for the current user, if available.
   */
  public readonly multiFactor?: MultiFactorSettings;

  /**
   * @param response - The server side response returned from the getAccountInfo
   *     endpoint.
   * @constructor
   * @internal
   */
  constructor(response: GetAccountInfoUserResponse) {
    // The Firebase user id is required.
    if (!response.localId) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Invalid user response');
    }

    utils.addReadonlyGetter(this, 'uid', response.localId);
    utils.addReadonlyGetter(this, 'email', response.email);
    utils.addReadonlyGetter(this, 'emailVerified', !!response.emailVerified);
    utils.addReadonlyGetter(this, 'displayName', response.displayName);
    utils.addReadonlyGetter(this, 'photoURL', response.photoUrl);
    utils.addReadonlyGetter(this, 'phoneNumber', response.phoneNumber);
    // If disabled is not provided, the account is enabled by default.
    utils.addReadonlyGetter(this, 'disabled', response.disabled || false);
    utils.addReadonlyGetter(this, 'metadata', new UserMetadata(response));
    const providerData: UserInfo[] = [];
    for (const entry of (response.providerUserInfo || [])) {
      providerData.push(new UserInfo(entry));
    }
    utils.addReadonlyGetter(this, 'providerData', providerData);

    // If the password hash is redacted (probably due to missing permissions)
    // then clear it out, similar to how the salt is returned. (Otherwise, it
    // *looks* like a b64-encoded hash is present, which is confusing.)
    if (response.passwordHash === B64_REDACTED) {
      utils.addReadonlyGetter(this, 'passwordHash', undefined);
    } else {
      utils.addReadonlyGetter(this, 'passwordHash', response.passwordHash);
    }

    utils.addReadonlyGetter(this, 'passwordSalt', response.salt);
    if (response.customAttributes) {
      utils.addReadonlyGetter(
        this, 'customClaims', JSON.parse(response.customAttributes));
    }

    let validAfterTime: string | null = null;
    // Convert validSince first to UTC milliseconds and then to UTC date string.
    if (typeof response.validSince !== 'undefined') {
      validAfterTime = parseDate(parseInt(response.validSince, 10) * 1000);
    }
    utils.addReadonlyGetter(this, 'tokensValidAfterTime', validAfterTime || undefined);
    utils.addReadonlyGetter(this, 'tenantId', response.tenantId);
    const multiFactor = new MultiFactorSettings(response);
    if (multiFactor.enrolledFactors.length > 0) {
      utils.addReadonlyGetter(this, 'multiFactor', multiFactor);
    }
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  public toJSON(): object {
    const json: any = {
      uid: this.uid,
      email: this.email,
      emailVerified: this.emailVerified,
      displayName: this.displayName,
      photoURL: this.photoURL,
      phoneNumber: this.phoneNumber,
      disabled: this.disabled,
      // Convert metadata to json.
      metadata: this.metadata.toJSON(),
      passwordHash: this.passwordHash,
      passwordSalt: this.passwordSalt,
      customClaims: deepCopy(this.customClaims),
      tokensValidAfterTime: this.tokensValidAfterTime,
      tenantId: this.tenantId,
    };
    if (this.multiFactor) {
      json.multiFactor =  this.multiFactor.toJSON();
    }
    json.providerData = [];
    for (const entry of this.providerData) {
      // Convert each provider data to json.
      json.providerData.push(entry.toJSON());
    }
    return json;
  }
}

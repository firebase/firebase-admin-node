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
import { auth } from './index';

import MultiFactorInfoInterface = auth.MultiFactorInfo;
import PhoneMultiFactorInfoInterface = auth.PhoneMultiFactorInfo;
import MultiFactorSettings = auth.MultiFactorSettings;
import UserMetadataInterface = auth.UserMetadata;
import UserInfoInterface = auth.UserInfo;
import UserRecordInterface = auth.UserRecord;

/**
 * 'REDACTED', encoded as a base64 string.
 */
const B64_REDACTED = Buffer.from('REDACTED').toString('base64');

/**
 * Parses a time stamp string or number and returns the corresponding date if valid.
 *
 * @param {any} time The unix timestamp string or number in milliseconds.
 * @return {string} The corresponding date as a UTC string, if valid. Otherwise, null.
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
  [key: string]: any;
}

enum MultiFactorId {
  Phone = 'phone',
}

/**
 * Abstract class representing a multi-factor info interface.
 */
export abstract class MultiFactorInfo implements MultiFactorInfoInterface {
  public readonly uid: string;
  public readonly displayName?: string;
  public readonly factorId: string;
  public readonly enrollmentTime?: string;

  /**
   * Initializes the MultiFactorInfo associated subclass using the server side.
   * If no MultiFactorInfo is associated with the response, null is returned.
   *
   * @param response The server side response.
   * @constructor
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
   * @param response The server side response.
   * @constructor
   */
  constructor(response: MultiFactorInfoResponse) {
    this.initFromServerResponse(response);
  }

  /** @return The plain object representation. */
  public toJSON(): any {
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
   * @param response The server side response.
   * @return The multi-factor ID associated with the provided response. If the response is
   *     not associated with any known multi-factor ID, null is returned.
   */
  protected abstract getFactorId(response: MultiFactorInfoResponse): string | null;

  /**
   * Initializes the MultiFactorInfo object using the provided server response.
   *
   * @param response The server side response.
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

/** Class representing a phone MultiFactorInfo object. */
export class PhoneMultiFactorInfo extends MultiFactorInfo implements PhoneMultiFactorInfoInterface {
  public readonly phoneNumber: string;

  /**
   * Initializes the PhoneMultiFactorInfo object using the server side response.
   *
   * @param response The server side response.
   * @constructor
   */
  constructor(response: MultiFactorInfoResponse) {
    super(response);
    utils.addReadonlyGetter(this, 'phoneNumber', response.phoneInfo);
  }

  /** @return The plain object representation. */
  public toJSON(): any {
    return Object.assign(
      super.toJSON(),
      {
        phoneNumber: this.phoneNumber,
      });
  }

  /**
   * Returns the factor ID based on the response provided.
   *
   * @param response The server side response.
   * @return The multi-factor ID associated with the provided response. If the response is
   *     not associated with any known multi-factor ID, null is returned.
   */
  protected getFactorId(response: MultiFactorInfoResponse): string | null {
    return (response && response.phoneInfo) ? MultiFactorId.Phone : null;
  }
}

/** Class representing multi-factor related properties of a user. */
export class MultiFactor implements MultiFactorSettings {
  public enrolledFactors: MultiFactorInfo[];

  /**
   * Initializes the MultiFactor object using the server side or JWT format response.
   *
   * @param response The server side response.
   * @constructor
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

  /** @return The plain object representation. */
  public toJSON(): any {
    return {
      enrolledFactors: this.enrolledFactors.map((info) => info.toJSON()),
    };
  }
}

/**
 * User metadata class that provides metadata information like user account creation
 * and last sign in time.
 *
 * @param response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserMetadata implements UserMetadataInterface {
  public readonly creationTime: string;
  public readonly lastSignInTime: string;

  /**
   * The time at which the user was last active (ID token refreshed), or null
   * if the user was never active. Formatted as a UTC Date string (eg
   * 'Sat, 03 Feb 2001 04:05:06 GMT')
   */
  public readonly lastRefreshTime: string | null;

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

  /** @return The plain object representation of the user's metadata. */
  public toJSON(): object {
    return {
      lastSignInTime: this.lastSignInTime,
      creationTime: this.creationTime,
    };
  }
}

/**
 * User info class that provides provider user information for different
 * Firebase providers like google.com, facebook.com, password, etc.
 *
 * @param response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserInfo implements UserInfoInterface {
  public readonly uid: string;
  public readonly displayName: string;
  public readonly email: string;
  public readonly photoURL: string;
  public readonly providerId: string;
  public readonly phoneNumber: string;

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

  /** @return The plain object representation of the current provider data. */
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
 * User record class that defines the Firebase user object populated from
 * the Firebase Auth getAccountInfo response.
 *
 * @param response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserRecord implements UserRecordInterface {
  public readonly uid: string;
  public readonly email: string;
  public readonly emailVerified: boolean;
  public readonly displayName: string;
  public readonly photoURL: string;
  public readonly phoneNumber: string;
  public readonly disabled: boolean;
  public readonly metadata: UserMetadata;
  public readonly providerData: UserInfo[];
  public readonly passwordHash?: string;
  public readonly passwordSalt?: string;
  public readonly customClaims: {[key: string]: any};
  public readonly tenantId?: string | null;
  public readonly tokensValidAfterTime?: string;
  public readonly multiFactor?: MultiFactor;

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
    const multiFactor = new MultiFactor(response);
    if (multiFactor.enrolledFactors.length > 0) {
      utils.addReadonlyGetter(this, 'multiFactor', multiFactor);
    }
  }

  /** @return The plain object representation of the user record. */
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

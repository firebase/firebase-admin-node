/*!
 * Copyright 2020 Google Inc.
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

import {MultiFactorInfo, PhoneMultiFactorInfo} from './user-record';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';
import {isNonNullObject} from '../utils/validator';
import * as utils from '../utils';

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

/** Enums for multi-factor identifiers. */
export enum MultiFactorId {
  Phone = 'phone',
}


/** Class representing multi-factor related properties of a user. */
export class MultiFactor {
  public readonly enrolledFactors: ReadonlyArray<MultiFactorInfo>;

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
        const multiFactorInfo = initMultiFactorInfo(factorResponse);
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
 * Initializes the MultiFactorInfo associated subclass using the server side.
 * If no MultiFactorInfo is associated with the response, null is returned.
 *
 * @param response The server side response.
 * @constructor
 */
export function initMultiFactorInfo(response: MultiFactorInfoResponse): MultiFactorInfo | null {
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
 * Abstract class representing a multi-factor info interface.
 */
export abstract class MultiFactorInfo {
  public readonly uid: string;
  public readonly displayName: string | null;
  public readonly factorId: MultiFactorId;
  public readonly enrollmentTime: string;

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
  protected abstract getFactorId(response: MultiFactorInfoResponse): MultiFactorId | null;

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
    utils.addReadonlyGetter(this, 'displayName', response.displayName || null);
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
 * Abstract class representing a multi-factor info interface.
 */
export abstract class MultiFactorInfoImpl implements MultiFactorInfo {
  public readonly uid: string;
  public readonly displayName: string | null;
  public readonly factorId: MultiFactorId;
  public readonly enrollmentTime: string;

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
  protected abstract getFactorId(response: MultiFactorInfoResponse): MultiFactorId | null;

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
    utils.addReadonlyGetter(this, 'displayName', response.displayName || null);
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
export class PhoneMultiFactorInfoImpl extends MultiFactorInfoImpl {
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
  protected getFactorId(response: MultiFactorInfoResponse): MultiFactorId | null {
    return (response && response.phoneInfo) ? MultiFactorId.Phone : null;
  }
}
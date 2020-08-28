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

import * as utils from '../utils';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import { MultiFactorInfoResponse } from './multi-factor-internal';

/**
 * Interface representing the common properties of a user enrolled second factor.
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
   * Initializes the MultiFactorInfo object using the server side response.
   *
   * @param response The server side response.
   * @constructor
   */
  constructor(response: MultiFactorInfoResponse) {
    this.initFromServerResponse(response);
  }

  /**
   * @return A JSON-serializable representation of this object.
   */
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


/**
 * Interface representing a phone specific user enrolled second factor.
 */
export class PhoneMultiFactorInfo extends MultiFactorInfo {
  /**
   * The phone number associated with a phone second factor.
   */
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
    return (response && response.phoneInfo) ? 'phone' : null;
  }
}

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

import { isNonNullObject } from '../utils/validator';
import * as utils from '../utils';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import { 
  MultiFactorInfo, PhoneMultiFactorInfo
} from './user-record';

/** Class representing multi-factor related properties of a user. */
export class MultiFactor {
  public enrolledFactors: MultiFactorInfo[];

  /**
   * Initializes the MultiFactor object using the server side or JWT format response.
   *
   * @param response The server side response.
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

/** Enums for multi-factor identifiers. */
export enum MultiFactorId {
  Phone = 'phone',
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

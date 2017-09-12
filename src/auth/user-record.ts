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

import {deepCopy} from '../utils/deep-copy';
import * as utils from '../utils';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';

/**
 * Parses a time stamp string or number and returns the corresponding date if valid.
 *
 * @param {any} time The unix timestamp string or number in milliseconds.
 * @return {string} The corresponding date as a UTC string, if valid.
 */
function parseDate(time: any): string {
  try {
    let date = new Date(parseInt(time, 10));
    if (!isNaN(date.getTime())) {
      return date.toUTCString();
    }
  } catch (e) {
    // Do nothing. null will be returned.
  }
  return null;
}

/** Parameters for update user operation */
export interface UpdateRequest {
  displayName?: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
  password?: string;
}

/** Parameters for create user operation */
export interface CreateRequest extends UpdateRequest {
  uid?: string;
}

/**
 * User metadata class that provides metadata information like user account creation
 * and last sign in time.
 *
 * @param {Object} response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserMetadata {
  public readonly creationTime: string;
  public readonly lastSignInTime: string;

  constructor(response: any) {
    // Creation date should always be available but due to some backend bugs there
    // were cases in the past where users did not have creation date properly set.
    // This included legacy Firebase migrating project users and some anonymous users.
    // These bugs have already been addressed since then.
    utils.addReadonlyGetter(this, 'creationTime', parseDate(response.createdAt));
    utils.addReadonlyGetter(this, 'lastSignInTime', parseDate(response.lastLoginAt));
  }

  /** @return {Object} The plain object representation of the user's metadata. */
  public toJSON(): Object {
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
 * @param {Object} response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserInfo {
  public readonly uid: string;
  public readonly displayName: string;
  public readonly email: string;
  public readonly photoURL: string;
  public readonly providerId: string;
  public readonly phoneNumber: string;

  constructor(response: any) {
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

  /** @return {Object} The plain object representation of the current provider data. */
  public toJSON(): Object {
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
 * @param {Object} response The server side response returned from the getAccountInfo
 *     endpoint.
 * @constructor
 */
export class UserRecord {
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
  public readonly customClaims: Object;

  constructor(response: any) {
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
    for (let entry of (response.providerUserInfo || [])) {
      providerData.push(new UserInfo(entry));
    }
    utils.addReadonlyGetter(this, 'providerData', providerData);
    utils.addReadonlyGetter(this, 'passwordHash', response.passwordHash);
    utils.addReadonlyGetter(this, 'passwordSalt', response.salt);
    try {
      utils.addReadonlyGetter(
          this, 'customClaims', JSON.parse(response.customAttributes));
    } catch (e) {
      // Ignore error.
      utils.addReadonlyGetter(this, 'customClaims', undefined);
    }
  }

  /** @return {Object} The plain object representation of the user record. */
  public toJSON(): Object {
    let json: any = {
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
    };
    json.providerData = [];
    for (let entry of this.providerData) {
       // Convert each provider data to json.
       json.providerData.push(entry.toJSON());
    }
    return json;
  }
}

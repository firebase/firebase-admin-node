/*!
 * Copyright 2018 Google Inc.
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

import {FirebaseArrayIndexError} from '../internal/error';
import {UploadAccountUser, UploadAccountOptions} from './user-import-builder-internal';

/** Firebase Auth supported hashing algorithms for import operations. */
export type HashAlgorithmType = 'SCRYPT' | 'STANDARD_SCRYPT' | 'HMAC_SHA512' |
    'HMAC_SHA256' | 'HMAC_SHA1' | 'HMAC_MD5' | 'MD5' | 'PBKDF_SHA1' | 'BCRYPT' |
    'PBKDF2_SHA256' | 'SHA512' | 'SHA256' | 'SHA1';


/** User import options for bulk account imports. */
export interface UserImportOptions {
  hash: {
    algorithm: HashAlgorithmType;
    key?: Buffer;
    saltSeparator?: Buffer;
    rounds?: number;
    memoryCost?: number;
    parallelization?: number;
    blockSize?: number;
    derivedKeyLength?: number;
  };
}

export interface SecondFactor {
  uid: string;
  phoneNumber: string;
  displayName?: string;
  enrollmentTime?: string;
  factorId: string;
}

interface UserProviderRequest {
  uid: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  providerId: string;
}

interface UserMetadataRequest {
  lastSignInTime?: string;
  creationTime?: string;
}

/** User import record as accepted from developer. */
export interface UserImportRecord {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
  metadata?: UserMetadataRequest;
  providerData?: Array<UserProviderRequest>;
  multiFactor?: {
    enrolledFactors: SecondFactor[];
  };
  customClaims?: {[key: string]: any};
  passwordHash?: Buffer;
  passwordSalt?: Buffer;
  tenantId?: string;
}


/** UploadAccount endpoint complete request interface. */
export interface UploadAccountRequest extends UploadAccountOptions {
  users?: UploadAccountUser[];
}


/** Response object for importUsers operation. */
export interface UserImportResult {
  failureCount: number;
  successCount: number;
  errors: FirebaseArrayIndexError[];
}


/** Callback function to validate an UploadAccountUser object. */
export type ValidatorFunction = (data: UploadAccountUser) => void;

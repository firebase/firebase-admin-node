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

import {deepCopy, deepExtend} from '../utils/deep-copy';
import * as utils from '../utils';
import * as validator from '../utils/validator';
import {AuthClientErrorCode, FirebaseAuthError, FirebaseArrayIndexError} from '../utils/error';

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


/** User import record as accepted from developer. */
export interface UserImportRecord {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
  metadata?: {
    lastSignInTime?: string;
    creationTime?: string;
  };
  providerData?: Array<{
    uid: string,
    displayName?: string,
    email?: string,
    photoURL?: string,
    providerId: string,
  }>;
  customClaims?: object;
  passwordHash?: Buffer;
  passwordSalt?: Buffer;
}


/** UploadAccount endpoint request interface. */
export interface UploadAccountRequest {
  hashAlgorithm?: string;
  signerKey?: string;
  rounds?: number;
  memoryCost?: number;
  saltSeparator?: string;
  cpuMemCost?: number;
  parallelization?: number;
  blockSize?: number;
  dkLen?: number;
  users?: Array<{
    localId: string;
    email?: string;
    emailVerified?: string;
    displayName?: string;
    disabled?: boolean;
    photoUrl?: string;
    phoneNumber?: string;
    providerUserInfo?: Array<{
      rawId: string;
      providerId: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
    }>;
    passwordHash?: string;
    salt?: string;
    lastLoginAt?: number;
    createdAt?: number;
    customAttributes?: string;
  }>;
}


/** Response object for importUsers operation. */
export interface UserImportResult {
  failureCount: number;
  successCount: number;
  errors: FirebaseArrayIndexError[];
}


/** Callback function to validate an object. */
type ValidatorFunction = (data: object) => void;


/**
 * Class that provides a helper for building/validating uploadAccount requests and
 * UserImportResult responses.
 */
export class UserImportBuilder {
  private requiresHashOptions: boolean;
  private validatedUsers: object[];
  private validatedOptions: object;
  private indexMap: object;
  private userImportResultErrors: FirebaseArrayIndexError[];

  /**
   * @param {UserImportRecord[]} users The list of user records to import.
   * @param {UserImportOptions=} options The import options which includes hashing
   *     algorithm details.
   * @param {ValidatorFunction=} userRequestValidator The user request validator function.
   * @constructor
   */
  constructor(
      private users: UserImportRecord[],
      private options?: UserImportOptions,
      private userRequestValidator?: ValidatorFunction) {
    this.requiresHashOptions = false;
    this.validatedUsers = [];
    this.userImportResultErrors = [];
    this.indexMap = {};

    this.validateAndPopulateUsers();
    this.validateAndPopulateOptions();
  }

  /**
   * Returns the corresponding constructed uploadAccount request.
   * @return {UploadAccountRequest} The constructed uploadAccount request.
   */
  public generateRequest(): UploadAccountRequest {
    const users = this.validatedUsers.map((user) => {
      return deepCopy(user);
    });
    return deepExtend({users}, deepCopy(this.validatedOptions)) as UploadAccountRequest;
  }

  /**
   * Populates the UserImportResult using the client side detected errors and the server
   * side returned errors.
   * @return {UserImportResult} The user import result based on the returned failed
   *     uploadAccount response.
   */
  public generateResponse(
      failedUploads: Array<{index: number, message: string}>): UserImportResult {
    // Initialize user import result.
    const importResult: UserImportResult = {
      successCount: this.users.length - this.userImportResultErrors.length,
      failureCount: this.userImportResultErrors.length,
      errors: deepCopy(this.userImportResultErrors),
    };
    importResult.failureCount += failedUploads.length;
    importResult.successCount -= failedUploads.length;
    failedUploads.forEach((failedUpload) => {
      importResult.errors.push({
        // Map backend request index to original developer provided array index.
        index: this.indexMap[failedUpload.index],
        error: new FirebaseAuthError(
          AuthClientErrorCode.INVALID_USER_IMPORT,
          failedUpload.message,
        ),
      });
    });
    // Sort errors by index.
    importResult.errors.sort((a, b) => {
      return a.index - b.index;
    });
    // Return sorted result.
    return importResult;
  }

  /**
   * Validates and populates the hashing options of the uploadAccount request.
   * Throws an error whenever an invalid or missing options is detected.
   */
  private validateAndPopulateOptions(): void {
    this.validatedOptions = {};
    if (!this.requiresHashOptions) {
      return;
    }
    if (!validator.isNonNullObject(this.options.hash)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.MISSING_HASH_ALGORITHM,
      );
    }
    if (typeof this.options.hash.algorithm === 'undefined' ||
        !validator.isNonEmptyString(this.options.hash.algorithm)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_HASH_ALGORITHM,
        `"hash.algorithm" must be a string matching the list of supported algorithms.`,
      );
    }

    let rounds;
    switch (this.options.hash.algorithm) {
      case 'HMAC_SHA512':
      case 'HMAC_SHA256':
      case 'HMAC_SHA1':
      case 'HMAC_MD5':
        if (!validator.isBuffer(this.options.hash.key)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_KEY,
            `A non-empty "hash.key" byte buffer must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        this.validatedOptions = {
          hashAlgorithm: this.options.hash.algorithm,
          signerKey: utils.toWebSafeBase64(this.options.hash.key),
        };
        break;
      case 'MD5':
      case 'SHA1':
      case 'SHA256':
      case 'SHA512':
      case 'PBKDF_SHA1':
      case 'PBKDF2_SHA256':
        rounds = parseInt((this.options.hash.rounds || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.rounds) ||
            isNaN(rounds) || rounds < 0 || rounds > 120000) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_ROUNDS,
            `A valid "hash.rounds" number between 0 and 120000 must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        this.validatedOptions = {
          hashAlgorithm: this.options.hash.algorithm,
          rounds,
        };
        break;
      case 'SCRYPT':
        if (!validator.isBuffer(this.options.hash.key)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_KEY,
            `A "hash.key" byte buffer must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        rounds = parseInt((this.options.hash.rounds || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.rounds) ||
            isNaN(rounds) || rounds <= 0 || rounds > 8) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_ROUNDS,
            `A valid "hash.rounds" number between 1 and 8 must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        const memoryCost = parseInt((this.options.hash.memoryCost || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.memoryCost) ||
            isNaN(memoryCost) || memoryCost <= 0 || memoryCost > 14) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_MEMORY_COST,
            `A valid "hash.memoryCost" number between 1 and 14 must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        if (typeof this.options.hash.saltSeparator !== 'undefined' &&
            !validator.isBuffer(this.options.hash.saltSeparator)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_SALT_SEPARATOR,
            `"hash.saltSeparator" must be a byte buffer.`,
          );
        }
        this.validatedOptions = {
          hashAlgorithm: this.options.hash.algorithm,
          signerKey: utils.toWebSafeBase64(this.options.hash.key),
          rounds,
          memoryCost,
          saltSeparator: utils.toWebSafeBase64(this.options.hash.saltSeparator || Buffer.from('')),
        };
        break;
      case 'BCRYPT':
        this.validatedOptions = {
          hashAlgorithm: this.options.hash.algorithm,
        };
        break;
      case 'STANDARD_SCRYPT':
        const cpuMemCost = parseInt((this.options.hash.memoryCost || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.memoryCost) || isNaN(cpuMemCost)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_MEMORY_COST,
            `A valid "hash.memoryCost" number must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        const parallelization = parseInt((this.options.hash.parallelization || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.parallelization) || isNaN(parallelization)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_PARALLELIZATION,
            `A valid "hash.parallelization" number must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        const blockSize = parseInt((this.options.hash.blockSize || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.blockSize) || isNaN(blockSize)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_BLOCK_SIZE,
            `A valid "hash.blockSize" number must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        const dkLen = parseInt((this.options.hash.derivedKeyLength || '0').toString(), 10);
        if (!validator.isNumber(this.options.hash.derivedKeyLength) || isNaN(dkLen)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_HASH_DERIVED_KEY_LENGTH,
            `A valid "hash.derivedKeyLength" number must be provided for ` +
            `hash algorithm ${this.options.hash.algorithm}.`,
          );
        }
        this.validatedOptions = {
          hashAlgorithm: this.options.hash.algorithm,
          cpuMemCost,
          parallelization,
          blockSize,
          dkLen,
        };
        break;
      default:
        throw new FirebaseAuthError(
          AuthClientErrorCode.INVALID_HASH_ALGORITHM,
          `Unsupported hash algorithm provider "${this.options.hash.algorithm}".`,
        );
    }
  }

  /**
   * Validates and populates the users list of the uploadAccount request.
   * Whenever a user with an error is detected, the error is cached and will later be
   * merged into the user import result. This allows the processing of valid users without
   * failing early on the first error detected.
   */
  private validateAndPopulateUsers(): void {
    let index = 0;
    this.users.forEach((user) => {
      try {
        const result = {
          localId: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          disabled: user.disabled,
          photoUrl: user.photoURL,
          phoneNumber: user.phoneNumber,
          providerUserInfo: [],
          passwordHash: undefined,
          salt: undefined,
          lastLoginAt: undefined,
          createdAt: undefined,
          customAttributes: user.customClaims && JSON.stringify(user.customClaims),
        };
        if (typeof user.passwordHash !== 'undefined') {
          this.requiresHashOptions = true;
          if (!validator.isBuffer(user.passwordHash)) {
            throw new FirebaseAuthError(
              AuthClientErrorCode.INVALID_PASSWORD_HASH,
            );
          }
          result.passwordHash = utils.toWebSafeBase64(user.passwordHash);
        }
        if (typeof user.passwordSalt !== 'undefined') {
          if (!validator.isBuffer(user.passwordSalt)) {
            throw new FirebaseAuthError(
              AuthClientErrorCode.INVALID_PASSWORD_SALT,
            );
          }
          result.salt = utils.toWebSafeBase64(user.passwordSalt);
        }
        if (validator.isNonNullObject(user.metadata)) {
          if (validator.isNonEmptyString(user.metadata.creationTime)) {
            result.createdAt = new Date(user.metadata.creationTime).getTime();
          }
          if (validator.isNonEmptyString(user.metadata.lastSignInTime)) {
            result.lastLoginAt = new Date(user.metadata.lastSignInTime).getTime();
          }
        }
        if (validator.isArray(user.providerData)) {
          user.providerData.forEach((providerData) => {
            result.providerUserInfo.push({
              providerId: providerData.providerId,
              rawId: providerData.uid,
              email: providerData.email,
              displayName: providerData.displayName,
              photoUrl: providerData.photoURL,
            });
          });
        }
        // Remove blank fields.
        for (const key in result) {
          if (typeof result[key] === 'undefined') {
            delete result[key];
          }
        }
        if (result.providerUserInfo.length === 0) {
          delete result.providerUserInfo;
        }
        // Validate the constructured user individual request. This will throw if an error
        // is detected.
        if (typeof this.userRequestValidator === 'function') {
          this.userRequestValidator(result);
        }
        // Only users that pass client screening will be passed to backend for processing.
        this.validatedUsers.push(result);
        // Map user's index (the one to be sent to backend) to original developer provided array.
        this.indexMap[this.validatedUsers.length - 1] = index;
      } catch (error) {
        // Save the client side error with respect to the developer provided array.
        this.userImportResultErrors.push({
          index,
          error,
        });
      }
      index++;
    });
  }
}

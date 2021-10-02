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

import { AuthClientErrorCode, ErrorInfo, FirebaseAuthError } from '../utils/error';
import { HttpError } from '../utils/api-request';
import { CryptoSigner, CryptoSignerError, CryptoSignerErrorCode } from '../utils/crypto-signer';

import * as validator from '../utils/validator';
import { toWebSafeBase64 } from '../utils';
import { Algorithm } from 'jsonwebtoken';

const ALGORITHM_NONE: Algorithm = 'none' as const;

const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
export const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

/**
 * Represents the header of a JWT.
 */
interface JWTHeader {
  alg: string;
  typ: string;
}

/**
 * Represents the body of a JWT.
 */
interface JWTBody {
  claims?: object;
  uid: string;
  aud: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
  tenant_id?: string;
}

/**
 * A CryptoSigner implementation that is used when communicating with the Auth emulator.
 * It produces unsigned tokens.
 */
export class EmulatedSigner implements CryptoSigner {

  algorithm = ALGORITHM_NONE;

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public sign(buffer: Buffer): Promise<Buffer> {
    return Promise.resolve(Buffer.from(''));
  }

  /**
   * @inheritDoc
   */
  public getAccountId(): Promise<string> {
    return Promise.resolve('firebase-auth-emulator@example.com');
  }
}

/**
 * Class for generating different types of Firebase Auth tokens (JWTs).
 *
 * @internal
 */
export class FirebaseTokenGenerator {

  private readonly signer: CryptoSigner;

  /**
   * @param tenantId - The tenant ID to use for the generated Firebase Auth
   *     Custom token. If absent, then no tenant ID claim will be set in the
   *     resulting JWT.
   */
  constructor(signer: CryptoSigner, public readonly tenantId?: string) {
    if (!validator.isNonNullObject(signer)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a CryptoSigner to use FirebaseTokenGenerator.',
      );
    }
    if (typeof this.tenantId !== 'undefined' && !validator.isNonEmptyString(this.tenantId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '`tenantId` argument must be a non-empty string.');
    }
    this.signer = signer;
  }

  /**
   * Creates a new Firebase Auth Custom token.
   *
   * @param uid - The user ID to use for the generated Firebase Auth Custom token.
   * @param developerClaims - Optional developer claims to include in the generated Firebase
   *     Auth Custom token.
   * @returns A Promise fulfilled with a Firebase Auth Custom token signed with a
   *     service account key and containing the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: {[key: string]: any}): Promise<string> {
    let errorMessage: string | undefined;
    if (!validator.isNonEmptyString(uid)) {
      errorMessage = '`uid` argument must be a non-empty string uid.';
    } else if (uid.length > 128) {
      errorMessage = '`uid` argument must a uid with less than or equal to 128 characters.';
    } else if (!this.isDeveloperClaimsValid_(developerClaims)) {
      errorMessage = '`developerClaims` argument must be a valid, non-null object containing the developer claims.';
    }

    if (errorMessage) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage);
    }

    const claims: {[key: string]: any} = {};
    if (typeof developerClaims !== 'undefined') {
      for (const key in developerClaims) {
        /* istanbul ignore else */
        if (Object.prototype.hasOwnProperty.call(developerClaims, key)) {
          if (BLACKLISTED_CLAIMS.indexOf(key) !== -1) {
            throw new FirebaseAuthError(
              AuthClientErrorCode.INVALID_ARGUMENT,
              `Developer claim "${key}" is reserved and cannot be specified.`,
            );
          }
          claims[key] = developerClaims[key];
        }
      }
    }
    return this.signer.getAccountId().then((account) => {
      const header: JWTHeader = {
        alg: this.signer.algorithm,
        typ: 'JWT',
      };
      const iat = Math.floor(Date.now() / 1000);
      const body: JWTBody = {
        aud: FIREBASE_AUDIENCE,
        iat,
        exp: iat + ONE_HOUR_IN_SECONDS,
        iss: account,
        sub: account,
        uid,
      };
      if (this.tenantId) {
        // eslint-disable-next-line @typescript-eslint/camelcase
        body.tenant_id = this.tenantId;
      }
      if (Object.keys(claims).length > 0) {
        body.claims = claims;
      }
      const token = `${this.encodeSegment(header)}.${this.encodeSegment(body)}`;
      const signPromise = this.signer.sign(Buffer.from(token));

      return Promise.all([token, signPromise]);
    }).then(([token, signature]) => {
      return `${token}.${this.encodeSegment(signature)}`;
    }).catch((err) => {
      throw handleCryptoSignerError(err);
    });
  }

  private encodeSegment(segment: object | Buffer): string {
    const buffer: Buffer = (segment instanceof Buffer) ? segment : Buffer.from(JSON.stringify(segment));
    return toWebSafeBase64(buffer).replace(/=+$/, '');
  }

  /**
   * Returns whether or not the provided developer claims are valid.
   *
   * @param developerClaims - Optional developer claims to validate.
   * @returns True if the provided claims are valid; otherwise, false.
   */
  private isDeveloperClaimsValid_(developerClaims?: object): boolean {
    if (typeof developerClaims === 'undefined') {
      return true;
    }
    return validator.isNonNullObject(developerClaims);
  }
}

/**
 * Creates a new FirebaseAuthError by extracting the error code, message and other relevant
 * details from a CryptoSignerError.
 *
 * @param err - The Error to convert into a FirebaseAuthError error
 * @returns A Firebase Auth error that can be returned to the user.
 */
export function handleCryptoSignerError(err: Error): Error {
  if (!(err instanceof CryptoSignerError)) {
    return err;
  }
  if (err.code === CryptoSignerErrorCode.SERVER_ERROR && validator.isNonNullObject(err.cause)) {
    const httpError = err.cause;
    const errorResponse = (httpError as HttpError).response.data;
    if (validator.isNonNullObject(errorResponse) && errorResponse.error) {
      const errorCode = errorResponse.error.status;
      const description = 'Please refer to https://firebase.google.com/docs/auth/admin/create-custom-tokens ' +
        'for more details on how to use and troubleshoot this feature.';
      const errorMsg = `${errorResponse.error.message}; ${description}`;

      return FirebaseAuthError.fromServerError(errorCode, errorMsg, errorResponse);
    }
    return new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR,
      'Error returned from server: ' + errorResponse + '. Additionally, an ' +
      'internal error occurred while attempting to extract the ' +
      'errorcode from the error.'
    );
  }
  return new FirebaseAuthError(mapToAuthClientErrorCode(err.code), err.message);
}

function mapToAuthClientErrorCode(code: string): ErrorInfo {
  switch (code) {
  case CryptoSignerErrorCode.INVALID_CREDENTIAL:
    return AuthClientErrorCode.INVALID_CREDENTIAL;
  case CryptoSignerErrorCode.INVALID_ARGUMENT:
    return AuthClientErrorCode.INVALID_ARGUMENT;
  default:
    return AuthClientErrorCode.INTERNAL_ERROR;
  }
}

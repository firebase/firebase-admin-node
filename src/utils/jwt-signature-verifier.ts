/*!
 * Copyright 2021 Google Inc.
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

import * as validator from './validator';
import * as jwt from 'jsonwebtoken';
import { ErrorInfo } from './error';
import { HttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';
import { FirebaseApp } from '../firebase-app';

export interface SignatureVerifier {
  verify(token: string): Promise<void>;
}

interface KeyFetcher<T extends {} | []> {
  fetchPublicKeys(): Promise<T>;
}

class PublicKeyFetcher implements KeyFetcher<{ [key: string]: string }> {
  private publicKeys: { [key: string]: string };
  private publicKeysExpireAt: number;

  constructor(private clientCertUrl: string, private readonly app: FirebaseApp) {
    if (!validator.isURL(clientCertUrl)) {
      throw new Error(
        'The provided public client certificate URL is an invalid URL.',
      );
    }
  }

  /**
   * Fetches the public keys for the Google certs.
   *
   * @return {Promise<object>} A promise fulfilled with public keys for the Google certs.
   */
  public fetchPublicKeys(): Promise<{ [key: string]: string }> {
    const publicKeysExist = (typeof this.publicKeys !== 'undefined');
    const publicKeysExpiredExists = (typeof this.publicKeysExpireAt !== 'undefined');
    const publicKeysStillValid = (publicKeysExpiredExists && Date.now() < this.publicKeysExpireAt);
    if (publicKeysExist && publicKeysStillValid) {
      return Promise.resolve(this.publicKeys);
    }

    const client = new HttpClient();
    const request: HttpRequestConfig = {
      method: 'GET',
      url: this.clientCertUrl,
      httpAgent: this.app.options.httpAgent,
    };
    return client.send(request).then((resp) => {
      if (!resp.isJson() || resp.data.error) {
        // Treat all non-json messages and messages with an 'error' field as
        // error responses.
        throw new HttpError(resp);
      }
      if (Object.prototype.hasOwnProperty.call(resp.headers, 'cache-control')) {
        const cacheControlHeader: string = resp.headers['cache-control'];
        const parts = cacheControlHeader.split(',');
        parts.forEach((part) => {
          const subParts = part.trim().split('=');
          if (subParts[0] === 'max-age') {
            const maxAge: number = +subParts[1];
            this.publicKeysExpireAt = Date.now() + (maxAge * 1000);
          }
        });
      }
      this.publicKeys = resp.data;
      return resp.data;
    }).catch((err) => {
      if (err instanceof HttpError) {
        let errorMessage = 'Error fetching public keys for Google certs: ';
        const resp = err.response;
        if (resp.isJson() && resp.data.error) {
          errorMessage += `${resp.data.error}`;
          if (resp.data.error_description) {
            errorMessage += ' (' + resp.data.error_description + ')';
          }
        } else {
          errorMessage += `${resp.text}`;
        }
        throw new SignatureVerifierError({
          code: SignatureVerifierErrorCode.INTERNAL_ERROR,
          message: errorMessage
        });
      }
      throw err;
    });
  }
}

export class PublicKeySignatureVerifier implements SignatureVerifier {
  private publicKeyProvider: PublicKeyFetcher;
  private getKeyHandler: jwt.GetPublicKeyOrSecret;

  constructor(clientCertUrl: string, private algorithm: jwt.Algorithm,
    readonly app: FirebaseApp) {
    if (!validator.isURL(clientCertUrl)) {
      throw new Error(
        'The provided public client certificate URL is an invalid URL.',
      );
    }
    else if (!validator.isNonEmptyString(algorithm)) {
      throw new Error('The provided JWT algorithm is an empty string.');
    }

    this.publicKeyProvider = new PublicKeyFetcher(clientCertUrl, app);
    this.getKeyHandler = this.getKey.bind(this);
  }

  public verify(token: string): Promise<void> {
    const error = new SignatureVerifierError({
      code: SignatureVerifierErrorCode.INVALID_TOKEN,
      message: 'The provided token has invalid signature.'
    });

    const verifyOptions: jwt.VerifyOptions = {};
    verifyOptions.algorithms = [this.algorithm];

    return isSignatureValid(token, this.getKeyHandler, verifyOptions)
      .then(isValid => {
        return isValid ? Promise.resolve() : Promise.reject(error);
      });
  }

  private getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
    const kid = header.kid || '';
    this.publicKeyProvider.fetchPublicKeys().then((publicKeys) => {
      if (!Object.prototype.hasOwnProperty.call(publicKeys, kid)) {
        callback(new Error(NO_MATCHING_KID_ERROR_MESSAGE));
      } else {
        callback(null, publicKeys[kid]);
      }
    })
      .catch(error => {
        callback(error);
      });
  }
}

export class EmulatorSignatureVerifier implements SignatureVerifier {
  
  public verify(token: string): Promise<void> {
    const error = new SignatureVerifierError({
      code: SignatureVerifierErrorCode.INVALID_TOKEN,
      message: 'The provided token has invalid signature.'
    });

    // Signature checks skipped for emulator; no need to fetch public keys.
    return isSignatureValid(token, '')
      .then(isValid => {
        return isValid ? Promise.resolve() : Promise.reject(error);
      });
  }
}

function isSignatureValid(token: string, secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret,
  options?: jwt.VerifyOptions): Promise<boolean> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, options,
      (error: jwt.VerifyErrors | null) => {
        if (!error) {
          return resolve(true);
        }
        if (error.name === 'TokenExpiredError') {
          return reject(new SignatureVerifierError({
            code: SignatureVerifierErrorCode.TOKEN_EXPIRED,
            message: 'The provided token has expired. Get a fresh token from your ' +
              'client app and try again.',
          }));
        } else if (error.name === 'JsonWebTokenError') {
          const prefix = 'error in secret or public key callback: ';
          if (error.message && error.message.includes(prefix)) {
            const message = error.message.split(prefix).pop();
            return reject(new SignatureVerifierError({
              code: SignatureVerifierErrorCode.INVALID_ARGUMENT,
              message: message || 'Error fetching public keys.',
            }));
          }
          return resolve(false);
        }
        return reject(new SignatureVerifierError({
          code: SignatureVerifierErrorCode.INVALID_TOKEN,
          message: error.message
        }));
      });
  });
}

/**
 * SignatureVerifier error code structure.
 *
 * @param {ErrorInfo} errorInfo The error information (code and message).
 * @constructor
 */
export class SignatureVerifierError extends Error {
  constructor(private errorInfo: ErrorInfo) {
    super(errorInfo.message);
    (this as any).__proto__ = SignatureVerifierError.prototype;
  }

  /** @return {string} The error code. */
  public get code(): string {
    return this.errorInfo.code;
  }

  /** @return {string} The error message. */
  public get message(): string {
    return this.errorInfo.message;
  }
}

/**
 * SignatureVerifier error codes.
 */
export enum SignatureVerifierErrorCode {
  INVALID_ARGUMENT = 'invalid-argument',
  INVALID_TOKEN = 'invalid-token',
  INVALID_CREDENTIAL = 'invalid-credential',
  TOKEN_EXPIRED = 'token-expired',
  INTERNAL_ERROR = 'internal-error',
}

export const NO_MATCHING_KID_ERROR_MESSAGE = 'no-matching-kid-error';

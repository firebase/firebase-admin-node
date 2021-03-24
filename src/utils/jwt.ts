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
import { HttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';
import { Agent } from 'http';

export type Dictionary = {[key: string]: any}

export type DecodedToken = {
  header: Dictionary;
  payload: Dictionary;
}

export interface SignatureVerifier {
  verify(token: string): Promise<void>;
}

interface KeyFetcher {
  fetchPublicKeys(): Promise<{ [key: string]: string }>;
}

export class UrlKeyFetcher implements KeyFetcher {
  private publicKeys: { [key: string]: string };
  private publicKeysExpireAt: number;

  constructor(private clientCertUrl: string, private readonly httpAgent?: Agent) {
    if (!validator.isURL(clientCertUrl)) {
      throw new Error(
        'The provided public client certificate URL is an invalid URL.',
      );
    }
  }

  /**
   * Fetches the public keys for the Google certs.
   *
   * @return A promise fulfilled with public keys for the Google certs.
   */
  public fetchPublicKeys(): Promise<{ [key: string]: string }> {
    if (this.shouldRefresh()) {
      return this.refresh();
    }
    return Promise.resolve(this.publicKeys);
  }

  private shouldRefresh(): boolean {
    const publicKeysExist = (typeof this.publicKeys !== 'undefined');
    const publicKeysExpiredExists = (typeof this.publicKeysExpireAt !== 'undefined');
    const publicKeysStillValid = (publicKeysExpiredExists && Date.now() < this.publicKeysExpireAt);
    return !(publicKeysExist && publicKeysStillValid);
  }

  private refresh(): Promise<{ [key: string]: string }> {
    const client = new HttpClient();
    const request: HttpRequestConfig = {
      method: 'GET',
      url: this.clientCertUrl,
      httpAgent: this.httpAgent,
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
        throw new JwtError(JwtErrorCode.INTERNAL_ERROR, errorMessage);
      }
      throw err;
    });
  }
}

/**
 * Verifies JWT signature with a public key.
 */
export class PublicKeySignatureVerifier implements SignatureVerifier {
  constructor(private keyFetcher: UrlKeyFetcher) {
    if (!validator.isNonNullObject(keyFetcher)) {
      throw new Error('The provided key fetcher is not an object or null.');
    }
  }

  public verify(token: string): Promise<void> {
    const ALGORITHM_RS256: jwt.Algorithm = 'RS256' as const;
    const error = new JwtError(JwtErrorCode.INVALID_TOKEN,
      'The provided token has invalid signature.');
    return isSignatureValid(token, getKeyCallback(this.keyFetcher),
      { algorithms: [ALGORITHM_RS256] })
      .then(isValid => {
        return isValid ? Promise.resolve() : Promise.reject(error);
      });
  }
}

function getKeyCallback(fetcher: KeyFetcher): jwt.GetPublicKeyOrSecret {
  return (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
    const kid = header.kid || '';
    fetcher.fetchPublicKeys().then((publicKeys) => {
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
    const error = new JwtError(JwtErrorCode.INVALID_TOKEN,
      'The provided token has invalid signature.');

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
          return reject(new JwtError(JwtErrorCode.TOKEN_EXPIRED,
            'The provided token has expired. Get a fresh token from your ' +
            'client app and try again.'));
        } else if (error.name === 'JsonWebTokenError') {
          const prefix = 'error in secret or public key callback: ';
          if (error.message && error.message.includes(prefix)) {
            const message = error.message.split(prefix).pop() || 'Error fetching public keys.';
            const code = (message === NO_MATCHING_KID_ERROR_MESSAGE) ? JwtErrorCode.NO_MATCHING_KID :
              JwtErrorCode.INVALID_ARGUMENT;
            return reject(new JwtError(code, message));
          }
          return resolve(false);
        }
        return reject(new JwtError(JwtErrorCode.INVALID_TOKEN, error.message));
      });
  });
}

/**
 * Decodes general purpose Firebase JWTs.
 */
export function decodeJwt(jwtToken: string): Promise<DecodedToken> {
  if (!validator.isString(jwtToken)) {
    return Promise.reject(new JwtError(JwtErrorCode.INVALID_ARGUMENT,
      'The provided token must be a string.'));
  }

  const fullDecodedToken: any = jwt.decode(jwtToken, {
    complete: true,
  });

  if (!fullDecodedToken) {
    return Promise.reject(new JwtError(JwtErrorCode.INVALID_ARGUMENT,
      'Decoding token failed.'));
  }

  const header = fullDecodedToken?.header;
  const payload = fullDecodedToken?.payload;
  return Promise.resolve({ header, payload });
}

/**
 * Jwt error code structure.
 *
 * @param code The error code.
 * @param message The error message.
 * @constructor
 */
export class JwtError extends Error {
  constructor(readonly code: JwtErrorCode, readonly message: string) {
    super(message);
    (this as any).__proto__ = JwtError.prototype;
  }
}

/**
 * JWT error codes.
 */
export enum JwtErrorCode {
  INVALID_ARGUMENT = 'invalid-argument',
  INVALID_CREDENTIAL = 'invalid-credential',
  TOKEN_EXPIRED = 'token-expired',
  INVALID_TOKEN = 'invalid-token',
  NO_MATCHING_KID = 'no-matching-kid-error',
  INTERNAL_ERROR = 'internal-error',
}

const NO_MATCHING_KID_ERROR_MESSAGE = 'no-matching-kid-error';

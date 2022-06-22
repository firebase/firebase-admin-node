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
import * as jwks from 'jwks-rsa';
import { HttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';
import { Agent } from 'http';

export const ALGORITHM_RS256: jwt.Algorithm = 'RS256' as const;

// `jsonwebtoken` converts errors from the `getKey` callback to its own `JsonWebTokenError` type
// and prefixes the error message with the following. Use the prefix to identify errors thrown
// from the key provider callback.
// https://github.com/auth0/node-jsonwebtoken/blob/d71e383862fc735991fd2e759181480f066bf138/verify.js#L96
const JWT_CALLBACK_ERROR_PREFIX = 'error in secret or public key callback: ';

const NO_MATCHING_KID_ERROR_MESSAGE = 'no-matching-kid-error';
const NO_KID_IN_HEADER_ERROR_MESSAGE = 'no-kid-in-header-error';

const HOUR_IN_SECONDS = 3600;

export type Dictionary = { [key: string]: any }

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

export class JwksFetcher implements KeyFetcher {
  private publicKeys: { [key: string]: string };
  private publicKeysExpireAt = 0;
  private client: jwks.JwksClient;

  constructor(jwksUrl: string) {
    if (!validator.isURL(jwksUrl)) {
      throw new Error('The provided JWKS URL is not a valid URL.');
    }

    this.client = jwks({
      jwksUri: jwksUrl,
      cache: false, // disable jwks-rsa LRU cache as the keys are always cached for 6 hours.
    });
  }

  public fetchPublicKeys(): Promise<{ [key: string]: string }> {
    if (this.shouldRefresh()) {
      return this.refresh();
    }
    return Promise.resolve(this.publicKeys);
  }

  private shouldRefresh(): boolean {
    return !this.publicKeys || this.publicKeysExpireAt <= Date.now();
  }

  private refresh(): Promise<{ [key: string]: string }> {
    return this.client.getSigningKeys()
      .then((signingKeys) => {
        // reset expire at from previous set of keys.
        this.publicKeysExpireAt = 0;
        const newKeys = signingKeys.reduce((map: { [key: string]: string }, signingKey: jwks.SigningKey) => {
          map[signingKey.kid] = signingKey.getPublicKey();
          return map;
        }, {});
        this.publicKeysExpireAt = Date.now() + (HOUR_IN_SECONDS * 6 * 1000);
        this.publicKeys = newKeys;
        return newKeys;
      }).catch((err) => {
        throw new Error(`Error fetching Json Web Keys: ${err.message}`);
      });
  }
}

/**
 * Class to fetch public keys from a client certificates URL.
 */
export class UrlKeyFetcher implements KeyFetcher {
  private publicKeys: { [key: string]: string };
  private publicKeysExpireAt = 0;

  constructor(private clientCertUrl: string, private readonly httpAgent?: Agent) {
    if (!validator.isURL(clientCertUrl)) {
      throw new Error(
        'The provided public client certificate URL is not a valid URL.',
      );
    }
  }

  /**
   * Fetches the public keys for the Google certs.
   *
   * @returns A promise fulfilled with public keys for the Google certs.
   */
  public fetchPublicKeys(): Promise<{ [key: string]: string }> {
    if (this.shouldRefresh()) {
      return this.refresh();
    }
    return Promise.resolve(this.publicKeys);
  }

  /**
   * Checks if the cached public keys need to be refreshed.
   *
   * @returns Whether the keys should be fetched from the client certs url or not.
   */
  private shouldRefresh(): boolean {
    return !this.publicKeys || this.publicKeysExpireAt <= Date.now();
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
      // reset expire at from previous set of keys.
      this.publicKeysExpireAt = 0;
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
        throw new Error(errorMessage);
      }
      throw err;
    });
  }
}

/**
 * Class for verifying JWT signature with a public key.
 */
export class PublicKeySignatureVerifier implements SignatureVerifier {
  constructor(private keyFetcher: KeyFetcher) {
    if (!validator.isNonNullObject(keyFetcher)) {
      throw new Error('The provided key fetcher is not an object or null.');
    }
  }

  public static withCertificateUrl(clientCertUrl: string, httpAgent?: Agent): PublicKeySignatureVerifier {
    return new PublicKeySignatureVerifier(new UrlKeyFetcher(clientCertUrl, httpAgent));
  }

  public static withJwksUrl(jwksUrl: string): PublicKeySignatureVerifier {
    return new PublicKeySignatureVerifier(new JwksFetcher(jwksUrl));
  }

  public verify(token: string): Promise<void> {
    if (!validator.isString(token)) {
      return Promise.reject(new JwtError(JwtErrorCode.INVALID_ARGUMENT,
        'The provided token must be a string.'));
    }

    return verifyJwtSignature(token, getKeyCallback(this.keyFetcher), { algorithms: [ALGORITHM_RS256] })
      .catch((error: JwtError) => {
        if (error.code === JwtErrorCode.NO_KID_IN_HEADER) {
          // No kid in JWT header. Try with all the public keys.
          return this.verifyWithoutKid(token);
        }
        throw error;
      });
  }

  private verifyWithoutKid(token: string): Promise<void> {
    return this.keyFetcher.fetchPublicKeys()
      .then(publicKeys => this.verifyWithAllKeys(token, publicKeys));
  }

  private verifyWithAllKeys(token: string, keys: { [key: string]: string }): Promise<void> {
    const promises: Promise<boolean>[] = [];
    Object.values(keys).forEach((key) => {
      const result = verifyJwtSignature(token, key)
        .then(() => true)
        .catch((error) => {
          if (error.code === JwtErrorCode.TOKEN_EXPIRED) {
            throw error;
          }
          return false;
        })
      promises.push(result);
    });

    return Promise.all(promises)
      .then((result) => {
        if (result.every((r) => r === false)) {
          throw new JwtError(JwtErrorCode.INVALID_SIGNATURE, 'Invalid token signature.');
        }
      });
  }
}

/**
 * Class for verifying unsigned (emulator) JWTs.
 */
export class EmulatorSignatureVerifier implements SignatureVerifier {
  public verify(token: string): Promise<void> {
    // Signature checks skipped for emulator; no need to fetch public keys.
    return verifyJwtSignature(token, '');
  }
}

/**
 * Provides a callback to fetch public keys.
 *
 * @param fetcher - KeyFetcher to fetch the keys from.
 * @returns A callback function that can be used to get keys in `jsonwebtoken`.
 */
function getKeyCallback(fetcher: KeyFetcher): jwt.GetPublicKeyOrSecret {
  return (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
    if (!header.kid) {
      callback(new Error(NO_KID_IN_HEADER_ERROR_MESSAGE));
    }
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

/**
 * Verifies the signature of a JWT using the provided secret or a function to fetch
 * the secret or public key.
 *
 * @param token - The JWT to be verified.
 * @param secretOrPublicKey - The secret or a function to fetch the secret or public key.
 * @param options - JWT verification options.
 * @returns A Promise resolving for a token with a valid signature.
 */
export function verifyJwtSignature(token: string, secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret,
  options?: jwt.VerifyOptions): Promise<void> {
  if (!validator.isString(token)) {
    return Promise.reject(new JwtError(JwtErrorCode.INVALID_ARGUMENT,
      'The provided token must be a string.'));
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, options,
      (error: jwt.VerifyErrors | null) => {
        if (!error) {
          return resolve();
        }
        if (error.name === 'TokenExpiredError') {
          return reject(new JwtError(JwtErrorCode.TOKEN_EXPIRED,
            'The provided token has expired. Get a fresh token from your ' +
            'client app and try again.'));
        } else if (error.name === 'JsonWebTokenError') {
          if (error.message && error.message.includes(JWT_CALLBACK_ERROR_PREFIX)) {
            const message = error.message.split(JWT_CALLBACK_ERROR_PREFIX).pop() || 'Error fetching public keys.';
            let code = JwtErrorCode.KEY_FETCH_ERROR;
            if (message === NO_MATCHING_KID_ERROR_MESSAGE) {
              code = JwtErrorCode.NO_MATCHING_KID;
            } else if (message === NO_KID_IN_HEADER_ERROR_MESSAGE) {
              code = JwtErrorCode.NO_KID_IN_HEADER;
            }
            return reject(new JwtError(code, message));
          }
        }
        return reject(new JwtError(JwtErrorCode.INVALID_SIGNATURE, error.message));
      });
  });
}

/**
 * Decodes general purpose Firebase JWTs.
 *
 * @param jwtToken - JWT token to be decoded.
 * @returns Decoded token containing the header and payload.
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
 * @param code - The error code.
 * @param message - The error message.
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
  INVALID_SIGNATURE = 'invalid-token',
  NO_MATCHING_KID = 'no-matching-kid-error',
  NO_KID_IN_HEADER = 'no-kid-error',
  KEY_FETCH_ERROR = 'key-fetch-error',
}

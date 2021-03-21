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

type Dictionary = {[key: string]: any}

export type DecodedToken = {
  header: Dictionary;
  payload: Dictionary;
}

/**
 * Class for decoding and verifying general purpose Firebase JWTs.
 */
export class JwtDecoder {

  constructor(private algorithm: jwt.Algorithm) {

    if (!validator.isNonEmptyString(algorithm)) {
      throw new Error('The provided JWT algorithm is an empty string.');
    }
  }

  public decodeToken(jwtToken: string): DecodedToken {
    if (!validator.isString(jwtToken)) {
      throw new JwtDecoderError({
        code: JwtDecoderErrorCode.INVALID_ARGUMENT,
        message: 'The provided token must be a string.'
      });
    }

    const fullDecodedToken: any = jwt.decode(jwtToken, {
      complete: true,
    });

    if (!fullDecodedToken) {
      throw new JwtDecoderError({
        code: JwtDecoderErrorCode.INVALID_ARGUMENT,
        message: 'Decoding token failed.'
      });
    }

    const header = fullDecodedToken?.header;
    const payload = fullDecodedToken?.payload;

    return { header, payload };
  }

  public isSignatureValid(jwtToken: string, publicKey: string | null): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const verifyOptions: jwt.VerifyOptions = {};
      if (publicKey !== null) {
        verifyOptions.algorithms = [this.algorithm];
      }
      jwt.verify(jwtToken, publicKey || '', verifyOptions,
        (error: jwt.VerifyErrors | null) => {
          if (!error) {
            return resolve(true);
          }
          if (error.name === 'TokenExpiredError') {
            return reject(new JwtDecoderError({
              code: JwtDecoderErrorCode.TOKEN_EXPIRED,
              message: 'The provided token has expired. Get a fresh token from your ' +
                'client app and try again.',
            }));
          } else if (error.name === 'JsonWebTokenError') {
            return resolve(false);
          }
          return reject(new JwtDecoderError({
            code: JwtDecoderErrorCode.INVALID_ARGUMENT,
            message: error.message
          }));
        });
    });
  }
}

/**
 * JwtDecoder error code structure.
 *
 * @param {ProjectManagementErrorCode} code The error code.
 * @param {ErrorInfo} errorInfo The error information (code and message).
 * @constructor
 */
export class JwtDecoderError extends Error {
  constructor(private errorInfo: ErrorInfo) {
    super(errorInfo.message);
    (this as any).__proto__ = JwtDecoderError.prototype;
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
 * Crypto Signer error codes and their default messages.
 */
export class JwtDecoderErrorCode {
  public static INVALID_ARGUMENT = 'invalid-argument';
  public static INVALID_CREDENTIAL = 'invalid-credential';
  public static TOKEN_EXPIRED = 'token-expired';
}

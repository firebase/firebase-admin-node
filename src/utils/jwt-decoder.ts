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
 * Decodes general purpose Firebase JWTs.
 */
export function decodeJwt(jwtToken: string): Promise<DecodedToken> {
  if (!validator.isString(jwtToken)) {
    return Promise.reject(new JwtDecoderError({
      code: JwtDecoderErrorCode.INVALID_ARGUMENT,
      message: 'The provided token must be a string.'
    }));
  }

  const fullDecodedToken: any = jwt.decode(jwtToken, {
    complete: true,
  });

  if (!fullDecodedToken) {
    return Promise.reject(new JwtDecoderError({
      code: JwtDecoderErrorCode.INVALID_ARGUMENT,
      message: 'Decoding token failed.'
    }));
  }

  const header = fullDecodedToken?.header;
  const payload = fullDecodedToken?.payload;

  return Promise.resolve({ header, payload });
}

/**
 * JwtDecoder error code structure.
 *
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
 * JWT decoder error codes.
 */
export enum JwtDecoderErrorCode {
  INVALID_ARGUMENT = 'invalid-argument',
  INVALID_CREDENTIAL = 'invalid-credential',
  TOKEN_EXPIRED = 'token-expired',
}

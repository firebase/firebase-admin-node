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

// List of blacklisted claims which cannot be provided when creating a custom token
export const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

/**
 * CryptoSigner interface represents an object that can be used to sign JWTs.
 */
export interface CryptoSigner {
  /**
   * Cryptographically signs a buffer of data.
   *
   * @param {Buffer} buffer The data to be signed.
   * @return {Promise<Buffer>} A promise that resolves with the raw bytes of a signature.
   */
  sign(buffer: Buffer): Promise<Buffer>;

  /**
   * Returns the ID of the service account used to sign tokens.
   *
   * @return {Promise<string>} A promise that resolves with a service account ID.
   */
  getAccountId(): Promise<string>;
}
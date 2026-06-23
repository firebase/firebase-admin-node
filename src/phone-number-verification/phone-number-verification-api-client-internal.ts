/*!
 * @license
 * Copyright 2025 Google LLC
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

export interface FirebasePhoneNumberTokenInfo {
  /** Documentation URL. */
  url: string;
  /** verify API name. */
  verifyApiName: string;
  /** The JWT full name. */
  jwtName: string;
  /** The JWT short name. */
  shortName: string;
  /** The JWT typ (Type) */
  typ: string;
}

export const JWKS_URL = 'https://fpnv.googleapis.com/v1beta/jwks';

export const FPNV_TOKEN_INFO: FirebasePhoneNumberTokenInfo = {
  url: 'https://firebase.google.com/docs/phone-number-verification',
  verifyApiName: 'verifyToken()',
  jwtName: 'Firebase Phone Verification token',
  shortName: 'FPNV token',
  typ: 'JWT',
};

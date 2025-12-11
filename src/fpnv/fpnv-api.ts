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


/**
 * Interface representing a Fpnv token.
 */
export interface FpnvToken {
    /**
     * The issuer identifier for the issuer of the response.
     * This value is a URL with the format
     * `https://firebaseappcheck.googleapis.com/<PROJECT_NUMBER>`, where `<PROJECT_NUMBER>` is the
     * same project number specified in the {@link aud} property.
     */
    iss: string;

    /**
     * The audience for which this token is intended.
     * This value is a JSON array of two strings, the first is the project number of your
     * Firebase project, and the second is the project ID of the same project.
     */
    aud: string[];

    /**
     * The Fpnv token's expiration time, in seconds since the Unix epoch. That is, the
     * time at which this Fpnv token expires and should no longer be considered valid.
     */
    exp: number;

    /**
     * The Fpnv token's issued-at time, in seconds since the Unix epoch. That is, the
     * time at which this Fpnv token was issued and should start to be considered
     * valid.
     */
    iat: number;

    /**
     * The phone number of User.
     */
    sub: string;

    /**
     * Unique ID.
     */
    jti: string;

    /**
     * Unique ID.
     */
    nonce: string;

    /**
     * The corresponding user's phone number.
     * This value is not actually one of the JWT token claims. It is added as a
     * convenience, and is set as the value of the {@link sub} property.
     */
    getPhoneNumber(): string;

    /**
     * Other arbitrary claims included in the token.
     */
    [key: string]: any;
}

export { FpnvErrorCode, FirebasePnvError } from './fpnv-api-client-internal';


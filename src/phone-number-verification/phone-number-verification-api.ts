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
 * Interface representing a PhoneNumberVerification token.
 */
export interface PhoneNumberVerificationToken {
    /**
     * The issuer identifier for the issuer of the response.
     * This value is a URL with the format
     * `https://fpnv.googleapis.com/projects/<PROJECT_NUMBER>`, where `<PROJECT_NUMBER>` is the
     * project number of your Firebase project, and the
     * same project number specified in the {@link PhoneNumberVerificationToken.aud} property.
     */
    iss: string;

    /**
     * The audience for which this token is intended.
     * This value is a JSON array of two strings, the first is the project number of your
     * Firebase project, and the second is the project ID of the same project.
     */
    aud: string[];

    /**
     * The PhoneNumber Verification token's expiration time, in seconds since the Unix epoch. That is, the
     * time at which this PhoneNumber Verification token expires and should no longer be considered valid.
     */
    exp: number;

    /**
     * The PhoneNumber Verification token's issued-at time, in seconds since the Unix epoch. That is, the
     * time at which this PhoneNumber Verification token was issued and should start to be considered
     * valid.
     */
    iat: number;

    /**
     * The phone number corresponding to this token.
     * As a convenience, this value is copied over to the
     * {@link PhoneNumberVerificationToken.phoneNumber | phoneNumber} property.
     */
    sub: string;

    /**
     * A case-sensitive string that uniquely identifies a specific JWT instance
     */
    jti: string;

    /**
     * A unique, single-use "number used once" value.
     */
    nonce: string;

    /**
     * The corresponding user's phone number.
     * This value is not actually one of the JWT token claims. It is added as a
     * convenience, and is set as the value of the {@link PhoneNumberVerificationToken.sub} property.
     */
    phoneNumber: string;

    /**
     * Indicates whether the token was issued while the app was in test mode.
     * Present and set to `true` for test-mode tokens.
     * As a convenience, a boolean value is also copied over to the
     * {@link PhoneNumberVerificationToken.testNumber | testNumber} property.
     */
    test_number?: boolean;

    /**
     * Indicates whether the token was issued while the app was in test mode.
     * This value is not actually one of the JWT token claims. It is added as a
     * convenience, and is set to `true` when the {@link PhoneNumberVerificationToken.test_number}
     * claim is `true`, or `false` otherwise.
     */
    testNumber?: boolean;

    /**
     * Other arbitrary claims included in the token.
     */
    [key: string]: any;
}

/**
 * Interface representing options for the {@link PhoneNumberVerification.verifyToken} method.
 */
export interface VerifyPhoneNumberTokenOptions {
    /**
     * To accept test-mode tokens (tokens containing the claim `"test_number": true`),
     * set this option to `true`. By default, {@link PhoneNumberVerification.verifyToken}
     * rejects test-mode tokens.
     *
     * Enable this option only during development and testing.
     */
    acceptTestTokens?: boolean;
}

export {
  PhoneNumberVerificationErrorCode,
  FirebasePhoneNumberVerificationError,
} from './error';


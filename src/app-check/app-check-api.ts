/*!
 * @license
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

/**
 * Interface representing an App Check token.
 */
export interface AppCheckToken {
  /**
   * The Firebase App Check token.
   */
  token: string;

  /**
   * The time-to-live duration of the token in milliseconds.
   */
  ttlMillis: number;
}

/**
 * Interface representing App Check token options.
 */
export interface AppCheckTokenOptions {
  /**
   * The length of time, in milliseconds, for which the App Check token will
   * be valid. This value must be between 30 minutes and 7 days, inclusive.
   */
  ttlMillis?: number;
}

/**
 * Interface representing a decoded Firebase App Check token, returned from the
 * {@link AppCheck.verifyToken} method.
 */
export interface DecodedAppCheckToken {
  /**
   * The issuer identifier for the issuer of the response.
   * This value is a URL with the format
   * `https://firebaseappcheck.googleapis.com/<PROJECT_NUMBER>`, where `<PROJECT_NUMBER>` is the
   * same project number specified in the {@link DecodedAppCheckToken.aud | aud} property.
   */
  iss: string;

  /**
   * The Firebase App ID corresponding to the app the token belonged to.
   * As a convenience, this value is copied over to the {@link DecodedAppCheckToken.app_id | app_id} property.
   */
  sub: string;

  /**
   * The audience for which this token is intended.
   * This value is a JSON array of two strings, the first is the project number of your
   * Firebase project, and the second is the project ID of the same project.
   */
  aud: string[];

  /**
   * The App Check token's expiration time, in seconds since the Unix epoch. That is, the
   * time at which this App Check token expires and should no longer be considered valid.
   */
  exp: number;

  /**
   * The App Check token's issued-at time, in seconds since the Unix epoch. That is, the
   * time at which this App Check token was issued and should start to be considered
   * valid.
   */
  iat: number;

  /**
   * The App ID corresponding to the App the App Check token belonged to.
   * This value is not actually one of the JWT token claims. It is added as a
   * convenience, and is set as the value of the {@link DecodedAppCheckToken.sub | sub} property.
   */
  app_id: string;
  [key: string]: any;
}

/**
 * Interface representing a verified App Check token response.
 */
export interface VerifyAppCheckTokenResponse {
  /**
   * The App ID corresponding to the App the App Check token belonged to.
   */
  appId: string;

  /**
   * The decoded Firebase App Check token.
   */
  token: DecodedAppCheckToken;
}

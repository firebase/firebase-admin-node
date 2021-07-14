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

import { app } from '../firebase-namespace-api';

/**
 * Gets the {@link appCheck.AppCheck `AppCheck`} service for the
 * default app or a given app.
 *
 * You can call `admin.appCheck()` with no arguments to access the default
 * app's {@link appCheck.AppCheck `AppCheck`} service or as
 * `admin.appCheck(app)` to access the
 * {@link appCheck.AppCheck `AppCheck`} service associated with a
 * specific app.
 *
 * @example
 * ```javascript
 * // Get the `AppCheck` service for the default app
 * var defaultAppCheck = admin.appCheck();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `AppCheck` service for a given app
 * var otherAppCheck = admin.appCheck(otherApp);
 * ```
 *
 * @param app Optional app for which to return the `AppCheck` service.
 *   If not provided, the default `AppCheck` service is returned.
 *
 * @return The default `AppCheck` service if no
 *   app is provided, or the `AppCheck` service associated with the provided
 *   app.
 */
export declare function appCheck(app?: app.App): appCheck.AppCheck;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace appCheck {
  /**
   * The Firebase `AppCheck` service interface.
   */
  export interface AppCheck {
    app: app.App;

    /**
     * Creates a new {@link appCheck.AppCheckToken `AppCheckToken`} that can be sent
     * back to a client.
     * 
     * @param appId The App ID of the Firebase App the token belongs to.
     * @param options Optional options object when creating a new App Check Token.
     *
     * @returns A promise that fulfills with a `AppCheckToken`.
     */
    createToken(appId: string, options?: AppCheckTokenOptions): Promise<AppCheckToken>;

    /**
     * Verifies a Firebase App Check token (JWT). If the token is valid, the promise is
     * fulfilled with the token's decoded claims; otherwise, the promise is
     * rejected.
     *
     * @param appCheckToken The App Check token to verify.
     *
     * @return A promise fulfilled with the
     *   token's decoded claims if the App Check token is valid; otherwise, a rejected
     *   promise.
     */
    verifyToken(appCheckToken: string): Promise<VerifyAppCheckTokenResponse>;
  }

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
   * {@link appCheck.AppCheck.verifyToken `verifyToken()`} method.
   */
  export interface DecodedAppCheckToken {
    /**
     * The issuer identifier for the issuer of the response.
     *
     * This value is a URL with the format
     * `https://firebaseappcheck.googleapis.com/<PROJECT_NUMBER>`, where `<PROJECT_NUMBER>` is the
     * same project number specified in the [`aud`](#aud) property.
     */
    iss: string;

    /**
     * The Firebase App ID corresponding to the app the token belonged to.
     *
     * As a convenience, this value is copied over to the [`app_id`](#app_id) property.
     */
    sub: string;

    /**
     * The audience for which this token is intended.
     *
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
     *
     * This value is not actually one of the JWT token claims. It is added as a
     * convenience, and is set as the value of the [`sub`](#sub) property.
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
    token: appCheck.DecodedAppCheckToken;
  }
}

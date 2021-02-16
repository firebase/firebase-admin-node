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
     * @return A promise that fulfills with a `AppCheckToken`.
     */
    createToken(appId: string): Promise<AppCheckToken>;
  }

  /**
   * Interface representing an App Check token.
   */
  export interface AppCheckToken {
    /**
     * Firebase App Check token
     */
    token: string;

    /**
     * Time-to-live duration of the token in milliseconds.
     */
    ttlMillis: number;
  }
}

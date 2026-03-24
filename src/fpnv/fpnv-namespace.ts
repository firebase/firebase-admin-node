/*!
 * @license
 * Copyright 2026 Google LLC
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

import { App } from '../app';
import {
  FpnvToken as TFpnvToken,
} from './fpnv-api';
import { Fpnv as TFpnv } from './fpnv';

/**
 * Gets the {@link firebase-admin.fpnv#Fpnv} service for the default app or a given app.
 *
 * `admin.fpnv()` can be called with no arguments to access the default
 * app's `Fpnv` service or as `admin.fpnv(app)` to access the
 * `Fpnv` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the `Fpnv` service for the default app
 * var defaultFpnv = admin.fpnv();
 * ```
 *
 * @example
 * ```javascript
 * // Get the `Fpnv` service for a given app
 * var otherFpnv = admin.fpnv(otherApp);
 * ```
 *
 * @param app - Optional app for which to return the `Fpnv` service.
 *   If not provided, the default `Fpnv` service is returned.
 *
 * @returns The default `Fpnv` service if no
 *   app is provided, or the `Fpnv` service associated with the provided
 *   app.
 */
export declare function fpnv(app?: App): fpnv.Fpnv;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace fpnv {
  /**
   * Type alias to {@link firebase-admin.fpnv#fpnv}.
   */
  export type Fpnv = TFpnv;

  /**
   * Type alias to {@link firebase-admin.fpnv#FpnvToken}.
   */
  export type FpnvToken = TFpnvToken
}

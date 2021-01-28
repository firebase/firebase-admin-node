/*!
 * Copyright 2020 Google Inc.
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

import { Bucket } from '@google-cloud/storage';
import { app } from '../firebase-namespace-api';

/**
 * Gets the {@link storage.Storage `Storage`} service for the
 * default app or a given app.
 *
 * `admin.storage()` can be called with no arguments to access the default
 * app's {@link storage.Storage `Storage`} service or as
 * `admin.storage(app)` to access the
 * {@link storage.Storage `Storage`} service associated with a
 * specific app.
 *
 * @example
 * ```javascript
 * // Get the Storage service for the default app
 * var defaultStorage = admin.storage();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Storage service for a given app
 * var otherStorage = admin.storage(otherApp);
 * ```
 */
export declare function storage(app?: app.App): storage.Storage;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace storage {
  /**
   * The default `Storage` service if no
   * app is provided or the `Storage` service associated with the provided
   * app.
   */
  export interface Storage {
    /**
     * Optional app whose `Storage` service to
     * return. If not provided, the default `Storage` service will be returned.
     */
    app: app.App;
    /**
     * @returns A [Bucket](https://cloud.google.com/nodejs/docs/reference/storage/latest/Bucket)
     * instance as defined in the `@google-cloud/storage` package.
     */
    bucket(name?: string): Bucket;
  }
}

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

import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { MachineLearning } from './machine-learning';

export {
  MachineLearning,
  ListModelsResult,
  Model,
  TFLiteModel,
} from './machine-learning';
export {
  AutoMLTfliteModelOptions,
  GcsTfliteModelOptions,
  ListModelsOptions,
  ModelOptions,
  ModelOptionsBase,
} from './machine-learning-api-client';

/**
 * Gets the {@link machineLearning.MachineLearning `MachineLearning`} service for the
 * default app or a given app.
 *
 * `getMachineLearning()` can be called with no arguments to access the
 * default app's {@link machineLearning.MachineLearning
  * `MachineLearning`} service or as `getMachineLearning(app)` to access
  * the {@link machineLearning.MachineLearning `MachineLearning`}
  * service associated with a specific app.
  *
  * @example
  * ```javascript
  * // Get the MachineLearning service for the default app
  * const defaultMachineLearning = getMachineLearning();
  * ```
  *
  * @example
  * ```javascript
  * // Get the MachineLearning service for a given app
  * const otherMachineLearning = getMachineLearning(otherApp);
  * ```
  *
  * @param app Optional app whose `MachineLearning` service to
  *   return. If not provided, the default `MachineLearning` service
  *   will be returned.
  *
  * @return The default `MachineLearning` service if no app is provided or the
  *   `MachineLearning` service associated with the provided app.
  */
export function getMachineLearning(app?: App): MachineLearning {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('machineLearning', (app) => new MachineLearning(app));
}

import {
  ListModelsResult as TListModelsResult,
  MachineLearning as TMachineLearning,
  Model as TModel,
  TFLiteModel as TTFLiteModel,
} from './machine-learning';
import {
  AutoMLTfliteModelOptions as TAutoMLTfliteModelOptions,
  GcsTfliteModelOptions as TGcsTfliteModelOptions,
  ListModelsOptions as TListModelsOptions,
  ModelOptions as TModelOptions,
  ModelOptionsBase as TModelOptionsBase,
} from './machine-learning-api-client';

/**
 * Gets the {@link machineLearning.MachineLearning `MachineLearning`} service for the
 * default app or a given app.
 *
 * `admin.machineLearning()` can be called with no arguments to access the
 * default app's {@link machineLearning.MachineLearning
 * `MachineLearning`} service or as `admin.machineLearning(app)` to access
 * the {@link machineLearning.MachineLearning `MachineLearning`}
 * service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the MachineLearning service for the default app
 * var defaultMachineLearning = admin.machineLearning();
 * ```
 *
 * @example
 * ```javascript
 * // Get the MachineLearning service for a given app
 * var otherMachineLearning = admin.machineLearning(otherApp);
 * ```
 *
 * @param app Optional app whose `MachineLearning` service to
 *   return. If not provided, the default `MachineLearning` service
 *   will be returned.
 *
 * @return The default `MachineLearning` service if no app is provided or the
 *   `MachineLearning` service associated with the provided app.
 */
export declare function machineLearning(app?: App): machineLearning.MachineLearning;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace machineLearning {
  export type ListModelsResult = TListModelsResult;
  export type MachineLearning = TMachineLearning;
  export type Model = TModel;
  export type TFLiteModel = TTFLiteModel;

  export type AutoMLTfliteModelOptions = TAutoMLTfliteModelOptions;
  export type GcsTfliteModelOptions = TGcsTfliteModelOptions;
  export type ListModelsOptions = TListModelsOptions;
  export type ModelOptions = TModelOptions;
  export type ModelOptionsBase = TModelOptionsBase;
}

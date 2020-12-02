/*!
 * @license
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

import { app } from './firebase-namespace-api';
import { FirebaseApp } from './firebase-app';

import App = app.App;

/**
 * Internals of a FirebaseService instance.
 */
export interface FirebaseServiceInternalsInterface {
  delete(): Promise<void>;
}

/**
 * Services are exposed through instances, each of which is associated with a FirebaseApp.
 */
export interface FirebaseServiceInterface {
  app: App;
  INTERNAL: FirebaseServiceInternalsInterface;
}

/**
 * Factory method to create FirebaseService instances given a FirebaseApp instance. Can optionally
 * add properties and methods to each FirebaseApp instance via the extendApp() function.
 */
export type FirebaseServiceFactory =
  (app: FirebaseApp, extendApp?: (props: object) => void) => FirebaseServiceInterface;

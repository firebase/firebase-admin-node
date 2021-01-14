/*!
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

import { AppErrorCodes, FirebaseAppError } from '../utils/error';
import { App, AppOptions } from './core';
import { FirebaseNamespace } from './firebase-namespace';

/**
 * In order to maintain backward compatibility, we instantiate a default namespace instance in
 * this module, and delegate all app lifecycle operations to it. In a future implementation where
 * the old admin namespace is no longer supported, we should remove this, and implement app
 * lifecycle management in this module itself.
 *
 * @internal
 */
export const defaultNamespace = new FirebaseNamespace();

export function initializeApp(options?: AppOptions, name?: string): App {
  return defaultNamespace.initializeApp(options, name);
}

export function getApp(name?: string): App {
  return defaultNamespace.app(name);
}

export function getApps(): App[] {
  return defaultNamespace.apps;
}

export function deleteApp(app: App): Promise<void> {
  if (typeof app !== 'object' || app === null || !('options' in app)) {
    throw new FirebaseAppError(AppErrorCodes.INVALID_ARGUMENT, 'Invalid app argument.');
  }

  // Make sure the given app already exists.
  const existingApp = getApp(app.name);

  // Delegate delete operation to the App instance itself for now. This will tear down any
  // local app state, and also remove it from the global map.
  return (existingApp as any).delete();
}

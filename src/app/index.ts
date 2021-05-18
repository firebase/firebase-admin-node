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

import { getSdkVersion } from '../utils';

/**
 * Firebase App and SDK initialization.
 *
 * @packageDocumentation
 */

export { App, AppOptions, FirebaseArrayIndexError, FirebaseError } from './core'
export { initializeApp, getApp, getApps, deleteApp } from './lifecycle';

export { Credential, ServiceAccount, GoogleOAuthAccessToken } from './credential';
export { applicationDefault, cert, refreshToken } from './credential-factory';

export const SDK_VERSION = getSdkVersion();

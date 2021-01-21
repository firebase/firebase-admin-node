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

import { Agent } from 'http';

import { Credential, ServiceAccount } from './credential';
import {
  ServiceAccountCredential, RefreshTokenCredential, getApplicationDefault
} from './credential-internal';

let globalAppDefaultCred: Credential | undefined;
const globalCertCreds: { [key: string]: ServiceAccountCredential } = {};
const globalRefreshTokenCreds: { [key: string]: RefreshTokenCredential } = {};

export function applicationDefault(httpAgent?: Agent): Credential {
  if (typeof globalAppDefaultCred === 'undefined') {
    globalAppDefaultCred = getApplicationDefault(httpAgent);
  }
  return globalAppDefaultCred;
}

export function cert(serviceAccountPathOrObject: string | ServiceAccount, httpAgent?: Agent): Credential {
  const stringifiedServiceAccount = JSON.stringify(serviceAccountPathOrObject);
  if (!(stringifiedServiceAccount in globalCertCreds)) {
    globalCertCreds[stringifiedServiceAccount] = new ServiceAccountCredential(
      serviceAccountPathOrObject, httpAgent);
  }
  return globalCertCreds[stringifiedServiceAccount];
}

export function refreshToken(refreshTokenPathOrObject: string | object, httpAgent?: Agent): Credential {
  const stringifiedRefreshToken = JSON.stringify(refreshTokenPathOrObject);
  if (!(stringifiedRefreshToken in globalRefreshTokenCreds)) {
    globalRefreshTokenCreds[stringifiedRefreshToken] = new RefreshTokenCredential(
      refreshTokenPathOrObject, httpAgent);
  }
  return globalRefreshTokenCreds[stringifiedRefreshToken];
}

/**
 * Clears the global ADC cache. Exported for testing.
 */
export function clearGlobalAppDefaultCred(): void {
  globalAppDefaultCred = undefined;
}

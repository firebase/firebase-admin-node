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

import * as credentialApi from './credential';
import * as credentialInterfacesApi from './credential-interfaces';

/**
 * Temporarily, admin.credential is used as the namespace name because we
 * cannot barrel re-export the contents from credential.ts, and we want it to
 * match the namespacing in the re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.credential {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  // Allows for exposing classes as interfaces in typings
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export import Credential = credentialInterfacesApi.Credential;
  export const applicationDefault = credentialApi.applicationDefault;
  export const cert = credentialApi.cert;
  export const refreshToken = credentialApi.refreshToken;
}

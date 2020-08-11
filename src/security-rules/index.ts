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

import { FirebaseApp } from '../firebase-app';
import * as securityRulesApi from './security-rules';
import * as firebaseAdmin from '../index';

export function securityRules(app?: FirebaseApp): securityRulesApi.SecurityRules {
  if (typeof(app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.securityRules();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.securityRules()` cannot be called like a function. Temporarily,
 * admin.securityRules is used as the namespace name because we cannot barrel 
 * re-export the contents from security-rules, and we want it to
 * match the namespacing in the re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.securityRules {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import RulesFile = securityRulesApi.RulesFile;
  export import RulesetMetadata = securityRulesApi.RulesetMetadata;
  export import RulesetMetadataList = securityRulesApi.RulesetMetadataList;
  
  /* eslint-disable @typescript-eslint/no-empty-interface */ 
  export interface Ruleset extends securityRulesApi.Ruleset {}
  export interface SecurityRules extends securityRulesApi.SecurityRules {}
}

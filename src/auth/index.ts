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

/**
 * Firebase Authentication.
 *
 * @packageDocumentation
 */

import { App, getApp } from '../app/index';
import { FirebaseApp } from '../app/firebase-app';
import { Auth } from './auth';

/**
 * Gets the {@link Auth} service for the default app or a
 * given app.
 *
 * `getAuth()` can be called with no arguments to access the default app's
 * {@link Auth} service or as `getAuth(app)` to access the
 * {@link Auth} service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Auth service for the default app
 * const defaultAuth = getAuth();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Auth service for a given app
 * const otherAuth = getAuth(otherApp);
 * ```
 *
 */
export function getAuth(app?: App): Auth {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('auth', (app) => new Auth(app));
}

export { ActionCodeSettings } from './action-code-settings-builder';

export {
  Auth,
} from './auth';

export {
  AuthFactorType,
  AuthProviderConfig,
  AuthProviderConfigFilter,
  BaseAuthProviderConfig,
  BaseCreateMultiFactorInfoRequest,
  BaseUpdateMultiFactorInfoRequest,
  CreateMultiFactorInfoRequest,
  CreatePhoneMultiFactorInfoRequest,
  CreateRequest,
  EmailSignInProviderConfig,
  ListProviderConfigResults,
  MultiFactorConfig,
  MultiFactorConfigState,
  MultiFactorCreateSettings,
  MultiFactorUpdateSettings,
  OAuthResponseType,
  OIDCAuthProviderConfig,
  OIDCUpdateAuthProviderRequest,
  SAMLAuthProviderConfig,
  SAMLUpdateAuthProviderRequest,
  UserProvider,
  UpdateAuthProviderRequest,
  UpdateMultiFactorInfoRequest,
  UpdatePhoneMultiFactorInfoRequest,
  UpdateRequest,
} from './auth-config';

export {
  BaseAuth,
  DeleteUsersResult,
  GetUsersResult,
  ListUsersResult,
  SessionCookieOptions,
} from './base-auth';

export {
  EmailIdentifier,
  PhoneIdentifier,
  ProviderIdentifier,
  UidIdentifier,
  UserIdentifier,
} from './identifier';

export {
  CreateTenantRequest,
  Tenant,
  UpdateTenantRequest,
} from './tenant';

export {
  ListTenantsResult,
  TenantAwareAuth,
  TenantManager,
} from './tenant-manager';

export { DecodedIdToken } from './token-verifier';

export {
  HashAlgorithmType,
  UserImportOptions,
  UserImportRecord,
  UserImportResult,
  UserMetadataRequest,
  UserProviderRequest,
} from './user-import-builder';

export {
  MultiFactorInfo,
  MultiFactorSettings,
  PhoneMultiFactorInfo,
  UserInfo,
  UserMetadata,
  UserRecord,
} from './user-record';

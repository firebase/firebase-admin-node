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

export { ActionCodeSettings } from './action-code-settings-builder';

export {
  Auth,
} from './auth';

export {
  MultiFactorConfig,
  MultiFactorConfigState,
  AuthFactorType,
  EmailSignInProviderConfig,
  AuthProviderConfig,
  SAMLAuthProviderConfig,
  OIDCAuthProviderConfig,
  SAMLUpdateAuthProviderRequest,
  OIDCUpdateAuthProviderRequest,
  UpdateAuthProviderRequest,
  ListProviderConfigResults,
  AuthProviderConfigFilter,
  MultiFactorUpdateSettings,
  UpdateMultiFactorInfoRequest,
  UpdatePhoneMultiFactorInfoRequest,
  UpdateRequest,
  CreateRequest,
  CreateMultiFactorInfoRequest,
  CreatePhoneMultiFactorInfoRequest,
  MultiFactorCreateSettings,
} from './auth-config';

export {
  DeleteUsersResult,
  GetUsersResult,
  ListUsersResult,
  SessionCookieOptions,
  BaseAuth,
} from './base-auth';

export {
  UserIdentifier,
  UidIdentifier,
  PhoneIdentifier,
  EmailIdentifier,
  ProviderIdentifier,
} from './identifier';

export {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
} from './tenant';

export {
  TenantManager,
  ListTenantsResult,
  TenantAwareAuth,
} from './tenant-manager';

export { DecodedIdToken } from './token-verifier';

export {
  HashAlgorithmType,
  UserImportOptions,
  UserMetadataRequest,
  UserProviderRequest,
  UserImportRecord,
  UserImportResult,
} from './user-import-builder';

export {
  UserRecord,
  UserMetadata,
  UserInfo,
  PhoneMultiFactorInfo,
  MultiFactorInfo,
  MultiFactorSettings,
} from './user-record';

export { auth } from './auth-namespace';

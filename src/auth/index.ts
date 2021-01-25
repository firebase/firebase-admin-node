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
  AuthFactorType,
  AuthProviderConfig,
  AuthProviderConfigFilter,
  CreateMultiFactorInfoRequest,
  CreatePhoneMultiFactorInfoRequest,
  CreateRequest,
  EmailSignInProviderConfig,
  ListProviderConfigResults,
  MultiFactorConfig,
  MultiFactorConfigState,
  MultiFactorCreateSettings,
  MultiFactorUpdateSettings,
  OIDCAuthProviderConfig,
  OIDCUpdateAuthProviderRequest,
  SAMLAuthProviderConfig,
  SAMLUpdateAuthProviderRequest,
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

export { auth } from './auth-namespace';

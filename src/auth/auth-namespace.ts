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

import { App } from '../app/index';

// Import all public types with aliases, and re-export from the auth namespace.

import { ActionCodeSettings as TActionCodeSettings } from './action-code-settings-builder';

import { Auth as TAuth } from './auth';

import {
  AuthFactorType as TAuthFactorType,
  AuthProviderConfig as TAuthProviderConfig,
  AuthProviderConfigFilter as TAuthProviderConfigFilter,
  CreateRequest as TCreateRequest,
  CreateMultiFactorInfoRequest as TCreateMultiFactorInfoRequest,
  CreatePhoneMultiFactorInfoRequest as TCreatePhoneMultiFactorInfoRequest,
  EmailSignInProviderConfig as TEmailSignInProviderConfig,
  ListProviderConfigResults as TListProviderConfigResults,
  MultiFactorCreateSettings as TMultiFactorCreateSettings,
  MultiFactorConfig as TMultiFactorConfig,
  MultiFactorConfigState as TMultiFactorConfigState,
  MultiFactorUpdateSettings as TMultiFactorUpdateSettings,
  OIDCAuthProviderConfig as TOIDCAuthProviderConfig,
  OIDCUpdateAuthProviderRequest as TOIDCUpdateAuthProviderRequest,
  SAMLAuthProviderConfig as TSAMLAuthProviderConfig,
  SAMLUpdateAuthProviderRequest as TSAMLUpdateAuthProviderRequest,
  UpdateAuthProviderRequest as TUpdateAuthProviderRequest,
  UpdateMultiFactorInfoRequest as TUpdateMultiFactorInfoRequest,
  UpdatePhoneMultiFactorInfoRequest as TUpdatePhoneMultiFactorInfoRequest,
  UpdateRequest as TUpdateRequest,
} from './auth-config';

import {
  BaseAuth as TBaseAuth,
  DeleteUsersResult as TDeleteUsersResult,
  GetUsersResult as TGetUsersResult,
  ListUsersResult as TListUsersResult,
  SessionCookieOptions as TSessionCookieOptions,
} from './base-auth';

import {
  EmailIdentifier as TEmailIdentifier,
  PhoneIdentifier as TPhoneIdentifier,
  ProviderIdentifier as TProviderIdentifier,
  UserIdentifier as TUserIdentifier,
  UidIdentifier as TUidIdentifier,
} from './identifier';

import {
  CreateTenantRequest as TCreateTenantRequest,
  Tenant as TTenant,
  UpdateTenantRequest as TUpdateTenantRequest,
} from './tenant';

import {
  ListTenantsResult as TListTenantsResult,
  TenantAwareAuth as TTenantAwareAuth,
  TenantManager as TTenantManager,
} from './tenant-manager';

import { DecodedIdToken as TDecodedIdToken } from './token-verifier';

import {
  HashAlgorithmType as THashAlgorithmType,
  UserImportOptions as TUserImportOptions,
  UserImportRecord as TUserImportRecord,
  UserImportResult as TUserImportResult,
  UserMetadataRequest as TUserMetadataRequest,
  UserProviderRequest as TUserProviderRequest,
} from './user-import-builder';

import {
  MultiFactorInfo as TMultiFactorInfo,
  MultiFactorSettings as TMultiFactorSettings,
  PhoneMultiFactorInfo as TPhoneMultiFactorInfo,
  UserInfo as TUserInfo,
  UserMetadata as TUserMetadata,
  UserRecord as TUserRecord,
} from './user-record';

/**
 * Gets the {@link firebase-admin.auth#Auth} service for the default app or a
 * given app.
 *
 * `admin.auth()` can be called with no arguments to access the default app's
 * {@link firebase-admin.auth#Auth} service or as `admin.auth(app)` to access the
 * {@link firebase-admin.auth#Auth} service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Auth service for the default app
 * var defaultAuth = admin.auth();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Auth service for a given app
 * var otherAuth = admin.auth(otherApp);
 * ```
 *
 */
export declare function auth(app?: App): auth.Auth;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace auth {
  /**
   * Type alias to {@link firebase-admin.auth#ActionCodeSettings}.
   */
  export type ActionCodeSettings = TActionCodeSettings;

  /**
   * Type alias to {@link firebase-admin.auth#Auth}.
   */
  export type Auth = TAuth;

  /**
   * Type alias to {@link firebase-admin.auth#AuthFactorType}.
   */
  export type AuthFactorType = TAuthFactorType;

  /**
   * Type alias to {@link firebase-admin.auth#AuthProviderConfig}.
   */
  export type AuthProviderConfig = TAuthProviderConfig;

  /**
   * Type alias to {@link firebase-admin.auth#AuthProviderConfigFilter}.
   */
  export type AuthProviderConfigFilter = TAuthProviderConfigFilter;

  /**
   * Type alias to {@link firebase-admin.auth#BaseAuth}.
   */
  export type BaseAuth = TBaseAuth;

  /**
   * Type alias to {@link firebase-admin.auth#CreateMultiFactorInfoRequest}.
   */
  export type CreateMultiFactorInfoRequest = TCreateMultiFactorInfoRequest;

  /**
   * Type alias to {@link firebase-admin.auth#CreatePhoneMultiFactorInfoRequest}.
   */
  export type CreatePhoneMultiFactorInfoRequest = TCreatePhoneMultiFactorInfoRequest;

  /**
   * Type alias to {@link firebase-admin.auth#CreateRequest}.
   */
  export type CreateRequest = TCreateRequest;

  /**
   * Type alias to {@link firebase-admin.auth#CreateTenantRequest}.
   */
  export type CreateTenantRequest = TCreateTenantRequest;

  /**
   * Type alias to {@link firebase-admin.auth#DecodedIdToken}.
   */
  export type DecodedIdToken = TDecodedIdToken;

  /**
   * Type alias to {@link firebase-admin.auth#DeleteUsersResult}.
   */
  export type DeleteUsersResult = TDeleteUsersResult;

  /**
   * Type alias to {@link firebase-admin.auth#EmailIdentifier}.
   */
  export type EmailIdentifier = TEmailIdentifier;

  /**
   * Type alias to {@link firebase-admin.auth#EmailSignInProviderConfig}.
   */
  export type EmailSignInProviderConfig = TEmailSignInProviderConfig;

  /**
   * Type alias to {@link firebase-admin.auth#GetUsersResult}.
   */
  export type GetUsersResult = TGetUsersResult;

  /**
   * Type alias to {@link firebase-admin.auth#HashAlgorithmType}.
   */
  export type HashAlgorithmType = THashAlgorithmType;

  /**
   * Type alias to {@link firebase-admin.auth#ListProviderConfigResults}.
   */
  export type ListProviderConfigResults = TListProviderConfigResults;

  /**
   * Type alias to {@link firebase-admin.auth#ListTenantsResult}.
   */
  export type ListTenantsResult = TListTenantsResult;

  /**
   * Type alias to {@link firebase-admin.auth#ListUsersResult}.
   */
  export type ListUsersResult = TListUsersResult;

  /**
   * Type alias to {@link firebase-admin.auth#MultiFactorCreateSettings}.
   */
  export type MultiFactorCreateSettings = TMultiFactorCreateSettings;

  /**
   * Type alias to {@link firebase-admin.auth#MultiFactorConfig}.
   */
  export type MultiFactorConfig = TMultiFactorConfig;

  /**
   * Type alias to {@link firebase-admin.auth#MultiFactorConfigState}.
   */
  export type MultiFactorConfigState = TMultiFactorConfigState;

  /**
   * Type alias to {@link firebase-admin.auth#MultiFactorInfo}.
   */
  export type MultiFactorInfo = TMultiFactorInfo;

  /**
   * Type alias to {@link firebase-admin.auth#MultiFactorUpdateSettings}.
   */
  export type MultiFactorUpdateSettings = TMultiFactorUpdateSettings;

  /**
   * Type alias to {@link firebase-admin.auth#MultiFactorSettings}.
   */
  export type MultiFactorSettings = TMultiFactorSettings;

  /**
   * Type alias to {@link firebase-admin.auth#OIDCAuthProviderConfig}.
   */
  export type OIDCAuthProviderConfig = TOIDCAuthProviderConfig;

  /**
   * Type alias to {@link firebase-admin.auth#OIDCUpdateAuthProviderRequest}.
   */
  export type OIDCUpdateAuthProviderRequest = TOIDCUpdateAuthProviderRequest;

  /**
   * Type alias to {@link firebase-admin.auth#PhoneIdentifier}.
   */
  export type PhoneIdentifier = TPhoneIdentifier;

  /**
   * Type alias to {@link firebase-admin.auth#PhoneMultiFactorInfo}.
   */
  export type PhoneMultiFactorInfo = TPhoneMultiFactorInfo;

  /**
   * Type alias to {@link firebase-admin.auth#ProviderIdentifier}.
   */
  export type ProviderIdentifier = TProviderIdentifier;

  /**
   * Type alias to {@link firebase-admin.auth#SAMLAuthProviderConfig}.
   */
  export type SAMLAuthProviderConfig = TSAMLAuthProviderConfig;

  /**
   * Type alias to {@link firebase-admin.auth#SAMLUpdateAuthProviderRequest}.
   */
  export type SAMLUpdateAuthProviderRequest = TSAMLUpdateAuthProviderRequest;

  /**
   * Type alias to {@link firebase-admin.auth#SessionCookieOptions}.
   */
  export type SessionCookieOptions = TSessionCookieOptions;

  /**
   * Type alias to {@link firebase-admin.auth#Tenant}.
   */
  export type Tenant = TTenant;

  /**
   * Type alias to {@link firebase-admin.auth#TenantAwareAuth}.
   */
  export type TenantAwareAuth = TTenantAwareAuth;

  /**
   * Type alias to {@link firebase-admin.auth#TenantManager}.
   */
  export type TenantManager = TTenantManager;

  /**
   * Type alias to {@link firebase-admin.auth#UidIdentifier}.
   */
  export type UidIdentifier = TUidIdentifier;

  /**
   * Type alias to {@link firebase-admin.auth#UpdateAuthProviderRequest}.
   */
  export type UpdateAuthProviderRequest = TUpdateAuthProviderRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UpdateMultiFactorInfoRequest}.
   */
  export type UpdateMultiFactorInfoRequest = TUpdateMultiFactorInfoRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UpdatePhoneMultiFactorInfoRequest}.
   */
  export type UpdatePhoneMultiFactorInfoRequest = TUpdatePhoneMultiFactorInfoRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UpdateRequest}.
   */
  export type UpdateRequest = TUpdateRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UpdateTenantRequest}.
   */
  export type UpdateTenantRequest = TUpdateTenantRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UserIdentifier}.
   */
  export type UserIdentifier = TUserIdentifier;

  /**
   * Type alias to {@link firebase-admin.auth#UserImportOptions}.
   */
  export type UserImportOptions = TUserImportOptions;

  /**
   * Type alias to {@link firebase-admin.auth#UserImportRecord}.
   */
  export type UserImportRecord = TUserImportRecord;

  /**
   * Type alias to {@link firebase-admin.auth#UserImportResult}.
   */
  export type UserImportResult = TUserImportResult;

  /**
   * Type alias to {@link firebase-admin.auth#UserInfo}.
   */
  export type UserInfo = TUserInfo;

  /**
   * Type alias to {@link firebase-admin.auth#UserMetadata}.
   */
  export type UserMetadata = TUserMetadata;

  /**
   * Type alias to {@link firebase-admin.auth#UserMetadataRequest}.
   */
  export type UserMetadataRequest = TUserMetadataRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UserProviderRequest}.
   */
  export type UserProviderRequest = TUserProviderRequest;

  /**
   * Type alias to {@link firebase-admin.auth#UserRecord}.
   */
  export type UserRecord = TUserRecord;
}

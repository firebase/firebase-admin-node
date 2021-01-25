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

import { App, getApp } from '../app/index';
import { Auth } from './auth';
import { FirebaseApp } from '../app/firebase-app';

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

export function getAuth(app?: App): Auth {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('auth', (app) => new Auth(app));
}

/**
 * Gets the {@link auth.Auth `Auth`} service for the default app or a
 * given app.
 *
 * `admin.auth()` can be called with no arguments to access the default app's
 * {@link auth.Auth `Auth`} service or as `admin.auth(app)` to access the
 * {@link auth.Auth `Auth`} service associated with a specific app.
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
  export type ActionCodeSettings = TActionCodeSettings;
  export type Auth = TAuth;
  export type AuthFactorType = TAuthFactorType;
  export type AuthProviderConfig = TAuthProviderConfig;
  export type AuthProviderConfigFilter = TAuthProviderConfigFilter;
  export type BaseAuth = TBaseAuth;
  export type CreateMultiFactorInfoRequest = TCreateMultiFactorInfoRequest;
  export type CreatePhoneMultiFactorInfoRequest = TCreatePhoneMultiFactorInfoRequest;
  export type CreateRequest = TCreateRequest;
  export type CreateTenantRequest = TCreateTenantRequest;
  export type DecodedIdToken = TDecodedIdToken;
  export type DeleteUsersResult = TDeleteUsersResult;
  export type EmailIdentifier = TEmailIdentifier;
  export type EmailSignInProviderConfig = TEmailSignInProviderConfig;
  export type GetUsersResult = TGetUsersResult;
  export type HashAlgorithmType = THashAlgorithmType;
  export type ListProviderConfigResults = TListProviderConfigResults;
  export type ListTenantsResult = TListTenantsResult;
  export type ListUsersResult = TListUsersResult;
  export type MultiFactorCreateSettings = TMultiFactorCreateSettings;
  export type MultiFactorConfig = TMultiFactorConfig;
  export type MultiFactorConfigState = TMultiFactorConfigState;
  export type MultiFactorInfo = TMultiFactorInfo;
  export type MultiFactorUpdateSettings = TMultiFactorUpdateSettings;
  export type MultiFactorSettings = TMultiFactorSettings;
  export type OIDCAuthProviderConfig = TOIDCAuthProviderConfig;
  export type OIDCUpdateAuthProviderRequest = TOIDCUpdateAuthProviderRequest;
  export type PhoneIdentifier = TPhoneIdentifier;
  export type PhoneMultiFactorInfo = TPhoneMultiFactorInfo;
  export type ProviderIdentifier = TProviderIdentifier;
  export type SAMLAuthProviderConfig = TSAMLAuthProviderConfig;
  export type SAMLUpdateAuthProviderRequest = TSAMLUpdateAuthProviderRequest;
  export type SessionCookieOptions = TSessionCookieOptions;
  export type Tenant = TTenant;
  export type TenantAwareAuth = TTenantAwareAuth;
  export type TenantManager = TTenantManager;
  export type UidIdentifier = TUidIdentifier;
  export type UpdateAuthProviderRequest = TUpdateAuthProviderRequest;
  export type UpdateMultiFactorInfoRequest = TUpdateMultiFactorInfoRequest;
  export type UpdatePhoneMultiFactorInfoRequest = TUpdatePhoneMultiFactorInfoRequest;
  export type UpdateRequest = TUpdateRequest;
  export type UpdateTenantRequest = TUpdateTenantRequest;
  export type UserIdentifier = TUserIdentifier;
  export type UserImportOptions = TUserImportOptions;
  export type UserImportRecord = TUserImportRecord;
  export type UserImportResult = TUserImportResult;
  export type UserInfo = TUserInfo;
  export type UserMetadata = TUserMetadata;
  export type UserMetadataRequest = TUserMetadataRequest;
  export type UserProviderRequest = TUserProviderRequest;
  export type UserRecord = TUserRecord;
}

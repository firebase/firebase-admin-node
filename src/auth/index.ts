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

import * as _actionCode from './action-code-settings-builder';
import * as _auth from './auth';
import * as _config from './auth-config';
import * as _identifier from './identifier';
import * as _import from './user-import-builder';
import * as _mfa from './multi-factor';
import * as _tenant from './tenant';
import * as _tenantManager from './tenant-manager';
import * as _user from './user-record';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.auth {
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export import ActionCodeSettings = _actionCode.ActionCodeSettings;

  export interface Auth extends _auth.Auth { }
  export import DecodedIdToken = _auth.DecodedIdToken;
  export import DeleteUsersResult = _auth.DeleteUsersResult;
  export import GetUsersResult = _auth.GetUsersResult;
  export import ListUsersResult = _auth.ListUsersResult;
  export import SessionCookieOptions = _auth.SessionCookieOptions;
  export interface TenantAwareAuth extends _auth.TenantAwareAuth { }

  export import AuthFactorType = _config.AuthFactorType;
  export import AuthProviderConfig = _config.AuthProviderConfig;
  export import AuthProviderConfigFilter = _config.AuthProviderConfigFilter;
  export import EmailSignInProviderConfig = _config.EmailSignInProviderConfig;
  export import ListProviderConfigResults = _config.ListProviderConfigResults;
  export import MultiFactorConfig = _config.MultiFactorConfig;
  export import MultiFactorConfigState = _config.MultiFactorConfigState;
  export import OIDCAuthProviderConfig = _config.OIDCAuthProviderConfig;
  export import OIDCUpdateAuthProviderRequest = _config.OIDCUpdateAuthProviderRequest;
  export import SAMLAuthProviderConfig = _config.SAMLAuthProviderConfig;
  export import SAMLAuthProviderRequest = _config.SAMLAuthProviderRequest;
  export import SAMLUpdateAuthProviderRequest = _config.SAMLUpdateAuthProviderRequest;
  export import UpdateAuthProviderRequest = _config.UpdateAuthProviderRequest;

  export import EmailIdentifier = _identifier.EmailIdentifier;
  export import PhoneIdentifier = _identifier.PhoneIdentifier;
  export import ProviderIdentifier = _identifier.ProviderIdentifier;
  export import UidIdentifier = _identifier.UidIdentifier;
  export import UserIdentifier = _identifier.UserIdentifier;

  export import HashAlgorithmType = _import.HashAlgorithmType;
  export import UserImportOptions = _import.UserImportOptions;
  export import UserImportRecord = _import.UserImportRecord;
  export import UserImportResult = _import.UserImportResult;
  export import UserMetadataRequest = _import.UserMetadataRequest;
  export import UserProviderRequest = _import.UserProviderRequest;

  export interface MultiFactorInfo extends _mfa.MultiFactorInfo { }
  export interface PhoneMultiFactorInfo extends _mfa.PhoneMultiFactorInfo { }

  export import ListTenantsResult = _tenant.ListTenantsResult;
  export interface Tenant extends _tenant.Tenant { }
  export import TenantOptions = _tenant.TenantOptions;

  export interface TenantManager extends _tenantManager.TenantManager { }

  export import CreateMultiFactorInfoRequest = _user.CreateMultiFactorInfoRequest;
  export import CreatePhoneMultiFactorInfoRequest = _user.CreatePhoneMultiFactorInfoRequest;
  export import CreateRequest = _user.CreateRequest;
  export interface MultiFactor extends _user.MultiFactor { }
  export import MultiFactorCreateSettings = _user.MultiFactorCreateSettings;
  export import MultiFactorUpdateSettings = _user.MultiFactorUpdateSettings;
  export import UpdateMultiFactorInfoRequest = _user.UpdateMultiFactorInfoRequest;
  export import UpdatePhoneMultiFactorInfoRequest = _user.UpdatePhoneMultiFactorInfoRequest;
  export import UpdateRequest = _user.UpdateRequest;
  export interface UserInfo extends _user.UserInfo { }
  export interface UserMetadata extends _user.UserMetadata { }
  export interface UserRecord extends _user.UserRecord { }
}

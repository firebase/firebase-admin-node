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
import * as authApi from './auth';
import * as authConfigApi from './auth-config';
import * as userRecordApi from './user-record';
import * as tenantApi from './tenant';
import * as tenantManagerApi from './tenant-manager';
import * as actionCodeSettingsBuilderApi from './action-code-settings-builder';
import * as userImportBuilderApi from './user-import-builder';

export function auth(app: FirebaseApp): authApi.Auth {
  return app.auth();
}

// This is unfortunate. But it seems we must define a namespace to make
// the typings work correctly. Otherwise `admin.auth()` cannot be called like a
// function. It would be great if we can find an alternative.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace auth {
  // See https://github.com/microsoft/TypeScript/issues/4336
  export import UserMetadata = userRecordApi.UserMetadata;
  export import UserInfo = userRecordApi.UserInfo;
  export import UserRecord = userRecordApi.UserRecord;
  export import UpdateRequest = userRecordApi.UpdateRequest;
  export import CreateRequest = userRecordApi.CreateRequest;
  export import DecodedIdToken = authApi.DecodedIdToken;
  export import ListUsersResult = authApi.DecodedIdToken;
  export import HashAlgorithmType = userImportBuilderApi.HashAlgorithmType;
  export import UserImportOptions = userImportBuilderApi.UserImportOptions;
  export import UserImportResult = userImportBuilderApi.UserImportResult;
  export import UserImportRecord = userImportBuilderApi.UserImportRecord;
  export import SessionCookieOptions = authApi.SessionCookieOptions;
  export import ActionCodeSettings = actionCodeSettingsBuilderApi.ActionCodeSettings;
  export import Tenant = tenantApi.Tenant;
  export import UpdateTenantRequest = tenantApi.UpdateTenantRequest;
  export import CreateTenantRequest = tenantApi.CreateTenantRequest;
  export import ListTenantsResult = tenantApi.ListTenantsResult;
  export import AuthProviderConfigFilter = authConfigApi.AuthProviderConfigFilter;
  export import AuthProviderConfig = authConfigApi.AuthProviderConfig;
  export import SAMLAuthProviderConfig = authConfigApi.SAMLAuthProviderConfig;
  export import OIDCAuthProviderConfig = authConfigApi.OIDCAuthProviderConfig;
  export import SAMLUpdateAuthProviderRequest = authConfigApi.SAMLUpdateAuthProviderRequest;
  export import OIDCUpdateAuthProviderRequest = authConfigApi.OIDCUpdateAuthProviderRequest;
  export import ListProviderConfigResults = authConfigApi.ListProviderConfigResults;
  export import UpdateAuthProviderRequest = authConfigApi.UpdateAuthProviderRequest;
  export import BaseAuth = authApi.BaseAuth;
  export import TenantAwareAuth = authApi.TenantAwareAuth;
  export import Auth = authApi.Auth;
  export import TenantManager = tenantManagerApi.TenantManager;
  export import MultiFactorInfo = userRecordApi.MultiFactorInfo;
  export import PhoneMultiFactorInfo = userRecordApi.PhoneMultiFactorInfo;
  export import CreateMultiFactorInfoRequest = userRecordApi.CreateMultiFactorInfoRequest;
  export import CreatePhoneMultiFactorInfoRequest = userRecordApi.CreatePhoneMultiFactorInfoRequest;
  export import UpdateMultiFactorInfoRequest = userRecordApi.UpdateMultiFactorInfoRequest;
  export import UpdatePhoneMultiFactorInfoRequest = userRecordApi.UpdatePhoneMultiFactorInfoRequest;
  export import MultiFactorCreateSettings = userRecordApi.MultiFactorCreateSettings;
  export import MultiFactorUpdateSettings = userRecordApi.MultiFactorUpdateSettings;
  export import DeleteUsersResult = userRecordApi.DeleteUsersResult;
  export import GetUsersResult = userRecordApi.GetUsersResult;
}

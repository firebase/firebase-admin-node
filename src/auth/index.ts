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

import { AbstractAuthRequestHandler } from './auth-api-request-internal';
import { FirebaseApp } from '../firebase-app';
import * as firebaseAdmin from '../index';

import * as authApi from './auth';
import * as actionCodeSettingsBuilderApi from './action-code-settings-builder';
import * as authConfigApi from './auth-config';
import * as identifierApi from './identifier';
import * as tenantApi from './tenant';
import * as tenantManagerApi from './tenant-manager';
import * as userImportBuilderApi from './user-import-builder';
import * as userRecordApi from './user-record';

export function auth(app?: FirebaseApp): authApi.Auth {
  if (typeof (app) === 'undefined') {
    app = firebaseAdmin.app();
  }
  return app.auth();
}

/**
 * We must define a namespace to make the typings work correctly. Otherwise
 * `admin.auth()` cannot be called like a function. Temporarily, admin.auth
 * is used as the namespace name because we cannot barrel re-export the
 * contents from auth, and we want it to match the namespacing in the
 * re-export inside src/index.d.ts
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace admin.auth {
  // See https://github.com/microsoft/TypeScript/issues/4336
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import ActionCodeSettings = actionCodeSettingsBuilderApi.ActionCodeSettings
  export import AuthFactorType = authConfigApi.AuthFactorType
  export import AuthProviderConfig = authConfigApi.AuthProviderConfig
  export import AuthProviderConfigFilter = authConfigApi.AuthProviderConfigFilter
  export import CreateMultiFactorInfoRequest = userRecordApi.CreateMultiFactorInfoRequest
  export import CreatePhoneMultiFactorInfoRequest = userRecordApi.CreatePhoneMultiFactorInfoRequest
  export import CreateRequest = userRecordApi.CreateRequest
  export import DecodedIdToken = authApi.DecodedIdToken
  export import DeleteUsersResult = authApi.DeleteUsersResult
  export import EmailIdentifier = identifierApi.EmailIdentifier
  export import GetUsersResult = authApi.GetUsersResult
  export import ListProviderConfigResults = authConfigApi.ListProviderConfigResults
  export import ListTenantsResult = tenantApi.ListTenantsResult
  export import ListUsersResult = authApi.ListUsersResult
  export import MultiFactorConfig = authConfigApi.MultiFactorConfig
  export import MultiFactorConfigState = authConfigApi.MultiFactorConfigState
  export import MultiFactorCreateSettings = userRecordApi.MultiFactorCreateSettings
  export import MultiFactorInfo = userRecordApi.MultiFactorInfo
  export import MultiFactorUpdateSettings = userRecordApi.MultiFactorUpdateSettings
  export import OIDCAuthProviderConfig = authConfigApi.OIDCAuthProviderConfig
  export import OIDCUpdateAuthProviderRequest = authConfigApi.OIDCUpdateAuthProviderRequest
  export import PhoneIdentifier = identifierApi.PhoneIdentifier
  export import PhoneMultiFactorInfo = userRecordApi.PhoneMultiFactorInfo
  export import ProviderIdentifier = identifierApi.ProviderIdentifier
  export import SAMLAuthProviderConfig = authConfigApi.SAMLAuthProviderConfig
  export import SAMLUpdateAuthProviderRequest = authConfigApi.SAMLUpdateAuthProviderRequest
  export import SessionCookieOptions = authApi.SessionCookieOptions
  export import UidIdentifier = identifierApi.UidIdentifier
  export import UpdateMultiFactorInfoRequest = userRecordApi.UpdateMultiFactorInfoRequest
  export import UpdatePhoneMultiFactorInfoRequest = userRecordApi.UpdatePhoneMultiFactorInfoRequest
  export import UpdateRequest = userRecordApi.UpdateRequest
  export import UpdateTenantRequest = tenantApi.TenantOptions
  export import UserImportOptions = userImportBuilderApi.UserImportOptions
  export import UserImportRecord = userImportBuilderApi.UserImportRecord
  export import UserImportResult = userImportBuilderApi.UserImportResult
  export import UserMetadataRequest = userImportBuilderApi.UserMetadataRequest
  export import UserProviderRequest = userImportBuilderApi.UserProviderRequest

  export type CreateTenantRequest = UpdateTenantRequest
  export type UpdateAuthProviderRequest = authConfigApi.SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest
  export type UserIdentifier = UidIdentifier | EmailIdentifier | PhoneIdentifier | ProviderIdentifier

  // Allows for exposing classes as interfaces in typings */
  /* eslint-disable @typescript-eslint/no-empty-interface */
  export interface BaseAuth extends authApi.BaseAuth<AbstractAuthRequestHandler> { }
  export interface MultiFactorSettings extends userRecordApi.MultiFactor { }
  export interface Tenant extends tenantApi.Tenant { }
  export interface TenantAwareAuth extends authApi.TenantAwareAuth { }
  export interface TenantManager extends tenantManagerApi.TenantManager { }
  export interface UserInfo extends userRecordApi.UserInfo { }
  export interface UserMetadata extends userRecordApi.UserMetadata { }
  export interface UserRecord extends userRecordApi.UserRecord { }
}

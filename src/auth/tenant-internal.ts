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

import {
  MultiFactorConfig, MultiFactorAuthServerConfig
} from './auth-config';

import {
  EmailSignInConfigServerRequest, EmailSignInProviderConfig,
} from './auth-config-internal';

/** The TenantOptions interface used for create/read/update tenant operations. */
export interface TenantOptions {
  displayName?: string;
  emailSignInConfig?: EmailSignInProviderConfig;
  multiFactorConfig?: MultiFactorConfig;
  testPhoneNumbers?: { [phoneNumber: string]: string } | null;
}

/** The corresponding server side representation of a TenantOptions object. */
export interface TenantOptionsServerRequest extends EmailSignInConfigServerRequest {
  displayName?: string;
  mfaConfig?: MultiFactorAuthServerConfig;
  testPhoneNumbers?: { [key: string]: string };
}

/** The tenant server response interface. */
export interface TenantServerResponse {
  name: string;
  displayName?: string;
  allowPasswordSignup?: boolean;
  enableEmailLinkSignin?: boolean;
  mfaConfig?: MultiFactorAuthServerConfig;
  testPhoneNumbers?: { [key: string]: string };
}

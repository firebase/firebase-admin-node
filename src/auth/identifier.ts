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

import { auth } from './index';

import UserIdentifier = auth.UserIdentifier;
import UidIdentifier = auth.UidIdentifier;
import EmailIdentifier = auth.EmailIdentifier;
import PhoneIdentifier = auth.PhoneIdentifier;
import ProviderIdentifier = auth.ProviderIdentifier;

/*
 * User defined type guards. See
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
 */

export function isUidIdentifier(id: UserIdentifier): id is UidIdentifier {
  return (id as UidIdentifier).uid !== undefined;
}

export function isEmailIdentifier(id: UserIdentifier): id is EmailIdentifier {
  return (id as EmailIdentifier).email !== undefined;
}

export function isPhoneIdentifier(id: UserIdentifier): id is PhoneIdentifier {
  return (id as PhoneIdentifier).phoneNumber !== undefined;
}

export function isProviderIdentifier(id: ProviderIdentifier): id is ProviderIdentifier {
  const pid = id as ProviderIdentifier;
  return pid.providerId !== undefined && pid.providerUid !== undefined;
}

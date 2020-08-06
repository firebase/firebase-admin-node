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

// Keys which are not allowed in the messaging data payload object.
export const BLACKLISTED_DATA_PAYLOAD_KEYS = ['from'];

// Keys which are not allowed in the messaging options object.
export const BLACKLISTED_OPTIONS_KEYS = [
  'condition', 'data', 'notification', 'registrationIds', 'registration_ids', 'to',
];

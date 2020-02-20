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

export interface RemoteConfigParameter {
    key: string;
    defaultValue?: string; // If `undefined`, the parameter uses the in-app default value
    description?: string;

    // A dictionary of {conditionName: value}
    // `undefined` value sets `useInAppDefault` to `true` (equivalent to `No Value`)
    conditionalValues?: {[name: string]: string | undefined};
}

export interface RemoteConfigCondition {
    name: string;
    expression: string;
    color?: string;
}

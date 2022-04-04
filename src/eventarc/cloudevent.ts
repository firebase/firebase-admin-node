
/*!
 * @license
 * Copyright 2022 Google Inc.
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

/**
 * A CloudEvent version.
 */
export type CloudEventVersion = '1.0';

/**
  * A CloudEvent describes event data.
  * 
  * @see https://github.com/cloudevents/spec/blob/v1.0/spec.md
  */
export interface CloudEvent {
   id?: string;
   source?: string;
   specversion?: CloudEventVersion;
   type: string;
 
   subject?: string;
   datacontenttype?: string;
   time?: string;
   data?: object | string;
 
   // Custom attributes/extensions.
   [key: string]: any;
 }

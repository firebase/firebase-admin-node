/*!
 * Copyright 2019 Google Inc.
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

export class AppMetadata {
  public readonly appId: string;
  public readonly displayName: string;
  public readonly platform: AppPlatform;
}

export enum AppPlatform {
  PLATFORM_UNKNOWN = 'PLATFORM_UNKNOWN',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

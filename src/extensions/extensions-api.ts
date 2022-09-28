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
 * SettableProcessingState represents all the Processing states that can be set on an ExtensionInstance's runtimeData.
 * 
 * - NONE: No lifecycle hook work has been done.
 * - PROCESSING_COMPLETE: Lifecycle hook work completed with no errors.
 * - PROCESSING_WARNING: Lifecycle hook work succeeded partially, or something happened that the user should be warned about.
 * - PROCESSING_FAILED: Lifecycle hook work failed completely, but the instance will still work correctly going forward.
 * - If the instance is in a broken state due to the errors, instead set FatalError.
 */
export type SettableProcessingState = 'NONE' | 'PROCESSING_COMPLETE' | 'PROCESSING_WARNING' | 'PROCESSING_FAILED';

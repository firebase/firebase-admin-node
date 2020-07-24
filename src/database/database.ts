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
import { Reference } from '@firebase/database';

declare module '@firebase/database' {
  interface Database {
    /**
     * Gets the currently applied security rules as a string. The return value consists of
     * the rules source including comments.
     *
     * @return A promise fulfilled with the rules as a raw string.
     */
    getRules(): Promise<string>;

    /**
     * Gets the currently applied security rules as a parsed JSON object. Any comments in
     * the original source are stripped away.
     *
     * @return A promise fulfilled with the parsed rules object.
     */
    getRulesJSON(): Promise<object>;

    /**
     * Sets the specified rules on the Firebase Realtime Database instance. If the rules source is
     * specified as a string or a Buffer, it may include comments.
     *
     * @param source Source of the rules to apply. Must not be `null` or empty.
     * @return Resolves when the rules are set on the Realtime Database.
     */
    setRules(source: string | Buffer | object): Promise<void>;
  }
}

// EventType and ThenableReference are temporarily defined here because they're
// not exposed in @firebase/database.
// See: https://github.com/firebase/firebase-js-sdk/issues/3479
export type EventType = 'value' | 'child_added' | 'child_changed'
  | 'child_moved' | 'child_removed';

/**
 * @extends {Reference}
 */
export interface ThenableReference extends Reference, Promise<Reference> { }

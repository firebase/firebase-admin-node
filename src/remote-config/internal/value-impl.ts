/*!
 * Copyright 2024 Google Inc.
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

'use strict';

import {
  Value,
  ValueSource,
} from '../remote-config-api';

/**
 * Implements type-safe getters for parameter values.
 * 
 * Visible for testing.
 * 
 * @internal
 */
export class ValueImpl implements Value {
  public static BOOLEAN_TRUTHY_VALUES = ['1', 'true', 't', 'yes', 'y', 'on'];
  public static DEFAULT_VALUE_FOR_NUMBER = 0;
  public static DEFAULT_VALUE_FOR_STRING = '';
  constructor(
        private readonly source: ValueSource,
        private readonly value = ValueImpl.DEFAULT_VALUE_FOR_STRING) { }
  asBoolean(): boolean {
    return ValueImpl.BOOLEAN_TRUTHY_VALUES.indexOf(this.value.toLowerCase()) >= 0;
  }
  asNumber(): number {
    const num = Number(this.value);
    if (isNaN(num)) {
      return ValueImpl.DEFAULT_VALUE_FOR_NUMBER;
    }
    return num;
  }
  asString(): string {
    return this.value;
  }
  getSource(): ValueSource {
    return this.source;
  }
}

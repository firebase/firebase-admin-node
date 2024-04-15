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
  public static readonly DEFAULT_VALUE_FOR_BOOLEAN = false;
  public static readonly DEFAULT_VALUE_FOR_STRING = '';
  public static readonly DEFAULT_VALUE_FOR_NUMBER = 0;
  public static readonly BOOLEAN_TRUTHY_VALUES = ['1', 'true', 't', 'yes', 'y', 'on'];
  constructor(
    private readonly source: ValueSource,
    private readonly value = ValueImpl.DEFAULT_VALUE_FOR_STRING) { }
  asString(): string {
    return this.value;
  }
  asBoolean(): boolean {
    if (this.source === 'static') {
      return ValueImpl.DEFAULT_VALUE_FOR_BOOLEAN;
    }
    return ValueImpl.BOOLEAN_TRUTHY_VALUES.indexOf(this.value.toLowerCase()) >= 0;
  }
  asNumber(): number {
    if (this.source === 'static') {
      return ValueImpl.DEFAULT_VALUE_FOR_NUMBER;
    }
    const num = Number(this.value);
    if (isNaN(num)) {
      return ValueImpl.DEFAULT_VALUE_FOR_NUMBER;
    }
    return num;
  }
  getSource(): ValueSource {
    return this.source;
  }
}

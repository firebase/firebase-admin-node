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

import * as chai from 'chai';
import { ValueImpl } from '../../../../src/remote-config/internal/value-impl';

const expect = chai.expect;

describe('ValueImpl', () => {
  describe('getSource', () => {
    it('returns the source string', () => {
      const value = new ValueImpl('static');
      expect(value.getSource()).to.equal('static');
    });
  });

  describe('asString', () => {
    it('returns string value as a string', () => {
      const value = new ValueImpl('default', 'shiba');
      expect(value.asString()).to.equal('shiba');
    });

    it('defaults to empty string', () => {
      const value = new ValueImpl('static');
      expect(value.asString()).to.equal(ValueImpl.DEFAULT_VALUE_FOR_STRING);
    });
  });

  describe('asNumber', () => {
    it('returns numeric value as a number', () => {
      const value = new ValueImpl('default', '123');
      expect(value.asNumber()).to.equal(123);
    });

    it('defaults to zero for non-numeric value', () => {
      const value = new ValueImpl('default', 'Hi, NaN!');
      expect(value.asNumber()).to.equal(ValueImpl.DEFAULT_VALUE_FOR_NUMBER);
    });
  });

  describe('asBoolean', () => {
    it("returns true for any value in RC's list of truthy values", () => {
      for (const truthyValue of ValueImpl.BOOLEAN_TRUTHY_VALUES) {
        const value = new ValueImpl('default', truthyValue);
        expect(value.asBoolean()).to.be.true;
      }
    });

    it('is case-insensitive', () => {
      const value = new ValueImpl('default', 'TRUE');
      expect(value.asBoolean()).to.be.true;
    });

    it("returns false for any value not in RC's list of truthy values", () => {
      const value = new ValueImpl('default', "I'm falsy");
      expect(value.asBoolean()).to.be.false;
    });
  });
});


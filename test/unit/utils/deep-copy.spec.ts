/*!
 * @license
 * Copyright 2026 Google LLC
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

import { expect } from 'chai';
import { deepCopy, deepExtend } from '../../../src/utils/deep-copy';

describe('deepCopy()', () => {
  it('should deep copy primitives and objects', () => {
    const source = {
      a: 1,
      b: 'hello',
      c: [1, 2, { nested: true }],
      d: new Date(1234567890),
    };
    const copy = deepCopy(source);
    expect(copy).to.deep.equal(source);
    expect(copy).to.not.equal(source);
    expect(copy.c).to.not.equal(source.c);
    expect(copy.c[2]).to.not.equal(source.c[2]);
    expect(copy.d).to.not.equal(source.d);
  });
});

describe('deepExtend()', () => {
  it('should merge nested objects and overwrite arrays', () => {
    const target = {
      a: { x: 1, y: 2 },
      arr: [1, 2],
    };
    const source = {
      a: { y: 3, z: 4 },
      arr: [3],
    };
    const result = deepExtend(target, source);
    expect(result).to.equal(target);
    expect(result).to.deep.equal({
      a: { x: 1, y: 3, z: 4 },
      arr: [3],
    });
  });

  it('should not mutate inherited prototype properties of the target', () => {
    const proto = { shared: { x: 1 } };
    const target = Object.create(proto);
    const source = { shared: { y: 2 } };

    deepExtend(target, source);

    expect(proto.shared).to.deep.equal({ x: 1 });
    expect(target.shared).to.deep.equal({ y: 2 });
    expect(Object.prototype.hasOwnProperty.call(target, 'shared')).to.be.true;
  });

  describe('prototype pollution', () => {
    afterEach(() => {
      delete (Object.prototype as any).polluted;
      delete (Object.prototype.toString as any).polluted;
    });

    it('should not pollute prototype via __proto__', () => {
      const payload = JSON.parse('{"__proto__": {"polluted": true}}');
      const target: Record<string, any> = {};
      deepExtend(target, payload);
      expect((Object.prototype as any).polluted).to.be.undefined;
      expect(target.polluted).to.be.undefined;
    });

    it('should not pollute prototype via constructor', () => {
      const payload = JSON.parse('{"constructor": {"prototype": {"polluted": true}}}');
      const target: Record<string, any> = {};
      deepExtend(target, payload);
      expect((Object.prototype as any).polluted).to.be.undefined;
      expect(target.polluted).to.be.undefined;
    });

    it('should not copy prototype property onto target', () => {
      const payload = JSON.parse('{"prototype": {"polluted": true}}');
      const target: Record<string, any> = {};
      deepExtend(target, payload);
      expect(Object.prototype.hasOwnProperty.call(target, 'prototype')).to.be.false;
    });

    it('should not pollute inherited Object.prototype methods like toString', () => {
      const payload = JSON.parse('{"toString": {"polluted": true}}');
      const target: Record<string, any> = {};
      deepExtend(target, payload);
      expect((Object.prototype.toString as any).polluted).to.be.undefined;
      expect(target.toString).to.deep.equal({ polluted: true });
    });
  });
});

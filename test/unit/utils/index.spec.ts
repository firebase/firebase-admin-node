import {expect} from 'chai';

import {addReadonlyGetter} from '../../../src/utils/index';

type Obj = {
  [key: string]: any;
};

describe('addReadonlyGetter()', () => {
  it('should add a new property to the provided object', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(obj.foo).to.be.true;
  });

  it('should make the new property read-only', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(() => {
      obj.foo = false;
    }).to.throw('Cannot assign to read only property \'foo\' of object \'#<Object>\'');
  });

  it('should make the new property enumerable', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(obj).to.have.keys(['foo']);
  });
});

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  isArray, isNonEmptyArray, isBoolean, isNumber, isString, isNonEmptyString, isNonNullObject,
  isEmail, isPassword, isURL, isUid,
} from '../../../src/utils/validator';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


/**
 * @param {number} numOfChars The number of random characters within the string.
 * @return {string} A string with a specific number of random characters.
 */
function createRandomString(numOfChars: number): string {
  let chars = [];
  let allowedChars = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (numOfChars > 0) {
    let index = Math.floor(Math.random() * allowedChars.length);
    chars.push(allowedChars.charAt(index));
    numOfChars--;
  }
  return chars.join('');
}

describe('isArray()', () => {
  it('should return false given no argument', () => {
    expect(isArray(undefined as any)).to.be.false;
  });

  const nonBooleans = [null, NaN, 0, 1, '', 'a', true, false, {}, { a: 1 }, _.noop];
  nonBooleans.forEach((nonBoolean) => {
    it('should return false given a non-array argument: ' + JSON.stringify(nonBoolean), () => {
      expect(isArray(nonBoolean as any)).to.be.false;
    });
  });

  it('should return true given an empty array', () => {
    expect(isArray([])).to.be.true;
  });

  it('should return true given a non-empty array', () => {
    expect(isArray([1, 2, 3])).to.be.true;
  });

  it('should return true given an empty array created from Array constructor', () => {
    expect(isArray(new Array())).to.be.true;
  });

  it('should return true given a non-empty array created from Array constructor', () => {
    expect(isArray(new Array(1, 2, 3))).to.be.true;
  });
});

describe('isNonEmptyArray()', () => {
  it('should return false given no argument', () => {
    expect(isNonEmptyArray(undefined as any)).to.be.false;
  });

  const nonBooleans = [null, NaN, 0, 1, '', 'a', true, false, {}, { a: 1 }, _.noop];
  nonBooleans.forEach((nonBoolean) => {
    it('should return false given a non-array argument: ' + JSON.stringify(nonBoolean), () => {
      expect(isNonEmptyArray(nonBoolean as any)).to.be.false;
    });
  });

  it('should return false given an empty array', () => {
    expect(isNonEmptyArray([])).to.be.false;
  });

  it('should return true given a non-empty array', () => {
    expect(isNonEmptyArray([1, 2, 3])).to.be.true;
  });

  it('should return false given an empty array created from Array constructor', () => {
    expect(isNonEmptyArray(new Array())).to.be.false;
  });

  it('should return true given a non-empty array created from Array constructor', () => {
    expect(isNonEmptyArray(new Array(1, 2, 3))).to.be.true;
  });
});

describe('isBoolean()', () => {
  it('should return false given no argument', () => {
    expect(isBoolean(undefined as any)).to.be.false;
  });

  const nonBooleans = [null, NaN, 0, 1, '', 'a', [], ['a'], {}, { a: 1 }, _.noop];
  nonBooleans.forEach((nonBoolean) => {
    it('should return false given a non-boolean argument: ' + JSON.stringify(nonBoolean), () => {
      expect(isBoolean(nonBoolean as any)).to.be.false;
    });
  });

  it('should return true given true', () => {
    expect(isBoolean(true)).to.be.true;
  });

  it('should return true given false', () => {
    expect(isBoolean(false)).to.be.true;
  });
});

describe('isNumber()', () => {
  it('should return false given no argument', () => {
    expect(isNumber(undefined as any)).to.be.false;
  });

  const nonNumbers = [null, true, false, '', 'a', [], ['a'], {}, { a: 1 }, _.noop];
  nonNumbers.forEach((nonNumber) => {
    it('should return false given a non-number argument: ' + JSON.stringify(nonNumber), () => {
      expect(isNumber(nonNumber as any)).to.be.false;
    });
  });

  it('should return false given NaN', () => {
    expect(isNumber(NaN)).to.be.false;
  });

  it('should return true given 0', () => {
    expect(isNumber(0)).to.be.true;
  });

  it('should return true given a negative number', () => {
    expect(isNumber(-1)).to.be.true;
  });

  it('should return true given a positive number', () => {
    expect(isNumber(1)).to.be.true;
  });

  it('should return true given Number.MAX_SAFE_INTEGER', () => {
    expect(isNumber((Number as any).MAX_SAFE_INTEGER)).to.be.true;
  });

  it('should return true given Number.MIN_SAFE_INTEGER', () => {
    expect(isNumber((Number as any).MIN_SAFE_INTEGER)).to.be.true;
  });

  it('should return true given Infinity', () => {
    expect(isNumber(Infinity)).to.be.true;
  });

  it('should return true given -Infinity', () => {
    expect(isNumber(-Infinity)).to.be.true;
  });
});

describe('isString()', () => {
  it('should return false given no argument', () => {
    expect(isString(undefined as any)).to.be.false;
  });

  const nonStrings = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
  nonStrings.forEach((nonString) => {
    it('should return false given a non-string argument: ' + JSON.stringify(nonString), () => {
      expect(isString(nonString as any)).to.be.false;
    });
  });

  it('should return true given an empty string', () => {
    expect(isString('')).to.be.true;
  });

  it('should return true given a string with only whitespace', () => {
    expect(isString(' ')).to.be.true;
  });

  it('should return true given a non-empty string', () => {
    expect(isString('foo')).to.be.true;
  });
});

describe('isNonEmptyString()', () => {
  it('should return false given no argument', () => {
    expect(isNonEmptyString(undefined as any)).to.be.false;
  });

  const nonStrings = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
  nonStrings.forEach((nonString) => {
    it('should return false given a non-string argument: ' + JSON.stringify(nonString), () => {
      expect(isNonEmptyString(nonString as any)).to.be.false;
    });
  });

  it('should return false given an empty string', () => {
    expect(isNonEmptyString('')).to.be.false;
  });

  it('should return true given a string with only whitespace', () => {
    expect(isNonEmptyString(' ')).to.be.true;
  });

  it('should return true given a non-empty string', () => {
    expect(isNonEmptyString('foo')).to.be.true;
  });
});

describe('isNonNullObject()', () => {
  it('should return false given no argument', () => {
    expect(isNonNullObject(undefined as any)).to.be.false;
  });

  const nonStrings = [NaN, 0, 1, true, false, '', 'a', _.noop];
  nonStrings.forEach((nonString) => {
    it('should return false given a non-object argument: ' + JSON.stringify(nonString), () => {
      expect(isNonNullObject(nonString as any)).to.be.false;
    });
  });

  it('should return false given null', () => {
    expect(isNonNullObject(null)).to.be.false;
  });

  it('should return false given an empty array', () => {
    expect(isNonNullObject([])).to.be.false;
  });

  it('should return false given a non-empty array', () => {
    expect(isNonNullObject(['a'])).to.be.false;
  });

  it('should return true given an empty object', () => {
    expect(isNonNullObject({})).to.be.true;
  });

  it('should return true given a non-empty object', () => {
    expect(isNonNullObject({ a: 1 })).to.be.true;
  });
});

describe('isUid()', () => {
  it('should return true with a valid uid', () => {
    expect(isUid(createRandomString(1))).to.be.true;
    expect(isUid(createRandomString(5))).to.be.true;
    expect(isUid(createRandomString(128))).to.be.true;
  });

  it('should return false with a null input', () => {
    expect(isUid(null)).to.be.false;
  });

  it('should return false with an undefined input', () => {
    expect(isUid(undefined)).to.be.false;
  });

  it('should return false with an invalid type', () => {
    expect(isUid({uid: createRandomString(1)})).to.be.false;
  });

  it('should return false with an empty string', () => {
    expect(isUid('')).to.be.false;
  });

  it('should return false with a string longer than 128 characters', () => {
    expect(isUid(createRandomString(129))).to.be.false;
  });
});

describe('isPassword()', () => {
  it('should return false with a null input', () => {
    expect(isPassword(null)).to.be.false;
  });

  it('should return false with an undefined input', () => {
    expect(isPassword(undefined)).to.be.false;
  });

  it('should return false with a non string', () => {
    expect(isPassword(12.4)).to.be.false;
  });

  it('should return false with an empty string', () => {
    expect(isPassword('')).to.be.false;
  });

  it('should return false with a string of less than 6 characters', () => {
    expect(isPassword('abcde')).to.be.false;
  });

  it('should return true with a string of at least 6 characters', () => {
    expect(isPassword('abcdef')).to.be.true;
  });
});

describe('isEmail()', () => {
  it('should return false with a null input', () => {
    expect(isEmail(null)).to.be.false;
  });

  it('should return false with an undefined input', () => {
    expect(isEmail(undefined)).to.be.false;
  });

  it('should return false with a non string', () => {
    expect(isEmail({email: 'user@example.com'})).to.be.false;
  });

  it('show return true with a valid email string', () => {
    expect(isEmail('abc12345@abc.b-a.bla2235535.co.uk')).to.be.true;
    expect(isEmail('abc@com')).to.be.true;
    expect(isEmail('abc@bla.')).to.be.true;
  });

  it('should return false with an invalid email string', () => {
    expect(isEmail('abc.com')).to.be.false;
    expect(isEmail('@bla.com')).to.be.false;
    expect(isEmail('a@')).to.be.false;
  });
});

describe('isURL()', () => {
  it('should return false with a null input', () => {
    expect(isURL(null)).to.be.false;
  });

  it('should return false with an undefined input', () => {
    expect(isURL(undefined)).to.be.false;
  });

  it('should return false with a non string', () => {
    expect(isURL(['http://www.google.com'])).to.be.false;
  });

  it('show return true with a valid web URL string', () => {
    expect(isURL('https://www.example.com:8080')).to.be.true;
    expect(isURL('https://www.example.com')).to.be.true;
    expect(isURL('https://www.example.com:8080/path/name/index.php?a=1&b=2&c=3#abcd'))
      .to.be.true;
    expect(isURL('http://www.example.com:8080/path/name/index.php?a=1&b=2&c=3#abcd'))
      .to.be.true;
    expect(isURL('http://localhost/path/name/index.php?a=1&b=2&c=3#abcd')).to.be.true;
    expect(isURL('http://127.0.0.1/path/name/index.php?a=1&b=2&c=3#abcd')).to.be.true;
    expect(isURL('http://a--b.c-c.co-uk/')).to.be.true;
  });

  it('should return false with an invalid web URL string', () => {
    expect(isURL('ftp://www.example.com:8080/path/name/file.png')).to.be.false;
    expect(isURL('example.com')).to.be.false;
    expect(isURL('')).to.be.false;
    expect(isURL('5356364326')).to.be.false;
    expect(isURL('http://www.exam[].com')).to.be.false;
    expect(isURL('http://`a--b.com')).to.be.false;
    expect(isURL('http://.com')).to.be.false;
    expect(isURL('http://abc.com.')).to.be.false;
    expect(isURL('http://-abc.com')).to.be.false;
    expect(isURL('http://www._abc.com')).to.be.false;
  });
});

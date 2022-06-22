/*!
 * @license
 * Copyright 2017 Google Inc.
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

import * as chai from 'chai';
import * as _ from 'lodash';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  isArray, isNonEmptyArray, isBoolean, isNumber, isString, isNonEmptyString, isNonNullObject,
  isEmail, isPassword, isURL, isUid, isPhoneNumber, isObject, isBuffer,
  isUTCDateString, isISODateString,
} from '../../../src/utils/validator';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

/**
 * @param {number} numOfChars The number of random characters within the string.
 * @return {string} A string with a specific number of random characters.
 */
function createRandomString(numOfChars: number): string {
  const chars = [];
  const allowedChars = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (numOfChars > 0) {
    const index = Math.floor(Math.random() * allowedChars.length);
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
    // eslint-disable-next-line @typescript-eslint/no-array-constructor
    expect(isArray(new Array())).to.be.true;
  });

  it('should return true given a non-empty array created from Array constructor', () => {
    // eslint-disable-next-line @typescript-eslint/no-array-constructor
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
    // eslint-disable-next-line @typescript-eslint/no-array-constructor
    expect(isNonEmptyArray(new Array())).to.be.false;
  });

  it('should return true given a non-empty array created from Array constructor', () => {
    // eslint-disable-next-line @typescript-eslint/no-array-constructor
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

describe('isObject()', () => {
  it('should return false given no argument', () => {
    expect(isObject(undefined as any)).to.be.false;
  });

  const nonStrings = [NaN, 0, 1, true, false, '', 'a', _.noop];
  nonStrings.forEach((nonString) => {
    it('should return false given a non-object argument: ' + JSON.stringify(nonString), () => {
      expect(isObject(nonString as any)).to.be.false;
    });
  });

  it('should return false given an empty array', () => {
    expect(isObject([])).to.be.false;
  });

  it('should return false given a non-empty array', () => {
    expect(isObject(['a'])).to.be.false;
  });

  it('should return true given null', () => {
    expect(isObject(null)).to.be.true;
  });

  it('should return true given an empty object', () => {
    expect(isObject({})).to.be.true;
  });

  it('should return true given a non-empty object', () => {
    expect(isObject({ a: 1 })).to.be.true;
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
    expect(isUid({ uid: createRandomString(1) })).to.be.false;
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
    expect(isEmail({ email: 'user@example.com' })).to.be.false;
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
    expect(isURL('http://localhost/path/name/')).to.be.true;
    expect(isURL('https://www.example.com:8080/path/name/index.php?a=1&b=2&c=3#abcd'))
      .to.be.true;
    expect(isURL('http://www.example.com:8080/path/name/index.php?a=1&b=2&c=3#abcd'))
      .to.be.true;
    expect(isURL('http://localhost/path/name/index.php?a=1&b=2&c=3#abcd')).to.be.true;
    expect(isURL('http://127.0.0.1/path/name/index.php?a=1&b=2&c=3#abcd')).to.be.true;
    expect(isURL('http://a--b.c-c.co-uk/')).to.be.true;
    expect(isURL('https://storage.googleapis.com/example-bucket/cat%20pic.jpeg?GoogleAccessId=e@' +
      'example-project.iam.gserviceaccount.com&Expires=1458238630&Signature=VVUgfqviDCov%2B%2BKn' +
      'mVOkwBR2olSbId51kSibuQeiH8ucGFyOfAVbH5J%2B5V0gDYIioO2dDGH9Fsj6YdwxWv65HE71VEOEsVPuS8CVb%2' +
      'BVeeIzmEe8z7X7o1d%2BcWbPEo4exILQbj3ROM3T2OrkNBU9sbHq0mLbDMhiiQZ3xCaiCQdsrMEdYVvAFggPuPq%2' +
      'FEQyQZmyJK3ty%2Bmr7kAFW16I9pD11jfBSD1XXjKTJzgd%2FMGSde4Va4J1RtHoX7r5i7YR7Mvf%2Fb17zlAuGlz' +
      'VUf%2FzmhLPqtfKinVrcqdlmamMcmLoW8eLG%2B1yYW%2F7tlS2hvqSfCW8eMUUjiHiSWgZLEVIG4Lw%3D%3D'))
      .to.be.true;
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

describe('isPhoneNumber()', () => {
  it('should return false given no argument', () => {
    expect(isPhoneNumber(undefined as any)).to.be.false;
  });

  const nonStrings = [null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop];
  nonStrings.forEach((nonString) => {
    it('should return false given a non-string argument: ' + JSON.stringify(nonString), () => {
      expect(isPhoneNumber(nonString as any)).to.be.false;
    });
  });

  it('should return false given an empty string', () => {
    expect(isPhoneNumber('')).to.be.false;
  });

  it('should return false given a string with only whitespace', () => {
    expect(isPhoneNumber(' ')).to.be.false;
  });

  it('should return false given a string with only a plus sign', () => {
    expect(isPhoneNumber('+')).to.be.false;
  });

  it('should return false given a string with a plus sign and no alphanumeric char', () => {
    expect(isPhoneNumber('+ ()-')).to.be.false;
  });

  it('should return true given a valid phone number', () => {
    expect(isPhoneNumber('+11234567890')).to.be.true;
  });

  it('should return true given a valid phone number that is formatted', () => {
    expect(isPhoneNumber('+1 (123) 456-7890')).to.be.true;
  });

  it('should return true given a valid phone number with alphabetical chars', () => {
    expect(isPhoneNumber('+1 800 FLOwerS')).to.be.true;
  });
});

describe('isBuffer()', () => {
  it('should return false given no argument', () => {
    expect(isBuffer(undefined as any)).to.be.false;
  });

  const nonBuffers = [null, NaN, 0, 1, '', 'a', [], ['a'], {}, { a: 1 }, _.noop, false];
  nonBuffers.forEach((nonBuffer) => {
    it('should return false given a non-buffer argument: ' + JSON.stringify(nonBuffer), () => {
      expect(isBuffer(nonBuffer as any)).to.be.false;
    });
  });

  it('should return true given a buffer', () => {
    expect(isBuffer(Buffer.from('I am a buffer'))).to.be.true;
  });
});

describe('isUTCDateString()', () => {
  const validUTCDateString = 'Fri, 25 Oct 2019 04:01:21 GMT';
  it('should return false given no argument', () => {
    expect(isUTCDateString(undefined as any)).to.be.false;
  });

  const nonUTCDateStrings = [
    null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop,
    new Date().getTime(),
    new Date().getTime().toString(),
    new Date().toISOString(),
    'Fri, 25 Oct 2019 04:01:21',
    '25 Oct 2019', 'Fri, 25 Oct 2019',
    '2019-10-25', '2019-10-25T04:07:34.036',
    new Date().toDateString(),
  ];
  nonUTCDateStrings.forEach((nonUTCDateString) => {
    it('should return false given an invalid UTC date string: ' + JSON.stringify(nonUTCDateString), () => {
      expect(isUTCDateString(nonUTCDateString as any)).to.be.false;
    });
  });

  it('should return true given a valid UTC date string', () => {
    expect(isUTCDateString(validUTCDateString)).to.be.true;
  });
});

describe('isISODateString()', () => {
  const validISODateString = '2019-10-25T04:07:34.036Z';
  it('should return false given no argument', () => {
    expect(isISODateString(undefined as any)).to.be.false;
  });

  const nonISODateStrings = [
    null, NaN, 0, 1, true, false, [], ['a'], {}, { a: 1 }, _.noop,
    new Date().getTime(),
    new Date().getTime().toString(),
    new Date().toUTCString(),
    'Fri, 25 Oct 2019 04:01:21',
    '25 Oct 2019', 'Fri, 25 Oct 2019',
    '2019-10-25', '2019-10-25T04:07:34.036',
    new Date().toDateString(),
  ];
  nonISODateStrings.forEach((nonISODateString) => {
    it('should return false given an invalid ISO date string: ' + JSON.stringify(nonISODateString), () => {
      expect(isISODateString(nonISODateString as any)).to.be.false;
    });
  });

  it('should return true given a valid ISO date string', () => {
    expect(isISODateString(validISODateString)).to.be.true;
  });
});

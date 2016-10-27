import {expect} from 'chai';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {isAlphanumeric, isEmail, isURL} from '../src/utils/validator';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


describe('isAlphanumeric()', () => {
  it('should return false with a non string', () => {
    expect(isAlphanumeric(12.4)).to.be.false;
  });

  it('should return true with a valid alphanumeric string', () => {
    expect(isAlphanumeric('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'))
      .to.be.true;
    expect(isAlphanumeric('')).to.be.true;
  });

  it('should return false with an invalid alphanumeric string', () => {
    expect(isAlphanumeric('1-f\|][{}?><:@')).to.be.false;
  });
});

describe('isEmail()', () => {
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
  it('should return false with a non string', () => {
    expect(isURL(['http://www.google.com'])).to.be.false;
  });

  it('show return true with a valid web URL string', () => {
    expect(isURL('https://www.example.com:8080/path/name/index.php?a=1&b=2&c=3#abcd'))
      .to.be.true;
    expect(isURL('http://www.example.com:8080/path/name/index.php?a=1&b=2&c=3#abcd'))
      .to.be.true;
    expect(isURL('http://localhost/path/name/index.php?a=1&b=2&c=3#abcd')).to.be.true;
    expect(isURL('http://127.0.0.1/path/name/index.php?a=1&b=2&c=3#abcd')).to.be.true;
  });

  it('should return false with an invalid web URL string', () => {
    expect(isURL('ftp://www.example.com:8080/path/name/file.png')).to.be.false;
    expect(isURL('example.com')).to.be.false;
    expect(isURL('')).to.be.false;
    expect(isURL('5356364326')).to.be.false;
    expect(isURL('http://www.exam[].com')).to.be.false;
    expect(isURL('http://`a--b.com')).to.be.false;
    expect(isURL('http://.com')).to.be.false;
  });
});

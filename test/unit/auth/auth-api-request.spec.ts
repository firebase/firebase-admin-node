/*!
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

'use strict';

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {deepCopy} from '../../../src/utils/deep-copy';
import {FirebaseApp} from '../../../src/firebase-app';
import {HttpRequestHandler} from '../../../src/utils/api-request';
import * as validator from '../../../src/utils/validator';
import {
  FirebaseAuthRequestHandler, FIREBASE_AUTH_GET_ACCOUNT_INFO,
  FIREBASE_AUTH_DELETE_ACCOUNT, FIREBASE_AUTH_SET_ACCOUNT_INFO,
  FIREBASE_AUTH_SIGN_UP_NEW_USER, FIREBASE_AUTH_DOWNLOAD_ACCOUNT,
  RESERVED_CLAIMS,
} from '../../../src/auth/auth-api-request';
import {AuthClientErrorCode, FirebaseAuthError} from '../../../src/utils/error';

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


describe('FIREBASE_AUTH_DOWNLOAD_ACCOUNT', () => {
  // Spy on all validators.
  let isNonEmptyString: sinon.SinonSpy;
  let isNumber: sinon.SinonSpy;

  beforeEach(() => {
    isNonEmptyString = sinon.spy(validator, 'isNonEmptyString');
    isNumber = sinon.spy(validator, 'isNumber');
  });
  afterEach(() => {
    isNonEmptyString.restore();
    isNumber.restore();
  });

  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getEndpoint()).to.equal('downloadAccount');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getHttpMethod()).to.equal('POST');
  });
  it('should return empty response validator', () => {
    expect(FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getResponseValidator()).to.not.be.null;
    expect(() => {
      const emptyResponse = {};
      const responseValidator = FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getResponseValidator();
      responseValidator(emptyResponse);
    }).not.to.throw();
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getRequestValidator();
    it('should succeed with valid maxResults passed', () => {
      const validRequest = {maxResults: 500};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isNumber).to.have.been.calledOnce.and.calledWith(500);
    });
    it('should succeed with valid maxResults and other optional parameters', () => {
      const validRequest = {
        maxResults: 500,
        nextPageToken: 'PAGE_TOKEN',
        // Pass an unsupported parameter which should be ignored.
        ignoreMe: 'bla',
      };
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isNumber).to.have.been.calledOnce.and.calledWith(500);
      expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('PAGE_TOKEN');
    });
    it('should fail when maxResults not passed', () => {
      const invalidRequest = {};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
      expect(isNumber).to.have.been.calledOnce.and.calledWith(undefined);
    });
    describe('called with invalid parameters', () => {
      it('should fail with invalid maxResults', () => {
        expect(() => {
          return requestValidator({maxResults: ''});
        }).to.throw();
        expect(isNumber).to.have.been.calledOnce.and.calledWith('');
      });
      it('should fail with zero maxResults', () => {
        expect(() => {
          return requestValidator({maxResults: 0});
        }).to.throw();
        expect(isNumber).to.have.been.calledOnce.and.calledWith(0);
      });
      it('should fail with negative maxResults', () => {
        expect(() => {
          return requestValidator({maxResults: -500});
        }).to.throw();
        expect(isNumber).to.have.been.calledOnce.and.calledWith(-500);
      });
      it('should fail with maxResults exceeding allowed limit', () => {
        expect(() => {
          return requestValidator({maxResults: 1001});
        }).to.throw();
        expect(isNumber).to.have.been.calledOnce.and.calledWith(1001);
      });
      it('should fail with invalid nextPageToken', () => {
        expect(() => {
          return requestValidator({maxResults: 1000, nextPageToken: ['PAGE_TOKEN']});
        }).to.throw();
        expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith(['PAGE_TOKEN']);
      });
    });
  });
});

describe('FIREBASE_AUTH_GET_ACCOUNT_INFO', () => {
  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_GET_ACCOUNT_INFO.getEndpoint()).to.equal('getAccountInfo');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_GET_ACCOUNT_INFO.getHttpMethod()).to.equal('POST');
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_GET_ACCOUNT_INFO.getRequestValidator();
    it('should succeed with localId passed', () => {
      const validRequest = {localId: ['1234']};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should succeed with email passed', () => {
      const validRequest = {email: ['user@example.com']};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should succeed with phoneNumber passed', () => {
      const validRequest = {phoneNumber: ['+11234567890']};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should fail when neither localId, email or phoneNumber are passed', () => {
      const invalidRequest = {bla: ['1234']};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
    });
  });
  describe('responseValidator', () => {
    const responseValidator = FIREBASE_AUTH_GET_ACCOUNT_INFO.getResponseValidator();
    it('should succeed with users returned', () => {
      const validResponse = {users: []};
      expect(() => {
        return responseValidator(validResponse);
      }).not.to.throw();
    });
    it('should fail when users is not returned', () => {
      const invalidResponse = {};
      expect(() => {
        responseValidator(invalidResponse);
      }).to.throw();
    });
  });
});

describe('FIREBASE_AUTH_DELETE_ACCOUNT', () => {
  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getEndpoint()).to.equal('deleteAccount');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getHttpMethod()).to.equal('POST');
  });
  it('should return empty response validator', () => {
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getResponseValidator()).to.not.be.null;
    expect(() => {
      const emptyResponse = {};
      const responseValidator = FIREBASE_AUTH_DELETE_ACCOUNT.getResponseValidator();
      responseValidator(emptyResponse);
    }).not.to.throw();
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_DELETE_ACCOUNT.getRequestValidator();
    it('should succeed with localId passed', () => {
      const validRequest = {localId: '1234'};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should fail when localId not passed', () => {
      const invalidRequest = {bla: '1234'};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
    });
  });
});

describe('FIREBASE_AUTH_SET_ACCOUNT_INFO', () => {
  // Spy on all validators.
  let isUidSpy: sinon.SinonSpy;
  let isEmailSpy: sinon.SinonSpy;
  let isPasswordSpy: sinon.SinonSpy;
  let isUrlSpy: sinon.SinonSpy;
  let isPhoneNumberSpy: sinon.SinonSpy;
  let isNumberSpy: sinon.SinonSpy;

  beforeEach(() => {
    isUidSpy = sinon.spy(validator, 'isUid');
    isEmailSpy = sinon.spy(validator, 'isEmail');
    isPasswordSpy = sinon.spy(validator, 'isPassword');
    isUrlSpy = sinon.spy(validator, 'isURL');
    isPhoneNumberSpy = sinon.spy(validator, 'isPhoneNumber');
    isNumberSpy = sinon.spy(validator, 'isNumber');
  });
  afterEach(() => {
    isUidSpy.restore();
    isEmailSpy.restore();
    isPasswordSpy.restore();
    isUrlSpy.restore();
    isPhoneNumberSpy.restore();
    isNumberSpy.restore();
  });

  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_SET_ACCOUNT_INFO.getEndpoint()).to.equal('setAccountInfo');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_SET_ACCOUNT_INFO.getHttpMethod()).to.equal('POST');
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_SET_ACCOUNT_INFO.getRequestValidator();
    it('should succeed with valid localId passed', () => {
      const validRequest = {localId: '1234'};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isUidSpy).to.have.been.calledOnce.and.calledWith('1234');
    });
    it('should succeed with valid localId and other optional parameters', () => {
      const validRequest = {
        localId: '1234',
        displayName: 'John Doe',
        email: 'user@example.com',
        password: 'password',
        emailVerified: true,
        photoUrl: 'http://www.example.com/1234/photo.png',
        disableUser: false,
        phoneNumber: '+11234567890',
        customAttributes: JSON.stringify({admin: true, groupId: '123'}),
        validSince: 1476136676,
        // Pass an unsupported parameter which should be ignored.
        ignoreMe: 'bla',
      };
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isUidSpy).to.have.been.calledOnce.and.calledWith('1234');
      expect(isEmailSpy).to.have.been.calledOnce.and.calledWith('user@example.com');
      expect(isPasswordSpy).to.have.been.calledOnce.and.calledWith('password');
      expect(isUrlSpy).to.have.been.calledOnce.and
        .calledWith('http://www.example.com/1234/photo.png');
      expect(isPhoneNumberSpy).to.have.been.calledOnce.and.calledWith('+11234567890');
      expect(isNumberSpy).to.have.been.calledOnce.and.calledWith(1476136676);
    });
    it('should succeed with valid localId and customAttributes with 1000 char payload', () => {
      // Test with 1000 characters.
      const atLimitClaims = JSON.stringify({key: createRandomString(990)});
      expect(() => {
        return requestValidator({localId: '1234', customAttributes: atLimitClaims});
      }).not.to.throw();
    });
    it('should fail when localId not passed', () => {
      const invalidRequest = {};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
      expect(isUidSpy).to.have.not.been.called;
    });
    describe('called with invalid parameters', () => {
      it('should fail with invalid localId', () => {
        expect(() => {
          return requestValidator({localId: ''});
        }).to.throw();
        expect(isUidSpy).to.have.been.calledOnce.and.calledWith('');
      });
      it('should fail with invalid displayName', () => {
        expect(() => {
          return requestValidator({localId: '1234', displayName: ['John Doe']});
        }).to.throw();
      });
      it('should fail with invalid email', () => {
        expect(() => {
          return requestValidator({localId: '1234', email: 'invalid'});
        }).to.throw();
        expect(isEmailSpy).to.have.been.calledOnce.and.calledWith('invalid');
      });
      it('should fail with invalid password', () => {
        expect(() => {
          return requestValidator({localId: '1234', password: 'short'});
        }).to.throw();
        expect(isPasswordSpy).to.have.been.calledOnce.and.calledWith('short');
      });
      it('should fail with invalid emailVerified flag', () => {
        expect(() => {
          return requestValidator({localId: '1234', emailVerified: 'yes'});
        }).to.throw();
      });
      it('should fail with invalid photoUrl', () => {
        expect(() => {
          return requestValidator({localId: '1234', photoUrl: 'invalid url'});
        }).to.throw();
        expect(isUrlSpy).to.have.been.calledOnce.and.calledWith('invalid url');
      });
      it('should fail with invalid disableUser flag', () => {
        expect(() => {
          return requestValidator({localId: '1234', disableUser: 'no'});
        }).to.throw();
      });
      it('should fail with invalid phoneNumber', () => {
        expect(() => {
          return requestValidator({localId: '1234', phoneNumber: 'invalid'});
        }).to.throw();
        expect(isPhoneNumberSpy).to.have.been.calledOnce.and.calledWith('invalid');
      });
      it('should fail with invalid JSON customAttributes', () => {
        expect(() => {
          return requestValidator({localId: '1234', customAttributes: 'invalid'});
        }).to.throw();
      });
      it('should fail with customAttributes exceeding maximum allowed payload', () => {
        // Test with 1001 characters.
        const largeClaims = JSON.stringify({key: createRandomString(991)});
        expect(() => {
          return requestValidator({localId: '1234', customAttributes: largeClaims});
        }).to.throw(`Developer claims payload should not exceed 1000 characters.`);
      });
      RESERVED_CLAIMS.forEach((invalidClaim) => {
        it(`should fail with customAttributes containing blacklisted claim: ${invalidClaim}`, () => {
          expect(() => {
            // Instantiate custom attributes with invalid claims.
            let claims = {};
            claims[invalidClaim] = 'bla';
            return requestValidator({localId: '1234', customAttributes: JSON.stringify(claims)});
          }).to.throw(`Developer claim "${invalidClaim}" is reserved and cannot be specified.`);
        });
      });
      it('should fail with customAttributes containing multi-blacklisted claims', () => {
        expect(() => {
          const claims = {
            sub: 'sub',
            auth_time: 'time',
          };
          return requestValidator({localId: '1234', customAttributes: JSON.stringify(claims)});
        }).to.throw(`Developer claims "auth_time", "sub" are reserved and cannot be specified.`);
      });
      it('should fail with invalid validSince', () => {
        expect(() => {
          return requestValidator({localId: '1234', validSince: 'invalid'});
        }).to.throw('The tokensValidAfterTime must be a valid UTC number in seconds.');
        expect(isNumberSpy).to.have.been.calledOnce.and.calledWith('invalid');
      });
    });
  });
  describe('responseValidator', () => {
    const responseValidator = FIREBASE_AUTH_SET_ACCOUNT_INFO.getResponseValidator();
    it('should succeed with localId returned', () => {
      const validResponse = {localId: '1234'};
      expect(() => {
        return responseValidator(validResponse);
      }).not.to.throw();
    });
    it('should fail when localId is not returned', () => {
      const invalidResponse = {};
      expect(() => {
        return responseValidator(invalidResponse);
      }).to.throw();
    });
  });
});

describe('FIREBASE_AUTH_SIGN_UP_NEW_USER', () => {
  // Spy on all validators.
  let isUidSpy: sinon.SinonSpy;
  let isEmailSpy: sinon.SinonSpy;
  let isPasswordSpy: sinon.SinonSpy;
  let isUrlSpy: sinon.SinonSpy;
  let isPhoneNumberSpy: sinon.SinonSpy;

  beforeEach(() => {
    isUidSpy = sinon.spy(validator, 'isUid');
    isEmailSpy = sinon.spy(validator, 'isEmail');
    isPasswordSpy = sinon.spy(validator, 'isPassword');
    isUrlSpy = sinon.spy(validator, 'isURL');
    isPhoneNumberSpy = sinon.spy(validator, 'isPhoneNumber');
  });
  afterEach(() => {
    isUidSpy.restore();
    isEmailSpy.restore();
    isPasswordSpy.restore();
    isUrlSpy.restore();
    isPhoneNumberSpy.restore();
  });

  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_SIGN_UP_NEW_USER.getEndpoint()).to.equal('signupNewUser');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_SIGN_UP_NEW_USER.getHttpMethod()).to.equal('POST');
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_SIGN_UP_NEW_USER.getRequestValidator();
    it('should succeed with valid parameters excluding uid', () => {
      const validRequest = {
        displayName: 'John Doe',
        email: 'user@example.com',
        password: 'password',
        emailVerified: true,
        photoUrl: 'http://www.example.com/1234/photo.png',
        disabled: false,
        phoneNumber: '+11234567890',
        // Pass an unsupported parameter which should be ignored.
        ignoreMe: 'bla',
      };
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isUidSpy).to.have.not.been.called;
      expect(isEmailSpy).to.have.been.calledOnce.and.calledWith('user@example.com');
      expect(isPasswordSpy).to.have.been.calledOnce.and.calledWith('password');
      expect(isUrlSpy).to.have.been.calledOnce.and
        .calledWith('http://www.example.com/1234/photo.png');
      expect(isPhoneNumberSpy).to.have.been.calledOnce.and.calledWith('+11234567890');
    });
    it('should succeed with valid parameters including uid', () => {
      const validRequest = {
        localId: '1234',
        displayName: 'John Doe',
        email: 'user@example.com',
        password: 'password',
        emailVerified: true,
        photoUrl: 'http://www.example.com/1234/photo.png',
        disabled: false,
        phoneNumber: '+11234567890',
        // Pass an unsupported parameter which should be ignored.
        ignoreMe: 'bla',
      };
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isUidSpy).to.have.been.calledOnce.and.calledWith('1234');
      expect(isEmailSpy).to.have.been.calledOnce.and.calledWith('user@example.com');
      expect(isPasswordSpy).to.have.been.calledOnce.and.calledWith('password');
      expect(isUrlSpy).to.have.been.calledOnce.and
        .calledWith('http://www.example.com/1234/photo.png');
      expect(isPhoneNumberSpy).to.have.been.calledOnce.and.calledWith('+11234567890');
    });
    it('should succeed with no parameters', () => {
      expect(() => {
        return requestValidator({});
      }).not.to.throw();
    });
    describe('called with invalid parameters', () => {
      it('should fail with invalid localId', () => {
        expect(() => {
          return requestValidator({localId: ''});
        }).to.throw();
        expect(isUidSpy).to.have.been.calledOnce.and.calledWith('');
      });
      it('should fail with invalid displayName', () => {
        expect(() => {
          return requestValidator({displayName: ['John Doe']});
        }).to.throw();
      });
      it('should fail with invalid email', () => {
        expect(() => {
          return requestValidator({email: 'invalid'});
        }).to.throw();
        expect(isEmailSpy).to.have.been.calledOnce.and.calledWith('invalid');
      });
      it('should fail with invalid password', () => {
        expect(() => {
          return requestValidator({password: 'short'});
        }).to.throw();
        expect(isPasswordSpy).to.have.been.calledOnce.and.calledWith('short');
      });
      it('should fail with invalid emailVerified flag', () => {
        expect(() => {
          return requestValidator({emailVerified: 'yes'});
        }).to.throw();
      });
      it('should fail with invalid photoUrl', () => {
        expect(() => {
          return requestValidator({photoUrl: 'invalid url'});
        }).to.throw();
        expect(isUrlSpy).to.have.been.calledOnce.and.calledWith('invalid url');
      });
      it('should fail with invalid disabled flag', () => {
        expect(() => {
          return requestValidator({disabled: 'no'});
        }).to.throw();
      });
      it('should fail with invalid phoneNumber', () => {
        expect(() => {
          return requestValidator({phoneNumber: 'invalid'});
        }).to.throw();
        expect(isPhoneNumberSpy).to.have.been.calledOnce.and.calledWith('invalid');
      });
      it('should fail with customAttributes', () => {
        expect(() => {
          return requestValidator({customAttributes: JSON.stringify({admin: true})});
        }).to.throw();
      });
      it('should fail with validSince', () => {
        expect(() => {
          return requestValidator({validSince: 1476136676});
        }).to.throw();
      });
    });
  });
  describe('responseValidator', () => {
    const responseValidator = FIREBASE_AUTH_SIGN_UP_NEW_USER.getResponseValidator();
    it('should succeed with localId returned', () => {
      const validResponse = {localId: '1234'};
      expect(() => {
        return responseValidator(validResponse);
      }).not.to.throw();
    });
    it('should fail when localId is not returned', () => {
      const invalidResponse = {};
      expect(() => {
        responseValidator(invalidResponse);
      }).to.throw();
    });
  });
});

describe('FirebaseAuthRequestHandler', () => {
  let mockApp: FirebaseApp;
  let mockedRequests: nock.Scope[] = [];
  let stubs: sinon.SinonStub[] = [];
  let mockAccessToken: string = utils.generateRandomAccessToken();
  let expectedHeaders: Object;

  before(() => utils.mockFetchAccessTokenRequests(mockAccessToken));

  after(() => {
    stubs = [];
    nock.cleanAll();
  });

  beforeEach(() => {
    mockApp = mocks.app();

    expectedHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
      Authorization: 'Bearer ' + mockAccessToken,
    };
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    return mockApp.delete();
  });

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        return new FirebaseAuthRequestHandler(mockApp);
      }).not.to.throw(Error);
    });
  });

  describe('getAccountInfoByEmail', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should be fulfilled given a valid email', () => {
      const expectedResult = {
        users : [
          {email: 'user@example.com'},
        ],
      };
      const data = {email: ['user@example.com']};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be rejected given an invalid email', () => {
      const expectedResult = {
        kind: 'identitytoolkit#GetAccountInfoResponse',
      };
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const data = {email: ['user@example.com']};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
  });

  describe('getAccountInfoByUid', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should be fulfilled given a valid localId', () => {
      const expectedResult = {
        users : [
          {localId: 'uid'},
        ],
      };
      const data = {localId: ['uid']};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByUid('uid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be rejected given an invalid localId', () => {
      const expectedResult = {
        kind: 'identitytoolkit#GetAccountInfoResponse',
      };
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const data = {localId: ['uid']};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByUid('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = {
        error: {
          message: 'OPERATION_NOT_ALLOWED',
        },
      };
      const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
      const data = {localId: ['uid']};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByUid('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
  });

  describe('getAccountInfoByPhoneNumber', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should be fulfilled given a valid phoneNumber', () => {
      const expectedResult = {
        users : [
          {
            localId: 'uid',
            phoneNumber: '+11234567890',
            providerUserInfo: [
              {
                providerId: 'phone',
                rawId: '+11234567890',
                phoneNumber: '+11234567890',
              },
            ],
          },
        ],
      };
      const data = {
        phoneNumber: ['+11234567890'],
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByPhoneNumber('+11234567890')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be rejected given an invalid phoneNumber', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_PHONE_NUMBER);

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest');
      stubs.push(stub);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByPhoneNumber('invalid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.not.been.called;
        });

    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = {
        kind: 'identitytoolkit#GetAccountInfoResponse',
      };
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const data = {
        phoneNumber: ['+11234567890'],
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByPhoneNumber('+11234567890')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
  });

  describe('downloadAccount', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/downloadAccount';
    const timeout = 10000;
    const nextPageToken = 'PAGE_TOKEN';
    const maxResults = 500;
    const expectedResult = {
      users : [
        {localId: 'uid1'},
        {localId: 'uid2'},
      ],
      nextPageToken: 'NEXT_PAGE_TOKEN',
    };
    it('should be fulfilled given a valid parameters', () => {
      const data = {
        maxResults,
        nextPageToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be fulfilled with empty user array when no users exist', () => {
      const emptyExpectedResult = {
        users: [],
      };
      const data = {
        maxResults,
        nextPageToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(emptyExpectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be fulfilled given no parameters', () => {
      // Default maxResults should be used.
      const data = {
        maxResults: 1000,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount()
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be rejected given an invalid maxResults', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `Required "maxResults" must be a positive non-zero number that does not ` +
        `exceed the allowed 1000.`,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(1001, nextPageToken)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });
    it('should be rejected given an invalid next page token', () => {
      const expectedError = new FirebaseAuthError(
         AuthClientErrorCode.INVALID_PAGE_TOKEN,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, '')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedServerError = {
        error: {
          message: 'INVALID_PAGE_SELECTION',
        },
      };
      const expectedError = FirebaseAuthError.fromServerError('INVALID_PAGE_SELECTION');
      const data = {
        maxResults,
        nextPageToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedServerError));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, nextPageToken)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
  });

  describe('deleteAccount', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/deleteAccount';
    const timeout = 10000;
    it('should be fulfilled given a valid localId', () => {
      const expectedResult = {
        kind: 'identitytoolkit#DeleteAccountResponse',
      };
      const data = {localId: 'uid'};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteAccount('uid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = {
        error: {
          message: 'OPERATION_NOT_ALLOWED',
        },
      };
      const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
      const data = {localId: 'uid'};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteAccount('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, expectedHeaders, timeout);
        });
    });
  });

  describe('updateExistingAccount', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/setAccountInfo';
    const timeout = 10000;
    const uid = '12345678';
    const validData = {
      displayName: 'John Doe',
      email: 'user@example.com',
      emailVerified: true,
      disabled: false,
      photoURL: 'http://localhost/1234/photo.png',
      password: 'password',
      phoneNumber: '+11234567890',
      ignoredProperty: 'value',
    };
    const expectedValidData = {
      localId: uid,
      displayName: 'John Doe',
      email: 'user@example.com',
      emailVerified: true,
      disableUser: false,
      photoUrl: 'http://localhost/1234/photo.png',
      password: 'password',
      phoneNumber: '+11234567890',
    };
    // Valid request to delete photoURL and displayName.
    const validDeleteData = deepCopy(validData);
    validDeleteData.displayName = null;
    validDeleteData.photoURL = null;
    const expectedValidDeleteData = {
      localId: uid,
      email: 'user@example.com',
      emailVerified: true,
      disableUser: false,
      password: 'password',
      phoneNumber: '+11234567890',
      deleteAttribute: ['DISPLAY_NAME', 'PHOTO_URL'],
    };
    // Valid request to delete phoneNumber.
    const validDeletePhoneNumberData = deepCopy(validData);
    validDeletePhoneNumberData.phoneNumber = null;
    const expectedValidDeletePhoneNumberData = {
      localId: uid,
      displayName: 'John Doe',
      email: 'user@example.com',
      emailVerified: true,
      disableUser: false,
      photoUrl: 'http://localhost/1234/photo.png',
      password: 'password',
      deleteProvider: ['phone'],
    };
    const invalidData = {
      uid,
      email: 'user@invalid@',
    };
    const invalidPhoneNumberData = {
      uid,
      phoneNumber: 'invalid',
    };

    it('should be fulfilled given a valid localId', () => {
      // Successful result server response.
      const expectedResult = {
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send empty update request.
      return requestHandler.updateExistingAccount(uid, {})
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, {localId: uid}, expectedHeaders, timeout);
        });
    });

    it('should be fulfilled given valid parameters', () => {
      // Successful result server response.
      const expectedResult = {
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send update request with all possible valid parameters.
      return requestHandler.updateExistingAccount(uid, validData)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
        });
    });

    it('should be fulfilled given valid profile parameters to delete', () => {
      // Successful result server response.
      const expectedResult = {
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send update request to delete display name and photo URL.
      return requestHandler.updateExistingAccount(uid, validDeleteData)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent. In this case, displayName
          // and photoURL removed from request and deleteAttribute added.
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedValidDeleteData, expectedHeaders, timeout);
        });
    });

    it('should be fulfilled given phone number to delete', () => {
      // Successful result server response.
      const expectedResult = {
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send update request to delete phone number.
      return requestHandler.updateExistingAccount(uid, validDeletePhoneNumberData)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent. In this case, phoneNumber
          // removed from request and deleteProvider added.
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedValidDeletePhoneNumberData, expectedHeaders,
              timeout);
        });
    });

    it('should be rejected given invalid parameters such as email', () => {
      // Expected error when an invalid email is provided.
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send update request with invalid email.
      return requestHandler.updateExistingAccount(uid, invalidData)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid email error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected given invalid parameters such as phoneNumber', () => {
      // Expected error when an invalid phone number is provided.
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send update request with invalid phone number.
      return requestHandler.updateExistingAccount(uid, invalidPhoneNumberData)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid phone number error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns an error', () => {
      // Backend returned error.
      const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
      const expectedResult = {
        error: {
          message: 'OPERATION_NOT_ALLOWED',
        },
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateExistingAccount(uid, validData)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
        });
    });
  });

  describe('setCustomUserClaims', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/setAccountInfo';
    const timeout = 10000;
    const uid = '12345678';
    const claims = {admin: true, groupId: '1234'};
    const expectedValidData = {
      localId: uid,
      customAttributes: JSON.stringify(claims),
    };
    const expectedEmptyClaimsData = {
      localId: uid,
      customAttributes: JSON.stringify({}),
    };
    const expectedResult = {
      localId: uid,
    };

    it('should be fulfilled given a valid localId and customAttributes', () => {
      // Successful result server response.
      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send empty request.
      return requestHandler.setCustomUserClaims(uid, claims)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedValidData,
              expectedHeaders, timeout);
        });
    });

    it('should be fulfilled given valid localId and null claims', () => {
      // Successful result server response.
      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send request to delete custom claims.
      return requestHandler.setCustomUserClaims(uid, null)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedEmptyClaimsData,
              expectedHeaders, timeout);
        });
    });

    it('should be rejected given invalid parameters such as uid', () => {
      // Expected error when an invalid uid is provided.
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send request with invalid uid.
      return requestHandler.setCustomUserClaims('', claims)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid uid error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected given invalid parameters such as customClaims', () => {
      // Expected error when invalid claims are provided.
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'CustomUserClaims argument must be an object or null.',
      );
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send request with invalid claims.
      return requestHandler.setCustomUserClaims(uid, 'invalid')
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid argument error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected given customClaims with blacklisted claims', () => {
      // Expected error when invalid claims are provided.
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.FORBIDDEN_CLAIM,
        `Developer claim "aud" is reserved and cannot be specified.`,
      );
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      const blacklistedClaims = {admin: true, aud: 'bla'};
      // Send request with blacklisted claims.
      return requestHandler.setCustomUserClaims(uid, blacklistedClaims)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Forbidden claims error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns an error', () => {
      // Backend returned error.
      const expectedError = FirebaseAuthError.fromServerError('USER_NOT_FOUND');
      const expectedServerError = {
        error: {
          message: 'USER_NOT_FOUND',
        },
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedServerError));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.setCustomUserClaims(uid, claims)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
        });
    });
  });

  describe('revokeRefreshTokens', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/setAccountInfo';
    const timeout = 10000;
    const uid = '12345678';
    const now = new Date();
    const expectedResult = {
      localId: uid,
    };
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers(now.getTime());
    });

    afterEach(() => {
      clock.restore();
    });

    it('should be fulfilled given a valid uid', () => {
      const requestData = {
        localId: uid,
        // Current time should be passed, rounded up.
        validSince: Math.ceil((now.getTime() + 5000) / 1000),
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Simulate 5 seconds passed.
      clock.tick(5000);
      return requestHandler.revokeRefreshTokens(uid)
        .then((returnedUid: string) => {
          expect(returnedUid).to.be.equal(uid);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, requestData, expectedHeaders, timeout);
        });
    });

    it('should be rejected given an invalid uid', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
      const invalidUid: any = {'localId': uid}; 

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.revokeRefreshTokens(invalidUid as any)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid uid error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns an error', () => {
      // Backend returned error.
      const expectedError = FirebaseAuthError.fromServerError('USER_NOT_FOUND');
      const expectedServerError = {
        error: {
          message: 'USER_NOT_FOUND',
        },
      };
      const requestData = {
        localId: uid,
        validSince: Math.ceil((now.getTime() + 5000) / 1000),
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedServerError));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Simulate 5 seconds passed.
      clock.tick(5000);
      return requestHandler.revokeRefreshTokens(uid)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, requestData, expectedHeaders, timeout);
        });
    });
  });

  describe('createNewAccount', () => {
    describe('with uid specified', () => {
      const httpMethod = 'POST';
      const host = 'www.googleapis.com';
      const port = 443;
      const path = '/identitytoolkit/v3/relyingparty/signupNewUser';
      const timeout = 10000;
      const uid = '12345678';
      const validData = {
        uid,
        displayName: 'John Doe',
        email: 'user@example.com',
        emailVerified: true,
        disabled: false,
        photoURL: 'http://localhost/1234/photo.png',
        password: 'password',
        phoneNumber: '+11234567890',
        ignoredProperty: 'value',
      };
      const expectedValidData = {
        localId: uid,
        displayName: 'John Doe',
        email: 'user@example.com',
        emailVerified: true,
        disabled: false,
        photoUrl: 'http://localhost/1234/photo.png',
        password: 'password',
        phoneNumber: '+11234567890',
      };
      const invalidData = {
        uid,
        email: 'user@invalid@',
      };
      const invalidPhoneNumberData = {
        uid,
        phoneNumber: 'invalid',
      };
      const emptyRequest = {
        localId: uid,
      };
      it('should be fulfilled given a valid localId', () => {
        // Successful uploadAccount response.
        const expectedResult = {
          kind: 'identitytoolkit#SignupNewUserResponse',
          localId: uid,
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send empty create new account request with only a uid provided.
        return requestHandler.createNewAccount({uid})
          .then((returnedUid: string) => {
            // uid should be returned.
            expect(returnedUid).to.be.equal(uid);
            // Confirm expected rpc request parameters sent.
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, emptyRequest, expectedHeaders, timeout);
          });
      });

      it('should be fulfilled given valid parameters', () => {
        const expectedResult = {
          kind: 'identitytoolkit#SignupNewUserResponse',
          localId: uid,
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Create a new account with all possible valid data.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            // uid should be returned.
            expect(returnedUid).to.be.equal(uid);
            // Confirm expected rpc request parameters sent.
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
          });
      });

      it('should be rejected given invalid parameters such as email', () => {
        // Expected error when an invalid email is provided.
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Create new account with invalid email.
        return requestHandler.createNewAccount(invalidData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Expected invalid email error should be thrown.
            expect(error).to.deep.equal(expectedError);
          });
      });

      it('should be rejected given invalid parameters such as phoneNumber', () => {
        // Expected error when an invalid phone number is provided.
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Create new account with invalid phone number.
        return requestHandler.createNewAccount(invalidPhoneNumberData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Expected invalid phone number error should be thrown.
            expect(error).to.deep.equal(expectedError);
          });
      });

      it('should be rejected when the backend returns a user exists error', () => {
        // Expected error when the uid already exists.
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.UID_ALREADY_EXISTS);
        const expectedResult = {
          error: {
            message: 'DUPLICATE_LOCAL_ID',
          },
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send create new account request and simulate a backend error that the user
        // already exists.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
          });
      });

      it('should be rejected when the backend returns an email exists error', () => {
        // Expected error when the email already exists.
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.EMAIL_ALREADY_EXISTS);
        const expectedResult = {
          error: {
            message: 'EMAIL_EXISTS',
          },
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send create new account request and simulate a backend error that the email
        // already exists.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
          });
      });

      it('should be rejected when the backend returns a generic error', () => {
        // Some generic backend error.
        const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
        const expectedResult = {
          error: {
            message: 'OPERATION_NOT_ALLOWED',
          },
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send create new account request with valid data but simulate backend error.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
          });
      });
    });

    describe('with no uid specified', () => {
      const httpMethod = 'POST';
      const host = 'www.googleapis.com';
      const port = 443;
      const path = '/identitytoolkit/v3/relyingparty/signupNewUser';
      const timeout = 10000;
      const uid = '12345678';
      const validData = {
        displayName: 'John Doe',
        email: 'user@example.com',
        emailVerified: true,
        disabled: false,
        photoURL: 'http://localhost/1234/photo.png',
        password: 'password',
        phoneNumber: '+11234567890',
        ignoredProperty: 'value',
      };
      const expectedValidData = {
        displayName: 'John Doe',
        email: 'user@example.com',
        emailVerified: true,
        disabled: false,
        photoUrl: 'http://localhost/1234/photo.png',
        password: 'password',
        phoneNumber: '+11234567890',
      };
      const invalidData = {
        email: 'user@invalid@',
      };
      const invalidPhoneNumberData = {
        uid,
        phoneNumber: 'invalid',
      };

      it('should be fulfilled given valid parameters', () => {
        // signupNewUser successful response.
        const expectedResult = {
          kind: 'identitytoolkit#SignupNewUserResponse',
          localId: uid,
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send request with valid data.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            // uid should be returned.
            expect(returnedUid).to.be.equal(uid);
            // Confirm expected rpc request parameters sent.
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
          });
      });

      it('should be rejected given invalid parameters such as email', () => {
        // Expected error when an invalid email is provided.
        const expectedError =
          new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);
        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send create new account request with invalid data.
        return requestHandler.createNewAccount(invalidData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });

      it('should be rejected given invalid parameters such as phone number', () => {
        // Expected error when an invalid phone number is provided.
        const expectedError =
          new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send create new account request with invalid data.
        return requestHandler.createNewAccount(invalidPhoneNumberData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });

      it('should be rejected when the backend returns a generic error', () => {
        // Some generic backend error.
        const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
        const expectedResult = {
          error: {
            message: 'OPERATION_NOT_ALLOWED',
          },
        };

        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.resolve(expectedResult));
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send valid create new account request and simulate backend error.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
            expect(stub).to.have.been.calledOnce.and.calledWith(
                host, port, path, httpMethod, expectedValidData, expectedHeaders, timeout);
          });
      });
    });
  });

  describe('non-2xx responses', () => {
    it('should be rejected given a simulated non-2xx response with a known error code', () => {
      const mockErrorResponse = {
        error: {
          error: {
            message: 'USER_NOT_FOUND',
          },
        },
        statusCode: 400,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .rejects(mockErrorResponse);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
    });

    it('should be rejected given a simulated non-2xx response with an unknown error code', () => {
      const mockErrorResponse = {
        error: {
          error: {
            message: 'UNKNOWN_ERROR_CODE',
          },
        },
        statusCode: 400,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .rejects(mockErrorResponse);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .should.eventually.be.rejected.and.have.property('code', 'auth/internal-error');
    });

    it('should be rejected given a simulated non-2xx response with no error code', () => {
      const mockErrorResponse = {
        error: {
          foo: 'bar',
        },
        statusCode: 400,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .rejects(mockErrorResponse);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .should.eventually.be.rejected.and.have.property('code', 'auth/internal-error');
    });
  });
});

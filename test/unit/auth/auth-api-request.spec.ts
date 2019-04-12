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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {deepCopy, deepExtend} from '../../../src/utils/deep-copy';
import {FirebaseApp} from '../../../src/firebase-app';
import {HttpClient, HttpRequestConfig} from '../../../src/utils/api-request';
import * as validator from '../../../src/utils/validator';
import {
  FirebaseAuthRequestHandler, FIREBASE_AUTH_GET_ACCOUNT_INFO,
  FIREBASE_AUTH_DELETE_ACCOUNT, FIREBASE_AUTH_SET_ACCOUNT_INFO,
  FIREBASE_AUTH_SIGN_UP_NEW_USER, FIREBASE_AUTH_DOWNLOAD_ACCOUNT,
  RESERVED_CLAIMS, FIREBASE_AUTH_UPLOAD_ACCOUNT, FIREBASE_AUTH_CREATE_SESSION_COOKIE,
  EMAIL_ACTION_REQUEST_TYPES,
} from '../../../src/auth/auth-api-request';
import {UserImportBuilder, UserImportRecord} from '../../../src/auth/user-import-builder';
import {AuthClientErrorCode, FirebaseAuthError} from '../../../src/utils/error';
import {ActionCodeSettingsBuilder} from '../../../src/auth/action-code-settings-builder';
import {
  OIDCAuthProviderConfig, SAMLAuthProviderConfig, OIDCUpdateAuthProviderRequest,
  SAMLUpdateAuthProviderRequest, SAMLConfigServerResponse,
} from '../../../src/auth/auth-config';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;
const host = 'identitytoolkit.googleapis.com';
const timeout = 25000;


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


describe('FIREBASE_AUTH_CREATE_SESSION_COOKIE', () => {
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
    expect(FIREBASE_AUTH_CREATE_SESSION_COOKIE.getEndpoint()).to.equal(':createSessionCookie');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_CREATE_SESSION_COOKIE.getHttpMethod()).to.equal('POST');
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_CREATE_SESSION_COOKIE.getRequestValidator();
    it('should succeed with valid parameters passed', () => {
      const validRequest = {idToken: 'ID_TOKEN', validDuration: 60 * 60};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('ID_TOKEN');
      expect(isNumber).to.have.been.calledOnce.and.calledWith(60 * 60);
    });
    it('should succeed with duration set at minimum allowed', () => {
      const validDuration = 60 * 5;
      const validRequest = {idToken: 'ID_TOKEN', validDuration};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('ID_TOKEN');
      expect(isNumber).to.have.been.calledOnce.and.calledWith(validDuration);
    });
    it('should succeed with duration set at maximum allowed', () => {
      const validDuration = 60 * 60 * 24 * 14;
      const validRequest = {idToken: 'ID_TOKEN', validDuration};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
      expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('ID_TOKEN');
      expect(isNumber).to.have.been.calledOnce.and.calledWith(validDuration);
    });
    it('should fail when idToken not passed', () => {
      const invalidRequest = {validDuration: 60 * 60};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
      expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith(undefined);
    });
    it('should fail when validDuration not passed', () => {
      const invalidRequest = {idToken: 'ID_TOKEN'};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
      expect(isNumber).to.have.been.calledOnce.and.calledWith(undefined);
    });
    describe('called with invalid parameters', () => {
      it('should fail with invalid idToken', () => {
        expect(() => {
          return requestValidator({idToken: '', validDuration: 60 * 60});
        }).to.throw();
        expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('');
      });
      it('should fail with invalid validDuration', () => {
        expect(() => {
          return requestValidator({idToken: 'ID_TOKEN', validDuration: 'invalid'});
        }).to.throw();
        expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('ID_TOKEN');
        expect(isNumber).to.have.been.calledOnce.and.calledWith('invalid');
      });
      it('should fail with validDuration less than minimum allowed', () => {
        // Duration less 5 minutes.
        const outOfBoundDuration = 60 * 5 - 1;
        expect(() => {
          return requestValidator({idToken: 'ID_TOKEN', validDuration: outOfBoundDuration});
        }).to.throw();
        expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('ID_TOKEN');
        expect(isNumber).to.have.been.calledOnce.and.calledWith(outOfBoundDuration);
      });
      it('should fail with validDuration greater than maximum allowed', () => {
        // Duration greater than 14 days.
        const outOfBoundDuration = 60 * 60 * 24 * 14 + 1;
        expect(() => {
          return requestValidator({idToken: 'ID_TOKEN', validDuration: outOfBoundDuration});
        }).to.throw();
        expect(isNonEmptyString).to.have.been.calledOnce.and.calledWith('ID_TOKEN');
        expect(isNumber).to.have.been.calledOnce.and.calledWith(outOfBoundDuration);
      });
    });
  });
  describe('responseValidator', () => {
    const responseValidator = FIREBASE_AUTH_CREATE_SESSION_COOKIE.getResponseValidator();
    it('should succeed with sessionCookie returned', () => {
      const validResponse = {sessionCookie: 'SESSION_COOKIE'};
      expect(() => {
        return responseValidator(validResponse);
      }).not.to.throw();
    });
    it('should fail when no session cookie is returned', () => {
      const invalidResponse = {};
      expect(() => {
        responseValidator(invalidResponse);
      }).to.throw();
    });
  });
});


describe('FIREBASE_AUTH_UPLOAD_ACCOUNT', () => {
  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_UPLOAD_ACCOUNT.getEndpoint()).to.equal('/accounts:batchCreate');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_UPLOAD_ACCOUNT.getHttpMethod()).to.equal('POST');
  });
  it('should return empty request validator', () => {
    expect(FIREBASE_AUTH_UPLOAD_ACCOUNT.getRequestValidator()).to.not.be.null;
    expect(() => {
      const emptyRequest = {};
      const requestValidator = FIREBASE_AUTH_UPLOAD_ACCOUNT.getRequestValidator();
      requestValidator(emptyRequest);
    }).not.to.throw();
  });
  it('should return empty response validator', () => {
    expect(FIREBASE_AUTH_UPLOAD_ACCOUNT.getResponseValidator()).to.not.be.null;
    expect(() => {
      const emptyResponse = {};
      const responseValidator = FIREBASE_AUTH_UPLOAD_ACCOUNT.getResponseValidator();
      responseValidator(emptyResponse);
    }).not.to.throw();
  });
});


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
    expect(FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getEndpoint()).to.equal('/accounts:batchGet');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_DOWNLOAD_ACCOUNT.getHttpMethod()).to.equal('GET');
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
    expect(FIREBASE_AUTH_GET_ACCOUNT_INFO.getEndpoint()).to.equal('/accounts:lookup');
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
      const validResponse: object = {users: []};
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
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getEndpoint()).to.equal('/accounts:delete');
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
    expect(FIREBASE_AUTH_SET_ACCOUNT_INFO.getEndpoint()).to.equal('/accounts:update');
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
            const claims: {[key: string]: any} = {};
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
    expect(FIREBASE_AUTH_SIGN_UP_NEW_USER.getEndpoint()).to.equal('/accounts');
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
  let stubs: sinon.SinonStub[] = [];
  let getTokenStub: sinon.SinonStub;
  const mockAccessToken: string = utils.generateRandomAccessToken();
  const expectedHeaders: {[key: string]: string} = {
    'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
    'Authorization': 'Bearer ' + mockAccessToken,
  };
  const callParams = (path: string, method: any, data: any): HttpRequestConfig => {
    return {
      method,
      url: `https://${host}${path}`,
      headers: expectedHeaders,
      data,
      timeout,
    };
  };

  before(() => {
    getTokenStub = utils.stubGetAccessToken(mockAccessToken);
  });

  after(() => {
    stubs = [];
    getTokenStub.restore();
  });

  beforeEach(() => {
    mockApp = mocks.app();
    return mockApp.INTERNAL.getToken();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    return mockApp.delete();
  });

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        return new FirebaseAuthRequestHandler(mockApp);
      }).not.to.throw(Error);
    });
  });

  describe('createSessionCookie', () => {
    const durationInMs = 24 * 60 * 60 * 1000;
    const path = '/v1/projects/project_id:createSessionCookie';
    const method = 'POST';

    it('should be fulfilled given a valid localId', () => {
      const expectedResult = utils.responseFrom({
        sessionCookie: 'SESSION_COOKIE',
      });
      const data = {idToken: 'ID_TOKEN', validDuration: durationInMs / 1000};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('ID_TOKEN', durationInMs)
        .then((result) => {
          expect(result).to.deep.equal('SESSION_COOKIE');
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be fulfilled given a duration equal to the maximum allowed', () => {
      const expectedResult = utils.responseFrom({
        sessionCookie: 'SESSION_COOKIE',
      });
      const durationAtLimitInMs = 14 * 24 * 60 * 60 * 1000;
      const data = {idToken: 'ID_TOKEN', validDuration: durationAtLimitInMs / 1000};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('ID_TOKEN', durationAtLimitInMs)
        .then((result) => {
          expect(result).to.deep.equal('SESSION_COOKIE');
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be fulfilled given a duration equal to the minimum allowed', () => {
      const expectedResult = utils.responseFrom({
        sessionCookie: 'SESSION_COOKIE',
      });
      const durationAtLimitInMs = 5 * 60 * 1000;
      const data = {idToken: 'ID_TOKEN', validDuration: durationAtLimitInMs / 1000};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('ID_TOKEN', durationAtLimitInMs)
        .then((result) => {
          expect(result).to.deep.equal('SESSION_COOKIE');
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be rejected given an invalid ID token', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ID_TOKEN,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('', durationInMs)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });
    it('should be rejected given an invalid duration', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_SESSION_COOKIE_DURATION,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('ID_TOKEN', 'invalid' as any)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });
    it('should be rejected given a duration less than minimum allowed', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_SESSION_COOKIE_DURATION,
      );
      const outOfBoundDuration = 60 * 1000 * 5 - 1;

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('ID_TOKEN', outOfBoundDuration)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });
    it('should be rejected given a duration greater than maximum allowed', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_SESSION_COOKIE_DURATION,
      );
      const outOfBoundDuration = 60 * 60 * 1000 * 24 * 14 + 1;

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('ID_TOKEN', outOfBoundDuration)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = utils.errorFrom({
        error: {
          message: 'INVALID_ID_TOKEN',
        },
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_ID_TOKEN);
      const data = {idToken: 'invalid-token', validDuration: durationInMs / 1000};
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createSessionCookie('invalid-token', durationInMs)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
  });

  describe('getAccountInfoByEmail', () => {
    const path = '/v1/projects/project_id/accounts:lookup';
    const method = 'POST';
    it('should be fulfilled given a valid email', () => {
      const expectedResult = utils.responseFrom({
        users : [
          {email: 'user@example.com'},
        ],
      });
      const data = {email: ['user@example.com']};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method,
            url: `https://${host}${path}`,
            data,
            headers: expectedHeaders,
            timeout,
          });
        });
    });
    it('should be rejected given an invalid email', () => {
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#GetAccountInfoResponse',
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const data = {email: ['user@example.com']};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
  });

  describe('getAccountInfoByUid', () => {
    const path = '/v1/projects/project_id/accounts:lookup';
    const method = 'POST';
    it('should be fulfilled given a valid localId', () => {
      const expectedResult = utils.responseFrom({
        users : [
          {localId: 'uid'},
        ],
      });
      const data = {localId: ['uid']};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByUid('uid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be rejected given an invalid localId', () => {
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#GetAccountInfoResponse',
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const data = {localId: ['uid']};
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByUid('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = utils.errorFrom({
        error: {
          message: 'OPERATION_NOT_ALLOWED',
        },
      });
      const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
      const data = {localId: ['uid']};

      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByUid('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
  });

  describe('getAccountInfoByPhoneNumber', () => {
    const path = '/v1/projects/project_id/accounts:lookup';
    const method = 'POST';
    it('should be fulfilled given a valid phoneNumber', () => {
      const expectedResult = utils.responseFrom({
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
      });
      const data = {
        phoneNumber: ['+11234567890'],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByPhoneNumber('+11234567890')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be rejected given an invalid phoneNumber', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_PHONE_NUMBER);

      const stub = sinon.stub(HttpClient.prototype, 'send');
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
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#GetAccountInfoResponse',
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const data = {
        phoneNumber: ['+11234567890'],
      };

      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByPhoneNumber('+11234567890')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
  });

  describe('uploadAccount', () => {
    const path = '/v1/projects/project_id/accounts:batchCreate';
    const method = 'POST';
    const nowString = new Date().toUTCString();
    const users = [
      {
        uid: '1234',
        email: 'user@example.com',
        passwordHash: Buffer.from('password'),
        passwordSalt: Buffer.from('salt'),
        displayName: 'Test User',
        photoURL: 'https://www.example.com/1234/photo.png',
        disabled: true,
        metadata: {
          lastSignInTime: nowString,
          creationTime: nowString,
        },
        providerData: [
          {
            uid: 'google1234',
            email: 'user@example.com',
            photoURL: 'https://www.google.com/1234/photo.png',
            displayName: 'Google User',
            providerId: 'google.com',
          },
        ],
        customClaims: {admin: true},
      },
      {
        uid: '9012',
        email: 'johndoe@example.com',
        passwordHash: Buffer.from('userpass'),
        passwordSalt: Buffer.from('NaCl'),
      },
      {uid: '5678', phoneNumber: '+16505550101'},
    ];
    const options = {
      hash: {
        algorithm: 'BCRYPT' as any,
      },
    };

    it('should throw on invalid options without making an underlying API call', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_HASH_ALGORITHM,
        `Unsupported hash algorithm provider "invalid".`,
      );
      const invalidOptions = {
        hash: {
          algorithm: 'invalid',
        },
      } as any;
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      expect(() => {
        requestHandler.uploadAccount(users, invalidOptions);
      }).to.throw(expectedError.message);
      expect(stub).to.have.not.been.called;
    });

    it('should throw when 1001 UserImportRecords are provided', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.MAXIMUM_USER_COUNT_EXCEEDED,
        `A maximum of 1000 users can be imported at once.`,
      );
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stubs.push(stub);

      const testUsers: UserImportRecord[] = [];
      for (let i = 0; i < 1001; i++) {
        testUsers.push({
          uid: 'USER' + i.toString(),
          email: 'user' + i.toString() + '@example.com',
          passwordHash: Buffer.from('password'),
        });
      }

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      expect(() => {
        requestHandler.uploadAccount(testUsers, options);
      }).to.throw(expectedError.message);
      expect(stub).to.have.not.been.called;
    });

    it('should resolve successfully when 1000 UserImportRecords are provided', () => {
      const expectedResult = utils.responseFrom({});
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const testUsers = [];
      for (let i = 0; i < 1000; i++) {
        testUsers.push({
          uid: 'USER' + i.toString(),
          email: 'user' + i.toString() + '@example.com',
          passwordHash: Buffer.from('password'),
        });
      }

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      const userImportBuilder = new UserImportBuilder(testUsers, options);
      return requestHandler.uploadAccount(testUsers, options)
        .then((result) => {
          expect(result).to.deep.equal(userImportBuilder.buildResponse([]));
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, userImportBuilder.buildRequest()));
        });

    });

    it('should resolve with expected result on underlying API success', () => {
      const expectedResult = utils.responseFrom({});
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      const userImportBuilder = new UserImportBuilder(users, options);
      return requestHandler.uploadAccount(users, options)
        .then((result) => {
          expect(result).to.deep.equal(userImportBuilder.buildResponse([]));
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, userImportBuilder.buildRequest()));
        });
    });

    it('should resolve with expected result on underlying API partial succcess', () => {
      const expectedResult = utils.responseFrom({
        error: [
          {index: 0, message: 'Some error occurred'},
          {index: 1, message: 'Another error occurred'},
        ],
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      const userImportBuilder = new UserImportBuilder(users, options);
      return requestHandler.uploadAccount(users, options)
        .then((result) => {
          expect(result).to.deep.equal(userImportBuilder.buildResponse(expectedResult.data.error));
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, userImportBuilder.buildRequest()));
        });
    });

    it('should resolve without underlying API call when users are processed client side', () => {
      // These users should fail to upload due to invalid phone number and email fields.
      const testUsers = [
        {uid: '1234', phoneNumber: 'invalid'},
        {uid: '5678', email: 'invalid'},
      ] as any;
      const expectedResult = {
        successCount: 0,
        failureCount: 2,
        errors: [
          {index: 0, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER)},
          {index: 1, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL)},
        ],
      };
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.uploadAccount(testUsers)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.not.been.called;
        });
    });

    it('should validate underlying users and resolve with expected errors', () => {
      const testUsers = [
        {uid: 'user1', displayName: false},
        {uid: 123},
        {uid: 'user2', email: 'invalid'},
        {uid: 'user3', phoneNumber: 'invalid'},
        {uid: 'user4', emailVerified: 'invalid'},
        {uid: 'user5', photoURL: 'invalid'},
        {uid: 'user6', disabled: 'invalid'},
        {uid: 'user7', metadata: {creationTime: 'invalid'}},
        {uid: 'user8', metadata: {lastSignInTime: 'invalid'}},
        {uid: 'user9', customClaims: {admin: true, aud: 'bla'}},
        {uid: 'user10', email: 'user10@example.com', passwordHash: 'invalid'},
        {uid: 'user11', email: 'user11@example.com', passwordSalt: 'invalid'},
        {uid: 'user12', providerData: [{providerId: 'google.com'}]},
        {
          uid: 'user13',
          providerData: [{providerId: 'google.com', uid: 'RAW_ID', displayName: false}],
        },
        {
          uid: 'user14',
          providerData: [{providerId: 'google.com', uid: 'RAW_ID', email: 'invalid'}],
        },
        {
          uid: 'user15',
          providerData: [{providerId: 'google.com', uid: 'RAW_ID', photoURL: 'invalid'}],
        },
        {uid: 'user16', providerData: [{}]},
        {email: 'user17@example.com'},
      ] as any;
      const validOptions = {
        hash: {
          algorithm: 'BCRYPT',
        },
      } as any;
      const expectedResult = {
        successCount: 0,
        failureCount: testUsers.length,
        errors: [
          {index: 0, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_DISPLAY_NAME)},
          {index: 1, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_UID)},
          {index: 2, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL)},
          {index: 3, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER)},
          {index: 4, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL_VERIFIED)},
          {index: 5, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PHOTO_URL)},
          {index: 6, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_DISABLED_FIELD)},
          {index: 7, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_CREATION_TIME)},
          {index: 8, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_LAST_SIGN_IN_TIME)},
          {
            index: 9,
            error: new FirebaseAuthError(
              AuthClientErrorCode.FORBIDDEN_CLAIM,
              `Developer claim "aud" is reserved and cannot be specified.`,
            ),
          },
          {index: 10, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD_HASH)},
          {index: 11, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PASSWORD_SALT)},
          {
            index: 12,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_UID,
              `The provider "uid" for "google.com" must be a valid non-empty string.`,
            ),
          },
          {
            index: 13,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_DISPLAY_NAME,
              `The provider "displayName" for "google.com" must be a valid string.`,
            ),
          },
          {
            index: 14,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_EMAIL,
              `The provider "email" for "google.com" must be a valid email string.`,
            ),
          },
          {
            index: 15,
            error: new FirebaseAuthError(
              AuthClientErrorCode.INVALID_PHOTO_URL,
              `The provider "photoURL" for "google.com" must be a valid URL string.`,
            ),
          },
          {index: 16, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID)},
          {index: 17, error: new FirebaseAuthError(AuthClientErrorCode.INVALID_UID)},
        ],
      };
      const stub = sinon.stub(HttpClient.prototype, 'send');
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.uploadAccount(testUsers, validOptions)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.not.been.called;
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INTERNAL_ERROR',
        },
      });
      const expectedError = new FirebaseAuthError(
         AuthClientErrorCode.INTERNAL_ERROR,
         `An internal error has occurred. Raw server response: ` +
         `"${JSON.stringify(expectedServerError.response.data)}"`,
      );
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      const userImportBuilder = new UserImportBuilder(users, options);
      return requestHandler.uploadAccount(users, options)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, userImportBuilder.buildRequest()));
        });
    });

  });

  describe('downloadAccount', () => {
    const path = '/v1/projects/project_id/accounts:batchGet';
    const method = 'GET';
    const nextPageToken = 'PAGE_TOKEN';
    const maxResults = 500;
    const expectedResult = utils.responseFrom({
      users : [
        {localId: 'uid1'},
        {localId: 'uid2'},
      ],
      nextPageToken: 'NEXT_PAGE_TOKEN',
    });
    it('should be fulfilled given a valid parameters', () => {
      const data = {
        maxResults,
        nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be fulfilled with empty user array when no users exist', () => {
      const data = {
        maxResults,
        nextPageToken,
      };

      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal({users: []});
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be fulfilled given no parameters', () => {
      // Default maxResults should be used.
      const data = {
        maxResults: 1000,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount()
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be rejected given an invalid maxResults', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `Required "maxResults" must be a positive integer that does not ` +
        `exceed 1000.`,
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
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_PAGE_SELECTION',
        },
      });
      const expectedError = FirebaseAuthError.fromServerError('INVALID_PAGE_SELECTION');
      const data = {
        maxResults,
        nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.downloadAccount(maxResults, nextPageToken)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
  });

  describe('deleteAccount', () => {
    const path = '/v1/projects/project_id/accounts:delete';
    const method = 'POST';
    it('should be fulfilled given a valid localId', () => {
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#DeleteAccountResponse',
      });
      const data = {localId: 'uid'};

      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteAccount('uid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = utils.errorFrom({
        error: {
          message: 'OPERATION_NOT_ALLOWED',
        },
      });
      const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
      const data = {localId: 'uid'};

      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
      stubs.push(stub);
      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteAccount('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, data));
        });
    });
  });

  describe('updateExistingAccount', () => {
    const path = '/v1/projects/project_id/accounts:update';
    const method = 'POST';
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
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send empty update request.
      return requestHandler.updateExistingAccount(uid, {})
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, {localId: uid}));
        });
    });

    it('should be fulfilled given valid parameters', () => {
      // Successful result server response.
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send update request with all possible valid parameters.
      return requestHandler.updateExistingAccount(uid, validData)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, expectedValidData));
        });
    });

    it('should be fulfilled given valid profile parameters to delete', () => {
      // Successful result server response.
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
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
            callParams(path, method, expectedValidDeleteData));
        });
    });

    it('should be fulfilled given phone number to delete', () => {
      // Successful result server response.
      const expectedResult = utils.responseFrom({
        kind: 'identitytoolkit#SetAccountInfoResponse',
        localId: uid,
      });

      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
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
            callParams(path, method, expectedValidDeletePhoneNumberData));
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
      const expectedResult = utils.errorFrom({
        error: {
          message: 'OPERATION_NOT_ALLOWED',
        },
      });

      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateExistingAccount(uid, validData)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, expectedValidData));
        });
    });
  });

  describe('setCustomUserClaims', () => {
    const path = '/v1/projects/project_id/accounts:update';
    const method = 'POST';
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
    const expectedResult = utils.responseFrom({
      localId: uid,
    });

    it('should be fulfilled given a valid localId and customAttributes', () => {
      // Successful result server response.
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send empty request.
      return requestHandler.setCustomUserClaims(uid, claims)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, expectedValidData));
        });
    });

    it('should be fulfilled given valid localId and null claims', () => {
      // Successful result server response.
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Send request to delete custom claims.
      return requestHandler.setCustomUserClaims(uid, null)
        .then((returnedUid: string) => {
          // uid should be returned.
          expect(returnedUid).to.be.equal(uid);
          // Confirm expected rpc request parameters sent.
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, expectedEmptyClaimsData));
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
      return requestHandler.setCustomUserClaims(uid, 'invalid' as any)
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
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'USER_NOT_FOUND',
        },
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.setCustomUserClaims(uid, claims)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
            callParams(path, method, expectedValidData));
        });
    });
  });

  describe('revokeRefreshTokens', () => {
    const path = '/v1/projects/project_id/accounts:update';
    const method = 'POST';
    const uid = '12345678';
    const now = new Date();
    const expectedResult = utils.responseFrom({
      localId: uid,
    });
    let clock: sinon.SinonFakeTimers;

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
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Simulate 5 seconds passed.
      clock.tick(5000);
      return requestHandler.revokeRefreshTokens(uid)
        .then((returnedUid: string) => {
          expect(returnedUid).to.be.equal(uid);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
        });
    });

    it('should be rejected given an invalid uid', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_UID);
      const invalidUid: any = {localId: uid};

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
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'USER_NOT_FOUND',
        },
      });
      const requestData = {
        localId: uid,
        validSince: Math.ceil((now.getTime() + 5000) / 1000),
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      // Simulate 5 seconds passed.
      clock.tick(5000);
      return requestHandler.revokeRefreshTokens(uid)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
        });
    });
  });

  describe('createNewAccount', () => {
    describe('with uid specified', () => {
      const path = '/v1/projects/project_id/accounts';
      const method = 'POST';
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
        const expectedResult = utils.responseFrom({
          kind: 'identitytoolkit#SignupNewUserResponse',
          localId: uid,
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send empty create new account request with only a uid provided.
        return requestHandler.createNewAccount({uid})
          .then((returnedUid: string) => {
            // uid should be returned.
            expect(returnedUid).to.be.equal(uid);
            // Confirm expected rpc request parameters sent.
            expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, emptyRequest));
          });
      });

      it('should be fulfilled given valid parameters', () => {
        const expectedResult = utils.responseFrom({
          kind: 'identitytoolkit#SignupNewUserResponse',
          localId: uid,
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Create a new account with all possible valid data.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            // uid should be returned.
            expect(returnedUid).to.be.equal(uid);
            // Confirm expected rpc request parameters sent.
            expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, method, expectedValidData));
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
        const expectedResult = utils.errorFrom({
          error: {
            message: 'DUPLICATE_LOCAL_ID',
          },
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
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
              callParams(path, method, expectedValidData));
          });
      });

      it('should be rejected when the backend returns an email exists error', () => {
        // Expected error when the email already exists.
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.EMAIL_ALREADY_EXISTS);
        const expectedResult = utils.errorFrom({
          error: {
            message: 'EMAIL_EXISTS',
          },
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
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
              callParams(path, method, expectedValidData));
          });
      });

      it('should be rejected when the backend returns a generic error', () => {
        // Some generic backend error.
        const expectedError = FirebaseAuthError.fromServerError('OPERATION_NOT_ALLOWED');
        const expectedResult = utils.errorFrom({
          error: {
            message: 'OPERATION_NOT_ALLOWED',
          },
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send create new account request with valid data but simulate backend error.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
            expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, method, expectedValidData));
          });
      });
    });

    describe('with no uid specified', () => {
      const path = '/v1/projects/project_id/accounts';
      const method = 'POST';
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
        const expectedResult = utils.responseFrom({
          kind: 'identitytoolkit#SignupNewUserResponse',
          localId: uid,
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send request with valid data.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            // uid should be returned.
            expect(returnedUid).to.be.equal(uid);
            // Confirm expected rpc request parameters sent.
            expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, method, expectedValidData));
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
        const expectedResult = utils.errorFrom({
          error: {
            message: 'OPERATION_NOT_ALLOWED',
          },
        });
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        // Send valid create new account request and simulate backend error.
        return requestHandler.createNewAccount(validData)
          .then((returnedUid: string) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
            expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, method, expectedValidData));
          });
      });
    });
  });

  describe('getEmailActionLink', () => {
    const path = '/v1/projects/project_id/accounts:sendOobCode';
    const method = 'POST';
    const email = 'user@example.com';
    const actionCodeSettings = {
      url: 'https://www.example.com/path/file?a=1&b=2',
      handleCodeInApp: true,
      iOS: {
        bundleId: 'com.example.ios',
      },
      android: {
        packageName: 'com.example.android',
        installApp: true,
        minimumVersion: '6',
      },
      dynamicLinkDomain: 'custom.page.link',
    };
    const expectedActionCodeSettingsRequest = new ActionCodeSettingsBuilder(actionCodeSettings).buildRequest();
    const expectedLink = 'https://custom.page.link?link=' +
        encodeURIComponent('https://projectId.firebaseapp.com/__/auth/action?oobCode=CODE') +
        '&apn=com.example.android&ibi=com.example.ios';
    const expectedResult = utils.responseFrom({
      email,
      oobLink: expectedLink,
    });

    it('should be fulfilled given a valid email', () => {
      const requestData = deepExtend({
        requestType: 'PASSWORD_RESET',
        email,
        returnOobLink: true,
      }, expectedActionCodeSettingsRequest);
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink('PASSWORD_RESET', email, actionCodeSettings)
        .then((oobLink: string) => {
          expect(oobLink).to.be.equal(expectedLink);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
        });
    });

    EMAIL_ACTION_REQUEST_TYPES.forEach((requestType) => {
      it('should be fulfilled given a valid requestType:' + requestType + ' and ActionCodeSettings', () => {
        const requestData = deepExtend({
          requestType,
          email,
          returnOobLink: true,
        }, expectedActionCodeSettingsRequest);
        const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.getEmailActionLink(requestType, email, actionCodeSettings)
          .then((oobLink: string) => {
            expect(oobLink).to.be.equal(expectedLink);
            expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
          });
      });
    });

    EMAIL_ACTION_REQUEST_TYPES.forEach((requestType) => {
      if (requestType === 'EMAIL_SIGNIN') {
        return;
      }
      it('should be fulfilled given requestType:' + requestType + ' and no ActionCodeSettings', () => {
        const requestData = {
          requestType,
          email,
          returnOobLink: true,
        };
        const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
        stubs.push(stub);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.getEmailActionLink(requestType, email)
          .then((oobLink: string) => {
            expect(oobLink).to.be.equal(expectedLink);
            expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
          });
      });
    });

    it('should be rejected given requestType:EMAIL_SIGNIN and no ActionCodeSettings', () => {
      const invalidRequestType = 'EMAIL_SIGNIN';
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"ActionCodeSettings" must be a non-null object.`,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink('EMAIL_SIGNIN', email)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid argument error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected given an invalid email', () => {
      const invalidEmail = 'invalid';
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_EMAIL);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink('PASSWORD_RESET', invalidEmail, actionCodeSettings)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid email error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected given an invalid request type', () => {
      const invalidRequestType = 'invalid';
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `"invalid" is not a supported email action request type.`,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink(invalidRequestType, email, actionCodeSettings)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid argument error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected given an invalid ActionCodeSettings object', () => {
      const invalidActionCodeSettings = 'invalid' as any;
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '"ActionCodeSettings" must be a non-null object.',
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink('EMAIL_SIGNIN', email, invalidActionCodeSettings)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Invalid argument error should be thrown.
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the response does not contain a link', () => {
      const expectedError = new FirebaseAuthError(
          AuthClientErrorCode.INTERNAL_ERROR,
          'INTERNAL ASSERT FAILED: Unable to create the email action link');
      const requestData = deepExtend({
        requestType: 'VERIFY_EMAIL',
        email,
        returnOobLink: true,
      }, expectedActionCodeSettingsRequest);
      // Simulate response missing link.
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom({email}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink('VERIFY_EMAIL', email, actionCodeSettings)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
        });
    });

    it('should be rejected when the backend returns an error', () => {
      // Backend returned error.
      const expectedError = FirebaseAuthError.fromServerError('USER_NOT_FOUND');
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'USER_NOT_FOUND',
        },
      });
      const requestData = deepExtend({
        requestType: 'VERIFY_EMAIL',
        email,
        returnOobLink: true,
      }, expectedActionCodeSettingsRequest);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getEmailActionLink('VERIFY_EMAIL', email, actionCodeSettings)
        .then((returnedUid: string) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, method, requestData));
        });
    });
  });

  describe('getOAuthIdpConfig()', () => {
    const providerId = 'oidc.provider';
    const path = `/v2beta1/projects/project_id/oauthIdpConfigs/${providerId}`;
    const expectedHttpMethod = 'GET';
    const expectedResult = utils.responseFrom({
      name: `projects/project1/oauthIdpConfigs/${providerId}`,
    });

    it('should be fulfilled given a valid provider ID', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getOAuthIdpConfig(providerId)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, {}));
        });
    });

    const invalidProviderIds = [
        null, NaN, 0, 1, true, false, '', 'saml.provider', ['oidc.provider'], [], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it('should be rejected given an invalid provider ID:' + JSON.stringify(invalidProviderId), () => {
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.getOAuthIdpConfig(invalidProviderId as any)
          .then((result) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });
    });

    it('should be rejected given a backend error', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'CONFIGURATION_NOT_FOUND',
        },
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getOAuthIdpConfig(providerId)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, {}));
        });
    });
  });

  describe('listOAuthIdpConfigs()', () => {
    const path = '/v2beta1/projects/project_id/oauthIdpConfigs';
    const expectedHttpMethod = 'GET';
    const nextPageToken = 'PAGE_TOKEN';
    const maxResults = 50;
    const expectedResult = utils.responseFrom({
      oauthIdpConfigs : [
        {name: 'projects/project1/oauthIdpConfigs/oidc.provider1'},
        {name: 'projects/project1/oauthIdpConfigs/oidc.provider2'},
      ],
      nextPageToken: 'NEXT_PAGE_TOKEN',
    });

    it('should be fulfilled given a valid parameters', () => {
      const data = {
        pageSize: maxResults,
        pageToken: nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listOAuthIdpConfigs(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, data));
        });
    });

    it('should be fulfilled with empty configuration array when no configurations exist', () => {
      const data = {
        pageSize: maxResults,
        pageToken: nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listOAuthIdpConfigs(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal({oauthIdpConfigs: []});
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, data));
        });
    });

    it('should be fulfilled given no parameters', () => {
      // Default maxResults should be used.
      const data = {
        pageSize: 100,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listOAuthIdpConfigs()
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, data));
        });
    });

    it('should be rejected given an invalid maxResults', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `Required "maxResults" must be a positive integer that does not ` +
        `exceed 100.`,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listOAuthIdpConfigs(101, nextPageToken)
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
      return requestHandler.listOAuthIdpConfigs(maxResults, '')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_PAGE_SELECTION',
        },
      });
      const expectedError = FirebaseAuthError.fromServerError('INVALID_PAGE_SELECTION');
      const data = {
        pageSize: maxResults,
        pageToken: nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listOAuthIdpConfigs(maxResults, nextPageToken)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, data));
        });
    });
  });

  describe('deleteOAuthIdpConfig()', () => {
    const providerId = 'oidc.provider';
    const path = `/v2beta1/projects/project_id/oauthIdpConfigs/${providerId}`;
    const expectedHttpMethod = 'DELETE';
    const expectedResult = utils.responseFrom({});

    it('should be fulfilled given a valid provider ID', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteOAuthIdpConfig(providerId)
        .then((result) => {
          expect(result).to.be.undefined;
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, {}));
        });
    });

    const invalidProviderIds = [
        null, NaN, 0, 1, true, false, '', 'saml.provider', ['oidc.provider'], [], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it('should be rejected given an invalid provider ID:' + JSON.stringify(invalidProviderId), () => {
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.deleteOAuthIdpConfig(invalidProviderId as any)
          .then((result) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });
    });

    it('should be rejected given a backend error', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'CONFIGURATION_NOT_FOUND',
        },
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteOAuthIdpConfig(providerId)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, {}));
        });
    });
  });

  describe('createOAuthIdpConfig', () => {
    const providerId = 'oidc.provider';
    const path = `/v2beta1/projects/project_id/oauthIdpConfigs?oauthIdpConfigId=${providerId}`;
    const expectedHttpMethod = 'POST';
    const configOptions = {
      providerId,
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: true,
      clientId: 'CLIENT_ID',
      issuer: 'https://oidc.com/issuer',
    };
    const expectedRequest = {
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: true,
      clientId: 'CLIENT_ID',
      issuer: 'https://oidc.com/issuer',
    };
    const expectedResult = utils.responseFrom(deepExtend({
      name: `projects/project1/oauthIdpConfigs/${providerId}`,
    }, expectedRequest));

    it('should be fulfilled given valid parameters', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createOAuthIdpConfig(configOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be rejected given invalid parameters', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"OIDCAuthProviderConfig.issuer" must be a valid URL string.',
      );
      const invalidOptions: OIDCAuthProviderConfig = deepCopy(configOptions);
      invalidOptions.issuer = 'invalid';

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createOAuthIdpConfig(invalidOptions)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns a response missing name', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new OIDC configuration',
      );
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createOAuthIdpConfig(configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_CONFIG',
        },
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createOAuthIdpConfig(configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, expectedRequest));
        });
    });
  });

  describe('updateOAuthIdpConfig()', () => {
    const providerId = 'oidc.provider';
    const path = `/v2beta1/projects/project_id/oauthIdpConfigs/${providerId}`;
    const expectedHttpMethod = 'PATCH';
    const configOptions = {
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: true,
      clientId: 'CLIENT_ID',
      issuer: 'https://oidc.com/issuer',
    };
    const expectedRequest = {
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: true,
      clientId: 'CLIENT_ID',
      issuer: 'https://oidc.com/issuer',
    };
    const expectedResult = utils.responseFrom(deepExtend({
      name: `projects/project_id/oauthIdpConfigs/${providerId}`,
    }, expectedRequest));
    const expectedPartialResult = utils.responseFrom(deepExtend({
      name: `projects/project_id/oauthIdpConfigs/${providerId}`,
    }, {
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: false,
      clientId: 'NEW_CLIENT_ID',
      issuer: 'https://oidc.com/issuer2',
    }));

    it('should be fulfilled given full parameters', () => {
      const expectedPath = path + '?updateMask=enabled,displayName,issuer,clientId';
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateOAuthIdpConfig(providerId, configOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be fulfilled given partial parameters', () => {
      const expectedPath = path + '?updateMask=enabled,clientId';
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedPartialResult);
      const partialConfigOptions = {
        enabled: false,
        clientId: 'NEW_CLIENT_ID',
      };
      const partialRequest: OIDCUpdateAuthProviderRequest = {
        enabled: false,
        displayName: undefined,
        issuer: undefined,
        clientId: 'NEW_CLIENT_ID',
      };
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateOAuthIdpConfig(providerId, partialConfigOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedPartialResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, partialRequest));
        });
    });

    it('should be fulfilled given single parameter to change', () => {
      const expectedPath = path + '?updateMask=issuer';
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedPartialResult);
      const partialConfigOptions = {
        issuer: 'https://oidc.com/issuer2',
      };
      const partialRequest: OIDCUpdateAuthProviderRequest = {
        clientId: undefined,
        displayName: undefined,
        enabled: undefined,
        issuer: 'https://oidc.com/issuer2',
      };
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateOAuthIdpConfig(providerId, partialConfigOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedPartialResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, partialRequest));
        });
    });

    const invalidProviderIds = [
        null, NaN, 0, 1, true, false, '', 'saml.provider', ['oidc.provider'], [], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it('should be rejected given an invalid provider ID:' + JSON.stringify(invalidProviderId), () => {
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.updateOAuthIdpConfig(invalidProviderId as any, configOptions)
          .then((result) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });
    });

    it('should be rejected given invalid parameters', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"OIDCAuthProviderConfig.issuer" must be a valid URL string.',
      );
      const invalidOptions: OIDCUpdateAuthProviderRequest = deepCopy(configOptions);
      invalidOptions.issuer = 'invalid';

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateOAuthIdpConfig(providerId, invalidOptions)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns a response missing name', () => {
      const expectedPath = path + '?updateMask=enabled,displayName,issuer,clientId';
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to update OIDC configuration',
      );
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateOAuthIdpConfig(providerId, configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedPath = path + '?updateMask=enabled,displayName,issuer,clientId';
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_CONFIG',
        },
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateOAuthIdpConfig(providerId, configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, expectedRequest));
        });
    });
  });

  describe('getInboundSamlConfig()', () => {
    const providerId = 'saml.provider';
    const path = `/v2beta1/projects/project_id/inboundSamlConfigs/${providerId}`;
    const expectedHttpMethod = 'GET';
    const expectedResult = utils.responseFrom({
      name: `projects/project1/inboundSamlConfigs/${providerId}`,
    });

    it('should be fulfilled given a valid provider ID', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getInboundSamlConfig(providerId)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, {}));
        });
    });

    const invalidProviderIds = [
        null, NaN, 0, 1, true, false, '', 'oidc.provider', ['saml.provider'], [], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it('should be rejected given an invalid provider ID:' + JSON.stringify(invalidProviderId), () => {
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.getInboundSamlConfig(invalidProviderId as any)
          .then((result) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });
    });

    it('should be rejected given a backend error', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'CONFIGURATION_NOT_FOUND',
        },
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getInboundSamlConfig(providerId)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, {}));
        });
    });
  });

  describe('listInboundSamlConfigs()', () => {
    const path = '/v2beta1/projects/project_id/inboundSamlConfigs';
    const expectedHttpMethod = 'GET';
    const nextPageToken = 'PAGE_TOKEN';
    const maxResults = 50;
    const expectedResult = utils.responseFrom({
      inboundSamlConfigs : [
        {name: 'projects/project1/inboundSamlConfigs/saml.provider1'},
        {name: 'projects/project1/inboundSamlConfigs/saml.provider2'},
      ],
      nextPageToken: 'NEXT_PAGE_TOKEN',
    });

    it('should be fulfilled given a valid parameters', () => {
      const data = {
        pageSize: maxResults,
        pageToken: nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listInboundSamlConfigs(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, data));
        });
    });

    it('should be fulfilled with empty configuration array when no configurations exist', () => {
      const data = {
        pageSize: maxResults,
        pageToken: nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listInboundSamlConfigs(maxResults, nextPageToken)
        .then((result) => {
          expect(result).to.deep.equal({inboundSamlConfigs: []});
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, data));
        });
    });

    it('should be fulfilled given no parameters', () => {
      // Default maxResults should be used.
      const data = {
        pageSize: 100,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listInboundSamlConfigs()
        .then((result) => {
          expect(result).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, data));
        });
    });

    it('should be rejected given an invalid maxResults', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `Required "maxResults" must be a positive integer that does not ` +
        `exceed 100.`,
      );

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listInboundSamlConfigs(101, nextPageToken)
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
      return requestHandler.listInboundSamlConfigs(maxResults, '')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_PAGE_SELECTION',
        },
      });
      const expectedError = FirebaseAuthError.fromServerError('INVALID_PAGE_SELECTION');
      const data = {
        pageSize: maxResults,
        pageToken: nextPageToken,
      };
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.listInboundSamlConfigs(maxResults, nextPageToken)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, data));
        });
    });
  });

  describe('deleteInboundSamlConfig()', () => {
    const providerId = 'saml.provider';
    const path = `/v2beta1/projects/project_id/inboundSamlConfigs/${providerId}`;
    const expectedHttpMethod = 'DELETE';
    const expectedResult = utils.responseFrom({});

    it('should be fulfilled given a valid provider ID', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteInboundSamlConfig(providerId)
        .then((result) => {
          expect(result).to.be.undefined;
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, {}));
        });
    });

    const invalidProviderIds = [
        null, NaN, 0, 1, true, false, '', 'oidc.provider', ['saml.provider'], [], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it('should be rejected given an invalid provider ID:' + JSON.stringify(invalidProviderId), () => {
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.deleteInboundSamlConfig(invalidProviderId as any)
          .then((result) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });
    });

    it('should be rejected given a backend error', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'CONFIGURATION_NOT_FOUND',
        },
      });
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.deleteInboundSamlConfig(providerId)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(callParams(path, expectedHttpMethod, {}));
        });
    });
  });

  describe('createInboundSamlConfig', () => {
    const providerId = 'saml.provider';
    const path = `/v2beta1/projects/project_id/inboundSamlConfigs?inboundSamlConfigId=${providerId}`;
    const expectedHttpMethod = 'POST';
    const configOptions = {
      providerId,
      displayName: 'SAML_DISPLAY_NAME',
      enabled: true,
      idpEntityId: 'IDP_ENTITY_ID',
      ssoURL: 'https://example.com/login',
      x509Certificates: ['CERT1', 'CERT2'],
      rpEntityId: 'RP_ENTITY_ID',
      callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
      enableRequestSigning: true,
    };
    const expectedRequest = {
      idpConfig: {
        idpEntityId: 'IDP_ENTITY_ID',
        ssoUrl: 'https://example.com/login',
        signRequest: true,
        idpCertificates: [
          {x509Certificate: 'CERT1'},
          {x509Certificate: 'CERT2'},
        ],
      },
      spConfig: {
        spEntityId: 'RP_ENTITY_ID',
        callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
      },
      displayName: 'SAML_DISPLAY_NAME',
      enabled: true,
    };
    const expectedResult = utils.responseFrom(deepExtend({
      name: 'projects/project1/inboundSamlConfigs/saml.provider',
    }, expectedRequest));

    it('should be fulfilled given valid parameters', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createInboundSamlConfig(configOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be rejected given invalid parameters', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.callbackURL" must be a valid URL string.',
      );
      const invalidOptions: SAMLAuthProviderConfig = deepCopy(configOptions);
      invalidOptions.callbackURL = 'invalid';

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createInboundSamlConfig(invalidOptions)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns a response missing name', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to create new SAML configuration',
      );
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createInboundSamlConfig(configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_CONFIG',
        },
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.createInboundSamlConfig(configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(path, expectedHttpMethod, expectedRequest));
        });
    });
  });

  describe('updateInboundSamlConfig()', () => {
    const providerId = 'saml.provider';
    const path = `/v2beta1/projects/project_id/inboundSamlConfigs/${providerId}`;
    const expectedHttpMethod = 'PATCH';
    const configOptions = {
      idpEntityId: 'IDP_ENTITY_ID',
      ssoURL: 'https://example.com/login',
      x509Certificates: ['CERT1', 'CERT2'],
      rpEntityId: 'RP_ENTITY_ID',
      callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
      enableRequestSigning: true,
      enabled: true,
      displayName: 'samlProviderName',
    };
    const expectedRequest = {
      idpConfig: {
        idpEntityId: 'IDP_ENTITY_ID',
        ssoUrl: 'https://example.com/login',
        signRequest: true,
        idpCertificates: [
          {x509Certificate: 'CERT1'},
          {x509Certificate: 'CERT2'},
        ],
      },
      spConfig: {
        spEntityId: 'RP_ENTITY_ID',
        callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
      },
      displayName: 'samlProviderName',
      enabled: true,
    };
    const expectedResult = utils.responseFrom(deepExtend({
      name: `projects/project_id/inboundSamlConfigs/${providerId}`,
    }, expectedRequest));
    const expectedPartialResult = utils.responseFrom(deepExtend({
      name: `projects/project_id/inboundSamlConfigs/${providerId}`,
    }, {
      idpConfig: {
        idpEntityId: 'IDP_ENTITY_ID',
        ssoUrl: 'https://example.com/login2',
        signRequest: true,
        idpCertificates: [
          {x509Certificate: 'CERT1'},
          {x509Certificate: 'CERT2'},
        ],
      },
      spConfig: {
        spEntityId: 'RP_ENTITY_ID2',
        callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
      },
      displayName: 'samlProviderName',
      enabled: false,
    }));
    const fullUpadateMask =
        'enabled,displayName,idpConfig.idpEntityId,idpConfig.ssoUrl,' +
        'idpConfig.signRequest,idpConfig.idpCertificates,spConfig.spEntityId,spConfig.callbackUri';

    it('should be fulfilled given full parameters', () => {
      const expectedPath = path + `?updateMask=${fullUpadateMask}`;
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateInboundSamlConfig(providerId, configOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be fulfilled given partial parameters', () => {
      const expectedPath = path + '?updateMask=enabled,idpConfig.ssoUrl,spConfig.spEntityId';
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedPartialResult);
      const partialConfigOptions = {
        ssoURL: 'https://example.com/login2',
        rpEntityId: 'RP_ENTITY_ID2',
        enabled: false,
      };
      const partialRequest: SAMLConfigServerResponse = {
        idpConfig: {
          idpEntityId: undefined,
          ssoUrl: 'https://example.com/login2',
          signRequest: undefined,
          idpCertificates: undefined,
        },
        spConfig: {
          spEntityId: 'RP_ENTITY_ID2',
          callbackUri: undefined,
        },
        displayName: undefined,
        enabled: false,
      };
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateInboundSamlConfig(providerId, partialConfigOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedPartialResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, partialRequest));
        });
    });

    it('should be fulfilled given single parameter to change', () => {
      const expectedPath = path + '?updateMask=idpConfig.ssoUrl';
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedPartialResult);
      const partialConfigOptions = {
        ssoURL: 'https://example.com/login2',
      };
      const partialRequest: SAMLConfigServerResponse = {
        idpConfig: {
          idpEntityId: undefined,
          ssoUrl: 'https://example.com/login2',
          signRequest: undefined,
          idpCertificates: undefined,
        },
        displayName: undefined,
        enabled: undefined,
      };
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateInboundSamlConfig(providerId, partialConfigOptions)
        .then((response) => {
          expect(response).to.deep.equal(expectedPartialResult.data);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, partialRequest));
        });
    });

    const invalidProviderIds = [
        null, NaN, 0, 1, true, false, '', 'oidc.provider', ['saml.provider'], [], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it('should be rejected given an invalid provider ID:' + JSON.stringify(invalidProviderId), () => {
        const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_PROVIDER_ID);

        const requestHandler = new FirebaseAuthRequestHandler(mockApp);
        return requestHandler.updateInboundSamlConfig(invalidProviderId as any, configOptions)
          .then((result) => {
            throw new Error('Unexpected success');
          }, (error) => {
            expect(error).to.deep.equal(expectedError);
          });
      });
    });

    it('should be rejected given invalid parameters', () => {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CONFIG,
        '"SAMLAuthProviderConfig.ssoURL" must be a valid URL string.',
      );
      const invalidOptions: SAMLUpdateAuthProviderRequest = deepCopy(configOptions);
      invalidOptions.ssoURL = 'invalid';

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateInboundSamlConfig(providerId, invalidOptions)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
        });
    });

    it('should be rejected when the backend returns a response missing name', () => {
      const expectedPath = path + `?updateMask=${fullUpadateMask}`;
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INTERNAL_ERROR,
        'INTERNAL ASSERT FAILED: Unable to update SAML configuration',
      );
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(utils.responseFrom({}));
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateInboundSamlConfig(providerId, configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, expectedRequest));
        });
    });

    it('should be rejected when the backend returns an error', () => {
      const expectedPath = path + `?updateMask=${fullUpadateMask}`;
      const expectedServerError = utils.errorFrom({
        error: {
          message: 'INVALID_CONFIG',
        },
      });
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedServerError);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.updateInboundSamlConfig(providerId, configOptions)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              callParams(expectedPath, expectedHttpMethod, expectedRequest));
        });
    });
  });

  describe('non-2xx responses', () => {
    it('should be rejected given a simulated non-2xx response with a known error code', () => {
      const mockErrorResponse = utils.errorFrom({
        error: {
          message: 'USER_NOT_FOUND',
        },
      }, 400);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(mockErrorResponse);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
    });

    it('should be rejected given a simulated non-2xx response with an unknown error code', () => {
      const mockErrorResponse = utils.errorFrom({
        error: {
          message: 'UNKNOWN_ERROR_CODE',
        },
      }, 400);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(mockErrorResponse);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .should.eventually.be.rejected.and.have.property('code', 'auth/internal-error');
    });

    it('should be rejected given a simulated non-2xx response with no error code', () => {
      const mockErrorResponse = utils.errorFrom({
        error: {
          foo: 'bar',
        },
      }, 400);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(mockErrorResponse);
      stubs.push(stub);

      const requestHandler = new FirebaseAuthRequestHandler(mockApp);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .should.eventually.be.rejected.and.have.property('code', 'auth/internal-error');
    });
  });
});

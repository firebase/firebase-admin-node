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

import {expect} from 'chai';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {deepCopy} from '../../../src/utils/deep-copy';
import {UserInfo, UserMetadata, UserRecord} from '../../../src/auth/user-record';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

/**
 * @return {Object} A sample valid user response as returned from getAccountInfo
 *     endpoint.
 */
function getValidUserResponse(): Object {
  return {
    localId: 'abcdefghijklmnopqrstuvwxyz',
    email: 'user@gmail.com',
    emailVerified: true,
    displayName: 'John Doe',
    phoneNumber: '+11234567890',
    providerUserInfo: [
      {
        providerId: 'google.com',
        displayName: 'John Doe',
        photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
        federatedId: '1234567890',
        email: 'user@gmail.com',
        rawId: '1234567890',
      },
      {
        providerId: 'facebook.com',
        displayName: 'John Smith',
        photoUrl: 'https://facebook.com/0987654321/photo.jpg',
        federatedId: '0987654321',
        email: 'user@facebook.com',
        rawId: '0987654321',
      },
      {
        providerId: 'phone',
        rawId: '+11234567890',
        phoneNumber: '+11234567890',
      },
      {
        providerId: 'password',
        email: 'user@gmail.com',
        rawId: 'user@gmail.com',
        federatedId: 'user@gmail.com',
        displayName: 'John Doe',
      },
    ],
    passwordHash: 'passwordHash',
    salt: 'passwordSalt',
    photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    validSince: '1476136676',
    lastLoginAt: '1476235905000',
    createdAt: '1476136676000',
    customAttributes: JSON.stringify({
      admin: true,
    }),
  };
}

/**
 * @return {Object} The expected user JSON representation for the above user
 *     server response.
 */
function getUserJSON(): Object {
  return {
    uid: 'abcdefghijklmnopqrstuvwxyz',
    email: 'user@gmail.com',
    phoneNumber: '+11234567890',
    emailVerified: true,
    disabled: false,
    displayName: 'John Doe',
    providerData: [
      {
        providerId: 'google.com',
        displayName: 'John Doe',
        photoURL: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
        email: 'user@gmail.com',
        uid: '1234567890',
        phoneNumber: undefined,
      },
      {
        providerId: 'facebook.com',
        displayName: 'John Smith',
        photoURL: 'https://facebook.com/0987654321/photo.jpg',
        email: 'user@facebook.com',
        uid: '0987654321',
        phoneNumber: undefined,
      },
      {
        providerId: 'phone',
        displayName: undefined,
        photoURL: undefined,
        email: undefined,
        uid: '+11234567890',
        phoneNumber: '+11234567890',
      },
      {
        providerId: 'password',
        displayName: 'John Doe',
        photoURL: undefined,
        email: 'user@gmail.com',
        uid: 'user@gmail.com',
        phoneNumber: undefined,
      },
    ],
    passwordHash: 'passwordHash',
    passwordSalt: 'passwordSalt',
    photoURL: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    metadata: {
      lastSignInTime: new Date(1476235905000).toUTCString(),
      creationTime: new Date(1476136676000).toUTCString(),
    },
    customClaims: {
      admin: true,
    },
    tokensValidAfterTime: new Date(1476136676000).toUTCString(),
  };
}

/**
 * @return {Object} A sample user info response as returned from getAccountInfo
 *     endpoint.
 */
function getUserInfoResponse(): Object {
  return {
    providerId: 'google.com',
    displayName: 'John Doe',
    photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    federatedId: '1234567890',
    email: 'user@gmail.com',
    rawId: '1234567890',
  };
}

/**
 * @return {Object} The JSON representation of the above user info response.
 */
function getUserInfoJSON(): Object {
  return {
    providerId: 'google.com',
    displayName: 'John Doe',
    photoURL: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    uid: '1234567890',
    email: 'user@gmail.com',
    phoneNumber: undefined,
  };
}

/**
 * @return {Object} A sample user info response with phone number as returned
 *     from getAccountInfo endpoint.
 */
function getUserInfoWithPhoneNumberResponse(): Object {
  return {
    providerId: 'phone',
    phoneNumber: '+11234567890',
    rawId: '+11234567890',
  };
}

/**
 * @return {Object} The JSON representation of the above user info response
 *     with a phone number.
 */
function getUserInfoWithPhoneNumberJSON(): Object {
  return {
    providerId: 'phone',
    displayName: undefined,
    photoURL: undefined,
    uid: '+11234567890',
    email: undefined,
    phoneNumber: '+11234567890',
  };
}

describe('UserInfo', () => {
  describe('constructor', () =>  {
    it('should throw when an empty object is provided', () => {
      expect(() =>  {
        return new UserInfo({});
      }).to.throw(Error);
    });

    it('should succeed when rawId and providerId are both provided', () => {
      expect(() => {
        return new UserInfo({providerId: 'google.com', rawId: '1234567890'});
      }).not.to.throw(Error);
    });

    it('should throw when only rawId is provided', () => {
      expect(() =>  {
        return new UserInfo({rawId: '1234567890'});
      }).to.throw(Error);
    });

    it('should throw when only providerId is provided', () => {
      expect(() =>  {
        return new UserInfo({providerId: 'google.com'});
      }).to.throw(Error);
    });
  });

  describe('getters', () => {
    const userInfoResponse: any = getUserInfoResponse();
    const userInfo = new UserInfo(userInfoResponse);
    const userInfoWithPhoneNumberResponse: any = getUserInfoWithPhoneNumberResponse();
    const userInfoWithPhoneNumber = new UserInfo(userInfoWithPhoneNumberResponse);
    it('should return expected providerId', () => {
      expect(userInfo.providerId).to.equal(userInfoResponse.providerId);
    });

    it('should throw when modifying readonly providerId property', () => {
      expect(() => {
        (userInfo as any).providerId = 'facebook.com';
      }).to.throw(Error);
    });

    it('should return expected displayName', () => {
      expect(userInfo.displayName).to.equal(userInfoResponse.displayName);
    });

    it('should throw when modifying readonly displayName property', () => {
      expect(() => {
        (userInfo as any).displayName = 'Jane Doe';
      }).to.throw(Error);
    });

    it('should return expected photoURL', () => {
      expect(userInfo.photoURL).to.equal(userInfoResponse.photoUrl);
    });

    it('should throw when modifying readonly photoURL property', () => {
      expect(() => {
        (userInfo as any).photoURL = 'http://localhost/photo.jpg';
      }).to.throw(Error);
    });

    it('should return expected email', () => {
      expect(userInfo.email).to.equal(userInfoResponse.email);
    });

    it('should throw when modifying readonly email property', () => {
      expect(() => {
        (userInfo as any).email = 'user@example.com';
      }).to.throw(Error);
    });

    it('should return expected uid', () => {
      expect(userInfo.uid).to.equal(userInfoResponse.rawId);
    });

    it('should throw when modifying readonly uid property', () => {
      expect(() => {
        (userInfo as any).uid = '00000000';
      }).to.throw(Error);
    });

    it('should return expected phoneNumber', () => {
      expect(userInfoWithPhoneNumber.phoneNumber)
        .to.equal(userInfoWithPhoneNumberResponse.phoneNumber);
    });

    it('should throw when modifying readonly phoneNumber property', () => {
      expect(() => {
        (userInfoWithPhoneNumber as any).phoneNumber = '+10987654321';
      }).to.throw(Error);
    });
  });

  describe('toJSON', () => {
    const userInfo = new UserInfo(getUserInfoResponse());
    const userInfoWithPhoneNumber =
        new UserInfo(getUserInfoWithPhoneNumberResponse());
    it('should return expected JSON object', () => {
      expect(userInfo.toJSON()).to.deep.equal(getUserInfoJSON());
    });
    it('should return expected JSON object with phone number', () => {
      expect(userInfoWithPhoneNumber.toJSON())
        .to.deep.equal(getUserInfoWithPhoneNumberJSON());
    });
  });
});

describe('UserMetadata', () => {
  const expectedLastLoginAt = 1476235905000;
  const expectedCreatedAt = 1476136676000;
  const actualMetadata: UserMetadata = new UserMetadata({
    lastLoginAt: expectedLastLoginAt,
    createdAt: expectedCreatedAt,
  });
  const expectedMetadataJSON = {
    lastSignInTime: new Date(expectedLastLoginAt).toUTCString(),
    creationTime: new Date(expectedCreatedAt).toUTCString(),
  };

  describe('constructor', () =>  {
    it('should initialize as expected when a valid creationTime is provided', () => {
      expect(() => {
        return new UserMetadata({createdAt: '1476136676000'});
      }).not.to.throw(Error);
    });

    it('should set creationTime and lastSignInTime to null when not provided', () => {
      let metadata = new UserMetadata({});
      expect(metadata.creationTime).to.be.null;
      expect(metadata.lastSignInTime).to.be.null;
    });

    it('should set creationTime to null when creationTime value is invalid', () => {
      let metadata = new UserMetadata({
        createdAt: 'invalid',
      });
      expect(metadata.creationTime).to.be.null;
      expect(metadata.lastSignInTime).to.be.null;
    });

    it('should set lastSignInTime to null when lastLoginAt value is invalid', () => {
      let metadata = new UserMetadata({
        createdAt: '1476235905000',
        lastLoginAt: 'invalid',
      });
      expect(metadata.lastSignInTime).to.be.null;
    });
  });

  describe('getters', () => {
    it('should return expected lastSignInTime', () => {
      expect(actualMetadata.lastSignInTime).to.equal(expectedMetadataJSON.lastSignInTime);
    });

    it('should throw when modifying readonly lastSignInTime property', () => {
      expect(() => {
        (actualMetadata as any).lastSignInTime = new Date();
      }).to.throw(Error);
    });

    it('should return expected creationTime', () => {
      expect(actualMetadata.creationTime).to.equal(expectedMetadataJSON.creationTime);
    });

    it('should throw when modifying readonly creationTime property', () => {
      expect(() => {
        (actualMetadata as any).creationTime = new Date();
      }).to.throw(Error);
    });
  });

  describe('toJSON', () => {
    it('should return expected JSON object', () => {
      expect(actualMetadata.toJSON()).to.deep.equal(expectedMetadataJSON);
    });
  });
});

describe('UserRecord', () => {
  describe('constructor', () =>  {
    it('should throw when no localId is provided', () => {
      expect(() =>  {
        return new UserRecord({});
      }).to.throw(Error);
    });

    it('should succeed when only localId is provided', () => {
      expect(() =>  {
        return new UserRecord({localId: '123456789'});
      }).not.to.throw(Error);
    });
  });

  describe('getters', () => {
    const validUserResponse = getValidUserResponse();
    const userRecord = new UserRecord(validUserResponse);
    const validUserResponseNoValidSince = deepCopy(validUserResponse);
    delete (validUserResponseNoValidSince as any).validSince;
    const userRecordNoValidSince = new UserRecord(validUserResponseNoValidSince);
    const expectedTokensValidAfterTime = new Date(1476136676000).toUTCString();
    it('should return expected uid', () => {
      expect(userRecord.uid).to.equal('abcdefghijklmnopqrstuvwxyz');
    });

    it('show throw when modifying readonly uid property', () => {
      expect(() => {
        (userRecord as any).uid = '00000000';
      }).to.throw(Error);
    });

    it('should return expected email', () => {
      expect(userRecord.email).to.equal('user@gmail.com');
    });

    it('should throw when modifying readonly email property', () => {
      expect(() => {
        (userRecord as any).email = 'newUser@example.com';
      }).to.throw(Error);
    });

    it('should return expected emailVerified', () => {
      expect(userRecord.emailVerified).to.be.true;
    });

    it('should throw when modifying readonly emailVerified property', () => {
      expect(() => {
        (userRecord as any).emailVerified = false;
      }).to.throw(Error);
    });

    it('should return expected displayName', () => {
      expect(userRecord.displayName).to.equal('John Doe');
    });

    it('should throw when modifying readonly displayName property', () => {
      expect(() => {
        (userRecord as any).displayName = 'Jane Doe';
      }).to.throw(Error);
    });

    it('should return expected photoURL', () => {
      expect(userRecord.photoURL).to.equal(
          'https://lh3.googleusercontent.com/1234567890/photo.jpg');
    });

    it('should throw when modifying readonly photoURL property', () => {
      expect(() => {
        (userRecord as any).photoURL = 'http://localhost/photo.jpg';
      }).to.throw(Error);
    });

    it('should return expected disabled', () => {
      expect(userRecord.disabled).to.be.false;
    });

    it('should throw when modifying readonly disabled property', () => {
      expect(() => {
        (userRecord as any).disabled = true;
      }).to.throw(Error);
    });

    it('should return expected phoneNumber', () => {
      expect(userRecord.phoneNumber).to.equal('+11234567890');
    });

    it('should throw when modifying readonly phoneNumber property', () => {
      expect(() => {
        (userRecord as any).phoneNumber = '+10987654321';
      }).to.throw(Error);
    });

    it('should return expected passwordHash', () => {
      expect(userRecord.passwordHash).to.equal('passwordHash');
    });

    it('should return expected undefined passwordHash', () => {
      let resp: any = deepCopy(validUserResponse);
      delete resp.passwordHash;
      expect((new UserRecord(resp)).passwordHash).to.be.undefined;
    });

    it('should return expected empty string passwordHash', () => {
      // This happens for users that were migrated from other Auth systems
      // using different hashing algorithms.
      let resp: any = deepCopy(validUserResponse);
      resp.passwordHash = '';
      expect((new UserRecord(resp)).passwordHash).to.be.equal('');
    });

    it('should throw when modifying readonly passwordHash property', () => {
      expect(() => {
        (userRecord as any).passwordHash = 'bla';
      }).to.throw(Error);
    });

    it('should return expected passwordSalt', () => {
      expect(userRecord.passwordSalt).to.equal('passwordSalt');
    });

    it('should return expected undefined passwordSalt', () => {
      let resp: any = deepCopy(validUserResponse);
      delete resp.salt;
      expect((new UserRecord(resp)).passwordSalt).to.be.undefined;
    });

    it('should return expected empty string passwordSalt', () => {
      // This happens for users that were migrated from other Auth systems
      // using different hashing algorithms.
      let resp: any = deepCopy(validUserResponse);
      resp.salt = '';
      expect((new UserRecord(resp)).passwordSalt).to.be.equal('');
    });

    it('should throw when modifying readonly passwordSalt property', () => {
      expect(() => {
        (userRecord as any).passwordSalt = 'bla';
      }).to.throw(Error);
    });

    it('should return expected customClaims', () => {
      expect(userRecord.customClaims).to.deep.equal({
        admin: true,
      });
    });

    it('should throw when modifying readonly customClaims property', () => {
      expect(() => {
        (userRecord as any).customClaims = {admin: false};
      }).to.throw(Error);
    });

    it('should return expected undefined customClaims', () => {
      let resp: any = deepCopy(validUserResponse);
      delete resp.customAttributes;
      expect((new UserRecord(resp)).customClaims).to.be.undefined;
    });

    it('should return expected tokensValidAfterTime', () => {
      expect(userRecord.tokensValidAfterTime).to.equal(expectedTokensValidAfterTime);
    });

    it('should throw when modifying readonly tokensValidAfterTime property', () => {
      expect(() => {
        (userRecord as any).tokensValidAfterTime =
            new Date(1476235905000).toUTCString();
      }).to.throw(Error);
    });

    it('should return null tokensValidAfterTime when not available', () => {
      expect(userRecordNoValidSince.tokensValidAfterTime).to.be.null;
    });

    it('should return expected metadata', () => {
      let metadata = new UserMetadata({
        createdAt: '1476136676000',
        lastLoginAt: '1476235905000',
      });
      expect(userRecord.metadata).to.deep.equal(metadata);
    });

    it('should throw when modifying readonly metadata property', () => {
      expect(() => {
        (userRecord as any).metadata = new UserMetadata({
          createdAt: new Date().toUTCString(),
          lastLoginAt: new Date().toUTCString(),
        });
      }).to.throw(Error);
    });

    it('should throw when modifying readonly metadata internals', () => {
      expect(() => {
        (userRecord as any).metadata.lastSignInTime = new Date();
      }).to.throw(Error);
    });

    it('should return expected providerData', () => {
      let providerData: Array<UserInfo> = [
        new UserInfo({
          providerId: 'google.com',
          displayName: 'John Doe',
          photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
          federatedId: '1234567890',
          email: 'user@gmail.com',
          rawId: '1234567890',
        }),
        new UserInfo({
          providerId: 'facebook.com',
          displayName: 'John Smith',
          photoUrl: 'https://facebook.com/0987654321/photo.jpg',
          federatedId: '0987654321',
          email: 'user@facebook.com',
          rawId: '0987654321',
        }),
        new UserInfo({
          providerId: 'phone',
          phoneNumber: '+11234567890',
          rawId: '+11234567890',
        }),
        new UserInfo({
          providerId: 'password',
          displayName: 'John Doe',
          email: 'user@gmail.com',
          rawId: 'user@gmail.com',
          federatedId: 'user@gmail.com',
        }),
      ];
      expect(userRecord.providerData).to.deep.equal(providerData);
    });

    it('should throw when modifying readonly providerData property', () => {
      expect(() => {
        (userRecord as any).providerData = [
           new UserInfo({
             providerId: 'google.com',
             displayName: 'Jane Doe',
             photoUrl: 'https://lh3.googleusercontent.com/00000000/photo.jpg',
             email: 'janedoe@gmail.com',
             rawId: '00000000',
           }),
        ];
      }).to.throw(Error);
    });

    it('should throw when modifying readonly providerData internals', () => {
      expect(() => {
        (userRecord.providerData[0] as any).displayName = 'John Smith';
      }).to.throw(Error);
    });
  });

  describe('toJSON', () => {
    const userRecord = new UserRecord(getValidUserResponse());
    const validUserResponseNoValidSince = getValidUserResponse();
    delete (validUserResponseNoValidSince as any).validSince;
    const userRecordNoValidSince = new UserRecord(validUserResponseNoValidSince);
    it('should return expected JSON object', () => {
      expect(userRecord.toJSON()).to.deep.equal(getUserJSON());
    });

    it('should return null tokensValidAfterTime when not available', () => {
      expect((userRecordNoValidSince.toJSON() as any).tokensValidAfterTime).to.be.null;
    });
  });
});

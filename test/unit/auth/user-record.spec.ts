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
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import { deepCopy } from '../../../src/utils/deep-copy';
import {
  UserInfo, UserMetadata, UserRecord, GetAccountInfoUserResponse, ProviderUserInfoResponse,
  MultiFactor, PhoneMultiFactorInfo, MultiFactorInfo, MultiFactorInfoResponse,
} from '../../../src/auth/user-record';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;
const now = new Date();

/**
 * @param tenantId The optional tenant ID to add to the response.
 * @return A sample valid user response as returned from getAccountInfo
 *     endpoint.
 */
function getValidUserResponse(tenantId?: string): GetAccountInfoUserResponse {
  const response: any = {
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
    mfaInfo: [
      {
        mfaEnrollmentId: 'enrollmentId1',
        displayName: 'displayName1',
        enrolledAt: now.toISOString(),
        phoneInfo: '+16505551234',
      },
      {
        mfaEnrollmentId: 'enrollmentId2',
        enrolledAt: now.toISOString(),
        phoneInfo: '+16505556789',
      },
    ],
  };
  if (typeof tenantId !== 'undefined') {
    response.tenantId = tenantId;
  }
  return response;
}

/**
 * @param tenantId The optional tenant ID to add to the user.
 * @return The expected user JSON representation for the above user
 *     server response.
 */
function getUserJSON(tenantId?: string): object {
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
    tenantId,
    multiFactor: {
      enrolledFactors: [
        {
          uid: 'enrollmentId1',
          displayName: 'displayName1',
          enrollmentTime: now.toUTCString(),
          phoneNumber: '+16505551234',
          factorId: 'phone',
        },
        {
          uid: 'enrollmentId2',
          displayName: undefined,
          enrollmentTime: now.toUTCString(),
          phoneNumber: '+16505556789',
          factorId: 'phone',
        },
      ],
    },
  };
}

/**
 * @return A sample user info response as returned from getAccountInfo
 *     endpoint.
 */
function getUserInfoResponse(): ProviderUserInfoResponse {
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
 * @return The JSON representation of the above user info response.
 */
function getUserInfoJSON(): object {
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
 * @return A sample user info response with phone number as returned
 *     from getAccountInfo endpoint.
 */
function getUserInfoWithPhoneNumberResponse(): ProviderUserInfoResponse {
  return {
    providerId: 'phone',
    phoneNumber: '+11234567890',
    rawId: '+11234567890',
  };
}

/**
 * @return The JSON representation of the above user info response
 *     with a phone number.
 */
function getUserInfoWithPhoneNumberJSON(): object {
  return {
    providerId: 'phone',
    displayName: undefined,
    photoURL: undefined,
    uid: '+11234567890',
    email: undefined,
    phoneNumber: '+11234567890',
  };
}

describe('PhoneMultiFactorInfo', () => {
  const serverResponse: MultiFactorInfoResponse = {
    mfaEnrollmentId: 'enrollmentId1',
    displayName: 'displayName1',
    enrolledAt: now.toISOString(),
    phoneInfo: '+16505551234',
  };
  const phoneMultiFactorInfo = new PhoneMultiFactorInfo(serverResponse);
  const phoneMultiFactorInfoMissingFields = new PhoneMultiFactorInfo({
    mfaEnrollmentId: serverResponse.mfaEnrollmentId,
    phoneInfo: serverResponse.phoneInfo,
  });

  describe('constructor', () => {
    it('should throw when an empty object is provided', () => {
      expect(() =>  {
        return new PhoneMultiFactorInfo({} as any);
      }).to.throw('INTERNAL ASSERT FAILED: Invalid multi-factor info response');
    });

    it('should throw when an undefined response is provided', () => {
      expect(() =>  {
        return new PhoneMultiFactorInfo(undefined as any);
      }).to.throw('INTERNAL ASSERT FAILED: Invalid multi-factor info response');
    });

    it('should succeed when mfaEnrollmentId and phoneInfo are both provided', () => {
      expect(() => {
        return new PhoneMultiFactorInfo({
          mfaEnrollmentId: 'enrollmentId1',
          phoneInfo: '+16505551234',
        });
      }).not.to.throw(Error);
    });

    it('should throw when only mfaEnrollmentId is provided', () => {
      expect(() =>  {
        return new PhoneMultiFactorInfo({
          mfaEnrollmentId: 'enrollmentId1',
        } as any);
      }).to.throw('INTERNAL ASSERT FAILED: Invalid multi-factor info response');
    });

    it('should throw when only phoneInfo is provided', () => {
      expect(() =>  {
        return new PhoneMultiFactorInfo({
          phoneInfo: '+16505551234',
        } as any);
      }).to.throw('INTERNAL ASSERT FAILED: Invalid multi-factor info response');
    });
  });

  describe('getters', () => {
    it('should set missing optional fields to null', () => {
      expect(phoneMultiFactorInfoMissingFields.uid).to.equal(serverResponse.mfaEnrollmentId);
      expect(phoneMultiFactorInfoMissingFields.displayName).to.be.undefined;
      expect(phoneMultiFactorInfoMissingFields.phoneNumber).to.equal(serverResponse.phoneInfo);
      expect(phoneMultiFactorInfoMissingFields.enrollmentTime).to.be.null;
      expect(phoneMultiFactorInfoMissingFields.factorId).to.equal('phone');
    });

    it('should return expected factorId', () => {
      expect(phoneMultiFactorInfo.factorId).to.equal('phone');
    });

    it('should throw when modifying readonly factorId property', () => {
      expect(() => {
        (phoneMultiFactorInfo as any).factorId = 'other';
      }).to.throw(Error);
    });

    it('should return expected displayName', () => {
      expect(phoneMultiFactorInfo.displayName).to.equal(serverResponse.displayName);
    });

    it('should throw when modifying readonly displayName property', () => {
      expect(() => {
        (phoneMultiFactorInfo as any).displayName = 'Modified';
      }).to.throw(Error);
    });

    it('should return expected phoneNumber', () => {
      expect(phoneMultiFactorInfo.phoneNumber).to.equal(serverResponse.phoneInfo);
    });

    it('should throw when modifying readonly phoneNumber property', () => {
      expect(() => {
        (phoneMultiFactorInfo as any).phoneNumber = '+16505551111';
      }).to.throw(Error);
    });

    it('should return expected uid', () => {
      expect(phoneMultiFactorInfo.uid).to.equal(serverResponse.mfaEnrollmentId);
    });

    it('should throw when modifying readonly uid property', () => {
      expect(() => {
        (phoneMultiFactorInfo as any).uid = 'modifiedEnrollmentId';
      }).to.throw(Error);
    });

    it('should return expected enrollmentTime', () => {
      expect(phoneMultiFactorInfo.enrollmentTime).to.equal(now.toUTCString());
    });

    it('should throw when modifying readonly uid property', () => {
      expect(() => {
        (phoneMultiFactorInfo as any).enrollmentTime = new Date().toISOString();
      }).to.throw(Error);
    });
  });

  describe('toJSON', () => {
    it('should return expected JSON object', () => {
      expect(phoneMultiFactorInfo.toJSON()).to.deep.equal({
        uid: 'enrollmentId1',
        displayName: 'displayName1',
        enrollmentTime: now.toUTCString(),
        phoneNumber: '+16505551234',
        factorId: 'phone',
      });
    });

    it('should return expected JSON object with missing fields set to null', () => {
      expect(phoneMultiFactorInfoMissingFields.toJSON()).to.deep.equal({
        uid: 'enrollmentId1',
        displayName: undefined,
        enrollmentTime: null,
        phoneNumber: '+16505551234',
        factorId: 'phone',
      });
    });
  });
});

describe('MultiFactorInfo', () => {
  const serverResponse: MultiFactorInfoResponse = {
    mfaEnrollmentId: 'enrollmentId1',
    displayName: 'displayName1',
    enrolledAt: now.toISOString(),
    phoneInfo: '+16505551234',
  };
  const phoneMultiFactorInfo = new PhoneMultiFactorInfo(serverResponse);

  describe('initMultiFactorInfo', () => {
    it('should return expected PhoneMultiFactorInfo', () => {
      expect(MultiFactorInfo.initMultiFactorInfo(serverResponse)).to.deep.equal(phoneMultiFactorInfo);
    });

    it('should return null for invalid MultiFactorInfo', () => {
      expect(MultiFactorInfo.initMultiFactorInfo(undefined as any)).to.be.null;
    });
  });
});

describe('MultiFactor', () => {
  const serverResponse = {
    localId: 'uid123',
    mfaInfo: [
      {
        mfaEnrollmentId: 'enrollmentId1',
        displayName: 'displayName1',
        enrolledAt: now.toISOString(),
        phoneInfo: '+16505551234',
      },
      {
        mfaEnrollmentId: 'enrollmentId2',
        enrolledAt: now.toISOString(),
        phoneInfo: '+16505556789',
      },
      {
        // Invalid factor.
        mfaEnrollmentId: 'enrollmentId3',
      },
      {
        // Unsupported factor.
        mfaEnrollmentId: 'enrollmentId4',
        displayName: 'Backup second factor',
        enrolledAt: now.toISOString(),
        secretKey: 'SECRET_KEY',
      },
    ],
  };
  const expectedMultiFactorInfo = [
    new PhoneMultiFactorInfo({
      mfaEnrollmentId: 'enrollmentId1',
      displayName: 'displayName1',
      enrolledAt: now.toISOString(),
      phoneInfo: '+16505551234',
    }),
    new PhoneMultiFactorInfo({
      mfaEnrollmentId: 'enrollmentId2',
      enrolledAt: now.toISOString(),
      phoneInfo: '+16505556789',
    }),
  ];

  describe('constructor', () => {
    it('should throw when a non object is provided', () => {
      expect(() =>  {
        return new MultiFactor(undefined as any);
      }).to.throw('INTERNAL ASSERT FAILED: Invalid multi-factor response');
    });

    it('should populate an empty enrolledFactors array when given an empty object', () => {
      const multiFactor = new MultiFactor({} as any);

      expect(multiFactor.enrolledFactors.length).to.equal(0);
    });

    it('should populate expected enrolledFactors', () => {
      const multiFactor = new MultiFactor(serverResponse);

      expect(multiFactor.enrolledFactors.length).to.equal(2);
      expect(multiFactor.enrolledFactors[0]).to.deep.equal(expectedMultiFactorInfo[0]);
      expect(multiFactor.enrolledFactors[1]).to.deep.equal(expectedMultiFactorInfo[1]);
    });
  });

  describe('getter', () => {
    it('should throw when modifying readonly enrolledFactors property', () => {
      const multiFactor = new MultiFactor(serverResponse);

      expect(() => {
        (multiFactor as any).enrolledFactors = [
          expectedMultiFactorInfo[0],
        ];
      }).to.throw(Error);
    });

    it('should throw when modifying readonly enrolledFactors internals', () => {
      const multiFactor = new MultiFactor(serverResponse);

      expect(() => {
        (multiFactor.enrolledFactors as any)[0] = new PhoneMultiFactorInfo({
          mfaEnrollmentId: 'enrollmentId3',
          displayName: 'displayName3',
          enrolledAt: now.toISOString(),
          phoneInfo: '+16505559999',
        });
      }).to.throw(Error);
    });
  });

  describe('toJSON', () => {
    it('should return expected JSON object when given an empty response', () => {
      const multiFactor = new MultiFactor({} as any);

      expect(multiFactor.toJSON()).to.deep.equal({
        enrolledFactors: [],
      });
    });

    it('should return expected JSON object when given a populated response', () => {
      const multiFactor = new MultiFactor(serverResponse);

      expect(multiFactor.toJSON()).to.deep.equal({
        enrolledFactors: [
          expectedMultiFactorInfo[0].toJSON(),
          expectedMultiFactorInfo[1].toJSON(),
        ],
      });
    });
  });
});

describe('UserInfo', () => {
  describe('constructor', () =>  {
    it('should throw when an empty object is provided', () => {
      expect(() =>  {
        return new UserInfo({} as any);
      }).to.throw(Error);
    });

    it('should succeed when rawId and providerId are both provided', () => {
      expect(() => {
        return new UserInfo({ providerId: 'google.com', rawId: '1234567890' });
      }).not.to.throw(Error);
    });

    it('should throw when only rawId is provided', () => {
      expect(() =>  {
        return new UserInfo({ rawId: '1234567890' } as any);
      }).to.throw(Error);
    });

    it('should throw when only providerId is provided', () => {
      expect(() =>  {
        return new UserInfo({ providerId: 'google.com' } as any);
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
  const expectedLastRefreshAt = '2016-10-12T01:31:45.000Z';
  const actualMetadata: UserMetadata = new UserMetadata({
    localId: 'uid123',
    lastLoginAt: expectedLastLoginAt.toString(),
    createdAt: expectedCreatedAt.toString(),
    lastRefreshAt: expectedLastRefreshAt,
  });
  const expectedMetadataJSON = {
    lastSignInTime: new Date(expectedLastLoginAt).toUTCString(),
    creationTime: new Date(expectedCreatedAt).toUTCString(),
  };

  describe('constructor', () =>  {
    it('should initialize as expected when a valid creationTime is provided', () => {
      expect(() => {
        return new UserMetadata({ createdAt: '1476136676000' } as any);
      }).not.to.throw(Error);
    });

    it('should set creationTime and lastSignInTime to null when not provided', () => {
      const metadata = new UserMetadata({} as any);
      expect(metadata.creationTime).to.be.null;
      expect(metadata.lastSignInTime).to.be.null;
    });

    it('should set creationTime to null when creationTime value is invalid', () => {
      const metadata = new UserMetadata({
        createdAt: 'invalid',
      } as any);
      expect(metadata.creationTime).to.be.null;
      expect(metadata.lastSignInTime).to.be.null;
    });

    it('should set lastSignInTime to null when lastLoginAt value is invalid', () => {
      const metadata = new UserMetadata({
        createdAt: '1476235905000',
        lastLoginAt: 'invalid',
      } as any);
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

    it('should return expected lastRefreshTime', () => {
      expect(actualMetadata.lastRefreshTime).to.equal(new Date(expectedLastRefreshAt).toUTCString())
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
        return new UserRecord({} as any);
      }).to.throw(Error);
    });

    it('should succeed when only localId is provided', () => {
      expect(() =>  {
        return new UserRecord({ localId: '123456789' });
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
      const resp: any = deepCopy(validUserResponse);
      delete resp.passwordHash;
      expect((new UserRecord(resp)).passwordHash).to.be.undefined;
    });

    it('should clear REDACTED passwordHash', () => {
      const user = new UserRecord({
        localId: 'uid1',
        passwordHash: Buffer.from('REDACTED').toString('base64'),
      });

      expect(user.passwordHash).to.be.undefined;
    });

    it('should return expected empty string passwordHash', () => {
      // This happens for users that were migrated from other Auth systems
      // using different hashing algorithms.
      const resp: any = deepCopy(validUserResponse);
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
      const resp: any = deepCopy(validUserResponse);
      delete resp.salt;
      expect((new UserRecord(resp)).passwordSalt).to.be.undefined;
    });

    it('should return expected empty string passwordSalt', () => {
      // This happens for users that were migrated from other Auth systems
      // using different hashing algorithms.
      const resp: any = deepCopy(validUserResponse);
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
        (userRecord as any).customClaims = { admin: false };
      }).to.throw(Error);
    });

    it('should return expected undefined customClaims', () => {
      const resp: any = deepCopy(validUserResponse);
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

    it('should return undefined tokensValidAfterTime when not available', () => {
      expect(userRecordNoValidSince.tokensValidAfterTime).to.be.undefined;
    });

    it('should return expected metadata', () => {
      const metadata = new UserMetadata({
        createdAt: '1476136676000',
        lastLoginAt: '1476235905000',
      } as any);
      expect(userRecord.metadata).to.deep.equal(metadata);
    });

    it('should throw when modifying readonly metadata property', () => {
      expect(() => {
        (userRecord as any).metadata = new UserMetadata({
          createdAt: new Date().toUTCString(),
          lastLoginAt: new Date().toUTCString(),
        } as any);
      }).to.throw(Error);
    });

    it('should throw when modifying readonly metadata internals', () => {
      expect(() => {
        (userRecord as any).metadata.lastSignInTime = new Date();
      }).to.throw(Error);
    });

    it('should return expected providerData', () => {
      const providerData: UserInfo[] = [
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

    it('should return undefined tenantId when not available', () => {
      expect(userRecord.tenantId).to.be.undefined;
    });

    it('should return expected tenantId', () => {
      const resp = deepCopy(getValidUserResponse('TENANT-ID')) as GetAccountInfoUserResponse;
      const tenantUserRecord = new UserRecord(resp);
      expect(tenantUserRecord.tenantId).to.equal('TENANT-ID');
    });

    it('should throw when modifying readonly tenantId property', () => {
      expect(() => {
        const resp = deepCopy(getValidUserResponse('TENANT-ID')) as GetAccountInfoUserResponse;
        const tenantUserRecord = new UserRecord(resp);
        (tenantUserRecord as any).tenantId = 'OTHER-TENANT-ID';
      }).to.throw(Error);
    });

    it('should return expected multiFactor', () => {
      const multiFactor = new MultiFactor({
        localId: 'uid123',
        mfaInfo: [
          {
            mfaEnrollmentId: 'enrollmentId1',
            displayName: 'displayName1',
            enrolledAt: now.toISOString(),
            phoneInfo: '+16505551234',
          },
          {
            mfaEnrollmentId: 'enrollmentId2',
            enrolledAt: now.toISOString(),
            phoneInfo: '+16505556789',
          },
        ],
      });
      expect(userRecord.multiFactor).to.deep.equal(multiFactor);
      expect(userRecord.multiFactor!.enrolledFactors.length).to.equal(2);
    });

    it('should return undefined multiFactor when not available', () => {
      const validUserResponseWithoutMultiFactor = deepCopy(validUserResponse);
      delete validUserResponseWithoutMultiFactor.mfaInfo;
      const userRecordWithoutMultiFactor = new UserRecord(validUserResponseWithoutMultiFactor);

      expect(userRecordWithoutMultiFactor.multiFactor).to.be.undefined;
    });

    it('should throw when modifying readonly multiFactor property', () => {
      expect(() => {
        (userRecord as any).multiFactor = new MultiFactor({
          localId: 'uid123',
          mfaInfo: [{
            mfaEnrollmentId: 'enrollmentId3',
            displayName: 'displayName3',
            enrolledAt: now.toISOString(),
            phoneInfo: '+16505550000',
          }],
        });
      }).to.throw(Error);
    });

    it('should throw when modifying readonly multiFactor internals', () => {
      expect(() => {
        (userRecord.multiFactor!.enrolledFactors[0] as any).displayName = 'Modified';
      }).to.throw(Error);

      expect(() => {
        (userRecord.multiFactor!.enrolledFactors as any)[0] = new PhoneMultiFactorInfo({
          mfaEnrollmentId: 'enrollmentId3',
          displayName: 'displayName3',
          enrolledAt: now.toISOString(),
          phoneInfo: '+16505550000',
        });
      }).to.throw(Error);

      expect(() => {
        (userRecord.multiFactor as any).enrolledFactors = [];
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

    it('should return undefined tokensValidAfterTime when not available', () => {
      expect((userRecordNoValidSince.toJSON() as any).tokensValidAfterTime).to.be.undefined;
    });

    it('should return expected JSON object with tenant ID when available', () => {
      const resp = deepCopy(getValidUserResponse('TENANT-ID') as GetAccountInfoUserResponse);
      const tenantUserRecord = new UserRecord(resp);
      expect(tenantUserRecord.toJSON()).to.deep.equal(getUserJSON('TENANT-ID'));
    });
  });
});

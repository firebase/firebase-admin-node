import {expect} from 'chai';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

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
    ],
    photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    validSince: '1476136676',
    lastLoginAt: '1476235905000',
    createdAt: '1476136676000',
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
      },
      {
        providerId: 'facebook.com',
        displayName: 'John Smith',
        photoURL: 'https://facebook.com/0987654321/photo.jpg',
        email: 'user@facebook.com',
        uid: '0987654321',
      },
    ],
    photoURL: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    metadata: {
      lastSignedInAt: new Date(1476235905000),
      createdAt: new Date(1476136676000),
    },
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
    const userInfo = new UserInfo(getUserInfoResponse());
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
  });

  describe('toJSON', () => {
    const userInfo = new UserInfo(getUserInfoResponse());
    it('should return expected JSON object', () => {
      expect(userInfo.toJSON()).to.deep.equal(getUserInfoJSON());
    });
  });
});

describe('UserMetadata', () => {
  const expectedLastLoginAt = 1476235905000;
  const expectedCreatedAt = 1476136676000;
  const actualMetadata: UserMetadata = new UserMetadata({
    lastLoginAt: expectedLastLoginAt.toString(),
    createdAt: expectedCreatedAt.toString(),
  });
  const expectedMetadataJSON = {
    lastSignedInAt: new Date(expectedLastLoginAt),
    createdAt: new Date(expectedCreatedAt),
  };

  describe('constructor', () =>  {
    it('should initialize as expected when a valid createdAt is provided', () => {
      expect(() => {
        return new UserMetadata({createdAt: '1476136676000'});
      }).not.to.throw(Error);
    });

    it('should set createdAt and lastSignedInAt to null when not provided', () => {
      let metadata = new UserMetadata({});
      expect(metadata.createdAt).to.be.null;
      expect(metadata.lastSignedInAt).to.be.null;
    });

    it('should set createdAt to null when createdAt value is invalid', () => {
      let metadata = new UserMetadata({
        createdAt: 'invalid',
      });
      expect(metadata.createdAt).to.be.null;
      expect(metadata.lastSignedInAt).to.be.null;
    });

    it('should set lastSignedInAt to null when lastLoginAt value is invalid', () => {
      let metadata = new UserMetadata({
        createdAt: '1476235905000',
        lastLoginAt: 'invalid',
      });
      expect(metadata.lastSignedInAt).to.be.null;
    });
  });

  describe('getters', () => {
    it('should return expected lastSignedInAt', () => {
      expect(actualMetadata.lastSignedInAt.getTime()).to.equal(expectedLastLoginAt);
    });

    it('should throw when modifying readonly lastSignedInAt property', () => {
      expect(() => {
        (actualMetadata as any).lastSignedInAt = new Date();
      }).to.throw(Error);
    });

    it('should return expected createdAt', () => {
      expect(actualMetadata.createdAt.getTime()).to.equal(expectedCreatedAt);
    });

    it('should throw when modifying readonly createdAt property', () => {
      expect(() => {
        (actualMetadata as any).createdAt = new Date();
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
    const userRecord = new UserRecord(getValidUserResponse());
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
          lastLoginAt: new Date().getTime(),
          createdAt: new Date().getTime(),
        });
      }).to.throw(Error);
    });

    it('should throw when modifying readonly metadata internals', () => {
      expect(() => {
        (userRecord as any).metadata.lastSignedInAt = new Date();
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
    it('should return expected JSON object', () => {
      expect(userRecord.toJSON()).to.deep.equal(getUserJSON());
    });
  });
});

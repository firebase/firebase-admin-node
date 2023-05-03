/*!
 * Copyright 2018 Google Inc.
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

import * as url from 'url';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import firebase from '@firebase/app-compat';
import '@firebase/auth-compat';
import { clone } from 'lodash';
import { User, FirebaseAuth } from '@firebase/auth-types';
import {
  generateRandomString, projectId, apiKey, noServiceAccountApp, cmdArgs,
} from './setup';
import * as mocks from '../resources/mocks';
import { deepExtend, deepCopy } from '../../src/utils/deep-copy';
import {
  AuthProviderConfig, CreateTenantRequest, DeleteUsersResult, PhoneMultiFactorInfo,
  TenantAwareAuth, UpdatePhoneMultiFactorInfoRequest, UpdateTenantRequest, UserImportOptions,
  UserImportRecord, UserRecord, getAuth, UpdateProjectConfigRequest, UserMetadata, MultiFactorConfig,
} from '../../lib/auth/index';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

const chalk = require('chalk'); // eslint-disable-line @typescript-eslint/no-var-requires

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

const newUserUid = generateRandomString(20);
const nonexistentUid = generateRandomString(20);
const newMultiFactorUserUid = generateRandomString(20);
const sessionCookieUids = [
  generateRandomString(20),
  generateRandomString(20),
  generateRandomString(20),
  generateRandomString(20),
];
const testPhoneNumber = '+11234567890';
const testPhoneNumber2 = '+16505550101';
const nonexistentPhoneNumber = '+18888888888';
const updatedEmail = generateRandomString(20).toLowerCase() + '@example.com';
const updatedPhone = '+16505550102';
const customClaims: { [key: string]: any } = {
  admin: true,
  groupId: '1234',
};
const uids = [newUserUid + '-1', newUserUid + '-2', newUserUid + '-3'];
const mockUserData = {
  email: newUserUid.toLowerCase() + '@example.com',
  emailVerified: false,
  phoneNumber: testPhoneNumber,
  password: 'password',
  displayName: 'Random User ' + newUserUid,
  photoURL: 'http://www.example.com/' + newUserUid + '/photo.png',
  disabled: false,
};
const actionCodeSettings = {
  url: 'http://localhost/?a=1&b=2#c=3',
  handleCodeInApp: false,
};
let deleteQueue = Promise.resolve();

interface UserImportTest {
  name: string;
  importOptions: UserImportOptions;
  rawPassword: string;
  rawSalt?: string;
  computePasswordHash(userImportTest: UserImportTest): Buffer;
}

/** @return Random generated SAML provider ID. */
function randomSamlProviderId(): string {
  return 'saml.' + generateRandomString(10, false).toLowerCase();
}

/** @return Random generated OIDC provider ID. */
function randomOidcProviderId(): string {
  return 'oidc.' + generateRandomString(10, false).toLowerCase();
}

function clientAuth(): FirebaseAuth {
  expect(firebase.auth).to.be.ok;
  return firebase.auth!();
}

describe('admin.auth', () => {

  let uidFromCreateUserWithoutUid: string;
  const processWarningSpy = sinon.spy();

  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
    if (authEmulatorHost) {
      (clientAuth() as any).useEmulator('http://' + authEmulatorHost);
    }
    process.on('warning', processWarningSpy);
    return cleanup();
  });

  afterEach(() => {
    expect(
      processWarningSpy.neverCalledWith(
        sinon.match(
          (warning: Error) => warning.name === 'MaxListenersExceededWarning'
        )
      ),
      'process.on("warning") was called with an unexpected MaxListenersExceededWarning.'
    ).to.be.true;
    processWarningSpy.resetHistory();
  });

  after(() => {
    process.removeListener('warning', processWarningSpy);
    return cleanup();
  });

  it('createUser() creates a new user when called without a UID', () => {
    const newUserData = clone(mockUserData);
    newUserData.email = generateRandomString(20).toLowerCase() + '@example.com';
    newUserData.phoneNumber = testPhoneNumber2;
    return getAuth().createUser(newUserData)
      .then((userRecord) => {
        uidFromCreateUserWithoutUid = userRecord.uid;
        expect(typeof userRecord.uid).to.equal('string');
        // Confirm expected email.
        expect(userRecord.email).to.equal(newUserData.email);
        // Confirm expected phone number.
        expect(userRecord.phoneNumber).to.equal(newUserData.phoneNumber);
      });
  });

  it('createUser() creates a new user with the specified UID', () => {
    const newUserData: any = clone(mockUserData);
    newUserData.uid = newUserUid;
    return getAuth().createUser(newUserData)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
        // Confirm expected email.
        expect(userRecord.email).to.equal(newUserData.email);
        // Confirm expected phone number.
        expect(userRecord.phoneNumber).to.equal(newUserData.phoneNumber);
      });
  });

  it('createUser() creates a new user with enrolled second factors', function () {
    if (authEmulatorHost) {
      return this.skip(); // Not yet supported in Auth Emulator.
    }
    const enrolledFactors = [
      {
        phoneNumber: '+16505550001',
        displayName: 'Work phone number',
        factorId: 'phone',
      },
      {
        phoneNumber: '+16505550002',
        displayName: 'Personal phone number',
        factorId: 'phone',
      },
    ];
    const newUserData: any = {
      uid: newMultiFactorUserUid,
      email: generateRandomString(20).toLowerCase() + '@example.com',
      emailVerified: true,
      password: 'password',
      multiFactor: {
        enrolledFactors,
      },
    };
    return getAuth().createUser(newUserData)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newMultiFactorUserUid);
        // Confirm expected email.
        expect(userRecord.email).to.equal(newUserData.email);
        // Confirm second factors added to user.
        expect(userRecord.multiFactor!.enrolledFactors.length).to.equal(2);
        // Confirm first enrolled second factor.
        const firstMultiFactor = userRecord.multiFactor!.enrolledFactors[0];
        expect(firstMultiFactor.uid).not.to.be.undefined;
        expect(firstMultiFactor.enrollmentTime).not.to.be.undefined;
        expect((firstMultiFactor as PhoneMultiFactorInfo).phoneNumber).to.equal(
          enrolledFactors[0].phoneNumber);
        expect(firstMultiFactor.displayName).to.equal(enrolledFactors[0].displayName);
        expect(firstMultiFactor.factorId).to.equal(enrolledFactors[0].factorId);
        // Confirm second enrolled second factor.
        const secondMultiFactor = userRecord.multiFactor!.enrolledFactors[1];
        expect(secondMultiFactor.uid).not.to.be.undefined;
        expect(secondMultiFactor.enrollmentTime).not.to.be.undefined;
        expect((secondMultiFactor as PhoneMultiFactorInfo).phoneNumber).to.equal(
          enrolledFactors[1].phoneNumber);
        expect(secondMultiFactor.displayName).to.equal(enrolledFactors[1].displayName);
        expect(secondMultiFactor.factorId).to.equal(enrolledFactors[1].factorId);
      });
  });

  it('createUser() fails when the UID is already in use', () => {
    const newUserData: any = clone(mockUserData);
    newUserData.uid = newUserUid;
    return getAuth().createUser(newUserData)
      .should.eventually.be.rejected.and.have.property('code', 'auth/uid-already-exists');
  });

  it('getUser() returns a user record with the matching UID', () => {
    return getAuth().getUser(newUserUid)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByEmail() returns a user record with the matching email', () => {
    return getAuth().getUserByEmail(mockUserData.email)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByPhoneNumber() returns a user record with the matching phone number', () => {
    return getAuth().getUserByPhoneNumber(mockUserData.phoneNumber)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() returns a user record with the matching provider id', async () => {
    // TODO(rsgowman): Once we can link a provider id with a user, just do that
    // here instead of creating a new user.
    const randomUid = 'import_' + generateRandomString(20).toLowerCase();
    const importUser: UserImportRecord = {
      uid: randomUid,
      email: 'user@example.com',
      phoneNumber: '+15555550000',
      emailVerified: true,
      disabled: false,
      metadata: {
        lastSignInTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
        creationTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
      },
      providerData: [{
        displayName: 'User Name',
        email: 'user@example.com',
        phoneNumber: '+15555550000',
        photoURL: 'http://example.com/user',
        providerId: 'google.com',
        uid: 'google_uid',
      }],
    };

    await getAuth().importUsers([importUser]);

    try {
      await getAuth().getUserByProviderUid('google.com', 'google_uid')
        .then((userRecord) => {
          expect(userRecord.uid).to.equal(importUser.uid);
        });
    } finally {
      await safeDelete(importUser.uid);
    }
  });

  it('getUserByProviderUid() redirects to getUserByEmail if given an email', () => {
    return getAuth().getUserByProviderUid('email', mockUserData.email)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() redirects to getUserByPhoneNumber if given a phone number', () => {
    return getAuth().getUserByProviderUid('phone', mockUserData.phoneNumber)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() returns a user record with the matching provider id', async () => {
    // TODO(rsgowman): Once we can link a provider id with a user, just do that
    // here instead of creating a new user.
    const randomUid = 'import_' + generateRandomString(20).toLowerCase();
    const importUser: UserImportRecord = {
      uid: randomUid,
      email: 'user@example.com',
      phoneNumber: '+15555550000',
      emailVerified: true,
      disabled: false,
      metadata: {
        lastSignInTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
        creationTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
      },
      providerData: [{
        displayName: 'User Name',
        email: 'user@example.com',
        phoneNumber: '+15555550000',
        photoURL: 'http://example.com/user',
        providerId: 'google.com',
        uid: 'google_uid',
      }],
    };

    await getAuth().importUsers([importUser]);

    try {
      await getAuth().getUserByProviderUid('google.com', 'google_uid')
        .then((userRecord) => {
          expect(userRecord.uid).to.equal(importUser.uid);
        });
    } finally {
      await safeDelete(importUser.uid);
    }
  });

  it('getUserByProviderUid() redirects to getUserByEmail if given an email', () => {
    return getAuth().getUserByProviderUid('email', mockUserData.email)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() redirects to getUserByPhoneNumber if given a phone number', () => {
    return getAuth().getUserByProviderUid('phone', mockUserData.phoneNumber)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() returns a user record with the matching provider id', async () => {
    // TODO(rsgowman): Once we can link a provider id with a user, just do that
    // here instead of creating a new user.
    const randomUid = 'import_' + generateRandomString(20).toLowerCase();
    const importUser: UserImportRecord = {
      uid: randomUid,
      email: 'user@example.com',
      phoneNumber: '+15555550000',
      emailVerified: true,
      disabled: false,
      metadata: {
        lastSignInTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
        creationTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
      },
      providerData: [{
        displayName: 'User Name',
        email: 'user@example.com',
        phoneNumber: '+15555550000',
        photoURL: 'http://example.com/user',
        providerId: 'google.com',
        uid: 'google_uid',
      }],
    };

    await getAuth().importUsers([importUser]);

    try {
      await getAuth().getUserByProviderUid('google.com', 'google_uid')
        .then((userRecord) => {
          expect(userRecord.uid).to.equal(importUser.uid);
        });
    } finally {
      await safeDelete(importUser.uid);
    }
  });

  it('getUserByProviderUid() redirects to getUserByEmail if given an email', () => {
    return getAuth().getUserByProviderUid('email', mockUserData.email)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() redirects to getUserByPhoneNumber if given a phone number', () => {
    return getAuth().getUserByProviderUid('phone', mockUserData.phoneNumber)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() returns a user record with the matching provider id', async () => {
    // TODO(rsgowman): Once we can link a provider id with a user, just do that
    // here instead of creating a new user.
    const randomUid = 'import_' + generateRandomString(20).toLowerCase();
    const importUser: UserImportRecord = {
      uid: randomUid,
      email: 'user@example.com',
      phoneNumber: '+15555550000',
      emailVerified: true,
      disabled: false,
      metadata: {
        lastSignInTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
        creationTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
      },
      providerData: [{
        displayName: 'User Name',
        email: 'user@example.com',
        phoneNumber: '+15555550000',
        photoURL: 'http://example.com/user',
        providerId: 'google.com',
        uid: 'google_uid',
      }],
    };

    await getAuth().importUsers([importUser]);

    try {
      await getAuth().getUserByProviderUid('google.com', 'google_uid')
        .then((userRecord) => {
          expect(userRecord.uid).to.equal(importUser.uid);
        });
    } finally {
      await safeDelete(importUser.uid);
    }
  });

  it('getUserByProviderUid() redirects to getUserByEmail if given an email', () => {
    return getAuth().getUserByProviderUid('email', mockUserData.email)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByProviderUid() redirects to getUserByPhoneNumber if given a phone number', () => {
    return getAuth().getUserByProviderUid('phone', mockUserData.phoneNumber)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  describe('getUsers()', () => {
    /**
     * Filters a list of object to another list of objects that only contains
     * the uid, email, and phoneNumber fields. Works with at least UserRecord
     * and UserImportRecord instances.
     */
    function mapUserRecordsToUidEmailPhones(
      values: Array<{ uid: string; email?: string; phoneNumber?: string }>
    ): Array<{ uid: string; email?: string; phoneNumber?: string }> {
      return values.map((ur) => ({ uid: ur.uid, email: ur.email, phoneNumber: ur.phoneNumber }));
    }

    const testUser1 = { uid: 'uid1', email: 'user1@example.com', phoneNumber: '+15555550001' };
    const testUser2 = { uid: 'uid2', email: 'user2@example.com', phoneNumber: '+15555550002' };
    const testUser3 = { uid: 'uid3', email: 'user3@example.com', phoneNumber: '+15555550003' };
    const usersToCreate = [testUser1, testUser2, testUser3];

    // Also create a user with a provider config. (You can't create a user with
    // a provider config. But you *can* import one.)
    const importUser1: UserImportRecord = {
      uid: 'uid4',
      email: 'user4@example.com',
      phoneNumber: '+15555550004',
      emailVerified: true,
      disabled: false,
      metadata: {
        lastSignInTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
        creationTime: 'Thu, 01 Jan 1970 00:00:00 UTC',
      },
      providerData: [{
        displayName: 'User Four',
        email: 'user4@example.com',
        phoneNumber: '+15555550004',
        photoURL: 'http://example.com/user4',
        providerId: 'google.com',
        uid: 'google_uid4',
      }],
    };

    const testUser4 = mapUserRecordsToUidEmailPhones([importUser1])[0];

    before(async () => {
      // Delete all the users that we're about to create (in case they were
      // left over from a prior run).
      const uidsToDelete = usersToCreate.map((user) => user.uid);
      uidsToDelete.push(importUser1.uid);
      await deleteUsersWithDelay(uidsToDelete);

      // Create/import users required by these tests
      await Promise.all(usersToCreate.map((user) => getAuth().createUser(user)));
      await getAuth().importUsers([importUser1]);
    });

    after(async () => {
      const uidsToDelete = usersToCreate.map((user) => user.uid);
      uidsToDelete.push(importUser1.uid);
      await deleteUsersWithDelay(uidsToDelete);
    });

    it('returns users by various identifier types in a single call', async () => {
      const users = await getAuth().getUsers([
        { uid: 'uid1' },
        { email: 'user2@example.com' },
        { phoneNumber: '+15555550003' },
        { providerId: 'google.com', providerUid: 'google_uid4' },
      ])
        .then((getUsersResult) => getUsersResult.users)
        .then(mapUserRecordsToUidEmailPhones);

      expect(users).to.have.deep.members([testUser1, testUser2, testUser3, testUser4]);
    });

    it('returns found users and ignores non-existing users', async () => {
      const users = await getAuth().getUsers([
        { uid: 'uid1' },
        { uid: 'uid_that_doesnt_exist' },
        { uid: 'uid3' },
      ]);
      expect(users.notFound).to.have.deep.members([{ uid: 'uid_that_doesnt_exist' }]);

      const foundUsers = mapUserRecordsToUidEmailPhones(users.users);
      expect(foundUsers).to.have.deep.members([testUser1, testUser3]);
    });

    it('returns nothing when queried for only non-existing users', async () => {
      const notFoundIds = [{ uid: 'non-existing user' }];
      const users = await getAuth().getUsers(notFoundIds);

      expect(users.users).to.be.empty;
      expect(users.notFound).to.deep.equal(notFoundIds);
    });

    it('de-dups duplicate users', async () => {
      const users = await getAuth().getUsers([
        { uid: 'uid1' },
        { uid: 'uid1' },
      ])
        .then((getUsersResult) => getUsersResult.users)
        .then(mapUserRecordsToUidEmailPhones);

      expect(users).to.deep.equal([testUser1]);
    });

    it('returns users with a lastRefreshTime', async () => {
      const isUTCString = (s: string): boolean => {
        return new Date(s).toUTCString() === s;
      };

      const newUserRecord = await getAuth().createUser({
        uid: 'lastRefreshTimeUser',
        email: 'lastRefreshTimeUser@example.com',
        password: 'p4ssword',
      });

      try {
        // New users should not have a lastRefreshTime set.
        expect(newUserRecord.metadata.lastRefreshTime).to.be.null;

        // Login to set the lastRefreshTime.
        await firebase.auth!().signInWithEmailAndPassword('lastRefreshTimeUser@example.com', 'p4ssword')
          .then(async () => {
            // Attempt to retrieve the user 3 times (with a small delay between
            // each attempt). Occassionally, this call retrieves the user data
            // without the lastLoginTime/lastRefreshTime set; possibly because
            // it's hitting a different server than the login request uses.
            let userRecord: UserRecord | null = null;

            for (let i = 0; i < 3; i++) {
              userRecord = await getAuth().getUser('lastRefreshTimeUser');
              if (userRecord!['metadata']['lastRefreshTime']) {
                break;
              }

              await new Promise((resolve) => {
                setTimeout(resolve, 1000 * Math.pow(2, i));
              });
            }

            const metadata = userRecord!['metadata'];
            expect(metadata['lastRefreshTime']).to.exist;
            expect(isUTCString(metadata['lastRefreshTime']!)).to.be.true;
            const creationTime = new Date(metadata['creationTime']).getTime();
            const lastRefreshTime = new Date(metadata['lastRefreshTime']!).getTime();
            expect(creationTime).lte(lastRefreshTime);
            expect(lastRefreshTime).lte(creationTime + 3600 * 1000);
          });
      } finally {
        getAuth().deleteUser('lastRefreshTimeUser');
      }
    });
  });

  it('listUsers() returns up to the specified number of users', () => {
    const promises: Array<Promise<UserRecord>> = [];
    uids.forEach((uid) => {
      const tempUserData = {
        uid,
        password: 'password',
      };
      promises.push(getAuth().createUser(tempUserData));
    });
    return Promise.all(promises)
      .then(() => {
        // Return 2 users with the provided page token.
        // This test will fail if other users are created in between.
        return getAuth().listUsers(2, uids[0]);
      })
      .then((listUsersResult) => {
        // Confirm expected number of users.
        expect(listUsersResult.users.length).to.equal(2);
        // Confirm next page token present.
        expect(typeof listUsersResult.pageToken).to.equal('string');
        // Confirm each user's uid and the hashed passwords.
        expect(listUsersResult.users[0].uid).to.equal(uids[1]);

        expect(
          listUsersResult.users[0].passwordHash,
          'Missing passwordHash field. A common cause would be forgetting to '
          + 'add the "Firebase Authentication Admin" permission. See '
          + 'instructions in CONTRIBUTING.md',
        ).to.be.ok;
        expect(listUsersResult.users[0].passwordHash!.length).greaterThan(0);

        expect(
          listUsersResult.users[0].passwordSalt,
          'Missing passwordSalt field. A common cause would be forgetting to '
          + 'add the "Firebase Authentication Admin" permission. See '
          + 'instructions in CONTRIBUTING.md',
        ).to.be.ok;
        expect(listUsersResult.users[0].passwordSalt!.length).greaterThan(0);

        expect(listUsersResult.users[1].uid).to.equal(uids[2]);
        expect(listUsersResult.users[1].passwordHash!.length).greaterThan(0);
        expect(listUsersResult.users[1].passwordSalt!.length).greaterThan(0);
      });
  });

  it('revokeRefreshTokens() invalidates existing sessions and ID tokens', async () => {
    let currentIdToken: string;
    let currentUser: User;
    // Sign in with an email and password account.
    return clientAuth().signInWithEmailAndPassword(mockUserData.email, mockUserData.password)
      .then(({ user }) => {
        expect(user).to.exist;
        currentUser = user!;
        // Get user's ID token.
        return user!.getIdToken();
      })
      .then((idToken) => {
        currentIdToken = idToken;
        // Verify that user's ID token while checking for revocation.
        return getAuth().verifyIdToken(currentIdToken, true);
      })
      .then((decodedIdToken) => {
        // Verification should succeed. Revoke that user's session.
        return new Promise((resolve) => setTimeout(() => resolve(
          getAuth().revokeRefreshTokens(decodedIdToken.sub),
        ), 1000));
      })
      .then(() => {
        const verifyingIdToken = getAuth().verifyIdToken(currentIdToken)
        if (authEmulatorHost) {
          // Check revocation is forced in emulator-mode and this should throw.
          return verifyingIdToken.should.eventually.be.rejected;
        } else {
          // verifyIdToken without checking revocation should still succeed.
          return verifyingIdToken.should.eventually.be.fulfilled;
        }
      })
      .then(() => {
        // verifyIdToken while checking for revocation should fail.
        return getAuth().verifyIdToken(currentIdToken, true)
          .should.eventually.be.rejected.and.have.property('code', 'auth/id-token-revoked');
      })
      .then(() => {
        // Confirm token revoked on client.
        return currentUser.reload()
          .should.eventually.be.rejected.and.have.property('code', 'auth/user-token-expired');
      })
      .then(() => {
        // New sign-in should succeed.
        return clientAuth().signInWithEmailAndPassword(
          mockUserData.email, mockUserData.password);
      })
      .then(({ user }) => {
        // Get new session's ID token.
        expect(user).to.exist;
        return user!.getIdToken();
      })
      .then((idToken) => {
        // ID token for new session should be valid even with revocation check.
        return getAuth().verifyIdToken(idToken, true)
          .should.eventually.be.fulfilled;
      });
  });

  it('setCustomUserClaims() sets claims that are accessible via user\'s ID token', () => {
    // Set custom claims on the user.
    return getAuth().setCustomUserClaims(newUserUid, customClaims)
      .then(() => {
        return getAuth().getUser(newUserUid);
      })
      .then((userRecord) => {
        // Confirm custom claims set on the UserRecord.
        expect(userRecord.customClaims).to.deep.equal(customClaims);
        expect(userRecord.email).to.exist;
        return clientAuth().signInWithEmailAndPassword(
          userRecord.email!, mockUserData.password);
      })
      .then(({ user }) => {
        // Get the user's ID token.
        expect(user).to.exist;
        return user!.getIdToken();
      })
      .then((idToken) => {
        // Verify ID token contents.
        return getAuth().verifyIdToken(idToken);
      })
      .then((decodedIdToken: { [key: string]: any }) => {
        // Confirm expected claims set on the user's ID token.
        for (const key in customClaims) {
          if (Object.prototype.hasOwnProperty.call(customClaims, key)) {
            expect(decodedIdToken[key]).to.equal(customClaims[key]);
          }
        }
        // Test clearing of custom claims.
        return getAuth().setCustomUserClaims(newUserUid, null);
      })
      .then(() => {
        return getAuth().getUser(newUserUid);
      })
      .then((userRecord) => {
        // Custom claims should be cleared.
        expect(userRecord.customClaims).to.deep.equal({});
        // Force token refresh. All claims should be cleared.
        expect(clientAuth().currentUser).to.exist;
        return clientAuth().currentUser!.getIdToken(true);
      })
      .then((idToken) => {
        // Verify ID token contents.
        return getAuth().verifyIdToken(idToken);
      })
      .then((decodedIdToken: { [key: string]: any }) => {
        // Confirm all custom claims are cleared.
        for (const key in customClaims) {
          if (Object.prototype.hasOwnProperty.call(customClaims, key)) {
            expect(decodedIdToken[key]).to.be.undefined;
          }
        }
      });
  });

  describe('updateUser()', () => {
    /**
     * Creates a new user for testing purposes. The user's uid will be
     * '$name_$tenRandomChars' and email will be
     * '$name_$tenRandomChars@example.com'.
     */
    // TODO(rsgowman): This function could usefully be employed throughout this file.
    function createTestUser(name: string): Promise<UserRecord> {
      const tenRandomChars = generateRandomString(10);
      return getAuth().createUser({
        uid: name + '_' + tenRandomChars,
        displayName: name,
        email: name + '_' + tenRandomChars + '@example.com',
      });
    }

    let updateUser: UserRecord;
    before(async () => {
      updateUser = await createTestUser('UpdateUser');
    });

    after(() => {
      return safeDelete(updateUser.uid);
    });

    it('updates the user record with the given parameters', () => {
      const updatedDisplayName = 'Updated User ' + updateUser.uid;
      return getAuth().updateUser(updateUser.uid, {
        email: updatedEmail,
        phoneNumber: updatedPhone,
        emailVerified: true,
        displayName: updatedDisplayName,
      })
        .then((userRecord) => {
          expect(userRecord.emailVerified).to.be.true;
          expect(userRecord.displayName).to.equal(updatedDisplayName);
          // Confirm expected email.
          expect(userRecord.email).to.equal(updatedEmail);
          // Confirm expected phone number.
          expect(userRecord.phoneNumber).to.equal(updatedPhone);
        });
    });

    it('creates, updates, and removes second factors', function () {
      if (authEmulatorHost) {
        return this.skip(); // Not yet supported in Auth Emulator.
      }

      const now = new Date(1476235905000).toUTCString();
      // Update user with enrolled second factors.
      const enrolledFactors = [
        {
          uid: 'mfaUid1',
          phoneNumber: '+16505550001',
          displayName: 'Work phone number',
          factorId: 'phone',
          enrollmentTime: now,
        },
        {
          uid: 'mfaUid2',
          phoneNumber: '+16505550002',
          displayName: 'Personal phone number',
          factorId: 'phone',
          enrollmentTime: now,
        },
      ];
      return getAuth().updateUser(updateUser.uid, {
        multiFactor: {
          enrolledFactors,
        },
      })
        .then((userRecord) => {
          // Confirm second factors added to user.
          const actualUserRecord: { [key: string]: any } = userRecord.toJSON();
          expect(actualUserRecord.multiFactor.enrolledFactors.length).to.equal(2);
          expect(actualUserRecord.multiFactor.enrolledFactors).to.deep.equal(enrolledFactors);
          // Update list of second factors.
          return getAuth().updateUser(updateUser.uid, {
            multiFactor: {
              enrolledFactors: [enrolledFactors[0]],
            },
          });
        })
        .then((userRecord) => {
          expect(userRecord.multiFactor!.enrolledFactors.length).to.equal(1);
          const actualUserRecord: { [key: string]: any } = userRecord.toJSON();
          expect(actualUserRecord.multiFactor.enrolledFactors[0]).to.deep.equal(enrolledFactors[0]);
          // Remove all second factors.
          return getAuth().updateUser(updateUser.uid, {
            multiFactor: {
              enrolledFactors: null,
            },
          });
        })
        .then((userRecord) => {
          // Confirm all second factors removed.
          expect(userRecord.multiFactor).to.be.undefined;
        });
    });

    it('can link/unlink with a federated provider', async function () {
      if (authEmulatorHost) {
        return this.skip(); // Not yet supported in Auth Emulator.
      }
      const googleFederatedUid = 'google_uid_' + generateRandomString(10);
      let userRecord = await getAuth().updateUser(updateUser.uid, {
        providerToLink: {
          providerId: 'google.com',
          uid: googleFederatedUid,
        },
      });

      let providerUids = userRecord.providerData.map((userInfo) => userInfo.uid);
      let providerIds = userRecord.providerData.map((userInfo) => userInfo.providerId);
      expect(providerUids).to.deep.include(googleFederatedUid);
      expect(providerIds).to.deep.include('google.com');

      userRecord = await getAuth().updateUser(updateUser.uid, {
        providersToUnlink: ['google.com'],
      });

      providerUids = userRecord.providerData.map((userInfo) => userInfo.uid);
      providerIds = userRecord.providerData.map((userInfo) => userInfo.providerId);
      expect(providerUids).to.not.deep.include(googleFederatedUid);
      expect(providerIds).to.not.deep.include('google.com');
    });

    it('can unlink multiple providers at once, incl a non-federated provider', async function () {
      if (authEmulatorHost) {
        return this.skip(); // Not yet supported in Auth Emulator.
      }
      await deletePhoneNumberUser('+15555550001');

      const googleFederatedUid = 'google_uid_' + generateRandomString(10);
      const facebookFederatedUid = 'facebook_uid_' + generateRandomString(10);

      let userRecord = await getAuth().updateUser(updateUser.uid, {
        phoneNumber: '+15555550001',
        providerToLink: {
          providerId: 'google.com',
          uid: googleFederatedUid,
        },
      });
      userRecord = await getAuth().updateUser(updateUser.uid, {
        providerToLink: {
          providerId: 'facebook.com',
          uid: facebookFederatedUid,
        },
      });

      let providerUids = userRecord.providerData.map((userInfo) => userInfo.uid);
      let providerIds = userRecord.providerData.map((userInfo) => userInfo.providerId);
      expect(providerUids).to.deep.include.members([googleFederatedUid, facebookFederatedUid, '+15555550001']);
      expect(providerIds).to.deep.include.members(['google.com', 'facebook.com', 'phone']);

      userRecord = await getAuth().updateUser(updateUser.uid, {
        providersToUnlink: ['google.com', 'facebook.com', 'phone'],
      });

      providerUids = userRecord.providerData.map((userInfo) => userInfo.uid);
      providerIds = userRecord.providerData.map((userInfo) => userInfo.providerId);
      expect(providerUids).to.not.deep.include.members([googleFederatedUid, facebookFederatedUid, '+15555550001']);
      expect(providerIds).to.not.deep.include.members(['google.com', 'facebook.com', 'phone']);
    });

    it('noops successfully when given an empty providersToUnlink list', async () => {
      const userRecord = await createTestUser('NoopWithEmptyProvidersToDeleteUser');
      try {
        const updatedUserRecord = await getAuth().updateUser(userRecord.uid, {
          providersToUnlink: [],
        });

        expect(updatedUserRecord).to.deep.equal(userRecord);
      } finally {
        safeDelete(userRecord.uid);
      }
    });

    it('A user with user record disabled is unable to sign in', async () => {
      const password = 'password';
      const email = 'updatedEmail@example.com';
      return getAuth().updateUser(updateUser.uid, { disabled: true, password, email })
        .then(() => {
          return clientAuth().signInWithEmailAndPassword(email, password);
        })
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.have.property('code', 'auth/user-disabled');
        });
    });
  });

  it('getUser() fails when called with a non-existing UID', () => {
    return getAuth().getUser(nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByEmail() fails when called with a non-existing email', () => {
    return getAuth().getUserByEmail(nonexistentUid + '@example.com')
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByPhoneNumber() fails when called with a non-existing phone number', () => {
    return getAuth().getUserByPhoneNumber(nonexistentPhoneNumber)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByProviderUid() fails when called with a non-existing provider id', () => {
    return getAuth().getUserByProviderUid('google.com', nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByProviderUid() fails when called with a non-existing provider id', () => {
    return getAuth().getUserByProviderUid('google.com', nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByProviderUid() fails when called with a non-existing provider id', () => {
    return getAuth().getUserByProviderUid('google.com', nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByProviderUid() fails when called with a non-existing provider id', () => {
    return getAuth().getUserByProviderUid('google.com', nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByProviderUid() fails when called with a non-existing provider id', () => {
    return getAuth().getUserByProviderUid('google.com', nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('updateUser() fails when called with a non-existing UID', () => {
    return getAuth().updateUser(nonexistentUid, {
      emailVerified: true,
    }).should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('deleteUser() fails when called with a non-existing UID', () => {
    return getAuth().deleteUser(nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('createCustomToken() mints a JWT that can be used to sign in', () => {
    return getAuth().createCustomToken(newUserUid, {
      isAdmin: true,
    })
      .then((customToken) => {
        return clientAuth().signInWithCustomToken(customToken);
      })
      .then(({ user }) => {
        expect(user).to.exist;
        return user!.getIdToken();
      })
      .then((idToken) => {
        return getAuth().verifyIdToken(idToken);
      })
      .then((token) => {
        expect(token.uid).to.equal(newUserUid);
        expect(token.isAdmin).to.be.true;
      });
  });

  it('createCustomToken() can mint JWTs without a service account', () => {
    return getAuth(noServiceAccountApp).createCustomToken(newUserUid, {
      isAdmin: true,
    })
      .then((customToken) => {
        return clientAuth().signInWithCustomToken(customToken);
      })
      .then(({ user }) => {
        expect(user).to.exist;
        return user!.getIdToken();
      })
      .then((idToken) => {
        return getAuth(noServiceAccountApp).verifyIdToken(idToken);
      })
      .then((token) => {
        expect(token.uid).to.equal(newUserUid);
        expect(token.isAdmin).to.be.true;
      });
  });

  it('verifyIdToken() fails when called with an invalid token', () => {
    return getAuth().verifyIdToken('invalid-token')
      .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
  });

  if (authEmulatorHost) {
    describe('Auth emulator support', () => {
      const uid = 'authEmulatorUser';
      before(() => {
        return getAuth().createUser({
          uid,
          email: 'lastRefreshTimeUser@example.com',
          password: 'p4ssword',
        });
      });
      after(() => {
        return getAuth().deleteUser(uid);
      });

      it('verifyIdToken() succeeds when called with an unsigned token', () => {
        const unsignedToken = mocks.generateIdToken({
          algorithm: 'none',
          audience: projectId,
          issuer: 'https://securetoken.google.com/' + projectId,
          subject: uid,
        }, undefined, 'secret');
        return getAuth().verifyIdToken(unsignedToken);
      });

      it('verifyIdToken() fails when called with a token with wrong project', () => {
        const unsignedToken = mocks.generateIdToken(
          { algorithm: 'none', audience: 'nosuch' },
          undefined, 'secret');
        return getAuth().verifyIdToken(unsignedToken)
          .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
      });

      it('verifyIdToken() fails when called with a token that does not belong to a user', () => {
        const unsignedToken = mocks.generateIdToken({
          algorithm: 'none',
          audience: projectId,
          issuer: 'https://securetoken.google.com/' + projectId,
          subject: 'nosuch',
        }, undefined, 'secret');
        return getAuth().verifyIdToken(unsignedToken)
          .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
      });
    });
  }

  describe('Link operations', () => {
    const uid = generateRandomString(20).toLowerCase();
    const email = uid + '@example.com';
    const newEmail = uid + 'new@example.com';
    const newPassword = 'newPassword';
    const userData = {
      uid,
      email,
      emailVerified: false,
      password: 'password',
    };

    // Create the test user before running this suite of tests.
    before(() => {
      return getAuth().createUser(userData);
    });

    // Sign out after each test.
    afterEach(() => {
      return clientAuth().signOut();
    });

    // Delete test user at the end of test suite.
    after(() => {
      return safeDelete(uid);
    });

    it('generatePasswordResetLink() should return a password reset link', () => {
      // Ensure old password set on created user.
      return getAuth().updateUser(uid, { password: 'password' })
        .then(() => {
          return getAuth().generatePasswordResetLink(email, actionCodeSettings);
        })
        .then((link) => {
          const code = getActionCode(link);
          expect(getContinueUrl(link)).equal(actionCodeSettings.url);
          return clientAuth().confirmPasswordReset(code, newPassword);
        })
        .then(() => {
          return clientAuth().signInWithEmailAndPassword(email, newPassword);
        })
        .then((result) => {
          expect(result.user).to.exist;
          expect(result.user!.email).to.equal(email);
          // Password reset also verifies the user's email.
          expect(result.user!.emailVerified).to.be.true;
        });
    });

    it('generateEmailVerificationLink() should return a verification link', () => {
      // Ensure the user's email is unverified.
      return getAuth().updateUser(uid, { password: 'password', emailVerified: false })
        .then((userRecord) => {
          expect(userRecord.emailVerified).to.be.false;
          return getAuth().generateEmailVerificationLink(email, actionCodeSettings);
        })
        .then((link) => {
          const code = getActionCode(link);
          expect(getContinueUrl(link)).equal(actionCodeSettings.url);
          return clientAuth().applyActionCode(code);
        })
        .then(() => {
          return clientAuth().signInWithEmailAndPassword(email, userData.password);
        })
        .then((result) => {
          expect(result.user).to.exist;
          expect(result.user!.email).to.equal(email);
          expect(result.user!.emailVerified).to.be.true;
        });
    });

    it('generateSignInWithEmailLink() should return a sign-in link', () => {
      return getAuth().generateSignInWithEmailLink(email, actionCodeSettings)
        .then((link) => {
          expect(getContinueUrl(link)).equal(actionCodeSettings.url);
          return clientAuth().signInWithEmailLink(email, link);
        })
        .then((result) => {
          expect(result.user).to.exist;
          expect(result.user!.email).to.equal(email);
          expect(result.user!.emailVerified).to.be.true;
        });
    });

    it('generateVerifyAndChangeEmailLink() should return a verification link', function () {
      if (authEmulatorHost) {
        return this.skip(); // Not yet supported in Auth Emulator.
      }
      // Ensure the user's email is verified.
      return getAuth().updateUser(uid, { password: 'password', emailVerified: true })
        .then((userRecord) => {
          expect(userRecord.emailVerified).to.be.true;
          return getAuth().generateVerifyAndChangeEmailLink(email, newEmail, actionCodeSettings);
        })
        .then((link) => {
          const code = getActionCode(link);
          expect(getContinueUrl(link)).equal(actionCodeSettings.url);
          return clientAuth().applyActionCode(code);
        })
        .then(() => {
          return clientAuth().signInWithEmailAndPassword(newEmail, 'password');
        })
        .then((result) => {
          expect(result.user).to.exist;
          expect(result.user!.email).to.equal(newEmail);
          expect(result.user!.emailVerified).to.be.true;
        });
    });
  });

  describe('Project config management operations', () => {
    before(function () {
      if (authEmulatorHost) {
        this.skip(); // getConfig is not supported in Auth Emulator
      }
    });
    const mfaConfig: MultiFactorConfig = {
      state: 'ENABLED',
      factorIds: ['phone'],
      providerConfigs: [
        {
          state: 'ENABLED',
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    };
    const projectConfigOption1: UpdateProjectConfigRequest = {
      smsRegionConfig: {
        allowByDefault: {
          disallowedRegions: ['AC', 'AD'],
        }
      },
      multiFactorConfig: mfaConfig,
      recaptchaConfig: {
        emailPasswordEnforcementState:  'AUDIT',
        managedRules: [
          {
            endScore: 0.1,
            action: 'BLOCK',
          },
        ],
        useAccountDefender: true,
      },
    };
    const projectConfigOption2: UpdateProjectConfigRequest = {
      smsRegionConfig: {
        allowlistOnly: {
          allowedRegions: ['AC', 'AD'],
        }
      },
      recaptchaConfig: {
        emailPasswordEnforcementState:  'OFF',
        useAccountDefender: false,
      },
    };
    const projectConfigOptionSmsEnabledTotpDisabled: UpdateProjectConfigRequest = {
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['phone'],
        providerConfigs: [
          {
            state: 'DISABLED',
            totpProviderConfig: {},
          },
        ],
      },
    };
    const expectedProjectConfig1: any = {
      smsRegionConfig: {
        allowByDefault: {
          disallowedRegions: ['AC', 'AD'],
        }
      },
      multiFactorConfig: mfaConfig,
      recaptchaConfig: {
        emailPasswordEnforcementState:  'AUDIT',
        managedRules: [
          {
            endScore: 0.1,
            action: 'BLOCK',
          },
        ],
        useAccountDefender: true,
      },
    };
    const expectedProjectConfig2: any = {
      smsRegionConfig: {
        allowlistOnly: {
          allowedRegions: ['AC', 'AD'],
        }
      },
      multiFactorConfig: mfaConfig,
      recaptchaConfig: {
        emailPasswordEnforcementState:  'OFF',
        managedRules: [
          {
            endScore: 0.1,
            action: 'BLOCK',
          },
        ],
      },
    };
    const expectedProjectConfigSmsEnabledTotpDisabled: any = {
      smsRegionConfig: expectedProjectConfig2.smsRegionConfig,
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['phone'],
        providerConfigs: [
          {
            state: 'DISABLED',
            totpProviderConfig: {},
          }
        ],
      },
      recaptchaConfig: {
        emailPasswordEnforcementState:  'OFF',
        managedRules: [
          {
            endScore: 0.1,
            action: 'BLOCK',
          },
        ],
      },
    };

    it('updateProjectConfig() should resolve with the updated project config', () => {
      return getAuth().projectConfigManager().updateProjectConfig(projectConfigOption1)
        .then((actualProjectConfig) => {
          // ReCAPTCHA keys are generated differently each time.
          delete actualProjectConfig.recaptchaConfig?.recaptchaKeys;
          expect(actualProjectConfig.toJSON()).to.deep.equal(expectedProjectConfig1);
          return getAuth().projectConfigManager().updateProjectConfig(projectConfigOption2);
        })
        .then((actualProjectConfig) => {
          expect(actualProjectConfig.toJSON()).to.deep.equal(expectedProjectConfig2);
          return getAuth().projectConfigManager().updateProjectConfig(projectConfigOptionSmsEnabledTotpDisabled);
        })
        .then((actualProjectConfig) => {
          expect(actualProjectConfig.toJSON()).to.deep.equal(expectedProjectConfigSmsEnabledTotpDisabled);
        });
    });

    it('getProjectConfig() should resolve with expected project config', () => {
      return getAuth().projectConfigManager().getProjectConfig()
        .then((actualConfig) => {
          const actualConfigObj = actualConfig.toJSON();
          expect(actualConfigObj).to.deep.equal(expectedProjectConfigSmsEnabledTotpDisabled);
        });
    });
  });

  describe('Tenant management operations', () => {
    let createdTenantId: string;
    const createdTenants: string[] = [];
    const tenantOptions: CreateTenantRequest = {
      displayName: 'testTenant1',
      emailSignInConfig: {
        enabled: true,
        passwordRequired: true,
      },
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['phone'],
        providerConfigs: [
          {
            state: 'ENABLED',
            totpProviderConfig: {
              adjacentIntervals: 5,
            },
          },
        ],
      },
      // Add random phone number / code pairs.
      testPhoneNumbers: {
        '+16505551234': '019287',
        '+16505550676': '985235',
      },
    };
    const expectedCreatedTenant: any = {
      displayName: 'testTenant1',
      emailSignInConfig: {
        enabled: true,
        passwordRequired: true,
      },
      anonymousSignInEnabled: false,
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['phone'],
        providerConfigs: [
          {
            state: 'ENABLED',
            totpProviderConfig: {
              adjacentIntervals: 5,
            },
          },
        ],
      },
      // These test phone numbers will not be checked when running integration
      // tests against the emulator suite and are ignored in auth emulator
      // altogether. For more information, please refer to this section of the
      // auth emulator DD: go/firebase-auth-emulator-dd#heading=h.odk06so2ydjd
      testPhoneNumbers: {
        '+16505551234': '019287',
        '+16505550676': '985235',
      },
    };
    const expectedUpdatedTenant: any = {
      displayName: 'testTenantUpdated',
      emailSignInConfig: {
        enabled: false,
        passwordRequired: true,
      },
      anonymousSignInEnabled: false,
      multiFactorConfig: {
        state: 'DISABLED',
        factorIds: [],
        providerConfigs: [
          {
            state: 'ENABLED',
            totpProviderConfig: {
              adjacentIntervals: 5,
            },
          },
        ],
      },
      // Test phone numbers will not be checked when running integration tests
      // against emulator suite. For more information, please refer to:
      // go/firebase-auth-emulator-dd#heading=h.odk06so2ydjd
      testPhoneNumbers: {
        '+16505551234': '123456',
      },
      recaptchaConfig: {
        emailPasswordEnforcementState:  'AUDIT',
        managedRules: [
          {
            endScore: 0.3,
            action: 'BLOCK',
          },
        ],
        useAccountDefender: true,
      },
    };
    const expectedUpdatedTenant2: any = {
      displayName: 'testTenantUpdated',
      emailSignInConfig: {
        enabled: true,
        passwordRequired: false,
      },
      anonymousSignInEnabled: false,
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['phone'],
        providerConfigs: [
          {
            state: 'ENABLED',
            totpProviderConfig: {},
          },
        ],
      },
      smsRegionConfig: {
        allowByDefault: {
          disallowedRegions: ['AC', 'AD'],
        }
      },
      recaptchaConfig: {
        emailPasswordEnforcementState:  'OFF',
        managedRules: [
          {
            endScore: 0.3,
            action: 'BLOCK',
          },
        ],
        useAccountDefender: false,
      },
    };
    const expectedUpdatedTenantSmsEnabledTotpDisabled: any = {
      displayName: 'testTenantUpdated',
      emailSignInConfig: {
        enabled: true,
        passwordRequired: false,
      },
      anonymousSignInEnabled: false,
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['phone'],
        providerConfigs: [
          {
            state: 'DISABLED',
            totpProviderConfig: {},
          },
        ],
      },
      smsRegionConfig: {
        allowByDefault: {
          disallowedRegions: ['AC', 'AD'],
        }
      },
      recaptchaConfig: {
        emailPasswordEnforcementState:  'OFF',
        managedRules: [
          {
            endScore: 0.3,
            action: 'BLOCK',
          },
        ],
        useAccountDefender: false,
      },
    };

    // https://mochajs.org/
    // Passing arrow functions (aka "lambdas") to Mocha is discouraged.
    // Lambdas lexically bind this and cannot access the Mocha context.
    before(function () {
      /* tslint:disable:no-console */
      if (!cmdArgs.testMultiTenancy) {
        // To enable, run: npm run test:integration -- --testMultiTenancy
        // By default we skip multi-tenancy as it is a Google Cloud Identity Platform
        // feature only and requires to be enabled via the Cloud Console.
        console.log(chalk.yellow('    Skipping multi-tenancy tests.'));
        this.skip();
      }
      /* tslint:enable:no-console */
    });

    // Delete test tenants at the end of test suite.
    after(() => {
      const promises: Array<Promise<any>> = [];
      createdTenants.forEach((tenantId) => {
        promises.push(
          getAuth().tenantManager().deleteTenant(tenantId)
            .catch(() => {/** Ignore. */ }));
      });
      return Promise.all(promises);
    });

    it('createTenant() should resolve with a new tenant', () => {
      return getAuth().tenantManager().createTenant(tenantOptions)
        .then((actualTenant) => {
          createdTenantId = actualTenant.tenantId;
          createdTenants.push(createdTenantId);
          expectedCreatedTenant.tenantId = createdTenantId;
          const actualTenantObj = actualTenant.toJSON();
          if (authEmulatorHost) {
            // Not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedCreatedTenant.testPhoneNumbers;
          }
          expect(actualTenantObj).to.deep.equal(expectedCreatedTenant);
        });
    });

    it('createTenant() can enable anonymous users', async () => {
      const tenant = await getAuth().tenantManager().createTenant({
        displayName: 'testTenantWithAnon',
        emailSignInConfig: {
          enabled: false,
          passwordRequired: true,
        },
        anonymousSignInEnabled: true,
      });
      createdTenants.push(tenant.tenantId);

      expect(tenant.anonymousSignInEnabled).to.be.true;
    });

    // Sanity check user management + email link generation + custom attribute APIs.
    // TODO: Confirm behavior in client SDK when it starts supporting it.
    describe('supports user management, email link generation, custom attribute and token revocation APIs', () => {
      let tenantAwareAuth: TenantAwareAuth;
      let createdUserUid: string;
      let lastValidSinceTime: number;
      const newUserData = clone(mockUserData);
      newUserData.email = generateRandomString(20).toLowerCase() + '@example.com';
      newUserData.phoneNumber = testPhoneNumber;
      const importOptions: any = {
        hash: {
          algorithm: 'HMAC_SHA256',
          key: Buffer.from('secret'),
        },
      };
      const rawPassword = 'password';
      const rawSalt = 'NaCl';

      before(function () {
        if (!createdTenantId) {
          this.skip();
        } else {
          tenantAwareAuth = getAuth().tenantManager().authForTenant(createdTenantId);
        }
      });

      // Delete test user at the end of test suite.
      after(() => {
        // If user successfully created, make sure it is deleted at the end of the test suite.
        if (createdUserUid) {
          return tenantAwareAuth.deleteUser(createdUserUid)
            .catch(() => {
              // Ignore error.
            });
        }
      });

      it('createUser() should create a user in the expected tenant', () => {
        return tenantAwareAuth.createUser(newUserData)
          .then((userRecord) => {
            createdUserUid = userRecord.uid;
            expect(userRecord.tenantId).to.equal(createdTenantId);
            expect(userRecord.email).to.equal(newUserData.email);
            expect(userRecord.phoneNumber).to.equal(newUserData.phoneNumber);
          });
      });

      it('setCustomUserClaims() should set custom attributes on the tenant specific user', () => {
        return tenantAwareAuth.setCustomUserClaims(createdUserUid, customClaims)
          .then(() => {
            return tenantAwareAuth.getUser(createdUserUid);
          })
          .then((userRecord) => {
            expect(userRecord.uid).to.equal(createdUserUid);
            expect(userRecord.tenantId).to.equal(createdTenantId);
            // Confirm custom claims set on the UserRecord.
            expect(userRecord.customClaims).to.deep.equal(customClaims);
          });
      });

      it('updateUser() should update the tenant specific user', () => {
        return tenantAwareAuth.updateUser(createdUserUid, {
          email: updatedEmail,
          phoneNumber: updatedPhone,
        })
          .then((userRecord) => {
            expect(userRecord.uid).to.equal(createdUserUid);
            expect(userRecord.tenantId).to.equal(createdTenantId);
            expect(userRecord.email).to.equal(updatedEmail);
            expect(userRecord.phoneNumber).to.equal(updatedPhone);
          });
      });

      it('generateEmailVerificationLink() should generate the link for tenant specific user', () => {
        // Generate email verification link to confirm it is generated in the expected
        // tenant context.
        return tenantAwareAuth.generateEmailVerificationLink(updatedEmail, actionCodeSettings)
          .then((link) => {
            // Confirm tenant ID set in link.
            expect(getTenantId(link)).equal(createdTenantId);
          });
      });

      it('generatePasswordResetLink() should generate the link for tenant specific user', () => {
        // Generate password reset link to confirm it is generated in the expected
        // tenant context.
        return tenantAwareAuth.generatePasswordResetLink(updatedEmail, actionCodeSettings)
          .then((link) => {
            // Confirm tenant ID set in link.
            expect(getTenantId(link)).equal(createdTenantId);
          });
      });

      it('generateSignInWithEmailLink() should generate the link for tenant specific user', () => {
        // Generate link for sign-in to confirm it is generated in the expected
        // tenant context.
        return tenantAwareAuth.generateSignInWithEmailLink(updatedEmail, actionCodeSettings)
          .then((link) => {
            // Confirm tenant ID set in link.
            expect(getTenantId(link)).equal(createdTenantId);
          });
      });

      it('revokeRefreshTokens() should revoke the tokens for the tenant specific user', () => {
        // Revoke refresh tokens.
        // On revocation, tokensValidAfterTime will be updated to current time. All tokens issued
        // before that time will be rejected. As the underlying backend field is rounded to the nearest
        // second, we are subtracting one second.
        lastValidSinceTime = new Date().getTime() - 1000;
        return tenantAwareAuth.revokeRefreshTokens(createdUserUid)
          .then(() => {
            return tenantAwareAuth.getUser(createdUserUid);
          })
          .then((userRecord) => {
            expect(userRecord.tokensValidAfterTime).to.exist;
            expect(new Date(userRecord.tokensValidAfterTime!).getTime())
              .to.be.greaterThan(lastValidSinceTime);
          });
      });

      it('listUsers() should list tenant specific users', () => {
        return tenantAwareAuth.listUsers(100)
          .then((listUsersResult) => {
            // Confirm expected user returned in the list and all users returned
            // belong to the expected tenant.
            const allUsersBelongToTenant =
              listUsersResult.users.every((user) => user.tenantId === createdTenantId);
            expect(allUsersBelongToTenant).to.be.true;
            const knownUserInTenant =
              listUsersResult.users.some((user) => user.uid === createdUserUid);
            expect(knownUserInTenant).to.be.true;
          });
      });

      it('deleteUser() should delete the tenant specific user', () => {
        return tenantAwareAuth.deleteUser(createdUserUid)
          .then(() => {
            return tenantAwareAuth.getUser(createdUserUid)
              .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
          });
      });

      it('importUsers() should upload a user to the specified tenant', () => {
        const currentHashKey = importOptions.hash.key.toString('utf8');
        const passwordHash =
          crypto.createHmac('sha256', currentHashKey).update(rawPassword + rawSalt).digest();
        const importUserRecord: any = {
          uid: createdUserUid,
          email: createdUserUid + '@example.com',
          passwordHash,
          passwordSalt: Buffer.from(rawSalt),
        };
        return tenantAwareAuth.importUsers([importUserRecord], importOptions)
          .then(() => {
            return tenantAwareAuth.getUser(createdUserUid);
          })
          .then((userRecord) => {
            // Confirm user uploaded successfully.
            expect(userRecord.tenantId).to.equal(createdTenantId);
            expect(userRecord.uid).to.equal(createdUserUid);
          });
      });

      it('createCustomToken() mints a JWT that can be used to sign in tenant users', async () => {
        try {
          clientAuth().tenantId = createdTenantId;

          const customToken = await tenantAwareAuth.createCustomToken('uid1');
          const { user } = await clientAuth().signInWithCustomToken(customToken);
          expect(user).to.not.be.null;
          const idToken = await user!.getIdToken();
          const token = await tenantAwareAuth.verifyIdToken(idToken);

          expect(token.uid).to.equal('uid1');
          expect(token.firebase.tenant).to.equal(createdTenantId);
        } finally {
          clientAuth().tenantId = null;
        }
      });
    });

    // Sanity check OIDC/SAML config management API.
    describe('SAML management APIs', () => {
      let tenantAwareAuth: TenantAwareAuth;
      const authProviderConfig = {
        providerId: randomSamlProviderId(),
        displayName: 'SAML_DISPLAY_NAME1',
        enabled: true,
        idpEntityId: 'IDP_ENTITY_ID1',
        ssoURL: 'https://example.com/login1',
        x509Certificates: [mocks.x509CertPairs[0].public],
        rpEntityId: 'RP_ENTITY_ID1',
        callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
        enableRequestSigning: true,
      };
      const modifiedConfigOptions = {
        displayName: 'SAML_DISPLAY_NAME3',
        enabled: false,
        idpEntityId: 'IDP_ENTITY_ID3',
        ssoURL: 'https://example.com/login3',
        x509Certificates: [mocks.x509CertPairs[1].public],
        rpEntityId: 'RP_ENTITY_ID3',
        callbackURL: 'https://projectId3.firebaseapp.com/__/auth/handler',
        enableRequestSigning: false,
      };

      before(function () {
        if (!createdTenantId) {
          this.skip();
        } else {
          tenantAwareAuth = getAuth().tenantManager().authForTenant(createdTenantId);
        }
      });

      // Delete SAML configuration at the end of test suite.
      after(() => {
        if (tenantAwareAuth) {
          return tenantAwareAuth.deleteProviderConfig(authProviderConfig.providerId)
            .catch(() => {
              // Ignore error.
            });
        }
      });

      it('should support CRUD operations', function () {
        // TODO(lisajian): Unskip once auth emulator supports OIDC/SAML
        if (authEmulatorHost) {
          return this.skip(); // Not yet supported in Auth Emulator.
        }
        return tenantAwareAuth.createProviderConfig(authProviderConfig)
          .then((config) => {
            assertDeepEqualUnordered(authProviderConfig, config);
            return tenantAwareAuth.getProviderConfig(authProviderConfig.providerId);
          })
          .then((config) => {
            assertDeepEqualUnordered(authProviderConfig, config);
            return tenantAwareAuth.updateProviderConfig(
              authProviderConfig.providerId, modifiedConfigOptions);
          })
          .then((config) => {
            const modifiedConfig = deepExtend(
              { providerId: authProviderConfig.providerId }, modifiedConfigOptions);
            assertDeepEqualUnordered(modifiedConfig, config);
            return tenantAwareAuth.deleteProviderConfig(authProviderConfig.providerId);
          })
          .then(() => {
            return tenantAwareAuth.getProviderConfig(authProviderConfig.providerId)
              .should.eventually.be.rejected.and.have.property('code', 'auth/configuration-not-found');
          });
      });
    });

    describe('OIDC management APIs', () => {
      let tenantAwareAuth: TenantAwareAuth;
      const authProviderConfig = {
        providerId: randomOidcProviderId(),
        displayName: 'OIDC_DISPLAY_NAME1',
        enabled: true,
        issuer: 'https://oidc.com/issuer1',
        clientId: 'CLIENT_ID1',
        responseType: {
          idToken: true,
        },
      };
      const deltaChanges = {
        displayName: 'OIDC_DISPLAY_NAME3',
        enabled: false,
        issuer: 'https://oidc.com/issuer3',
        clientId: 'CLIENT_ID3',
        clientSecret: 'CLIENT_SECRET',
        responseType: {
          idToken: false,
          code: true,
        },
      };
      const modifiedConfigOptions = {
        providerId: authProviderConfig.providerId,
        displayName: 'OIDC_DISPLAY_NAME3',
        enabled: false,
        issuer: 'https://oidc.com/issuer3',
        clientId: 'CLIENT_ID3',
        clientSecret: 'CLIENT_SECRET',
        responseType: {
          code: true,
        },
      };

      before(function () {
        if (!createdTenantId) {
          this.skip();
        } else {
          tenantAwareAuth = getAuth().tenantManager().authForTenant(createdTenantId);
        }
      });

      // Delete OIDC configuration at the end of test suite.
      after(() => {
        if (tenantAwareAuth) {
          return tenantAwareAuth.deleteProviderConfig(authProviderConfig.providerId)
            .catch(() => {
              // Ignore error.
            });
        }
      });

      it('should support CRUD operations', function () {
        // TODO(lisajian): Unskip once auth emulator supports OIDC/SAML
        if (authEmulatorHost) {
          return this.skip(); // Not yet supported in Auth Emulator.
        }
        return tenantAwareAuth.createProviderConfig(authProviderConfig)
          .then((config) => {
            assertDeepEqualUnordered(authProviderConfig, config);
            return tenantAwareAuth.getProviderConfig(authProviderConfig.providerId);
          })
          .then((config) => {
            assertDeepEqualUnordered(authProviderConfig, config);
            return tenantAwareAuth.updateProviderConfig(
              authProviderConfig.providerId, deltaChanges);
          })
          .then((config) => {
            assertDeepEqualUnordered(modifiedConfigOptions, config);
            return tenantAwareAuth.deleteProviderConfig(authProviderConfig.providerId);
          })
          .then(() => {
            return tenantAwareAuth.getProviderConfig(authProviderConfig.providerId)
              .should.eventually.be.rejected.and.have.property('code', 'auth/configuration-not-found');
          });
      });
    });

    it('getTenant() should resolve with expected tenant', () => {
      return getAuth().tenantManager().getTenant(createdTenantId)
        .then((actualTenant) => {
          const actualTenantObj = actualTenant.toJSON();
          if (authEmulatorHost) {
            // Not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedCreatedTenant.testPhoneNumbers;
          }
          expect(actualTenantObj).to.deep.equal(expectedCreatedTenant);
        });
    });

    it('updateTenant() should resolve with the updated tenant', () => {
      expectedUpdatedTenant.tenantId = createdTenantId;
      expectedUpdatedTenant2.tenantId = createdTenantId;
      const updatedOptions: UpdateTenantRequest = {
        displayName: expectedUpdatedTenant.displayName,
        emailSignInConfig: {
          enabled: false,
        },
        multiFactorConfig: deepCopy(expectedUpdatedTenant.multiFactorConfig),
        testPhoneNumbers: deepCopy(expectedUpdatedTenant.testPhoneNumbers),
        recaptchaConfig: deepCopy(expectedUpdatedTenant.recaptchaConfig),
      };
      const updatedOptions2: UpdateTenantRequest = {
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false,
        },
        multiFactorConfig: deepCopy(expectedUpdatedTenant2.multiFactorConfig),
        // Test clearing of phone numbers.
        testPhoneNumbers: null,
        smsRegionConfig: deepCopy(expectedUpdatedTenant2.smsRegionConfig),
        recaptchaConfig: deepCopy(expectedUpdatedTenant2.recaptchaConfig),
      };
      if (authEmulatorHost) {
        return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions)
          .then((actualTenant) => {
            const actualTenantObj = actualTenant.toJSON();
            // Not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedUpdatedTenant.testPhoneNumbers;
            expect(actualTenantObj).to.deep.equal(expectedUpdatedTenant);
            return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions2);
          })
          .then((actualTenant) => {
            const actualTenantObj = actualTenant.toJSON();
            // Not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedUpdatedTenant2.testPhoneNumbers;
            expect(actualTenantObj).to.deep.equal(expectedUpdatedTenant2);
          });
      }
      return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions)
        .then((actualTenant) => {
          expect(actualTenant.toJSON()).to.deep.equal(expectedUpdatedTenant);
          return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions2);
        })
        .then((actualTenant) => {
          // response from backend ignores account defender status is recaptcha status is OFF.
          const expectedUpdatedTenantCopy = deepCopy(expectedUpdatedTenant2);
          delete expectedUpdatedTenantCopy.recaptchaConfig.useAccountDefender;
          expect(actualTenant.toJSON()).to.deep.equal(expectedUpdatedTenantCopy);
        });
    });

    it('updateTenant() should not update tenant when SMS region config is undefined', () => {
      expectedUpdatedTenant.tenantId = createdTenantId;
      const updatedOptions2: UpdateTenantRequest = {
        displayName: expectedUpdatedTenant2.displayName,
        smsRegionConfig: undefined,
      };
      if (authEmulatorHost) {
        return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions2)
          .then((actualTenant) => {
            const actualTenantObj = actualTenant.toJSON();
            // Not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedUpdatedTenant2.testPhoneNumbers;
            expect(actualTenantObj).to.deep.equal(expectedUpdatedTenant2);
          });
      }
      return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions2)
        .then((actualTenant) => {
          // response from backend ignores account defender status is recaptcha status is OFF.
          const expectedUpdatedTenantCopy = deepCopy(expectedUpdatedTenant2);
          delete expectedUpdatedTenantCopy.recaptchaConfig.useAccountDefender;
          expect(actualTenant.toJSON()).to.deep.equal(expectedUpdatedTenantCopy);
        });
    });

    it('updateTenant() should not update MFA-related config of tenant when MultiFactorConfig is undefined', () => {
      expectedUpdatedTenant.tenantId = createdTenantId;
      const updateRequestNoMfaConfig: UpdateTenantRequest = {
        displayName: expectedUpdatedTenant2.displayName,
        multiFactorConfig: undefined,
      };
      if (authEmulatorHost) {
        return getAuth().tenantManager().updateTenant(createdTenantId, updateRequestNoMfaConfig)
          .then((actualTenant) => {
            const actualTenantObj = actualTenant.toJSON();
            // Configuring test phone numbers are not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedUpdatedTenant2.testPhoneNumbers;
            expect(actualTenantObj).to.deep.equal(expectedUpdatedTenant2);
          });
      }
      return getAuth().tenantManager().updateTenant(createdTenantId, updateRequestNoMfaConfig)
    });
      
    it('updateTenant() should not update tenant reCAPTCHA config is undefined', () => {
      expectedUpdatedTenant.tenantId = createdTenantId;
      const updatedOptions2: UpdateTenantRequest = {
        displayName: expectedUpdatedTenant2.displayName,
        recaptchaConfig: undefined,
      };
      if (authEmulatorHost) {
        return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions2)
          .then((actualTenant) => {
            const actualTenantObj = actualTenant.toJSON();
            // Not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedUpdatedTenant2.testPhoneNumbers;
            expect(actualTenantObj).to.deep.equal(expectedUpdatedTenant2);
          });
      }
      return getAuth().tenantManager().updateTenant(createdTenantId, updatedOptions2)
        .then((actualTenant) => {
          // response from backend ignores account defender status is recaptcha status is OFF.
          const expectedUpdatedTenantCopy = deepCopy(expectedUpdatedTenant2);
          delete expectedUpdatedTenantCopy.recaptchaConfig.useAccountDefender;
          expect(actualTenant.toJSON()).to.deep.equal(expectedUpdatedTenantCopy);
        });
    });
    it('updateTenant() should not disable SMS MFA when TOTP is disabled', () => {
      expectedUpdatedTenantSmsEnabledTotpDisabled.tenantId = createdTenantId;
      const updateRequestSMSEnabledTOTPDisabled: UpdateTenantRequest = {
        displayName: expectedUpdatedTenant2.displayName,
        multiFactorConfig: {
          state: 'ENABLED',
          factorIds: ['phone'],
          providerConfigs: [
            {
              state: 'DISABLED',
              totpProviderConfig: {}
            },
          ],
        },
      };
      if (authEmulatorHost) {
        return getAuth().tenantManager().updateTenant(createdTenantId, updateRequestSMSEnabledTOTPDisabled)
          .then((actualTenant) => {
            const actualTenantObj = actualTenant.toJSON();
            // Configuring test phone numbers are not supported in Auth Emulator
            delete (actualTenantObj as { testPhoneNumbers?: Record<string, string> }).testPhoneNumbers;
            delete expectedUpdatedTenantSmsEnabledTotpDisabled.testPhoneNumbers;
            expect(actualTenantObj).to.deep.equal(expectedUpdatedTenantSmsEnabledTotpDisabled);
          });
      }
      return getAuth().tenantManager().updateTenant(createdTenantId, updateRequestSMSEnabledTOTPDisabled)
        .then((actualTenant) => {
          // response from backend ignores account defender status is recaptcha status is OFF.
          const expectedUpdatedTenantCopy = deepCopy(expectedUpdatedTenantSmsEnabledTotpDisabled);
          delete expectedUpdatedTenantCopy.recaptchaConfig.useAccountDefender;
          expect(actualTenant.toJSON()).to.deep.equal(expectedUpdatedTenantCopy);
        });
    });

    it('updateTenant() should be able to enable/disable anon provider', async () => {
      const tenantManager = getAuth().tenantManager();
      let tenant = await tenantManager.createTenant({
        displayName: 'testTenantUpdateAnon',
      });
      createdTenants.push(tenant.tenantId);
      expect(tenant.anonymousSignInEnabled).to.be.false;

      tenant = await tenantManager.updateTenant(tenant.tenantId, {
        anonymousSignInEnabled: true,
      });
      expect(tenant.anonymousSignInEnabled).to.be.true;

      tenant = await tenantManager.updateTenant(tenant.tenantId, {
        anonymousSignInEnabled: false,
      });
      expect(tenant.anonymousSignInEnabled).to.be.false;
    });

    it('listTenants() should resolve with expected number of tenants', () => {
      const allTenantIds: string[] = [];
      const tenantOptions2 = deepCopy(tenantOptions);
      tenantOptions2.displayName = 'testTenant2';
      const listAllTenantIds = (tenantIds: string[], nextPageToken?: string): Promise<void> => {
        return getAuth().tenantManager().listTenants(100, nextPageToken)
          .then((result) => {
            result.tenants.forEach((tenant) => {
              tenantIds.push(tenant.tenantId);
            });
            if (result.pageToken) {
              return listAllTenantIds(tenantIds, result.pageToken);
            }
          });
      };
      return getAuth().tenantManager().createTenant(tenantOptions2)
        .then((actualTenant) => {
          createdTenants.push(actualTenant.tenantId);
          // Test listTenants returns the expected tenants.
          return listAllTenantIds(allTenantIds);
        })
        .then(() => {
          // All created tenants should be in the list of tenants.
          createdTenants.forEach((tenantId) => {
            expect(allTenantIds).to.contain(tenantId);
          });
        });
    });

    it('deleteTenant() should successfully delete the provided tenant', () => {
      const allTenantIds: string[] = [];
      const listAllTenantIds = (tenantIds: string[], nextPageToken?: string): Promise<void> => {
        return getAuth().tenantManager().listTenants(100, nextPageToken)
          .then((result) => {
            result.tenants.forEach((tenant) => {
              tenantIds.push(tenant.tenantId);
            });
            if (result.pageToken) {
              return listAllTenantIds(tenantIds, result.pageToken);
            }
          });
      };

      return getAuth().tenantManager().deleteTenant(createdTenantId)
        .then(() => {
          // Use listTenants() instead of getTenant() to check that the tenant
          // is no longer present, because Auth Emulator implicitly creates the
          // tenant in getTenant() when it is not found
          return listAllTenantIds(allTenantIds);
        })
        .then(() => {
          expect(allTenantIds).to.not.contain(createdTenantId);
        });
    });
  });

  describe('SAML configuration operations', () => {
    const authProviderConfig1 = {
      providerId: randomSamlProviderId(),
      displayName: 'SAML_DISPLAY_NAME1',
      enabled: true,
      idpEntityId: 'IDP_ENTITY_ID1',
      ssoURL: 'https://example.com/login1',
      x509Certificates: [mocks.x509CertPairs[0].public],
      rpEntityId: 'RP_ENTITY_ID1',
      callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
      enableRequestSigning: true,
    };
    const authProviderConfig2 = {
      providerId: randomSamlProviderId(),
      displayName: 'SAML_DISPLAY_NAME2',
      enabled: true,
      idpEntityId: 'IDP_ENTITY_ID2',
      ssoURL: 'https://example.com/login2',
      x509Certificates: [mocks.x509CertPairs[1].public],
      rpEntityId: 'RP_ENTITY_ID2',
      callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
      enableRequestSigning: true,
    };

    const removeTempConfigs = (): Promise<any> => {
      return Promise.all([
        getAuth().deleteProviderConfig(authProviderConfig1.providerId).catch(() => {/* empty */ }),
        getAuth().deleteProviderConfig(authProviderConfig2.providerId).catch(() => {/* empty */ }),
      ]);
    };

    // Clean up temp configurations used for test.
    before(function () {
      if (authEmulatorHost) {
        return this.skip(); // Not implemented.
      }
      return removeTempConfigs().then(() => getAuth().createProviderConfig(authProviderConfig1));
    });

    after(() => {
      return removeTempConfigs();
    });

    it('createProviderConfig() successfully creates a SAML config', () => {
      return getAuth().createProviderConfig(authProviderConfig2)
        .then((config) => {
          assertDeepEqualUnordered(authProviderConfig2, config);
        });
    });

    it('getProviderConfig() successfully returns the expected SAML config', () => {
      return getAuth().getProviderConfig(authProviderConfig1.providerId)
        .then((config) => {
          assertDeepEqualUnordered(authProviderConfig1, config);
        });
    });

    it('listProviderConfig() successfully returns the list of SAML providers', () => {
      const configs: AuthProviderConfig[] = [];
      const listProviders: any = (type: 'saml' | 'oidc', maxResults?: number, pageToken?: string) => {
        return getAuth().listProviderConfigs({ type, maxResults, pageToken })
          .then((result) => {
            result.providerConfigs.forEach((config: AuthProviderConfig) => {
              configs.push(config);
            });
            if (result.pageToken) {
              return listProviders(type, maxResults, result.pageToken);
            }
          });
      };
      // In case the project already has existing providers, list all configurations and then
      // check the 2 test configs are available.
      return listProviders('saml', 1)
        .then(() => {
          let index1 = 0;
          let index2 = 0;
          for (let i = 0; i < configs.length; i++) {
            if (configs[i].providerId === authProviderConfig1.providerId) {
              index1 = i;
            } else if (configs[i].providerId === authProviderConfig2.providerId) {
              index2 = i;
            }
          }
          assertDeepEqualUnordered(authProviderConfig1, configs[index1]);
          assertDeepEqualUnordered(authProviderConfig2, configs[index2]);
        });
    });

    it('updateProviderConfig() successfully overwrites a SAML config', () => {
      const modifiedConfigOptions = {
        displayName: 'SAML_DISPLAY_NAME3',
        enabled: false,
        idpEntityId: 'IDP_ENTITY_ID3',
        ssoURL: 'https://example.com/login3',
        x509Certificates: [mocks.x509CertPairs[1].public],
        rpEntityId: 'RP_ENTITY_ID3',
        callbackURL: 'https://projectId3.firebaseapp.com/__/auth/handler',
        enableRequestSigning: false,
      };
      return getAuth().updateProviderConfig(authProviderConfig1.providerId, modifiedConfigOptions)
        .then((config) => {
          const modifiedConfig = deepExtend(
            { providerId: authProviderConfig1.providerId }, modifiedConfigOptions);
          assertDeepEqualUnordered(modifiedConfig, config);
        });
    });

    it('updateProviderConfig() successfully partially modifies a SAML config', () => {
      const deltaChanges = {
        displayName: 'SAML_DISPLAY_NAME4',
        x509Certificates: [mocks.x509CertPairs[0].public],
        // Note, currently backend has a bug where error is thrown when callbackURL is not
        // passed event though it is not required. Fix is on the way.
        callbackURL: 'https://projectId3.firebaseapp.com/__/auth/handler',
        rpEntityId: 'RP_ENTITY_ID4',
      };
      // Only above fields should be modified.
      const modifiedConfigOptions = {
        displayName: 'SAML_DISPLAY_NAME4',
        enabled: false,
        idpEntityId: 'IDP_ENTITY_ID3',
        ssoURL: 'https://example.com/login3',
        x509Certificates: [mocks.x509CertPairs[0].public],
        rpEntityId: 'RP_ENTITY_ID4',
        callbackURL: 'https://projectId3.firebaseapp.com/__/auth/handler',
        enableRequestSigning: false,
      };
      return getAuth().updateProviderConfig(authProviderConfig1.providerId, deltaChanges)
        .then((config) => {
          const modifiedConfig = deepExtend(
            { providerId: authProviderConfig1.providerId }, modifiedConfigOptions);
          assertDeepEqualUnordered(modifiedConfig, config);
        });
    });

    it('deleteProviderConfig() successfully deletes an existing SAML config', () => {
      return getAuth().deleteProviderConfig(authProviderConfig1.providerId).then(() => {
        return getAuth().getProviderConfig(authProviderConfig1.providerId)
          .should.eventually.be.rejected.and.have.property('code', 'auth/configuration-not-found');
      });
    });
  });

  describe('OIDC configuration operations', () => {
    const authProviderConfig1 = {
      providerId: randomOidcProviderId(),
      displayName: 'OIDC_DISPLAY_NAME1',
      enabled: true,
      issuer: 'https://oidc.com/issuer1',
      clientId: 'CLIENT_ID1',
      responseType: {
        idToken: true,
      },
    };
    const authProviderConfig2 = {
      providerId: randomOidcProviderId(),
      displayName: 'OIDC_DISPLAY_NAME2',
      enabled: true,
      issuer: 'https://oidc.com/issuer2',
      clientId: 'CLIENT_ID2',
      clientSecret: 'CLIENT_SECRET',
      responseType: {
        code: true,
      },
    };

    const removeTempConfigs = (): Promise<any> => {
      return Promise.all([
        getAuth().deleteProviderConfig(authProviderConfig1.providerId).catch(() => {/* empty */ }),
        getAuth().deleteProviderConfig(authProviderConfig2.providerId).catch(() => {/* empty */ }),
      ]);
    };

    // Clean up temp configurations used for test.
    before(function () {
      if (authEmulatorHost) {
        return this.skip(); // Not implemented.
      }
      return removeTempConfigs().then(() => getAuth().createProviderConfig(authProviderConfig1));
    });

    after(() => {
      return removeTempConfigs();
    });

    it('createProviderConfig() successfully creates an OIDC config', () => {
      return getAuth().createProviderConfig(authProviderConfig2)
        .then((config) => {
          assertDeepEqualUnordered(authProviderConfig2, config);
        });
    });

    it('getProviderConfig() successfully returns the expected OIDC config', () => {
      return getAuth().getProviderConfig(authProviderConfig1.providerId)
        .then((config) => {
          assertDeepEqualUnordered(authProviderConfig1, config);
        });
    });

    it('listProviderConfig() successfully returns the list of OIDC providers', () => {
      const configs: AuthProviderConfig[] = [];
      const listProviders: any = (type: 'saml' | 'oidc', maxResults?: number, pageToken?: string) => {
        return getAuth().listProviderConfigs({ type, maxResults, pageToken })
          .then((result) => {
            result.providerConfigs.forEach((config: AuthProviderConfig) => {
              configs.push(config);
            });
            if (result.pageToken) {
              return listProviders(type, maxResults, result.pageToken);
            }
          });
      };
      // In case the project already has existing providers, list all configurations and then
      // check the 2 test configs are available.
      return listProviders('oidc', 1)
        .then(() => {
          let index1 = 0;
          let index2 = 0;
          for (let i = 0; i < configs.length; i++) {
            if (configs[i].providerId === authProviderConfig1.providerId) {
              index1 = i;
            } else if (configs[i].providerId === authProviderConfig2.providerId) {
              index2 = i;
            }
          }
          assertDeepEqualUnordered(authProviderConfig1, configs[index1]);
          assertDeepEqualUnordered(authProviderConfig2, configs[index2]);
        });
    });

    it('updateProviderConfig() successfully partially modifies an OIDC config', () => {
      const deltaChanges = {
        displayName: 'OIDC_DISPLAY_NAME3',
        enabled: false,
        issuer: 'https://oidc.com/issuer3',
        clientId: 'CLIENT_ID3',
        clientSecret: 'CLIENT_SECRET',
        responseType: {
          idToken: false,
          code: true,
        },
      };
      // Only above fields should be modified.
      const modifiedConfigOptions = {
        providerId: authProviderConfig1.providerId,
        displayName: 'OIDC_DISPLAY_NAME3',
        enabled: false,
        issuer: 'https://oidc.com/issuer3',
        clientId: 'CLIENT_ID3',
        clientSecret: 'CLIENT_SECRET',
        responseType: {
          code: true,
        },
      };
      return getAuth().updateProviderConfig(authProviderConfig1.providerId, deltaChanges)
        .then((config) => {
          assertDeepEqualUnordered(modifiedConfigOptions, config);
        });
    });

    it('updateProviderConfig() with invalid oauth response type should be rejected', () => {
      const deltaChanges = {
        displayName: 'OIDC_DISPLAY_NAME4',
        enabled: false,
        issuer: 'https://oidc.com/issuer4',
        clientId: 'CLIENT_ID4',
        clientSecret: 'CLIENT_SECRET',
        responseType: {
          idToken: false,
          code: false,
        },
      };
      return getAuth().updateProviderConfig(authProviderConfig1.providerId, deltaChanges).
        should.eventually.be.rejected.and.have.property('code', 'auth/invalid-oauth-responsetype');
    });

    it('updateProviderConfig() code flow with no client secret should be rejected', () => {
      const deltaChanges = {
        displayName: 'OIDC_DISPLAY_NAME5',
        enabled: false,
        issuer: 'https://oidc.com/issuer5',
        clientId: 'CLIENT_ID5',
        responseType: {
          idToken: false,
          code: true,
        },
      };
      return getAuth().updateProviderConfig(authProviderConfig1.providerId, deltaChanges).
        should.eventually.be.rejected.and.have.property('code', 'auth/missing-oauth-client-secret');
    });

    it('deleteProviderConfig() successfully deletes an existing OIDC config', () => {
      return getAuth().deleteProviderConfig(authProviderConfig1.providerId).then(() => {
        return getAuth().getProviderConfig(authProviderConfig1.providerId)
          .should.eventually.be.rejected.and.have.property('code', 'auth/configuration-not-found');
      });
    });
  });

  it('deleteUser() deletes the user with the given UID', () => {
    return Promise.all([
      getAuth().deleteUser(newUserUid),
      getAuth().deleteUser(uidFromCreateUserWithoutUid),
    ]).should.eventually.be.fulfilled;
  });

  describe('deleteUsers()', () => {
    it('deletes users', async () => {
      const uid1 = await getAuth().createUser({}).then((ur) => ur.uid);
      const uid2 = await getAuth().createUser({}).then((ur) => ur.uid);
      const uid3 = await getAuth().createUser({}).then((ur) => ur.uid);
      const ids = [{ uid: uid1 }, { uid: uid2 }, { uid: uid3 }];

      return deleteUsersWithDelay([uid1, uid2, uid3])
        .then((deleteUsersResult) => {
          expect(deleteUsersResult.successCount).to.equal(3);
          expect(deleteUsersResult.failureCount).to.equal(0);
          expect(deleteUsersResult.errors).to.have.length(0);

          return getAuth().getUsers(ids);
        })
        .then((getUsersResult) => {
          expect(getUsersResult.users).to.have.length(0);
          expect(getUsersResult.notFound).to.have.deep.members(ids);
        });
    });

    it('deletes users that exist even when non-existing users also specified', async () => {
      const uid1 = await getAuth().createUser({}).then((ur) => ur.uid);
      const uid2 = 'uid-that-doesnt-exist';
      const ids = [{ uid: uid1 }, { uid: uid2 }];

      return deleteUsersWithDelay([uid1, uid2])
        .then((deleteUsersResult) => {
          expect(deleteUsersResult.successCount).to.equal(2);
          expect(deleteUsersResult.failureCount).to.equal(0);
          expect(deleteUsersResult.errors).to.have.length(0);

          return getAuth().getUsers(ids);
        })
        .then((getUsersResult) => {
          expect(getUsersResult.users).to.have.length(0);
          expect(getUsersResult.notFound).to.have.deep.members(ids);
        });
    });

    it('is idempotent', async () => {
      const uid = await getAuth().createUser({}).then((ur) => ur.uid);

      return deleteUsersWithDelay([uid])
        .then((deleteUsersResult) => {
          expect(deleteUsersResult.successCount).to.equal(1);
          expect(deleteUsersResult.failureCount).to.equal(0);
        })
        // Delete the user again, ensuring that everything still counts as a success.
        .then(() => deleteUsersWithDelay([uid]))
        .then((deleteUsersResult) => {
          expect(deleteUsersResult.successCount).to.equal(1);
          expect(deleteUsersResult.failureCount).to.equal(0);
        });
    });
  });

  describe('createSessionCookie()', () => {
    let expectedExp: number;
    let expectedIat: number;
    const expiresIn = 24 * 60 * 60 * 1000;
    let payloadClaims: any;
    let currentIdToken: string;
    const uid = sessionCookieUids[0];
    const uid2 = sessionCookieUids[1];
    const uid3 = sessionCookieUids[2];
    const uid4 = sessionCookieUids[3];

    it('creates a valid Firebase session cookie', () => {
      return getAuth().createCustomToken(uid, { admin: true, groupId: '1234' })
        .then((customToken) => clientAuth().signInWithCustomToken(customToken))
        .then(({ user }) => {
          expect(user).to.exist;
          return user!.getIdToken();
        })
        .then((idToken) => {
          currentIdToken = idToken;
          return getAuth().verifyIdToken(idToken);
        }).then((decodedIdTokenClaims) => {
          expectedExp = Math.floor((new Date().getTime() + expiresIn) / 1000);
          payloadClaims = decodedIdTokenClaims;
          payloadClaims.iss = payloadClaims.iss.replace(
            'securetoken.google.com', 'session.firebase.google.com');
          delete payloadClaims.exp;
          delete payloadClaims.iat;
          expectedIat = Math.floor(new Date().getTime() / 1000);
          // One day long session cookie.
          return getAuth().createSessionCookie(currentIdToken, { expiresIn });
        })
        .then((sessionCookie) => getAuth().verifySessionCookie(sessionCookie))
        .then((decodedIdToken) => {
          // Check for expected expiration with +/-5 seconds of variation.
          expect(decodedIdToken.exp).to.be.within(expectedExp - 5, expectedExp + 5);
          expect(decodedIdToken.iat).to.be.within(expectedIat - 5, expectedIat + 5);
          // Not supported in ID token,
          delete decodedIdToken.nonce;
          // exp and iat may vary depending on network connection latency.
          delete (decodedIdToken as any).exp;
          delete (decodedIdToken as any).iat;
          expect(decodedIdToken).to.deep.equal(payloadClaims);
        });
    });

    it('creates a revocable session cookie', () => {
      let currentSessionCookie: string;
      return getAuth().createCustomToken(uid2)
        .then((customToken) => clientAuth().signInWithCustomToken(customToken))
        .then(({ user }) => {
          expect(user).to.exist;
          return user!.getIdToken();
        })
        .then((idToken) => {
          // One day long session cookie.
          return getAuth().createSessionCookie(idToken, { expiresIn });
        })
        .then((sessionCookie) => {
          currentSessionCookie = sessionCookie;
          return new Promise((resolve) => setTimeout(() => resolve(
            getAuth().revokeRefreshTokens(uid2),
          ), 1000));
        })
        .then(() => {
          const verifyingSessionCookie = getAuth().verifySessionCookie(currentSessionCookie);
          if (authEmulatorHost) {
            // Check revocation is forced in emulator-mode and this should throw.
            return verifyingSessionCookie.should.eventually.be.rejected;
          } else {
            // verifyIdToken without checking revocation should still succeed.
            return verifyingSessionCookie.should.eventually.be.fulfilled;
          }
        })
        .then(() => {
          return getAuth().verifySessionCookie(currentSessionCookie, true)
            .should.eventually.be.rejected.and.have.property('code', 'auth/session-cookie-revoked');
        });
    });

    it('fails when called with a revoked ID token', () => {
      return getAuth().createCustomToken(uid3, { admin: true, groupId: '1234' })
        .then((customToken) => clientAuth().signInWithCustomToken(customToken))
        .then(({ user }) => {
          expect(user).to.exist;
          return user!.getIdToken();
        })
        .then((idToken) => {
          currentIdToken = idToken;
          return new Promise((resolve) => setTimeout(() => resolve(
            getAuth().revokeRefreshTokens(uid3),
          ), 1000));
        })
        .then(() => {
          return getAuth().createSessionCookie(currentIdToken, { expiresIn })
            .should.eventually.be.rejected.and.have.property('code', 'auth/id-token-expired');
        });
    });

    it('fails when called with user disabled', async () => {
      const expiresIn = 24 * 60 * 60 * 1000;
      const customToken = await getAuth().createCustomToken(uid4, { admin: true, groupId: '1234' });
      const { user } = await clientAuth().signInWithCustomToken(customToken);
      expect(user).to.exist;

      const idToken = await user!.getIdToken();
      const decodedIdTokenClaims = await getAuth().verifyIdToken(idToken);
      expect(decodedIdTokenClaims.uid).to.be.equal(uid4);

      const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
      const decodedIdToken = await getAuth().verifySessionCookie(sessionCookie, true);
      expect(decodedIdToken.uid).to.equal(uid4);

      const userRecord = await getAuth().updateUser(uid4, { disabled: true });
      // Ensure disabled field has been updated.
      expect(userRecord.uid).to.equal(uid4);
      expect(userRecord.disabled).to.equal(true);

      return getAuth().createSessionCookie(idToken, { expiresIn })
        .should.eventually.be.rejected.and.have.property('code', 'auth/user-disabled');
    });
  });

  describe('verifySessionCookie()', () => {
    const uid = sessionCookieUids[0];
    it('fails when called with an invalid session cookie', () => {
      return getAuth().verifySessionCookie('invalid-token')
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('fails when called with a Firebase ID token', () => {
      return getAuth().createCustomToken(uid)
        .then((customToken) => clientAuth().signInWithCustomToken(customToken))
        .then(({ user }) => {
          expect(user).to.exist;
          return user!.getIdToken();
        })
        .then((idToken) => {
          return getAuth().verifySessionCookie(idToken)
            .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
        });
    });

    it('fails with checkRevoked set to true and corresponding user disabled', async () => {
      const expiresIn = 24 * 60 * 60 * 1000;
      const customToken = await getAuth().createCustomToken(uid, { admin: true, groupId: '1234' });
      const { user } = await clientAuth().signInWithCustomToken(customToken);
      expect(user).to.exist;

      const idToken = await user!.getIdToken();
      const decodedIdTokenClaims = await getAuth().verifyIdToken(idToken);
      expect(decodedIdTokenClaims.uid).to.be.equal(uid);

      const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
      let decodedIdToken = await getAuth().verifySessionCookie(sessionCookie, true);
      expect(decodedIdToken.uid).to.equal(uid);

      const userRecord = await getAuth().updateUser(uid, { disabled: true });
      // Ensure disabled field has been updated.
      expect(userRecord.uid).to.equal(uid);
      expect(userRecord.disabled).to.equal(true);

      try {
        // If it is in emulator mode, a user-disabled error will be thrown.
        decodedIdToken = await getAuth().verifySessionCookie(sessionCookie, false);
        expect(decodedIdToken.uid).to.equal(uid);
      } catch (error) {
        if (authEmulatorHost) {
          expect(error).to.have.property('code', 'auth/user-disabled');
        } else {
          throw error;
        }
      }

      try {
        await getAuth().verifySessionCookie(sessionCookie, true);
      } catch (error) {
        expect(error).to.have.property('code', 'auth/user-disabled');
      }
    });
  });

  describe('importUsers()', () => {
    const randomUid = 'import_' + generateRandomString(20).toLowerCase();
    let importUserRecord: UserImportRecord;
    const rawPassword = 'password';
    const rawSalt = 'NaCl';
    // Simulate a user stored using SCRYPT being migrated to Firebase Auth via importUsers.
    // Obtained from https://github.com/firebase/scrypt.
    const scryptHashKey = 'jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZ' +
      'JzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==';
    const scryptPasswordHash = 'V358E8LdWJXAO7muq0CufVpEOXaj8aFiC7T/rcaGieN04q/ZPJ0' +
      '8WhJEHGjj9lz/2TT+/86N5VjVoc5DdBhBiw==';
    const scryptHashOptions = {
      hash: {
        algorithm: 'SCRYPT',
        key: Buffer.from(scryptHashKey, 'base64'),
        saltSeparator: Buffer.from('Bw==', 'base64'),
        rounds: 8,
        memoryCost: 14,
      },
    };

    afterEach(() => {
      return safeDelete(randomUid);
    });

    const fixtures: UserImportTest[] = [
      {
        name: 'HMAC_SHA256',
        importOptions: {
          hash: {
            algorithm: 'HMAC_SHA256',
            key: Buffer.from('secret'),
          },
        } as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          expect(userImportTest.importOptions.hash.key).to.exist;
          const currentHashKey = userImportTest.importOptions.hash.key!.toString('utf8');
          const currentRawPassword = userImportTest.rawPassword;
          const currentRawSalt = userImportTest.rawSalt;
          return crypto.createHmac('sha256', currentHashKey)
            .update(currentRawPassword + currentRawSalt).digest();
        },
        rawPassword,
        rawSalt,
      },
      {
        name: 'SHA256',
        importOptions: {
          hash: {
            algorithm: 'SHA256',
            rounds: 1,
          },
        } as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          const currentRawPassword = userImportTest.rawPassword;
          const currentRawSalt = userImportTest.rawSalt;
          return crypto.createHash('sha256').update(currentRawSalt + currentRawPassword).digest();
        },
        rawPassword,
        rawSalt,
      },
      {
        name: 'MD5',
        importOptions: {
          hash: {
            algorithm: 'MD5',
            rounds: 0,
          },
        } as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          const currentRawPassword = userImportTest.rawPassword;
          const currentRawSalt = userImportTest.rawSalt;
          return Buffer.from(crypto.createHash('md5')
            .update(currentRawSalt + currentRawPassword).digest('hex'));
        },
        rawPassword,
        rawSalt,
      },
      {
        name: 'BCRYPT',
        importOptions: {
          hash: {
            algorithm: 'BCRYPT',
          },
        } as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          return Buffer.from(bcrypt.hashSync(userImportTest.rawPassword, 10));
        },
        rawPassword,
      },
      {
        name: 'STANDARD_SCRYPT',
        importOptions: {
          hash: {
            algorithm: 'STANDARD_SCRYPT',
            memoryCost: 1024,
            parallelization: 16,
            blockSize: 8,
            derivedKeyLength: 64,
          },
        } as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          const currentRawPassword = userImportTest.rawPassword;

          expect(userImportTest.rawSalt).to.exist;
          const currentRawSalt = userImportTest.rawSalt!;

          expect(userImportTest.importOptions.hash.memoryCost).to.exist;
          const N = userImportTest.importOptions.hash.memoryCost!;

          expect(userImportTest.importOptions.hash.blockSize).to.exist;
          const r = userImportTest.importOptions.hash.blockSize!;

          expect(userImportTest.importOptions.hash.parallelization).to.exist;
          const p = userImportTest.importOptions.hash.parallelization!;

          expect(userImportTest.importOptions.hash.derivedKeyLength).to.exist;
          const dkLen = userImportTest.importOptions.hash.derivedKeyLength!;

          return Buffer.from(
            crypto.scryptSync(
              currentRawPassword,
              Buffer.from(currentRawSalt),
              dkLen,
              {
                N, r, p,
              }));
        },
        rawPassword,
        rawSalt,
      },
      {
        name: 'PBKDF2_SHA256',
        importOptions: {
          hash: {
            algorithm: 'PBKDF2_SHA256',
            rounds: 100000,
          },
        } as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          const currentRawPassword = userImportTest.rawPassword;
          expect(userImportTest.rawSalt).to.exist;
          const currentRawSalt = userImportTest.rawSalt!;
          expect(userImportTest.importOptions.hash.rounds).to.exist;
          const currentRounds = userImportTest.importOptions.hash.rounds!;
          return crypto.pbkdf2Sync(
            currentRawPassword, currentRawSalt, currentRounds, 64, 'sha256');
        },
        rawPassword,
        rawSalt,
      },
      {
        name: 'SCRYPT',
        importOptions: scryptHashOptions as any,
        computePasswordHash: (): Buffer => {
          return Buffer.from(scryptPasswordHash, 'base64');
        },
        rawPassword,
        rawSalt,
      },
    ];

    fixtures.forEach((fixture) => {
      it(`successfully imports users with ${fixture.name} to Firebase Auth.`, function () {
        if (authEmulatorHost) {
          return this.skip(); // Auth Emulator does not support real hashes.
        }
        importUserRecord = {
          uid: randomUid,
          email: randomUid + '@example.com',
        };
        importUserRecord.passwordHash = fixture.computePasswordHash(fixture);
        if (typeof fixture.rawSalt !== 'undefined') {
          importUserRecord.passwordSalt = Buffer.from(fixture.rawSalt);
        }
        return testImportAndSignInUser(
          importUserRecord, fixture.importOptions, fixture.rawPassword)
          .should.eventually.be.fulfilled;

      });
    });

    it('successfully imports users with multiple OAuth providers', () => {
      const uid = randomUid;
      const email = uid + '@example.com';
      const now = new Date(1476235905000).toUTCString();
      const photoURL = 'http://www.example.com/' + uid + '/photo.png';
      importUserRecord = {
        uid,
        email,
        emailVerified: true,
        displayName: 'Test User',
        photoURL,
        phoneNumber: '+15554446666',
        disabled: false,
        customClaims: { admin: true },
        metadata: {
          lastSignInTime: now,
          creationTime: now,
          // TODO(rsgowman): Enable once importing users supports lastRefreshTime
          //lastRefreshTime: now,
        },
        providerData: [
          {
            uid: uid + '-facebook',
            displayName: 'Facebook User',
            email,
            photoURL: photoURL + '?providerId=facebook.com',
            providerId: 'facebook.com',
          },
          {
            uid: uid + '-twitter',
            displayName: 'Twitter User',
            photoURL: photoURL + '?providerId=twitter.com',
            providerId: 'twitter.com',
          },
        ],
      };
      uids.push(importUserRecord.uid);
      return getAuth().importUsers([importUserRecord])
        .then((result) => {
          expect(result.failureCount).to.equal(0);
          expect(result.successCount).to.equal(1);
          expect(result.errors.length).to.equal(0);
          return getAuth().getUser(uid);
        }).then((userRecord) => {
          // The phone number provider will be appended to the list of accounts.
          importUserRecord.providerData?.push({
            uid: importUserRecord.phoneNumber!,
            providerId: 'phone',
            phoneNumber: importUserRecord.phoneNumber!,
          });
          // The lastRefreshTime should be set to null
          type Writable<UserMetadata> = {
            -readonly [k in keyof UserMetadata]: UserMetadata[k];
          };
          (importUserRecord.metadata as Writable<UserMetadata>).lastRefreshTime = null;
          const actualUserRecord: { [key: string]: any } = userRecord.toJSON();
          for (const key of Object.keys(importUserRecord)) {
            expect(JSON.stringify(actualUserRecord[key]))
              .to.be.equal(JSON.stringify((importUserRecord as any)[key]));
          }
        });
    });

    it('successfully imports users with enrolled second factors', function () {
      if (authEmulatorHost) {
        return this.skip(); // Not yet implemented.
      }
      const uid = generateRandomString(20).toLowerCase();
      const email = uid + '@example.com';
      const now = new Date(1476235905000).toUTCString();
      const enrolledFactors: UpdatePhoneMultiFactorInfoRequest[] = [
        {
          uid: 'mfaUid1',
          phoneNumber: '+16505550001',
          displayName: 'Work phone number',
          factorId: 'phone',
          enrollmentTime: now,
        },
        {
          uid: 'mfaUid2',
          phoneNumber: '+16505550002',
          displayName: 'Personal phone number',
          factorId: 'phone',
          enrollmentTime: now,
        },
      ];

      importUserRecord = {
        uid,
        email,
        emailVerified: true,
        displayName: 'Test User',
        disabled: false,
        metadata: {
          lastSignInTime: now,
          creationTime: now,
        },
        providerData: [
          {
            uid: uid + '-facebook',
            displayName: 'Facebook User',
            email,
            providerId: 'facebook.com',
          },
        ],
        multiFactor: {
          enrolledFactors,
        },
      };
      uids.push(importUserRecord.uid);

      return getAuth().importUsers([importUserRecord])
        .then((result) => {
          expect(result.failureCount).to.equal(0);
          expect(result.successCount).to.equal(1);
          expect(result.errors.length).to.equal(0);
          return getAuth().getUser(uid);
        }).then((userRecord) => {
          // Confirm second factors added to user.
          const actualUserRecord: { [key: string]: any } = userRecord.toJSON();
          expect(actualUserRecord.multiFactor.enrolledFactors.length).to.equal(2);
          expect(actualUserRecord.multiFactor.enrolledFactors)
            .to.deep.equal(importUserRecord.multiFactor?.enrolledFactors);
        }).should.eventually.be.fulfilled;
    });

    it('fails when invalid users are provided', () => {
      const users = [
        { uid: generateRandomString(20).toLowerCase(), email: 'invalid' },
        { uid: generateRandomString(20).toLowerCase(), emailVerified: 'invalid' } as any,
      ];
      return getAuth().importUsers(users)
        .then((result) => {
          expect(result.successCount).to.equal(0);
          expect(result.failureCount).to.equal(2);
          expect(result.errors.length).to.equal(2);
          expect(result.errors[0].index).to.equal(0);
          expect(result.errors[0].error.code).to.equals('auth/invalid-email');
          expect(result.errors[1].index).to.equal(1);
          expect(result.errors[1].error.code).to.equals('auth/invalid-email-verified');
        });
    });

    it('fails when users with invalid phone numbers are provided', function () {
      if (authEmulatorHost) {
        // Auth Emulator's phoneNumber validation is also lax and won't throw.
        return this.skip();
      }
      const users = [
        // These phoneNumbers passes local (lax) validator but fails remotely.
        { uid: generateRandomString(20).toLowerCase(), phoneNumber: '+1error' },
        { uid: generateRandomString(20).toLowerCase(), phoneNumber: '+1invalid' },
      ];
      return getAuth().importUsers(users)
        .then((result) => {
          expect(result.successCount).to.equal(0);
          expect(result.failureCount).to.equal(2);
          expect(result.errors.length).to.equal(2);
          expect(result.errors[0].index).to.equal(0);
          expect(result.errors[0].error.code).to.equals('auth/invalid-user-import');
          expect(result.errors[1].index).to.equal(1);
          expect(result.errors[1].error.code).to.equals('auth/invalid-user-import');
        });
    });
  });
});

/**
 * Imports the provided user record with the specified hashing options and then
 * validates the import was successful by signing in to the imported account using
 * the corresponding plain text password.
 * @param importUserRecord The user record to import.
 * @param importOptions The import hashing options.
 * @param rawPassword The plain unhashed password string.
 * @retunr A promise that resolved on success.
 */
function testImportAndSignInUser(
  importUserRecord: UserImportRecord,
  importOptions: any,
  rawPassword: string): Promise<void> {
  const users = [importUserRecord];
  // Import the user record.
  return getAuth().importUsers(users, importOptions)
    .then((result) => {
      // Verify the import result.
      expect(result.failureCount).to.equal(0);
      expect(result.successCount).to.equal(1);
      expect(result.errors.length).to.equal(0);
      // Sign in with an email and password to the imported account.
      return clientAuth().signInWithEmailAndPassword(users[0].email!, rawPassword);
    })
    .then(({ user }) => {
      // Confirm successful sign-in.
      expect(user).to.exist;
      expect(user!.email).to.equal(users[0].email);
      expect(user!.providerData[0]).to.exist;
      expect(user!.providerData[0]!.providerId).to.equal('password');
    });
}

/**
 * Helper function that deletes the user with the specified phone number
 * if it exists.
 * @param phoneNumber The phone number of the user to delete.
 * @return A promise that resolves when the user is deleted
 *     or is found not to exist.
 */
function deletePhoneNumberUser(phoneNumber: string): Promise<void> {
  return getAuth().getUserByPhoneNumber(phoneNumber)
    .then((userRecord) => {
      return safeDelete(userRecord.uid);
    })
    .catch((error) => {
      // Suppress user not found error.
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    });
}

/**
 * Runs cleanup routine that could affect outcome of tests and removes any
 * intermediate users created.
 *
 * @return A promise that resolves when test preparations are ready.
 */
function cleanup(): Promise<any> {
  // Delete any existing users that could affect the test outcome.
  const promises: Array<Promise<void>> = [
    deletePhoneNumberUser(testPhoneNumber),
    deletePhoneNumberUser(testPhoneNumber2),
    deletePhoneNumberUser(nonexistentPhoneNumber),
    deletePhoneNumberUser(updatedPhone),
  ];
  // Delete users created for session cookie tests.
  sessionCookieUids.forEach((uid) => uids.push(uid));
  // Delete list of users for testing listUsers.
  uids.forEach((uid) => {
    // Use safeDelete to avoid getting throttled.
    promises.push(safeDelete(uid));
  });
  return Promise.all(promises);
}

/**
 * Returns the action code corresponding to the link.
 *
 * @param link The link to parse for the action code.
 * @return The link's corresponding action code.
 */
function getActionCode(link: string): string {
  const parsedUrl = new url.URL(link);
  const oobCode = parsedUrl.searchParams.get('oobCode');
  expect(oobCode).to.exist;
  return oobCode!;
}

/**
 * Returns the continue URL corresponding to the link.
 *
 * @param link The link to parse for the continue URL.
 * @return The link's corresponding continue URL.
 */
function getContinueUrl(link: string): string {
  const parsedUrl = new url.URL(link);
  const continueUrl = parsedUrl.searchParams.get('continueUrl');
  expect(continueUrl).to.exist;
  return continueUrl!;
}

/**
 * Returns the tenant ID corresponding to the link.
 *
 * @param link The link to parse for the tenant ID.
 * @return The link's corresponding tenant ID.
 */
function getTenantId(link: string): string {
  const parsedUrl = new url.URL(link);
  const tenantId = parsedUrl.searchParams.get('tenantId');
  expect(tenantId).to.exist;
  return tenantId!;
}

/**
 * Safely deletes a specificed user identified by uid. This API chains all delete
 * requests and throttles them as the Auth backend rate limits this endpoint.
 * A bulk delete API is being designed to help solve this issue.
 *
 * @param uid The identifier of the user to delete.
 * @return A promise that resolves when delete operation resolves.
 */
function safeDelete(uid: string): Promise<void> {
  // Wait for delete queue to empty.
  const deletePromise = deleteQueue
    .then(() => {
      return getAuth().deleteUser(uid);
    })
    .catch((error) => {
      // Suppress user not found error.
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    });
  // Suppress errors in delete queue to not spill over to next item in queue.
  deleteQueue = deletePromise.catch(() => {
    // Do nothing.
  });
  return deletePromise;
}

/**
 * Deletes the specified list of users by calling the `deleteUsers()` API. This
 * API is rate limited at 1 QPS, and therefore this helper function staggers
 * subsequent invocations by adding 1 second delay to each call.
 *
 * @param uids The list of user identifiers to delete.
 * @return A promise that resolves when delete operation resolves.
 */
async function deleteUsersWithDelay(uids: string[]): Promise<DeleteUsersResult> {
  if (!authEmulatorHost) {
    await new Promise((resolve) => { setTimeout(resolve, 1000); });
  }
  return getAuth().deleteUsers(uids);
}

/**
 * Asserts actual object is equal to expected object while ignoring key order.
 * This is useful since to.deep.equal fails when order differs.
 *
 * @param expected object.
 * @param actual object.
 */
function assertDeepEqualUnordered(expected: { [key: string]: any }, actual: { [key: string]: any }): void {
  for (const key in expected) {
    if (Object.prototype.hasOwnProperty.call(expected, key)) {
      expect(actual[key])
        .to.deep.equal(expected[key]);
    }
  }
  expect(Object.keys(actual).length).to.be.equal(Object.keys(expected).length);
}

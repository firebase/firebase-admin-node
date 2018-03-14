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

import * as admin from '../../lib/index';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as scrypt from 'scrypt';
import firebase = require('firebase');
import {clone} from 'lodash';
import {generateRandomString, projectId, apiKey} from './setup';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

const newUserUid = generateRandomString(20);
const nonexistentUid = generateRandomString(20);
const testPhoneNumber = '+11234567890';
const testPhoneNumber2 = '+16505550101';
const nonexistentPhoneNumber = '+18888888888';
const updatedEmail = generateRandomString(20) + '@example.com';
const updatedPhone = '+16505550102';
const customClaims = {
  admin: true,
  groupId: '1234',
};
const uids = [newUserUid + '-1', newUserUid + '-2', newUserUid + '-3'];
const mockUserData = {
  email: newUserUid + '@example.com',
  emailVerified: false,
  phoneNumber: testPhoneNumber,
  password: 'password',
  displayName: 'Random User ' + newUserUid,
  photoURL: 'http://www.example.com/' + newUserUid + '/photo.png',
  disabled: false,
};
let deleteQueue = Promise.resolve();

interface UserImportTest {
  name: string;
  importOptions: admin.auth.UserImportOptions;
  rawPassword: string;
  rawSalt?: string;
  computePasswordHash(userImportTest: UserImportTest): Buffer;
}


describe('admin.auth', () => {

  let uidFromCreateUserWithoutUid: string;

  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
    return cleanup();
  });

  after(() => {
    return cleanup();
  });

  it('createUser() creates a new user when called without a UID', () => {
    const newUserData = clone(mockUserData);
    newUserData.email = generateRandomString(20) + '@example.com';
    newUserData.phoneNumber = testPhoneNumber2;
    return admin.auth().createUser(newUserData)
      .then((userRecord) => {
        uidFromCreateUserWithoutUid = userRecord.uid;
        expect(typeof userRecord.uid).to.equal('string');
        // Confirm expected email.
        expect(userRecord.email).to.equal(newUserData.email.toLowerCase());
        // Confirm expected phone number.
        expect(userRecord.phoneNumber).to.equal(newUserData.phoneNumber);
      });
  });

  it('createUser() creates a new user with the specified UID', () => {
    const newUserData: any = clone(mockUserData);
    newUserData.uid = newUserUid;
    return admin.auth().createUser(newUserData)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
        // Confirm expected email.
        expect(userRecord.email).to.equal(newUserData.email.toLowerCase());
        // Confirm expected phone number.
        expect(userRecord.phoneNumber).to.equal(newUserData.phoneNumber);
      });
  });

  it('createUser() fails when the UID is already in use', () => {
    const newUserData: any = clone(mockUserData);
    newUserData.uid = newUserUid;
    return admin.auth().createUser(newUserData)
      .should.eventually.be.rejected.and.have.property('code', 'auth/uid-already-exists');
  });

  it('getUser() returns a user record with the matching UID', () => {
    return admin.auth().getUser(newUserUid)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByEmail() returns a user record with the matching email', () => {
    return admin.auth().getUserByEmail(mockUserData.email)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('getUserByPhoneNumber() returns a user record with the matching phone number', () => {
    return admin.auth().getUserByPhoneNumber(mockUserData.phoneNumber)
      .then((userRecord) => {
        expect(userRecord.uid).to.equal(newUserUid);
      });
  });

  it('listUsers() returns up to the specified number of users', () => {
    const promises: Array<Promise<admin.auth.UserRecord>> = [];
    uids.forEach((uid) => {
      const tempUserData = {
        uid,
        password: 'password',
      };
      promises.push(admin.auth().createUser(tempUserData));
    });
    return Promise.all(promises)
      .then(() => {
        // Return 2 users with the provided page token.
        // This test will fail if other users are created in between.
        return admin.auth().listUsers(2, uids[0]);
      })
      .then((listUsersResult) => {
        // Confirm expected number of users.
        expect(listUsersResult.users.length).to.equal(2);
        // Confirm next page token present.
        expect(typeof listUsersResult.pageToken).to.equal('string');
        // Confirm each user's uid and the hashed passwords.
        expect(listUsersResult.users[0].uid).to.equal(uids[1]);
        expect(listUsersResult.users[0].passwordHash.length).greaterThan(0);
        expect(listUsersResult.users[0].passwordSalt.length).greaterThan(0);

        expect(listUsersResult.users[1].uid).to.equal(uids[2]);
        expect(listUsersResult.users[1].passwordHash.length).greaterThan(0);
        expect(listUsersResult.users[1].passwordSalt.length).greaterThan(0);
      });
  }).timeout(5000);

  it('revokeRefreshTokens() invalidates existing sessions and ID tokens', () => {
    let currentIdToken: string = null;
    let currentUser: any = null;
    // Sign in with an email and password account.
    return firebase.auth().signInWithEmailAndPassword(mockUserData.email, mockUserData.password)
      .then((user) => {
        currentUser = user;
        // Get user's ID token.
        return user.getIdToken();
      })
      .then((idToken) => {
        currentIdToken = idToken;
        // Verify that user's ID token while checking for revocation.
        return admin.auth().verifyIdToken(currentIdToken, true);
      })
      .then((decodedIdToken) => {
        // Verification should succeed. Revoke that user's session.
        return new Promise((resolve) => setTimeout(() => resolve(
          admin.auth().revokeRefreshTokens(decodedIdToken.sub),
        ), 1000));
      })
      .then(() => {
        // verifyIdToken without checking revocation should still succeed.
        return admin.auth().verifyIdToken(currentIdToken)
          .should.eventually.be.fulfilled;
      })
      .then(() => {
        // verifyIdToken while checking for revocation should fail.
        return admin.auth().verifyIdToken(currentIdToken, true)
          .should.eventually.be.rejected.and.have.property('code', 'auth/id-token-revoked');
      })
      .then(() => {
        // Confirm token revoked on client.
        return currentUser.reload()
          .should.eventually.be.rejected.and.have.property('code', 'auth/user-token-expired');
      })
      .then(() => {
        // New sign-in should succeed.
        return firebase.auth().signInWithEmailAndPassword(
            mockUserData.email, mockUserData.password);
      })
      .then((user) => {
        // Get new session's ID token.
        return user.getIdToken();
      })
      .then((idToken) => {
        // ID token for new session should be valid even with revocation check.
        return admin.auth().verifyIdToken(idToken, true)
          .should.eventually.be.fulfilled;
      });
  }).timeout(10000);

  it('setCustomUserClaims() sets claims that are accessible via user\'s ID token', () => {
    // Set custom claims on the user.
    return admin.auth().setCustomUserClaims(newUserUid, customClaims)
      .then(() => {
        return admin.auth().getUser(newUserUid);
      })
      .then((userRecord) => {
        // Confirm custom claims set on the UserRecord.
        expect(userRecord.customClaims).to.deep.equal(customClaims);
        return firebase.auth().signInWithEmailAndPassword(
          userRecord.email, mockUserData.password);
      })
      .then((user) => {
         // Get the user's ID token.
         return user.getIdToken();
      })
      .then((idToken) => {
         // Verify ID token contents.
         return admin.auth().verifyIdToken(idToken);
      })
      .then((decodedIdToken) => {
        // Confirm expected claims set on the user's ID token.
        for (const key in customClaims) {
          if (customClaims.hasOwnProperty(key)) {
            expect(decodedIdToken[key]).to.equal(customClaims[key]);
          }
        }
      });
  }).timeout(5000);

  it('updateUser() updates the user record with the given parameters', () => {
    const updatedDisplayName = 'Updated User ' + newUserUid;
    return admin.auth().updateUser(newUserUid, {
      email: updatedEmail,
      phoneNumber: updatedPhone,
      emailVerified: true,
      displayName: updatedDisplayName,
    })
      .then((userRecord) => {
        expect(userRecord.emailVerified).to.be.true;
        expect(userRecord.displayName).to.equal(updatedDisplayName);
        // Confirm expected email.
        expect(userRecord.email).to.equal(updatedEmail.toLowerCase());
        // Confirm expected phone number.
        expect(userRecord.phoneNumber).to.equal(updatedPhone);
      });
  });

  it('getUser() fails when called with a non-existing UID', () => {
    return admin.auth().getUser(nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByEmail() fails when called with a non-existing email', () => {
    return admin.auth().getUserByEmail(nonexistentUid + '@example.com')
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('getUserByPhoneNumber() fails when called with a non-existing phone number', () => {
    return admin.auth().getUserByPhoneNumber(nonexistentPhoneNumber)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('updateUser() fails when called with a non-existing UID', () => {
    return admin.auth().updateUser(nonexistentUid, {
      emailVerified: true,
    }).should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('deleteUser() fails when called with a non-existing UID', () => {
    return admin.auth().deleteUser(nonexistentUid)
      .should.eventually.be.rejected.and.have.property('code', 'auth/user-not-found');
  });

  it('createCustomToken() mints a JWT that can be used to sign in', () => {
    return admin.auth().createCustomToken(newUserUid, {
      isAdmin: true,
    })
      .then((customToken) => {
        return firebase.auth().signInWithCustomToken(customToken);
      })
      .then((user) => {
        return user.getIdToken();
      })
      .then((idToken) => {
        return admin.auth().verifyIdToken(idToken);
      })
      .then((token) => {
        expect(token.uid).to.equal(newUserUid);
        expect(token.isAdmin).to.be.true;
      });
  });

  it('verifyIdToken() fails when called with an invalid token', () => {
    return admin.auth().verifyIdToken('invalid-token')
      .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
  });

  it('deleteUser() deletes the user with the given UID', () => {
    return Promise.all([
      admin.auth().deleteUser(newUserUid),
      admin.auth().deleteUser(uidFromCreateUserWithoutUid),
    ]).should.eventually.be.fulfilled;
  });

  describe('importUsers()', () => {
    const randomUid = 'import_' + generateRandomString(20).toLowerCase();
    let importUserRecord;
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
          const currentHashKey = userImportTest.importOptions.hash.key.toString('utf8');
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
            rounds: 0,
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
          const currentRawSalt = userImportTest.rawSalt;
          const N = userImportTest.importOptions.hash.memoryCost;
          const r = userImportTest.importOptions.hash.blockSize;
          const p = userImportTest.importOptions.hash.parallelization;
          const dkLen = userImportTest.importOptions.hash.derivedKeyLength;
          return Buffer.from(scrypt.hashSync(
              currentRawPassword, {N, r, p}, dkLen, new Buffer(currentRawSalt)));
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
          const currentRawSalt = userImportTest.rawSalt;
          const currentRounds = userImportTest.importOptions.hash.rounds;
          return crypto.pbkdf2Sync(
              currentRawPassword, currentRawSalt, currentRounds, 64, 'sha256');
        },
        rawPassword,
        rawSalt,
      },
      {
        name: 'SCRYPT',
        importOptions: scryptHashOptions as any,
        computePasswordHash: (userImportTest: UserImportTest): Buffer => {
          return Buffer.from(scryptPasswordHash, 'base64');
        },
        rawPassword,
        rawSalt,
      },
    ];

    fixtures.forEach((fixture) => {
      it(`successfully imports users with ${fixture.name} to Firebase Auth.`, () => {
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

      }).timeout(5000);
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
        customClaims: {admin: true},
        metadata: {
          lastSignInTime: now,
          creationTime: now,
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
      return admin.auth().importUsers([importUserRecord])
        .then((result) => {
          expect(result.failureCount).to.equal(0);
          expect(result.successCount).to.equal(1);
          expect(result.errors.length).to.equal(0);
          return admin.auth().getUser(uid);
        }).then((userRecord) => {
          // The phone number provider will be appended to the list of accounts.
          importUserRecord.providerData.push({
            uid: importUserRecord.phoneNumber,
            providerId: 'phone',
            phoneNumber: importUserRecord.phoneNumber,
          });
          const actualUserRecord = userRecord.toJSON();
          for (const key of Object.keys(importUserRecord)) {
            expect(JSON.stringify(actualUserRecord[key]))
              .to.be.equal(JSON.stringify(importUserRecord[key]));
          }
        }).should.eventually.be.fulfilled;
    });

    it('fails when invalid users are provided', () => {
      const users = [
        {uid: generateRandomString(20).toLowerCase(), phoneNumber: '+1error'},
        {uid: generateRandomString(20).toLowerCase(), email: 'invalid'},
        {uid: generateRandomString(20).toLowerCase(), phoneNumber: '+1invalid'},
        {uid: generateRandomString(20).toLowerCase(), emailVerified: 'invalid'} as any,
      ];
      return admin.auth().importUsers(users)
        .then((result) => {
          expect(result.successCount).to.equal(0);
          expect(result.failureCount).to.equal(4);
          expect(result.errors.length).to.equal(4);
          expect(result.errors[0].index).to.equal(0);
          expect(result.errors[0].error.code).to.equals('auth/invalid-user-import');
          expect(result.errors[1].index).to.equal(1);
          expect(result.errors[1].error.code).to.equals('auth/invalid-email');
          expect(result.errors[2].index).to.equal(2);
          expect(result.errors[2].error.code).to.equals('auth/invalid-user-import');
          expect(result.errors[3].index).to.equal(3);
          expect(result.errors[3].error.code).to.equals('auth/invalid-email-verified');
        }).should.eventually.be.fulfilled;
    });
  });
});

/**
 * Imports the provided user record with the specified hashing options and then
 * validates the import was successful by signing in to the imported account using
 * the corresponding plain text password.
 * @param {admin.auth.UserImportRecord} importUserRecord The user record to import.
 * @param {admin.auth.UserImportOptions} importOptions The import hashing options.
 * @param {string} rawPassword The plain unhashed password string.
 * @retunr {Promise<void>} A promise that resolved on success.
 */
function testImportAndSignInUser(
    importUserRecord: any, importOptions: any, rawPassword: string): Promise<void> {
  const users = [importUserRecord];
  // Import the user record.
  return admin.auth().importUsers(users, importOptions)
    .then((result) => {
      // Verify the import result.
      expect(result.failureCount).to.equal(0);
      expect(result.successCount).to.equal(1);
      expect(result.errors.length).to.equal(0);
      // Sign in with an email and password to the imported account.
      return firebase.auth().signInWithEmailAndPassword(users[0].email, rawPassword);
    })
    .then((user) => {
      // Confirm successful sign-in.
      expect(user.email).to.equal(users[0].email);
      expect(user.providerData[0].providerId).to.equal('password');
    });
}

/**
 * Helper function that deletes the user with the specified phone number
 * if it exists.
 * @param {string} phoneNumber The phone number of the user to delete.
 * @return {Promise} A promise that resolves when the user is deleted
 *     or is found not to exist.
 */
function deletePhoneNumberUser(phoneNumber) {
  return admin.auth().getUserByPhoneNumber(phoneNumber)
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
 * @return {Promise} A promise that resolves when test preparations are ready.
 */
function cleanup() {
  // Delete any existing users that could affect the test outcome.
  const promises: Array<Promise<void>> = [
    deletePhoneNumberUser(testPhoneNumber),
    deletePhoneNumberUser(testPhoneNumber2),
    deletePhoneNumberUser(nonexistentPhoneNumber),
    deletePhoneNumberUser(updatedPhone),
  ];
  // Delete list of users for testing listUsers.
  uids.forEach((uid) => {
    // Use safeDelete to avoid getting throttled.
    promises.push(safeDelete(uid));
  });
  return Promise.all(promises);
}

/**
 * Safely deletes a specificed user identified by uid. This API chains all delete
 * requests and throttles them as the Auth backend rate limits this endpoint.
 * A bulk delete API is being designed to help solve this issue.
 *
 * @param {string} uid The identifier of the user to delete.
 * @return {Promise} A promise that resolves when delete operation resolves.
 */
function safeDelete(uid: string): Promise<void> {
  // Wait for delete queue to empty.
  const deletePromise = deleteQueue
    .then(() => {
      return admin.auth().deleteUser(uid);
    })
    .catch((error) => {
      // Suppress user not found error.
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    });
  // Suppress errors in delete queue to not spill over to next item in queue.
  deleteQueue = deletePromise.catch((error) => {
    // Do nothing.
  });
  return deletePromise;
}

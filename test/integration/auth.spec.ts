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
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import firebase = require('firebase');
import {clone} from 'lodash';
import {generateRandomString, projectId, apiKey} from './setup';

chai.should();
chai.use(chaiAsPromised);

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

describe('admin.auth', () => {

  let uidFromCreateUserWithoutUid: string;

  before(() => {
    firebase.initializeApp({
      apiKey,
      authDomain: projectId + '.firebaseapp.com',
    });
    cleanup();
  });

  after(() => {
    cleanup();
  });

  it('createUser() creates a new user when called without a UID', () => {
    let newUserData = clone(mockUserData);
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
    let newUserData: any = clone(mockUserData);
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
    let newUserData: any = clone(mockUserData);
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
    let promises: Promise<admin.auth.UserRecord>[] = [];
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
  });

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
        return admin.auth().revokeRefreshTokens(decodedIdToken.sub);
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
        for (let key in customClaims) {
          if (customClaims.hasOwnProperty(key)) {
            expect(decodedIdToken[key]).to.equal(customClaims[key]);
          }
        }
      });
  });

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
});

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
      return admin.auth().deleteUser(userRecord.uid);
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
  let promises: Promise<void>[] = [
    deletePhoneNumberUser(testPhoneNumber),
    deletePhoneNumberUser(testPhoneNumber2),
    deletePhoneNumberUser(nonexistentPhoneNumber),
    deletePhoneNumberUser(updatedPhone),
  ];
  // Delete list of users for testing listUsers.
  uids.forEach((uid) => {
    promises.push(
      admin.auth().deleteUser(uid)
        .catch((error) => {
          // Suppress user not found error.
          if (error.code !== 'auth/user-not-found') {
            throw error;
          }
        })
    );
  });
  return Promise.all(promises);
}

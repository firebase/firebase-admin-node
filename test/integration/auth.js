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

var _ = require('lodash');
var firebase = require('firebase');

var admin = require('../../lib/index');
var testutils = require('./utils');

firebase.initializeApp({
  apiKey: testutils.getApiKey(),
  authDomain: testutils.getProjectId() + ".firebaseapp.com",
});

function test(utils) {
  console.log('\nAuth:');

  var idTokenToTest;
  var uidFromCreateUserWithoutUid;

  var newUserUid = utils.generateRandomString(20);
  var nonexistentUid = utils.generateRandomString(20);
  var testPhoneNumber = '+11234567890';
  var testPhoneNumber2 = '+16505550101';
  var nonexistentPhoneNumber = '+18888888888';
  var updatedEmail = utils.generateRandomString(20) + '@example.com';
  var updatedPhone = '+16505550102';
  var customClaims = {
    admin: true,
    groupId: '1234'
  };
  var uids = [newUserUid + '-1', newUserUid + '-2', newUserUid + '-3'];

  var mockUserData = {
    email: newUserUid + '@example.com',
    emailVerified: false,
    phoneNumber: testPhoneNumber,
    password: 'password',
    displayName: 'Random User ' + newUserUid,
    photoURL: 'http://www.example.com/' + newUserUid + '/photo.png',
    disabled: false,
  };

  /**
   * Helper function that deletes the user with the specified phone number
   * if it exists.
   * @param {string} phoneNumber The phone number of the user to delete.
   * @return {Promise} A promise that resolves when the user is deleted
   *     or is found not to exist.
   */
  function deletePhoneNumberUser(phoneNumber) {
    return admin.auth().getUserByPhoneNumber(phoneNumber)
      .then(function(userRecord) {
        return admin.auth().deleteUser(userRecord.uid);
      })
      .catch(function(error) {
        // Suppress user not found error.
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      });
  }

  /**
   * Runs cleanup routine that could affect outcome of tests and removes any
   * intermediate users created.
   * @param {string} label The test label.
   * @return {Promise} A promise that resolves when test preparations are ready.
   */
  function cleanup(label) {
    // Delete any existing users that could affect the test outcome.
    var promises = [
      deletePhoneNumberUser(testPhoneNumber),
      deletePhoneNumberUser(testPhoneNumber2),
      deletePhoneNumberUser(nonexistentPhoneNumber),
      deletePhoneNumberUser(updatedPhone)
    ];
    // Delete list of users for testing listUsers.
    uids.forEach(function(uid) {
      promises.push(
        admin.auth().deleteUser(uid)
          .catch(function(error) {
            // Suppress user not found error.
            if (error.code !== 'auth/user-not-found') {
              throw error;
            }
          })
      );
    });
    return Promise.all(promises)
      .catch(function(error) {
        utils.logFailure(label + '()', error);
      });
  }

  /**
   * Clean up routine to run before tests. This ensures any new users to be
   * created in the test, will not collide with existing users.
   */
  function before() {
    return cleanup('before');
  }

  /**
   * Clean up routine to run after tests. This cleans up the user database
   * from all intermediate users created. The before test should be sufficient
   * but for good practice, these temporary users are also removed from the
   * Auth backend, minimizing the surface area of project changes caused by
   * this test.
   */
  function after() {
    return cleanup('after');
  }

  function testCreateUserWithoutUid() {
    var newUserData = _.clone(mockUserData);
    newUserData.email = utils.generateRandomString(20) + '@example.com';
    newUserData.phoneNumber = testPhoneNumber2;
    return admin.auth().createUser(newUserData)
      .then(function(userRecord) {
        uidFromCreateUserWithoutUid = userRecord.uid;
        utils.assert(typeof userRecord.uid === 'string', 'auth().createUser(noUid)', 'Incorrect uid type.');
        // Confirm expected email.
        utils.assert(
          userRecord.email === newUserData.email.toLowerCase(),
          'auth().createUser(noUid)', 'Incorrect email.');
        // Confirm expected phone number.
        utils.assert(
          userRecord.phoneNumber === newUserData.phoneNumber,
          'auth().createUser(noUid)', 'Incorrect phone.');
      })
      .catch(function(error) {
        utils.logFailure('auth().createUser(noUid)', error);
      });
  }

  function testCreateUserWithUid() {
    var newUserData = _.clone(mockUserData);
    newUserData.uid = newUserUid;
    return admin.auth().createUser(newUserData)
      .then(function(userRecord) {
        utils.assert(userRecord.uid === newUserUid, 'auth().createUser(withUid)', 'Incorrect uid.');
        // Confirm expected email.
        utils.assert(
          userRecord.email === newUserData.email.toLowerCase(),
          'auth().createUser(withUid)', 'Incorrect email.');
        // Confirm expected phone number.
        utils.assert(
          userRecord.phoneNumber === newUserData.phoneNumber,
          'auth().createUser(withUid)', 'Incorrect phone.');
      })
      .catch(function(error) {
        utils.logFailure('auth().createUser(withUid)', error);
      });
  }

  function testCreateDuplicateUserWithError() {
    var newUserData = _.clone(mockUserData);
    newUserData.uid = newUserUid;
    return admin.auth().createUser(newUserData)
      .then(function() {
        utils.logFailure('auth().createUser(existingUid)', 'User unexpectedly returned.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'auth/uid-already-exists',
          'auth().createUser(existingUid)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function testGetUser() {
    return admin.auth().getUser(newUserUid)
      .then(function(userRecord) {
        utils.assert(userRecord.uid === newUserUid, 'auth().getUser()', 'Incorrect uid.');
      })
      .catch(function(error) {
        utils.logFailure('auth().getUser()', error);
      });
  }

  function testListUsers() {
    var promises = [];
    uids.forEach(function(uid) {
      var tempUserData = {
        uid: uid,
        password: 'password'
      };
      promises.push(admin.auth().createUser(tempUserData));
    });
    return Promise.all(promises)
      .then(function() {
        // Return 2 users with the provided page token.
        // This test will fail if other users are created in between.
        return admin.auth().listUsers(2, uids[0]);
      })
      .then(function(listUsersResult) {
        // Confirm expected number of users.
        utils.assert(
          listUsersResult.users.length == 2,
          'auth().listUsers() expected number of results',
          'Incorrect number of results.');
        // Confirm next page token present.
        utils.assert(
          typeof listUsersResult.pageToken === 'string',
          'auth().listUsers() expected next page token',
          'Missing next page token from results.');
        // Confirm each user's uid and the hashed passwords.
        utils.assert(
          listUsersResult.users[0].uid === uids[1] &&
          listUsersResult.users[0].passwordHash.length &&
          listUsersResult.users[0].passwordSalt.length,
          'auth().listUsers() expected first user',
          'Incorrect first user returned.');
        utils.assert(
          listUsersResult.users[1].uid === uids[2] &&
          listUsersResult.users[1].passwordHash.length &&
          listUsersResult.users[1].passwordSalt.length,
          'auth().listUsers() expected second user',
          'Incorrect second user returned.');
      })
      .catch(function(error) {
        utils.logFailure('auth().listUsers()', error);
      });
  }

  function testCustomAttributes() {
    // Set custom claims on the user.
    return admin.auth().setCustomUserClaims(newUserUid, customClaims)
      .then(function() {
        return admin.auth().getUser(newUserUid);
      })
      .then(function(userRecord) {
        // Confirm custom claims set on the UserRecord.
        utils.assert(
          _.isEqual(userRecord.customClaims, customClaims),
          'auth().setCustomUserClaims() expected claims on UserRecord',
          'Incorrect claims.');
        // Use client SDK to sign in the user.
        return firebase.auth().signInWithEmailAndPassword(
          userRecord.email, mockUserData.password);
      })
      .then(function(user) {
         // Get the user's ID token.
         return user.getToken();
      })
      .then(function(idToken) {
         // Verify ID token contents.
         return admin.auth().verifyIdToken(idToken);
      })
      .then(function(decodedIdToken) {
        // Confirm expected claims set on the user's ID token.
        for (var key in customClaims) {
          utils.assert(
            customClaims[key] === decodedIdToken[key],
            'auth().setCustomUserClaims() expected ID token key: ' + key,
            'Incorrect or missing claim "' + key + '".');
        }
      })
      .catch(function(error) {
        utils.logFailure('auth().setCustomUserClaims()', error);
      });
  }

  function testGetUserByEmail() {
    return admin.auth().getUserByEmail(mockUserData.email)
      .then(function(userRecord) {
        utils.assert(userRecord.uid === newUserUid, 'auth().getUserByEmail()', 'Incorrect uid.');
      })
      .catch(function(error) {
        utils.logFailure('auth().getUserByEmail()', error);
      });
  }

  function testGetUserByPhoneNumber() {
    return admin.auth().getUserByPhoneNumber(mockUserData.phoneNumber)
      .then(function(userRecord) {
        utils.assert(userRecord.uid === newUserUid, 'auth().getUserByPhoneNumber()', 'Incorrect uid.');
      })
      .catch(function(error) {
        utils.logFailure('auth().getUserByPhoneNumber()', error);
      });
  }

  function testUpdateUser() {
    var updatedDisplayName = 'Updated User ' + newUserUid;

    return admin.auth().updateUser(newUserUid, {
      email: updatedEmail,
      phoneNumber: updatedPhone,
      emailVerified: true,
      displayName: updatedDisplayName,
    })
      .then(function(userRecord) {
        utils.assert(
          (userRecord.emailVerified === true) && (userRecord.displayName === updatedDisplayName),
          'auth().updateUser()',
          'Incorrect emailVerified or displayName.'
        );
        // Confirm expected email.
        utils.assert(
          userRecord.email === updatedEmail.toLowerCase(),
          'auth().updateUser()', 'Incorrect email.');
        // Confirm expected phone number.
        utils.assert(
          userRecord.phoneNumber === updatedPhone, 'auth().updateUser()', 'Incorrect phone.');
      })
      .catch(function(error) {
        utils.logFailure('auth().updateUser()', error);
      });
  }

  function testDeleteUser() {
    return Promise.all([
      admin.auth().deleteUser(newUserUid),
      admin.auth().deleteUser(uidFromCreateUserWithoutUid)
    ])
      .then(function() {
        utils.logSuccess('auth().deleteUser()');
      })
      .catch(function(error) {
        utils.logFailure('auth().deleteUser()', error);
      });
  }

  function testGetNonexistentUserWithError() {
    return admin.auth().getUser(nonexistentUid)
      .then(function() {
        utils.logFailure('auth().getUser(nonexistentUid)', 'User unexpectedly returned.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'auth/user-not-found',
          'auth().getUser(nonexistentUid)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function testGetNonexistentUserByEmailWithError() {
    return admin.auth().getUserByEmail(nonexistentUid + '@example.com')
      .then(function() {
        utils.logFailure('auth().getUserEmail(nonexistentEmail)', 'User unexpectedly returned.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'auth/user-not-found',
          'auth().getUserEmail(nonexistentEmail)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function testGetNonexistentUserByPhoneNumberWithError() {
    return admin.auth().getUserByPhoneNumber(nonexistentPhoneNumber)
      .then(function() {
        utils.logFailure(
          'auth().getUserByPhoneNumber(nonexistentPhoneNumber)', 'User unexpectedly returned.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'auth/user-not-found',
          'auth().getUserByPhoneNumber(nonexistentPhoneNumber)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function testUpdateNonexistentUserWithError() {
    return admin.auth().updateUser(nonexistentUid, {
      emailVerified: true,
    })
      .then(function() {
        utils.logFailure('auth().updateUser(nonexistentUid)', 'User unexpectedly updated.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'auth/user-not-found',
          'auth().updateUser(nonexistentUid)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function testDeleteNonexistentUserWithError() {
    return admin.auth().deleteUser(nonexistentUid)
      .then(function() {
        utils.logFailure('auth().deleteUser(nonexistentUid)', 'User unexpectedly deleted.');
      })
      .catch(function(error) {
        utils.assert(
          error.code === 'auth/user-not-found',
          'auth().deleteUser(nonexistentUid)',
          'Incorrect error code: ' + error.code
        );
      });
  }

  function testCreateCustomToken() {
    return admin.auth().createCustomToken(newUserUid, {
      isAdmin: true,
    })
      .then(function(customToken) {
        return firebase.auth().signInWithCustomToken(customToken);
      })
      .then(function(user) {
        return user.getToken();
      })
      .then(function(idToken) {
        utils.logSuccess('auth.createCustomToken()');
        idTokenToTest = idToken;
      })
      .catch(function(error) {
        utils.logFailure('auth().createCustomToken()', error);
      });
  }

  function testVerifyIdToken() {
    return admin.auth().verifyIdToken(idTokenToTest)
      .then(function(token) {
        utils.assert(token.uid === newUserUid, 'auth().verifyIdToken(validToken)', 'ID token has wrong uid.');
      })
      .catch(function(error) {
        utils.logFailure('auth().verifyIdToken(validToken)', error);
      });
  }

  function testVerifyIdTokenWithError() {
    return admin.auth().verifyIdToken('invalid-token')
      .then(function(token) {
        utils.logFailure('auth().verifyIdToken(invalidToken)', 'ID token unexpectedly verified.');
      })
      .catch(function(error) {
        utils.logSuccess('auth().verifyIdToken(invalidToken)');
      });
  }


  return before()
    .then(testCreateUserWithoutUid)
    .then(testCreateUserWithUid)
    .then(testCreateDuplicateUserWithError)
    .then(testGetUser)
    .then(testGetUserByEmail)
    .then(testGetUserByPhoneNumber)
    .then(testCustomAttributes)
    .then(testUpdateUser)
    .then(testGetNonexistentUserWithError)
    .then(testGetNonexistentUserByEmailWithError)
    .then(testGetNonexistentUserByPhoneNumberWithError)
    .then(testUpdateNonexistentUserWithError)
    .then(testDeleteNonexistentUserWithError)
    .then(testCreateCustomToken)
    .then(testVerifyIdToken)
    .then(testVerifyIdTokenWithError)
    .then(testListUsers)
    // testDeleteUser() should be the last test and should ensure all users created by previous
    // tests are deleted.
    .then(testDeleteUser)
    // Cleanup after tests.
    .then(after);
};


module.exports = {
  test: test
}

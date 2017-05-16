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

  var mockUserData = {
    email: newUserUid + '@example.com',
    emailVerified: false,
    password: 'password',
    displayName: 'Random User ' + newUserUid,
    photoURL: 'http://www.example.com/' + newUserUid + '/photo.png',
    disabled: false,
  };

  function testCreateUserWithoutUid() {
    var newUserData = _.clone(mockUserData);
    newUserData.email = utils.generateRandomString(20) + '@example.com';
    return admin.auth().createUser(newUserData)
      .then(function(userRecord) {
        uidFromCreateUserWithoutUid = userRecord.uid;
        utils.assert(typeof userRecord.uid === 'string', 'auth().createUser(noUid)', 'Incorrect uid type.');
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

  function testGetUserByEmail() {
    return admin.auth().getUserByEmail(mockUserData.email)
      .then(function(userRecord) {
        utils.assert(userRecord.uid === newUserUid, 'auth().getUserByEmail()', 'Incorrect uid.');
      })
      .catch(function(error) {
        utils.logFailure('auth().getUserByEmail()', error);
      });
  }

  function testUpdateUser() {
    var updatedDisplayName = 'Updated User ' + newUserUid;

    return admin.auth().updateUser(newUserUid, {
      emailVerified: true,
      displayName: updatedDisplayName,
    })
      .then(function(userRecord) {
        utils.assert(
          (userRecord.emailVerified === true) && (userRecord.displayName === updatedDisplayName),
          'auth().updateUser()',
          'Incorrect emailVerified or displayName.'
        );
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


  return Promise.resolve()
    .then(testCreateUserWithoutUid)
    .then(testCreateUserWithUid)
    .then(testCreateDuplicateUserWithError)
    .then(testGetUser)
    .then(testGetUserByEmail)
    .then(testUpdateUser)
    .then(testGetNonexistentUserWithError)
    .then(testGetNonexistentUserByEmailWithError)
    .then(testUpdateNonexistentUserWithError)
    .then(testDeleteNonexistentUserWithError)
    .then(testCreateCustomToken)
    .then(testVerifyIdToken)
    .then(testVerifyIdTokenWithError)
    // testDeleteUser() should be the last test and should ensure all users created by previous
    // tests are deleted.
    .then(testDeleteUser);
};


module.exports = {
  test: test
}

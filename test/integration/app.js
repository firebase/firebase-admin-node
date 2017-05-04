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

var admin = require('../../lib/index');

function test(utils) {
  console.log('\nFirebaseApp:');

  var defaultApp = admin.app();
  var nullApp = admin.app('null');
  var nonNullApp = admin.app('nonNull');

  utils.assert(
    defaultApp.auth().app === defaultApp,
    'app.auth().app',
    'App instances do not match.'
  );
  utils.assert(
    nullApp.database().app === nullApp,
    'app.database().app',
    'App instances do not match.'
  );
  utils.assert(
    nonNullApp.messaging().app === nonNullApp,
    'app.messaging().app',
    'App instances do not match.'
  );

  utils.assert(
    defaultApp.options.databaseURL === 'https://admin-sdks-test.firebaseio.com',
    'app.options.databaseURL',
    'databaseURL is incorrect.'
  );
  utils.assert(
    nullApp.options.databaseAuthVariableOverride === null,
    'app.options.databaseAuthVariableOverride',
    'databaseAuthVariableOverride is incorrect.'
  );


  function testDefaultApp() {
    return defaultApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .then(function() {
        utils.logSuccess('defaultApp.database().ref("blocked").set()');
      })
      .catch(function(error) {
        utils.logFailure('defaultApp.database().ref("blocked").set()', error);
      });
  }

  function testNullApp() {
    return nullApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .then(function() {
        utils.logFailure('nullApp.database().ref("blocked").set()', 'Write unexpectedly succeeded.');
      })
      .catch(function(error) {
        utils.logSuccess('nullApp.database().ref("blocked").set()');
      });
  }

  function testNonNullApp() {
    return nonNullApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .then(function() {
        utils.logSuccess('nonNullApp.database().ref("blocked").set()');
      })
      .catch(function(error) {
        utils.logFailure('nonNullApp.database().ref("blocked").set()', error);
      });
  }

  return Promise.resolve()
    .then(testDefaultApp)
    .then(testNullApp)
    .then(testNonNullApp);
};


module.exports = {
  test: test
}

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
  console.log('\nDatabase:');

  var ref = admin.database().ref('adminNodeSdkManualTest');

  function testSet() {
    return ref.set({
      success: true,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    })
      .then(function() {
        utils.logSuccess('database().set()');
      })
      .catch(function(error) {
        utils.logFailure('database().set()', error);
      });
  }

  function testOnce() {
    return ref.once('value')
      .then(function(snapshot) {
        var value = snapshot.val();
        utils.assert(
          value.success === true && typeof value.timestamp === 'number',
          'database.once()',
          'Snapshot has unexpected value'
        );
      }).catch(function(error) {
        utils.logFailure('database().once()', error)
      });
  }


  return Promise.resolve()
    .then(testSet)
    .then(testOnce);
};


module.exports = {
  test: test
}

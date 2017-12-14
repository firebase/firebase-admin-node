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
  console.log('\nInstanceId:');

  function testNonExistingInstanceId() {
    return admin.instanceId().deleteInstanceId('non-existing')
      .then(result => {
        utils.logFailure('instanceId()', 'No error thrown for non-existing instance ID');
      })
      .catch(err => {
        utils.assert(
          err.code == 'instance-id/api-error',
          'admin.instanceId().deleteInstanceId(non-existing)',
          'Invalid error for non-existing instance ID: ' + err);
        utils.assert(
          err.message == 'Instance ID "non-existing": Failed to find the instance ID.',
          'admin.instanceId().deleteInstanceId(non-existing)',
          'Invalid error for non-existing instance ID: ' + err)
      });
  }

  return Promise.resolve()
    .then(testNonExistingInstanceId);
}

module.exports = {
  test: test
}

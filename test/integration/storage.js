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
var stream = require('stream');

function test(utils) {
  console.log('\nStorage:');
  
  function testDefaultBucket() {
    return admin.storage().bucket().then((bucket) => {
      return testCloudStorage(bucket, 'storage().bucket()');
    });
  }

  function testCustomBucket() {
    return admin.storage().bucket(utils.getProjectId() + '.appspot.com')
      .then((bucket) => {
        return testCloudStorage(bucket, 'storage().bucket(string)');
      });
  }

  function testNonExistingBucket() {
    return admin.storage().bucket('non.existing')
      .then((bucket) => {
        utils.logFailure(
            'storage().bucket("non.existing")', 
            'Promise not rejected for non existing bucket');
      })
      .catch((error) => {
        utils.assert(
            error.message == 'Bucket non.existing does not exist.',
            'storage().bucket("non.existing")',
            'Incorrect error message: ' + error.message
        );
      });
  }

  function testCloudStorage(bucket, testName) {
    const expected = 'Hello World: ' + testName;
    const file = bucket.file('data_' + Date.now() + '.txt');
    return file.save(expected)
      .then(() => {
        return file.download();
      })
      .then((data) => {
        return data[0].toString();
      })
      .then((actual) => {
        utils.assert(
            actual == expected, testName,
            'Data read from GCS do not match expected'
        );
        return file.delete();
      })
      .catch((error) => {
        let reason;
        if (error.message) {
            reason = error.message;
        } else {
            reason = JSON.stringify(error);
        }
        utils.logFailure(
            testName, 
            'Error while interacting with bucket: ' + reason);    
      });
  }

  return Promise.resolve()
    .then(testDefaultBucket)
    .then(testCustomBucket)
    .then(testNonExistingBucket);
}

module.exports = {
  test: test
}
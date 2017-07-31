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
    const bucket = admin.storage().bucket();
    return verifyBucket(bucket, 'storage().bucket()')
      .then(() => {
        utils.logSuccess('storage().bucket()');
      })
      .catch((error) => {
        handleError(error, 'storage().bucket()');
      });
  }

  function testCustomBucket() {
    const bucket = admin.storage().bucket(utils.getProjectId() + '.appspot.com');
    return verifyBucket(bucket, 'storage().bucket(string)')
      .then(() => {
        utils.logSuccess('storage().bucket(string)');
      })
      .catch((error) => {
        handleError(error, 'storage().bucket(string)');
      });
  }

  function testNonExistingBucket() {
    const bucket = admin.storage().bucket('non.existing');
    return bucket.exists()
      .then((data) => {
        utils.assert(!data[0], 'storage().bucket("non.existing").exists() returned true');
      })
      .catch((error) => {
        handleError(error, 'storage().bucket("non.existing")');
      });
  }

  function verifyBucket(bucket, testName) {
    const expected = 'Hello World: ' + testName;
    const file = bucket.file('data_' + Date.now() + '.txt');
    return file.save(expected)
      .then(() => {
        return file.download();
      })
      .then((data) => {
        if (data[0].toString() != expected) {
          return Promise.reject('Data read from GCS does not match expected');
        }
        return file.delete();
      })
      .then((resp) => {
        return file.exists();
      })
      .then((data) => {
        if (data[0]) {
          return Promise.reject('Failed to delete file from GCS');
        }
      });
  }

  function handleError(error, testName) {
    let reason;
    if (error.message) {
        reason = error.message;
    } else {
        reason = JSON.stringify(error);
    }
    utils.logFailure(
        testName, 
        'Error while interacting with bucket: ' + reason);    
  }

  return Promise.resolve()
    .then(testDefaultBucket)
    .then(testCustomBucket)
    .then(testNonExistingBucket);
}

module.exports = {
  test: test
}

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
  console.log('\nFirestore:');
  
  function testFirestore() {
    const expected = {
        name: 'Mountain View',
        population: 77846,
    };
    const reference = admin.firestore().collection('cities').doc('Mountain View')
    return reference.set(expected)
        .then(result => {
            return reference.get();
        })
        .then(snapshot => {
            var data = snapshot.data();
            if (data.name !== expected.name || data.population !== expected.population) {
                return Promise.reject('Data read from Firestore did not match expected');    
            }
            return reference.delete();
        })
        .then(result => {
            return reference.get();
        })
        .then(snapshot => {
            if (snapshot.exists) {
                return Promise.reject('Failed to delete document from Firestore');
            }
            utils.logSuccess('firestore().client()');
        })
        .catch(err => {
            utils.logFailure('firestore().client()', 'Error while interacting with Firestore: ' + err);     
        });
  }

  return Promise.resolve()
    .then(testFirestore);
}

module.exports = {
  test: test
}

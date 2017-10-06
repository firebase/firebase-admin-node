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
var admin = require('../../lib/index');

function test(utils) {
  console.log('\nFirestore:');
  
  function testFirestore() {
    const expected = {
        name: 'Mountain View',
        population: 77846,
    };
    const reference = admin.firestore().collection('cities').doc()
    return reference.set(expected)
        .then(result => {
            return reference.get();
        })
        .then(snapshot => {
            var data = snapshot.data();
            if (!_.isEqual(expected, data)) {
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
            utils.logSuccess('firestore()');
        })
        .catch(err => {
            utils.logFailure('firestore()', 'Error while interacting with Firestore: ' + err);     
        });
  }

  function testFieldValue() {
    const expected = {
        name: 'Mountain View',
        population: 77846,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    const reference = admin.firestore().collection('cities').doc()
    return reference.set(expected)
        .then(result => {
            return reference.get();
        })
        .then(snapshot => {
            var data = snapshot.data();
            if (data.timestamp && data.timestamp instanceof Date) {
                utils.logSuccess('firestore.FieldValue');
            } else {
                utils.logFailure('firestore.FieldValue', 'Server timestamp value not present');
            }
            return reference.delete();
        });
  }

  function testFieldPath() {
    return Promise.resolve(admin.firestore.FieldPath).then(fieldPath => {
        utils.assert(
            typeof fieldPath !== 'undefined',
            'firestore.FieldPath',
            'FieldPath not available in firestore namespace')
    });
  }

  function testGeoPoint() {
    return Promise.resolve(admin.firestore.GeoPoint).then(geoPoint => {
        utils.assert(
            typeof geoPoint !== 'undefined',
            'firestore.GeoPoint',
            'GeoPoint not available in firestore namespace')
    });
  }

  function testSetDocumentReference() {
    const expected = {
        name: 'Mountain View',
        population: 77846,
    };
    const source = admin.firestore().collection('cities').doc();
    const target = admin.firestore().collection('cities').doc();
    return source.set(expected)
        .then(result => {
            return target.set({name: 'Palo Alto', sisterCity: source});
        })
        .then(result => {
            return target.get();
        })
        .then(snapshot => {
            var data = snapshot.data();
            utils.assert(
                _.isEqual(source.path, data.sisterCity.path),
                'firestore.DocumentReference',
                'Data read from Firestore did not match expected: ' + data);
            var promises = [];
            promises.push(source.delete());
            promises.push(target.delete());
            return Promise.all(promises);
        });
  }

  return Promise.resolve()
    .then(testFirestore)
    .then(testFieldValue)
    .then(testFieldPath)
    .then(testGeoPoint)
    .then(testSetDocumentReference);
}

module.exports = {
  test: test
}

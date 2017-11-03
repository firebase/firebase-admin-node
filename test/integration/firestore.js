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
    const reference = admin.firestore().collection('cities').doc()
    return Promise.resolve()
        .then(() => {
            const expected = {
                name: 'Mountain View',
                population: 77846,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            };
            return reference.set(expected);
        })
        .then(result => {
            return reference.get();
        })
        .then(snapshot => {
            var data = snapshot.data();
            utils.assert(
                data.timestamp && data.timestamp instanceof Date,
                'firestore.FieldValue',
                'Server timestamp value not present');
            return reference.delete();
        })
        .catch(err => {
            utils.logFailure('firestore.FieldValue', 'Error while interacting with Firestore: ' + err);
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
        })
        .catch(err => {
            utils.logFailure('firestore.DocumentReference', 'Error while interacting with Firestore: ' + err);
        });
  }

  function testSetLogFunction() {
    const logs = [];
    const source = admin.firestore().collection('cities').doc();
    return Promise.resolve().then(() => {
      admin.firestore.setLogFunction((log) => {
          logs.push(log);
      })
      return source.set({name: 'San Francisco'});
    }).then(result => {
      return source.delete();
    }).then(result => {
      utils.assert(
          logs.length > 0,
          'firestore.setLogFunction()',
          'Log function did not update');
    }).catch(err => {
      utils.logFailure('firestore.setLogFunction()', 'Error while setting log function: ' + err);
    });
}

return Promise.resolve()
    .then(testFirestore)
    .then(testFieldValue)
    .then(testFieldPath)
    .then(testGeoPoint)
    .then(testSetDocumentReference)
    .then(testSetLogFunction);
}

module.exports = {
  test: test
}

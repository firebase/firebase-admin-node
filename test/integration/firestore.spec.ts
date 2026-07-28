/*!
 * Copyright 2018 Google LLC
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { clone } from 'lodash';
import { getApp } from '../../lib/app/index';
import {
  DocumentReference, DocumentSnapshot, FieldValue, Firestore, FirestoreDataConverter,
  QueryDocumentSnapshot, Timestamp, getFirestore, initializeFirestore, setLogFunction,
} from '../../lib/firestore/index';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

const mountainView = {
  name: 'Mountain View',
  population: 77846,
};

describe('admin.firestore', () => {

  let reference: DocumentReference;

  before(() => {
    const db = getFirestore();
    reference = db.collection('cities').doc();
  });

  it('getFirestore() returns a Firestore client', () => {
    const firestore: Firestore = getFirestore();
    expect(firestore).to.not.be.undefined;
  });

  it('initializeFirestore returns a Firestore client', () => {
    const firestore: Firestore = initializeFirestore(getApp());
    expect(firestore).to.not.be.undefined;
  });

  it('supports basic data access', () => {
    return reference.set(mountainView)
      .then(() => {
        return reference.get();
      })
      .then((snapshot) => {
        const data = snapshot.data();
        expect(data).to.deep.equal(mountainView);
        return reference.delete();
      })
      .then(() => {
        return reference.get();
      })
      .then((snapshot) => {
        expect(snapshot.exists).to.be.false;
      });
  });

  it('FieldValue.serverTimestamp() provides a server-side timestamp', () => {
    const expected: any = clone(mountainView);
    expected.timestamp = FieldValue.serverTimestamp();
    return reference.set(expected)
      .then(() => {
        return reference.get();
      })
      .then((snapshot) => {
        const data = snapshot.data();
        expect(data).to.exist;
        expect(data!.timestamp).is.not.null;
        expect(data!.timestamp).to.be.instanceOf(Timestamp);
        return reference.delete();
      })
      .should.eventually.be.fulfilled;
  });

  it('supports operations with custom type converters', () => {
    const converter: FirestoreDataConverter<City> = {
      toFirestore: (city: City) => {
        return {
          name: city.localId,
          population: city.people,
        };
      },
      fromFirestore: (snap: QueryDocumentSnapshot) => {
        return new City(snap.data().name, snap.data().population);
      }
    };

    const expected: City = new City('Sunnyvale', 153185);
    const refWithConverter: DocumentReference<City> = getFirestore()
      .collection('cities')
      .doc()
      .withConverter(converter);
    return refWithConverter.set(expected)
      .then(() => {
        return refWithConverter.get();
      })
      .then((snapshot: DocumentSnapshot<City>) => {
        expect(snapshot.data()).to.be.instanceOf(City);
        return refWithConverter.delete();
      });
  });

  it('supports saving references in documents', () => {
    const source = getFirestore().collection('cities').doc();
    const target = getFirestore().collection('cities').doc();
    return source.set(mountainView)
      .then(() => {
        return target.set({ name: 'Palo Alto', sisterCity: source });
      })
      .then(() => {
        return target.get();
      })
      .then((snapshot) => {
        const data = snapshot.data();
        expect(data).to.exist;
        expect(data!.sisterCity.path).to.deep.equal(source.path);
        const promises = [];
        promises.push(source.delete());
        promises.push(target.delete());
        return Promise.all(promises);
      })
      .should.eventually.be.fulfilled;
  });

  it('setLogFunction() enables logging for the Firestore module', () => {
    const logs: string[] = [];
    const source = getFirestore().collection('cities').doc();
    setLogFunction((log) => {
      logs.push(log);
    });
    return source.set({ name: 'San Francisco' })
      .then(() => {
        return source.delete();
      })
      .then(() => {
        expect(logs.length).greaterThan(0);
      });
  });
});

class City {
  constructor(readonly localId: string, readonly people: number) { }
}

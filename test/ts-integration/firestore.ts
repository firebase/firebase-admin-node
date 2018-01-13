import * as admin from '../../lib/index'
import {expect} from 'chai';
import {DocumentReference} from '@google-cloud/firestore';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

const _ = require('lodash');

chai.should();
chai.use(chaiAsPromised);

const mountainView = {
  name: 'Mountain View',
  population: 77846,
};

describe('admin.firestore', () => {

  let reference: DocumentReference;

  before(() => {
    reference = admin.firestore().collection('cities').doc()
  });

  it('returns a Firestore client', () => {
    const firestore = admin.firestore();
    expect(firestore).to.be.instanceOf(admin.firestore.Firestore);
  });

  it('supports basic data access', () => {
    return reference.set(mountainView)
      .then(result => {
        return reference.get();
      })
      .then(snapshot => {
        var data = snapshot.data();
        expect(data).to.deep.equal(mountainView);
        return reference.delete();
      })
      .then(result => {
        return reference.get();
      })
      .then(snapshot => {
        expect(snapshot.exists).to.be.false;
      });
  });

  it('.FieldValue.serverTimestamp() provides a server-side timestamp', () => {
    let expected = _.clone(mountainView);
    expected.timestamp = admin.firestore.FieldValue.serverTimestamp();
    return reference.set(expected)
      .then(result => {
        return reference.get();
      })
      .then(snapshot => {
        var data = snapshot.data();
        expect(data.timestamp).is.not.null;
        expect(data.timestamp instanceof Date).is.true;
        return reference.delete();
      })
      .should.eventually.be.fulfilled;
  });

  it('.FieldPath type is defined', () => {
    expect(typeof admin.firestore.FieldPath).to.be.not.undefined;
  });

  it('.FieldValue type is defined', () => {
    expect(typeof admin.firestore.FieldValue).to.be.not.undefined;
  });

  it('.GeoPoint type is defined', () => {
    expect(typeof admin.firestore.GeoPoint).to.be.not.undefined;
  });

  it('supports saving references in documents', () => {
    const source = admin.firestore().collection('cities').doc();
    const target = admin.firestore().collection('cities').doc();
    return source.set(mountainView)
      .then(result => {
          return target.set({name: 'Palo Alto', sisterCity: source});
      })
      .then(result => {
          return target.get();
      })
      .then(snapshot => {
          var data = snapshot.data();
          expect(data.sisterCity.path).to.deep.equal(source.path);
          var promises = [];
          promises.push(source.delete());
          promises.push(target.delete());
          return Promise.all(promises);
      })
      .should.eventually.be.fulfilled;
  });

  it('.setLogFunction() enables logging for the Firestore module', () => {
    const logs = [];
    const source = admin.firestore().collection('cities').doc();
    admin.firestore.setLogFunction((log) => {
      logs.push(log);
    })
    return source.set({name: 'San Francisco'})
      .then(result => {
        return source.delete();
      })
      .then(result => {
        expect(logs.length).greaterThan(0);
      });
  });
});
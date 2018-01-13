import * as admin from '../../lib/index'
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {defaultApp, nullApp, nonNullApp} from './setup';

chai.should();
chai.use(chaiAsPromised);

const path = 'adminNodeSdkManualTest';

describe('admin.database()', () => {
    
  it('default app is not blocked by security rules', () => {
    return defaultApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .should.eventually.be.fulfilled;
  });

  it('App with null auth overrides is blocked by security rules', () => {
    return nullApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .should.eventually.be.rejectedWith('PERMISSION_DENIED: Permission denied');
  });

  it('App with non-null auth override is not blocked by security rules', () => {
    return nonNullApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .should.eventually.be.fulfilled;
  });

  describe('DatabaseReference', () => {
    let ref: admin.database.Reference;
    
    before(() => {
      ref = admin.database().ref(path);
    });

    it('.set() completes successfully', () => {
      return ref.set({
        success: true,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      }).should.eventually.be.fulfilled;
    });

    it('.once() returns the current value of the reference', () => {
      return ref.once('value')
        .then((snapshot) => {
          var value = snapshot.val();
          expect(value.success).to.be.true;
          expect(typeof value.timestamp).to.equal('number');
        });
    });

    it('.child().once() returns the current value of the child', () => {
      return ref.child('timestamp').once('value')
        .then((snapshot) => {
          expect(typeof snapshot.val()).to.equal('number');
        });
    });

    it('.remove() completes successfully', () => {
      return ref.remove().should.eventually.be.fulfilled;
    });
  });
});

describe('app.database(url).ref()', () => {

  let refWithUrl: admin.database.Reference;
  
  before(() => {
    let app = admin.app();
    refWithUrl = app.database(app.options.databaseURL).ref(path);
  });

  it('.set() completes successfully', () => {
    return refWithUrl.set({
      success: true,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    }).should.eventually.be.fulfilled;
  });

  it('.once() returns the current value of the reference', () => {
    return refWithUrl.once('value')
      .then((snapshot) => {
        var value = snapshot.val();
        expect(value.success).to.be.true;
        expect(typeof value.timestamp).to.equal('number');
      });
  });

  it('.child().once() returns the current value of the child', () => {
    return refWithUrl.child('timestamp').once('value')
      .then((snapshot) => {
        expect(typeof snapshot.val()).to.equal('number');
      });
  });

  it('.remove() completes successfully', () => {
    return refWithUrl.remove().should.eventually.be.fulfilled;
  });
});
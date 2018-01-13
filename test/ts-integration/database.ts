import * as admin from '../../lib/index'
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  defaultApp, nullApp, nonNullApp
} from './setup';

chai.should();
chai.use(chaiAsPromised);

describe('admin.database()', () => {

  let ref: admin.database.Reference;
    
  before(() => {
    ref = admin.database().ref('adminNodeSdkManualTest');
  });
    
  it('Default app should not be blocked by security rules', () => {
    return defaultApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .should.eventually.be.fulfilled;
  });

  it('App with null auth override should be blocked by security rules', () => {
    return nullApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .should.eventually.be.rejectedWith('PERMISSION_DENIED: Permission denied');
  });

  it('App with non-null auth override should not be blocked by security rules', () => {
    return nonNullApp.database().ref('blocked').set(admin.database.ServerValue.TIMESTAMP)
      .should.eventually.be.fulfilled;
  });

  describe('DatabaseReference', () => {
    it('set() should complete successfully', () => {
      return ref.set({
        success: true,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      }).should.eventually.be.fulfilled;
    });

    it('once() should return the current value of the reference', () => {
      return ref.once('value')
        .then((snapshot) => {
          var value = snapshot.val();
          expect(value.success).to.be.true;
          expect(typeof value.timestamp).to.equal('number');
        });
    });

    it('once() should return the current value of the child', () => {
      return ref.child('timestamp').once('value')
        .then((snapshot) => {
          expect(typeof snapshot.val()).to.equal('number');
        });
    });

    it('should be able to access reference with URL', () => {
      let app = admin.app()
      let url = app.options.databaseURL;
      let refFromApp = app.database(url).ref(ref.path);
      return refFromApp.once('value')
        .then((snapshot) => {
          var value = snapshot.val();
          expect(value.success).to.be.true;
          expect(typeof value.timestamp).to.equal('number');
      });
    })

    it('remove() should complete successfully', () => {
      return ref.remove().should.eventually.be.fulfilled;
    });
  });
});
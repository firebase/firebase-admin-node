import * as admin from '../../lib/index';
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {defaultApp, nullApp, nonNullApp, cmdArgs, databaseUrl} from './setup';

const apiRequest = require('../../lib/utils/api-request');
const url = require('url');
const chalk = require('chalk');

chai.should();
chai.use(chaiAsPromised);

const path = 'adminNodeSdkManualTest';

describe('admin.database()', () => {

  before(() => {
    if (!cmdArgs.updateRules) {
      console.log(chalk.yellow('    Not updating security rules: --updateRules flag not set'));
      return
    }
    console.log(chalk.yellow('    Updating security rules to defaults'));
    const client = new apiRequest.SignedApiRequestHandler(defaultApp);
    const dbUrl =  url.parse(databaseUrl);
    const defaultRules = {
      rules : {
        '.read': 'auth != null',
        '.write': 'auth != null',
      },
    };
    const headers = {
      'Content-Type': 'application/json',
    };
    return client.sendRequest(dbUrl.host, 443, '/.settings/rules.json', 
      'PUT', defaultRules, headers, 10000);
  });

  it('returns a database client', () => {
    const db = admin.database();
    expect(db).to.be.instanceOf((admin.database as any).Database);
  });

  it('ServerValue type is defined', () => {
    const serverValue = admin.database.ServerValue;
    expect(serverValue).to.not.be.null;
  });

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
          let value = snapshot.val();
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

describe('app.database(url)', () => {

  it('returns a Database client for URL', () => {
    const db = admin.app().database(databaseUrl);
    expect(db).to.be.instanceOf((admin.database as any).Database);
  });

  describe('DatabaseReference', () => {
    let refWithUrl: admin.database.Reference;

    before(() => {
      const app = admin.app();
      refWithUrl = app.database(databaseUrl).ref(path);
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
          let value = snapshot.val();
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
});

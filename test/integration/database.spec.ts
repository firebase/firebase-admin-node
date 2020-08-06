/*!
 * Copyright 2018 Google Inc.
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

import * as admin from '../../lib/index';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { defaultApp, nullApp, nonNullApp, cmdArgs, databaseUrl } from './setup';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

const path = 'adminNodeSdkManualTest';

describe('admin.database', () => {

  before(() => {
    /* tslint:disable:no-console */
    if (!cmdArgs.updateRules) {
      console.log(chalk.yellow('    Not updating security rules. Some tests may fail.'));
      console.log(chalk.yellow('    Set the --updateRules flag to force update rules.'));
      return;
    }
    console.log(chalk.yellow('    Updating security rules to defaults.'));
    /* tslint:enable:no-console */
    const defaultRules = {
      rules : {
        '.read': 'auth != null',
        '.write': 'auth != null',
      },
    };
    return admin.database().setRules(defaultRules);
  });

  it('admin.database() returns a database client', () => {
    const db = admin.database();
    expect(db).to.be.instanceOf((admin.database as any).Database);
  });

  it('admin.database.ServerValue type is defined', () => {
    const serverValue = admin.database.ServerValue;
    expect(serverValue).to.not.be.null;
  });

  it('default App is not blocked by security rules', () => {
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

  describe('admin.database().ref()', () => {
    let ref: admin.database.Reference;

    before(() => {
      ref = admin.database().ref(path);
    });

    it('ref() can be called with ref', () => {
      const copy = admin.database().ref(ref);
      expect(copy).to.be.instanceof((admin.database as any).Reference);
      expect(copy.key).to.equal(ref.key);
    });

    it('set() completes successfully', () => {
      return ref.set({
        success: true,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      }).should.eventually.be.fulfilled;
    });

    it('once() returns the current value of the reference', () => {
      return ref.once('value')
        .then((snapshot) => {
          const value = snapshot.val();
          expect(value.success).to.be.true;
          expect(typeof value.timestamp).to.equal('number');
        });
    });

    it('child().once() returns the current value of the child', () => {
      return ref.child('timestamp').once('value')
        .then((snapshot) => {
          expect(typeof snapshot.val()).to.equal('number');
        });
    });

    it('remove() completes successfully', () => {
      return ref.remove().should.eventually.be.fulfilled;
    });
  });

  describe('app.database(url).ref()', () => {

    let refWithUrl: admin.database.Reference;

    before(() => {
      const app = admin.app();
      refWithUrl = app.database(databaseUrl).ref(path);
    });

    it('app.database(url) returns a Database client for URL', () => {
      const db = admin.app().database(databaseUrl);
      expect(db).to.be.instanceOf((admin.database as any).Database);
    });

    it('set() completes successfully', () => {
      return refWithUrl.set({
        success: true,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      }).should.eventually.be.fulfilled;
    });

    it('once() returns the current value of the reference', () => {
      return refWithUrl.once('value')
        .then((snapshot) => {
          const value = snapshot.val();
          expect(value.success).to.be.true;
          expect(typeof value.timestamp).to.equal('number');
        });
    });

    it('child().once() returns the current value of the child', () => {
      return refWithUrl.child('timestamp').once('value')
        .then((snapshot) => {
          expect(typeof snapshot.val()).to.equal('number');
        });
    });

    it('remove() completes successfully', () => {
      return refWithUrl.remove().should.eventually.be.fulfilled;
    });
  });

  it('admin.database().getRules() returns currently defined rules as a string', () => {
    return admin.database().getRules().then((result) => {
      return expect(result).to.be.not.empty;
    });
  });

  it('admin.database().getRulesJSON() returns currently defined rules as an object', () => {
    return admin.database().getRulesJSON().then((result) => {
      return expect(result).to.be.not.undefined;
    });
  });
});

// Check for type compilation. This method is not invoked by any tests. But it
// will trigger a TS compilation failure if the RTDB typings were not loaded
// correctly. (Marked as export to avoid compilation warning.)
export function addValueEventListener(
  db: admin.database.Database,
  callback: (s: admin.database.DataSnapshot | null) => any): void {
  const eventType: admin.database.EventType = 'value';
  db.ref().on(eventType, callback);
}

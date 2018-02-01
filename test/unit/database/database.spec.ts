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

'use strict';

import * as _ from 'lodash';
import {expect} from 'chai';

import * as mocks from '../../resources/mocks';
import {FirebaseApp} from '../../../src/firebase-app';
import {DatabaseService} from '../../../src/database/database';
import {Database} from '@firebase/database';

describe('Database', () => {
  let mockApp: FirebaseApp;
  let database: DatabaseService;

  beforeEach(() => {
    mockApp = mocks.app();
    database = new DatabaseService(mockApp);
  });

  afterEach(() => {
    return database.INTERNAL.delete().then(() => {
      return mockApp.delete();
    });
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it(`should throw given invalid app: ${ JSON.stringify(invalidApp) }`, () => {
        expect(() => {
          const databaseAny: any = DatabaseService;
          return new databaseAny(invalidApp);
        }).to.throw('First argument passed to admin.database() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const databaseAny: any = DatabaseService;
        return new databaseAny();
      }).to.throw('First argument passed to admin.database() must be a valid Firebase app instance.');
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new DatabaseService(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(database.app).to.equal(mockApp);
    });

    it('is read-only', () => {
      expect(() => {
        (database as any).app = mockApp;
      }).to.throw('Cannot set property app of #<DatabaseService> which has only a getter');
    });
  });

  describe('getDatabase', () => {
    it('should return the default Database namespace', () => {
      const db: Database = database.getDatabase();
      expect(db.ref().toString()).to.be.equal('https://databasename.firebaseio.com/');
    });

    it('should return the Database namespace', () => {
      const db: Database = database.getDatabase(mockApp.options.databaseURL);
      expect(db.ref().toString()).to.be.equal('https://databasename.firebaseio.com/');
    });

    it('should return a cached version of Database on subsequent calls', () => {
      const db1: Database = database.getDatabase(mockApp.options.databaseURL);
      const db2: Database = database.getDatabase(mockApp.options.databaseURL);
      expect(db1).to.equal(db2);
      expect(db1.ref().toString()).to.equal('https://databasename.firebaseio.com/');
    });

    it('should return a Database instance for the specified URL', () => {
      const db1: Database = database.getDatabase(mockApp.options.databaseURL);
      const db2: Database = database.getDatabase('https://other-database.firebaseio.com');
      expect(db1.ref().toString()).to.equal('https://databasename.firebaseio.com/');
      expect(db2.ref().toString()).to.equal('https://other-database.firebaseio.com/');
    });

    const invalidArgs = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidArgs.forEach((url) => {
      it(`should throw given invalid URL argument: ${JSON.stringify(url)}`, () => {
        expect(() => {
          (database as any).getDatabase(url);
        }).to.throw('Database URL must be a valid, non-empty URL string.');
      });
    });
  });
});

/*!
 * @license
 * Copyright 2021 Google Inc.
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

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { App } from '../../../src/app/index';
import {
  getDatabase, getDatabaseWithUrl, Database, ServerValue, enableLogging ,
} from '../../../src/database/index';
import { FirebaseApp } from '../../../src/app/firebase-app';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Database', () => {
  let mockApp: App;

  beforeEach(() => {
    mockApp = mocks.app();
  });

  afterEach(() => {
    return (mockApp as FirebaseApp).delete();
  });

  describe('getDatabase()', () => {
    it('should throw when default app is not available', () => {
      expect(() => {
        return getDatabase();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return getDatabase(mockApp);
      }).not.to.throw();
    });

    it('should return the same instance for a given app instance', () => {
      const db1: Database = getDatabase(mockApp);
      const db2: Database = getDatabase(mockApp);
      expect(db1).to.equal(db2);
    });
  });

  describe('getDatabaseWithUrl()', () => {
    it('should throw when default app is not available', () => {
      expect(() => {
        return getDatabaseWithUrl('https://test.firebaseio.com');
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return getDatabaseWithUrl('https://test.firebaseio.com', mockApp);
      }).not.to.throw();
    });

    it('should return the same instance for a given app instance', () => {
      const db1: Database = getDatabaseWithUrl('https://test.firebaseio.com', mockApp);
      const db2: Database = getDatabaseWithUrl('https://test.firebaseio.com', mockApp);
      const db3: Database = getDatabaseWithUrl('https://other.firebaseio.com', mockApp);
      expect(db1).to.equal(db2);
      expect(db1).to.not.equal(db3);
    });
  });

  it('should expose ServerValue sentinel', () => {
    expect(() => ServerValue.increment(1)).to.not.throw();
  });

  it('should expose enableLogging global function', () => {
    expect(() => {
      enableLogging(console.log);
      enableLogging(false);
    }).to.not.throw();
  });
});

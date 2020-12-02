/*!
 * @license
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
import { expect } from 'chai';
import * as sinon from 'sinon';

import * as mocks from '../../resources/mocks';
import { FirebaseApp } from '../../../src/firebase-app';
import { DatabaseService } from '../../../src/database/database-internal';
import { database } from '../../../src/database/index';
import * as utils from '../utils';
import { HttpClient, HttpRequestConfig } from '../../../src/utils/api-request';

import Database = database.Database;

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

  describe('Rules', () => {
    const mockAccessToken: string = utils.generateRandomAccessToken();
    let getTokenStub: sinon.SinonStub;
    let stubs: sinon.SinonStub[] = [];

    before(() => {
      getTokenStub = utils.stubGetAccessToken(mockAccessToken);
    });

    after(() => {
      getTokenStub.restore();
    });

    beforeEach(() => {
      return mockApp.INTERNAL.getToken();
    });

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    const rules = {
      rules: {
        '.read': true,
      },
    };
    const rulesString = JSON.stringify(rules);
    const rulesWithComments = `{
      // Some comments
      rules: {
        '.read': true,
      },
    }`;
    const rulesPath = '.settings/rules.json';

    function callParamsForGet(
      strict = false,
      url = `https://databasename.firebaseio.com/${rulesPath}`,
    ): HttpRequestConfig {

      const params: HttpRequestConfig = {
        method: 'GET',
        url,
        headers: {
          Authorization: 'Bearer ' + mockAccessToken,
        },
      };

      if (strict) {
        params.data = { format: 'strict' };
      }

      return params;
    }

    function stubSuccessfulResponse(payload: string | object): sinon.SinonStub {
      const expectedResult = utils.responseFrom(payload);
      const stub = sinon.stub(HttpClient.prototype, 'send').resolves(expectedResult);
      stubs.push(stub);
      return stub;
    }

    function stubErrorResponse(payload: string | object): sinon.SinonStub {
      const expectedResult = utils.errorFrom(payload);
      const stub = sinon.stub(HttpClient.prototype, 'send').rejects(expectedResult);
      stubs.push(stub);
      return stub;
    }

    describe('getRules', () => {
      it('should return the rules fetched from the database', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse(rules);
        return db.getRules().then((result) => {
          expect(result).to.equal(rulesString);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet());
        });
      });

      it('should return the rules fetched from the database including comments', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse(rulesWithComments);
        return db.getRules().then((result) => {
          expect(result).to.equal(rulesWithComments);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet());
        });
      });

      it('should return the rules fetched from the explicitly specified database', () => {
        const db: Database = database.getDatabase('https://custom.firebaseio.com');
        const stub = stubSuccessfulResponse(rules);
        return db.getRules().then((result) => {
          expect(result).to.equal(rulesString);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet(false, `https://custom.firebaseio.com/${rulesPath}`));
        });
      });

      it('should return the rules fetched from the custom URL with query params', () => {
        const db: Database = database.getDatabase('http://localhost:9000?ns=foo');
        const stub = stubSuccessfulResponse(rules);
        return db.getRules().then((result) => {
          expect(result).to.equal(rulesString);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet(false, `http://localhost:9000/${rulesPath}?ns=foo`));
        });
      });

      it('should throw if the server responds with a well-formed error', () => {
        const db: Database = database.getDatabase();
        stubErrorResponse({ error: 'test error' });
        return db.getRules().should.eventually.be.rejectedWith(
          'Error while accessing security rules: test error');
      });

      it('should throw if the server responds with an error', () => {
        const db: Database = database.getDatabase();
        stubErrorResponse('error text');
        return db.getRules().should.eventually.be.rejectedWith(
          'Error while accessing security rules: error text');
      });

      it('should throw in the event of an I/O error', () => {
        const db: Database = database.getDatabase();
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(
          new Error('network error'));
        stubs.push(stub);
        return db.getRules().should.eventually.be.rejectedWith('network error');
      });
    });

    describe('getRulesWithJSON', () => {
      it('should return the rules fetched from the database', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse(rules);
        return db.getRulesJSON().then((result) => {
          expect(result).to.deep.equal(rules);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet(true));
        });
      });

      it('should return the rules fetched from the explicitly specified database', () => {
        const db: Database = database.getDatabase('https://custom.firebaseio.com');
        const stub = stubSuccessfulResponse(rules);
        return db.getRulesJSON().then((result) => {
          expect(result).to.deep.equal(rules);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet(true, `https://custom.firebaseio.com/${rulesPath}`));
        });
      });

      it('should return the rules fetched from the custom URL with query params', () => {
        const db: Database = database.getDatabase('http://localhost:9000?ns=foo');
        const stub = stubSuccessfulResponse(rules);
        return db.getRulesJSON().then((result) => {
          expect(result).to.deep.equal(rules);
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForGet(true, `http://localhost:9000/${rulesPath}?ns=foo`));
        });
      });

      it('should throw if the server responds with a well-formed error', () => {
        const db: Database = database.getDatabase();
        stubErrorResponse({ error: 'test error' });
        return db.getRulesJSON().should.eventually.be.rejectedWith(
          'Error while accessing security rules: test error');
      });

      it('should throw if the server responds with an error', () => {
        const db: Database = database.getDatabase();
        stubErrorResponse('error text');
        return db.getRulesJSON().should.eventually.be.rejectedWith(
          'Error while accessing security rules: error text');
      });

      it('should throw in the event of an I/O error', () => {
        const db: Database = database.getDatabase();
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(
          new Error('network error'));
        stubs.push(stub);
        return db.getRulesJSON().should.eventually.be.rejectedWith('network error');
      });
    });

    function callParamsForPut(
      data: string | Buffer | object,
      url = `https://databasename.firebaseio.com/${rulesPath}`,
    ): HttpRequestConfig {

      return {
        method: 'PUT',
        url,
        headers: {
          'Authorization': 'Bearer ' + mockAccessToken,
          'content-type': 'application/json; charset=utf-8',
        },
        data,
      };
    }

    describe('setRules', () => {
      it('should set the rules when specified as a string', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse({});
        return db.setRules(rulesString).then(() => {
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForPut(rulesString));
        });
      });

      it('should set the rules when specified as a Buffer', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse({});
        const buffer = Buffer.from(rulesString);
        return db.setRules(buffer).then(() => {
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForPut(buffer));
        });
      });

      it('should set the rules when specified as an object', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse({});
        return db.setRules(rules).then(() => {
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForPut(rules));
        });
      });

      it('should set the rules with comments when specified as a string', () => {
        const db: Database = database.getDatabase();
        const stub = stubSuccessfulResponse({});
        return db.setRules(rulesWithComments).then(() => {
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForPut(rulesWithComments));
        });
      });

      it('should set the rules in the explicitly specified database', () => {
        const db: Database = database.getDatabase('https://custom.firebaseio.com');
        const stub = stubSuccessfulResponse({});
        return db.setRules(rulesString).then(() => {
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForPut(rulesString, `https://custom.firebaseio.com/${rulesPath}`));
        });
      });

      it('should set the rules using the custom URL with query params', () => {
        const db: Database = database.getDatabase('http://localhost:9000?ns=foo');
        const stub = stubSuccessfulResponse({});
        return db.setRules(rulesString).then(() => {
          return expect(stub).to.have.been.calledOnce.and.calledWith(
            callParamsForPut(rulesString, `http://localhost:9000/${rulesPath}?ns=foo`));
        });
      });

      const invalidSources: any[] = [null, '', undefined, true, false, 1];
      invalidSources.forEach((invalidSource) => {
        it(`should throw if the source is ${JSON.stringify(invalidSource)}`, () => {
          const db: Database = database.getDatabase();
          return db.setRules(invalidSource).should.eventually.be.rejectedWith(
            'Source must be a non-empty string, Buffer or an object.');
        });
      });

      it('should throw if the server responds with a well-formed error', () => {
        const db: Database = database.getDatabase();
        stubErrorResponse({ error: 'test error' });
        return db.setRules(rules).should.eventually.be.rejectedWith(
          'Error while accessing security rules: test error');
      });

      it('should throw if the server responds with an error', () => {
        const db: Database = database.getDatabase();
        stubErrorResponse('error text');
        return db.setRules(rules).should.eventually.be.rejectedWith(
          'Error while accessing security rules: error text');
      });

      it('should throw in the event of an I/O error', () => {
        const db: Database = database.getDatabase();
        const stub = sinon.stub(HttpClient.prototype, 'send').rejects(
          new Error('network error'));
        stubs.push(stub);
        return db.setRules(rules).should.eventually.be.rejectedWith('network error');
      });
    });
  });
});

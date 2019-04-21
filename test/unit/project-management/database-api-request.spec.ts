/*!
 * Copyright 2019 Google Inc.
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
import * as chaiAsPromised from 'chai-as-promised';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FirebaseApp } from '../../../src/firebase-app';
import { DatabaseRequestHandler } from '../../../src/project-management/database-api-request';
import { HttpClient } from '../../../src/utils/api-request';
import * as mocks from '../../resources/mocks';
import * as utils from '../utils';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const DATABASE_RULES_URL = mocks.databaseURL + '/.settings/rules.json';
const VALID_DATABASE_RULES = `
{
  "rules": {
    // My rules
    "foo": {
      ".read": true,
      ".write": false,
    },
  },
}
`.trim();

describe('DatabaseRequestHandler', () => {
  const mockAccessToken: string = utils.generateRandomAccessToken();
  let stubs: sinon.SinonStub[] = [];
  let getTokenStub: sinon.SinonStub;
  let mockApp: FirebaseApp;
  let expectedHeaders: object;
  let requestHandler: DatabaseRequestHandler;

  before(() => {
    getTokenStub = utils.stubGetAccessToken(mockAccessToken);
  });

  after(() => {
    stubs = [];
    getTokenStub.restore();
  });

  beforeEach(() => {
    mockApp = mocks.app();
    expectedHeaders = {
      'X-Client-Version': 'Node/Admin/<XXX_SDK_VERSION_XXX>',
      'Authorization': 'Bearer ' + mockAccessToken,
    };
    requestHandler = new DatabaseRequestHandler(mockApp);
    return mockApp.INTERNAL.getToken();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    return mockApp.delete();
  });

  function testHttpErrors(callback: () => Promise<any>) {
    const errorCodeMap: any = {
      400: 'project-management/invalid-argument',
      401: 'project-management/authentication-error',
      403: 'project-management/authentication-error',
      423: 'project-management/failed-precondition',
      500: 'project-management/internal-error',
      503: 'project-management/service-unavailable',
    };
    Object.keys(errorCodeMap).forEach((errorCode) => {
      if (!errorCodeMap.hasOwnProperty(errorCode)) {
        return;
      }
      it(`should throw for HTTP ${errorCode} errors`, () => {
        const stub = sinon
          .stub(HttpClient.prototype, 'send')
          .rejects(utils.errorFrom({}, parseInt(errorCode, 10)));
        stubs.push(stub);

        return callback().should.eventually.be.rejected.and.have.property(
          'code',
          errorCodeMap[errorCode],
        );
      });
    });

    it('should throw for HTTP unknown errors', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 1337));
      stubs.push(stub);

      return callback().should.eventually.be.rejected.and.have.property(
        'code',
        'project-management/unknown-error',
      );
    });
  }

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        return new DatabaseRequestHandler(mockApp);
      }).not.to.throw(Error);
    });
  });

  describe('getDatabaseRules', () => {
    testHttpErrors(() => requestHandler.getRules());

    it('should succeed', () => {
      const expectedResult = VALID_DATABASE_RULES;

      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(expectedResult));
      stubs.push(stub);

      return requestHandler.getRules().then((result) => {
        expect(result).to.deep.equal(expectedResult);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'GET',
          url: DATABASE_RULES_URL,
          data: null,
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });

  describe('setDatabaseRules', () => {
    testHttpErrors(() => requestHandler.setRules(VALID_DATABASE_RULES));

    it('should succeed', () => {
      const stub = sinon
        .stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(''));
      stubs.push(stub);

      const requestData = VALID_DATABASE_RULES;
      return requestHandler.setRules(VALID_DATABASE_RULES).then((result) => {
        expect(result).to.equal(undefined);
        expect(stub).to.have.been.calledOnce.and.calledWith({
          method: 'PUT',
          url: DATABASE_RULES_URL,
          data: requestData,
          headers: expectedHeaders,
          timeout: 10000,
        });
      });
    });
  });
});

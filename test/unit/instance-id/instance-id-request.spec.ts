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
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {FirebaseApp} from '../../../src/firebase-app';
import {HttpRequestHandler} from '../../../src/utils/api-request';
import {FirebaseInstanceIdRequestHandler} from '../../../src/instance-id/instance-id-request';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('FirebaseInstanceIdRequestHandler', () => {
  let mockApp: FirebaseApp;
  let projectId: string = 'test-project-id';
  let mockedRequests: nock.Scope[] = [];
  let stubs: sinon.SinonStub[] = [];
  let mockAccessToken: string = utils.generateRandomAccessToken();
  let expectedHeaders: Object;

  before(() => utils.mockFetchAccessTokenRequests(mockAccessToken));

  after(() => {
    stubs = [];
    nock.cleanAll();
  });

  beforeEach(() => {
    mockApp = mocks.app();
    expectedHeaders = {
      Authorization: 'Bearer ' + mockAccessToken,
    };
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    return mockApp.delete();
  });

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        return new FirebaseInstanceIdRequestHandler(mockApp, projectId);
      }).not.to.throw(Error);
    });
  });

  describe('deleteInstanceId', () => {
    const httpMethod = 'DELETE';
    const host = 'console.firebase.google.com';
    const port = 443;
    const path = `/v1/project/${projectId}/instanceId/test-iid`;
    const timeout = 10000;
    
    it('should be fulfilled given a valid instance ID', () => {
      const expectedResult = {};

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      const requestHandler = new FirebaseInstanceIdRequestHandler(mockApp, projectId);
      return requestHandler.deleteInstanceId('test-iid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, undefined, expectedHeaders, timeout);
        });
    });
    
    it('should throw for HTTP 404 errors', () => {
        const expectedResult = {'statusCode': 404};
  
        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.reject(expectedResult));
        stubs.push(stub);
  
        const requestHandler = new FirebaseInstanceIdRequestHandler(mockApp, projectId);
        return requestHandler.deleteInstanceId('test-iid')
          .then(() => {
            throw new Error('Unexpected success');
          })
          .catch((error) => {
            expect(error.code).to.equal('instance-id/api-error');
            expect(error.message).to.equal('Instance ID "test-iid": Failed to find the instance ID.');
          });
    });

    it('should throw for HTTP 409 errors', () => {
        const expectedResult = {'statusCode': 409};
  
        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.reject(expectedResult));
        stubs.push(stub);
  
        const requestHandler = new FirebaseInstanceIdRequestHandler(mockApp, projectId);
        return requestHandler.deleteInstanceId('test-iid')
          .then(() => {
            throw new Error('Unexpected success');
          })
          .catch((error) => {
            expect(error.code).to.equal('instance-id/api-error');
            expect(error.message).to.equal('Instance ID "test-iid": Already deleted.');
          });
    });

    it('should throw for unexpected HTTP errors', () => {
        const expectedResult = {'statusCode': 511};
  
        let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
          .returns(Promise.reject(expectedResult));
        stubs.push(stub);
  
        const requestHandler = new FirebaseInstanceIdRequestHandler(mockApp, projectId);
        return requestHandler.deleteInstanceId('test-iid')
          .then(() => {
            throw new Error('Unexpected success');
          })
          .catch((error) => {
            expect(error.code).to.equal('instance-id/api-error');
            expect(error.message).to.equal(JSON.stringify(expectedResult));
          });
    });
  });
});

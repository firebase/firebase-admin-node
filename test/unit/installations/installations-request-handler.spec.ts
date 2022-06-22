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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import { FirebaseApp } from '../../../src/app/firebase-app';
import { HttpClient } from '../../../src/utils/api-request';
import { FirebaseInstallationsRequestHandler } from '../../../src/installations/installations-request-handler';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('FirebaseInstallationsRequestHandler', () => {
  const projectId = 'project_id';
  const mockAccessToken: string = utils.generateRandomAccessToken();
  let stubs: sinon.SinonStub[] = [];
  let getTokenStub: sinon.SinonStub;
  let mockApp: FirebaseApp;
  let expectedHeaders: object;

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
      Authorization: 'Bearer ' + mockAccessToken,
    };
    return mockApp.INTERNAL.getToken();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    return mockApp.delete();
  });

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        return new FirebaseInstallationsRequestHandler(mockApp);
      }).not.to.throw(Error);
    });
  });

  describe('deleteInstallation', () => {
    const httpMethod = 'DELETE';
    const host = 'console.firebase.google.com';
    const path = `/v1/project/${projectId}/instanceId/test-fid`;
    const timeout = 10000;

    it('should be fulfilled given a valid installation ID', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .resolves(utils.responseFrom(''));
      stubs.push(stub);

      const requestHandler = new FirebaseInstallationsRequestHandler(mockApp);
      return requestHandler.deleteInstallation('test-fid')
        .then(() => {
          expect(stub).to.have.been.calledOnce.and.calledWith({
            method: httpMethod,
            url: `https://${host}${path}`,
            headers: expectedHeaders,
            timeout,
          });
        });
    });

    it('should throw for HTTP 404 errors', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 404));
      stubs.push(stub);

      const requestHandler = new FirebaseInstallationsRequestHandler(mockApp);
      return requestHandler.deleteInstallation('test-fid')
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error.code).to.equal('installations/api-error');
          expect(error.message).to.equal('Installation ID "test-fid": Failed to find the installation ID.');
        });
    });

    it('should throw for HTTP 409 errors', () => {
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom({}, 409));
      stubs.push(stub);

      const requestHandler = new FirebaseInstallationsRequestHandler(mockApp);
      return requestHandler.deleteInstallation('test-fid')
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error.code).to.equal('installations/api-error');
          expect(error.message).to.equal('Installation ID "test-fid": Already deleted.');
        });
    });

    it('should throw for unexpected HTTP errors', () => {
      const expectedResult = { error: 'test error' };
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .rejects(utils.errorFrom(expectedResult, 511));
      stubs.push(stub);

      const requestHandler = new FirebaseInstallationsRequestHandler(mockApp);
      return requestHandler.deleteInstallation('test-fid')
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error.code).to.equal('installations/api-error');
          expect(error.message).to.equal('test error');
        });
    });
  });
});

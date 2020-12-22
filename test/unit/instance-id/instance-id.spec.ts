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

import { InstanceId } from '../../../src/instance-id/instance-id';
import { FirebaseInstanceIdRequestHandler } from '../../../src/instance-id/instance-id-request-internal';
import { FirebaseApp } from '../../../src/firebase-app';
import { FirebaseInstanceIdError, InstanceIdClientErrorCode } from '../../../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('InstanceId', () => {
  let iid: InstanceId;
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;
  let getTokenStub: sinon.SinonStub;

  let nullAccessTokenClient: InstanceId;
  let malformedAccessTokenClient: InstanceId;
  let rejectedPromiseAccessTokenClient: InstanceId;

  let googleCloudProject: string | undefined;
  let gcloudProject: string | undefined;

  const noProjectIdError = 'Failed to determine project ID for InstanceId. Initialize the SDK '
  + 'with service account credentials or set project ID as an app option. Alternatively set the '
  + 'GOOGLE_CLOUD_PROJECT environment variable.';

  beforeEach(() => {
    mockApp = mocks.app();
    getTokenStub = utils.stubGetAccessToken(undefined, mockApp);
    mockCredentialApp = mocks.mockCredentialApp();
    iid = new InstanceId(mockApp);

    googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
    gcloudProject = process.env.GCLOUD_PROJECT;

    nullAccessTokenClient = new InstanceId(mocks.appReturningNullAccessToken());
    malformedAccessTokenClient = new InstanceId(mocks.appReturningMalformedAccessToken());
    rejectedPromiseAccessTokenClient = new InstanceId(mocks.appRejectedWhileFetchingAccessToken());
  });

  afterEach(() => {
    getTokenStub.restore();
    process.env.GOOGLE_CLOUD_PROJECT = googleCloudProject;
    process.env.GCLOUD_PROJECT = gcloudProject;
    return mockApp.delete();
  });


  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const iidAny: any = InstanceId;
          return new iidAny(invalidApp);
        }).to.throw('First argument passed to admin.instanceId() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const iidAny: any = InstanceId;
        return new iidAny();
      }).to.throw('First argument passed to admin.instanceId() must be a valid Firebase app instance.');
    });

    it('should reject given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const instanceId = new InstanceId(mockCredentialApp);
      return instanceId.deleteInstanceId('iid')
        .should.eventually.rejectedWith(noProjectIdError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new InstanceId(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(iid.app).to.equal(mockApp);
    });

    it('is read-only', () => {
      expect(() => {
        (iid as any).app = mockApp;
      }).to.throw('Cannot set property app of #<InstanceId> which has only a getter');
    });
  });

  describe('deleteInstanceId()', () => {

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    const expectedError = new FirebaseInstanceIdError(InstanceIdClientErrorCode.API_ERROR);
    const testInstanceId = 'test-iid';

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no instance ID', () => {
      return (iid as any).deleteInstanceId()
        .should.eventually.be.rejected.and.have.property('code', 'instance-id/invalid-instance-id');
    });

    it('should be rejected given an invalid instance ID', () => {
      return iid.deleteInstanceId('')
        .should.eventually.be.rejected.and.have.property('code', 'instance-id/invalid-instance-id');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenClient.deleteInstanceId(testInstanceId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenClient.deleteInstanceId(testInstanceId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenClient.deleteInstanceId(testInstanceId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve without errors on success', () => {
      const stub = sinon.stub(FirebaseInstanceIdRequestHandler.prototype, 'deleteInstanceId')
        .resolves();
      stubs.push(stub);
      return iid.deleteInstanceId(testInstanceId)
        .then(() => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(testInstanceId);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub deleteInstanceId to throw a backend error.
      const stub = sinon.stub(FirebaseInstanceIdRequestHandler.prototype, 'deleteInstanceId')
        .returns(Promise.reject(expectedError));
      stubs.push(stub);
      return iid.deleteInstanceId(testInstanceId)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(testInstanceId);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });
});

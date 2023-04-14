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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocks from '../../resources/mocks';

import { FirebaseApp } from '../../../src/app/firebase-app';
import { AppCheck } from '../../../src/app-check/index';
import { AppCheckApiClient, FirebaseAppCheckError } from '../../../src/app-check/app-check-api-client-internal';
import { AppCheckTokenGenerator } from '../../../src/app-check/token-generator';
import { HttpClient } from '../../../src/utils/api-request';
import { ServiceAccountSigner } from '../../../src/utils/crypto-signer';
import { AppCheckTokenVerifier } from '../../../src/app-check/token-verifier';

const expect = chai.expect;

describe('AppCheck', () => {

  const INTERNAL_ERROR = new FirebaseAppCheckError('internal-error', 'message');
  const APP_ID = '1:1234:android:1234';
  const TEST_TOKEN_TO_EXCHANGE = 'signed-custom-token';

  let appCheck: AppCheck;

  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;

  // Stubs used to simulate underlying api calls.
  let stubs: sinon.SinonStub[] = [];

  before(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    appCheck = new AppCheck(mockApp);
  });

  after(() => {
    return mockApp.delete();
  });

  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    stubs = [];
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const appCheckAny: any = AppCheck;
          return new appCheckAny(invalidApp);
        }).to.throw(
          'First argument passed to admin.appCheck() must be a valid Firebase app '
          + 'instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const appCheckAny: any = AppCheck;
        return new appCheckAny();
      }).to.throw(
        'First argument passed to admin.appCheck() must be a valid Firebase app '
        + 'instance.');
    });

    it('should reject when initialized without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const noProjectId = 'Failed to determine project ID. Initialize the SDK with service '
        + 'account credentials or set project ID as an app option. Alternatively, set the '
        + 'GOOGLE_CLOUD_PROJECT environment variable.';
      const appCheckWithoutProjectId = new AppCheck(mockCredentialApp);
      const stub = sinon.stub(AppCheckTokenGenerator.prototype, 'createCustomToken')
        .resolves(TEST_TOKEN_TO_EXCHANGE);
      stubs.push(stub);
      return appCheckWithoutProjectId.createToken(APP_ID)
        .should.eventually.rejectedWith(noProjectId);
    });

    it('should reject when failed to contact the Metadata server', () => {
      // Remove the Project ID to force a request to the Metadata server
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      const appCheckWithoutProjectId = new AppCheck(mockCredentialApp);
      const stub = sinon.stub(HttpClient.prototype, 'send')
        .rejects(new Error('network error.'));
      stubs.push(stub);
      const expected = 'Failed to determine service account. Make sure to initialize the SDK '
        + 'with a service account credential. Alternatively specify a service account with '
        + 'iam.serviceAccounts.signBlob permission. Original error: '
        + 'Error: network error.';
      return appCheckWithoutProjectId.createToken(APP_ID)
        .should.eventually.be.rejectedWith(expected);
    });

    it('should reject when failed to sign the token', () => {
      const expected = 'sign error';
      const stub = sinon.stub(ServiceAccountSigner.prototype, 'sign')
        .rejects(new Error(expected));
      stubs.push(stub);
      return appCheck.createToken(APP_ID)
        .should.eventually.be.rejectedWith(expected);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new AppCheck(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(appCheck.app).to.equal(mockApp);
    });
  });

  describe('createToken', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(AppCheckApiClient.prototype, 'exchangeToken')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return appCheck.createToken(APP_ID)
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    it('should propagate API errors with custom options', () => {
      const stub = sinon
        .stub(AppCheckApiClient.prototype, 'exchangeToken')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return appCheck.createToken(APP_ID, { ttlMillis: 1800000 })
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    it('should resolve with AppCheckToken on success', () => {
      const response = { token: 'token', ttlMillis: 3000 };
      const stub = sinon
        .stub(AppCheckApiClient.prototype, 'exchangeToken')
        .resolves(response);
      stubs.push(stub);
      return appCheck.createToken(APP_ID)
        .then((token) => {
          expect(token.token).equals('token');
          expect(token.ttlMillis).equals(3000);
        });
    });
  });

  describe('verifyToken', () => {
    it('should propagate API errors', () => {
      const stub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .rejects(INTERNAL_ERROR);
      stubs.push(stub);
      return appCheck.verifyToken('token')
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
    });

    it('should resolve with VerifyAppCheckTokenResponse on success', () => {
      const response = {
        sub: 'app-id',
        iss: 'https://firebaseappcheck.googleapis.com/123456',
        app_id: 'app-id',
        aud: ['123456', 'project-id'],
        exp: 1617741496,
        iat: 1516239022,
      };
      const stub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .resolves(response);
      stubs.push(stub);
      return appCheck.verifyToken('token')
        .then((tokenResponse) => {
          expect(tokenResponse.appId).equals('app-id');
          expect(tokenResponse.token).equals(response);
          expect(tokenResponse.alreadyConsumed).equals(undefined);
        });
    });

    it('should throw given an invalid options', () => {
      [null, 100, -100, 'abc', [], true].forEach((invalidOptions) => {
        expect(() => {
          return appCheck.verifyToken('token', invalidOptions as any)
        }).to.throw(
          'VerifyAppCheckTokenOptions must be a non-null object.');
      });
    });

    it('should call verifyReplayProtection when consume is set to true', () => {
      const response = {
        sub: 'app-id',
        iss: 'https://firebaseappcheck.googleapis.com/123456',
        app_id: 'app-id',
        aud: ['123456', 'project-id'],
        exp: 1617741496,
        iat: 1516239022,
      };
      const verifierStub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .resolves(response);
      const replayStub = sinon
        .stub(AppCheckApiClient.prototype, 'verifyReplayProtection')
        .resolves(true);
      stubs.push(verifierStub);
      stubs.push(replayStub);
      return appCheck.verifyToken('token', { consume: true })
        .then((tokenResponse) => {
          expect(tokenResponse.appId).equals('app-id');
          expect(tokenResponse.token).equals(response);
          expect(tokenResponse.alreadyConsumed).equals(true);

          expect(verifierStub).to.have.been.calledOnce.and.calledWith('token');
          expect(replayStub).to.have.been.calledOnce.and.calledWith('token');
        });
    });

    it('should not call verifyReplayProtection when consume is set to false', () => {
      const response = {
        sub: 'app-id',
        iss: 'https://firebaseappcheck.googleapis.com/123456',
        app_id: 'app-id',
        aud: ['123456', 'project-id'],
        exp: 1617741496,
        iat: 1516239022,
      };
      const verifierStub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .resolves(response);
      const replayStub = sinon
        .stub(AppCheckApiClient.prototype, 'verifyReplayProtection')
        .resolves(true);
      stubs.push(verifierStub);
      stubs.push(replayStub);
      return appCheck.verifyToken('token', { consume: false })
        .then((tokenResponse) => {
          expect(tokenResponse.appId).equals('app-id');
          expect(tokenResponse.token).equals(response);
          expect(tokenResponse.alreadyConsumed).equals(undefined);

          expect(verifierStub).to.have.been.calledOnce.and.calledWith('token');
          expect(replayStub).to.not.have.been.called;
        });
    });

    it('should not call verifyReplayProtection when consume is set to undefined', () => {
      const response = {
        sub: 'app-id',
        iss: 'https://firebaseappcheck.googleapis.com/123456',
        app_id: 'app-id',
        aud: ['123456', 'project-id'],
        exp: 1617741496,
        iat: 1516239022,
      };
      const verifierStub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .resolves(response);
      const replayStub = sinon
        .stub(AppCheckApiClient.prototype, 'verifyReplayProtection')
        .resolves(true);
      stubs.push(verifierStub);
      stubs.push(replayStub);
      return appCheck.verifyToken('token', { consume: undefined })
        .then((tokenResponse) => {
          expect(tokenResponse.appId).equals('app-id');
          expect(tokenResponse.token).equals(response);
          expect(tokenResponse.alreadyConsumed).equals(undefined);

          expect(verifierStub).to.have.been.calledOnce.and.calledWith('token');
          expect(replayStub).to.not.have.been.called;
        });
    });

    it('should not call verifyReplayProtection for an invalid token when consume is set to true', () => {
      const verifierStub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .rejects(INTERNAL_ERROR);
      const replayStub = sinon
        .stub(AppCheckApiClient.prototype, 'verifyReplayProtection')
        .resolves(true);
      stubs.push(verifierStub);
      stubs.push(replayStub);
      appCheck.verifyToken('token', { consume: true })
        .should.eventually.be.rejected.and.deep.equal(INTERNAL_ERROR);
      expect(verifierStub).to.have.been.calledOnce.and.calledWith('token');
      return expect(replayStub).to.not.have.been.called;
    });

    it('should resolve with VerifyAppCheckTokenResponse on success with already_consumed set', () => {
      const response = {
        sub: 'app-id',
        iss: 'https://firebaseappcheck.googleapis.com/123456',
        app_id: 'app-id',
        aud: ['123456', 'project-id'],
        exp: 1617741496,
        iat: 1516239022,
      };
      const verifierStub = sinon
        .stub(AppCheckTokenVerifier.prototype, 'verifyToken')
        .resolves(response);
      const replayStub = sinon
        .stub(AppCheckApiClient.prototype, 'verifyReplayProtection')
        .resolves(false);
      stubs.push(verifierStub);
      stubs.push(replayStub);
      return appCheck.verifyToken('token', { consume: true })
        .then((tokenResponse) => {
          expect(tokenResponse.appId).equals('app-id');
          expect(tokenResponse.token).equals(response);
          expect(tokenResponse.alreadyConsumed).equals(false);

          expect(verifierStub).to.have.been.calledOnce.and.calledWith('token');
          expect(replayStub).to.have.been.calledOnce.and.calledWith('token');
        });
    });
  });
});

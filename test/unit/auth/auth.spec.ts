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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {Auth, DecodedIdToken} from '../../../src/auth/auth';
import {UserRecord} from '../../../src/auth/user-record';
import {FirebaseApp} from '../../../src/firebase-app';
import {FirebaseTokenGenerator} from '../../../src/auth/token-generator';
import {FirebaseAuthRequestHandler} from '../../../src/auth/auth-api-request';
import {AuthClientErrorCode, FirebaseAuthError} from '../../../src/utils/error';

import * as validator from '../../../src/utils/validator';
import { FirebaseTokenVerifier } from '../../../src/auth/token-verifier';
import {
  AuthProviderConfigFilter, OIDCConfig, SAMLConfig,
  OIDCConfigServerResponse, SAMLConfigServerResponse,
} from '../../../src/auth/auth-config';
import {deepCopy} from '../../../src/utils/deep-copy';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;


interface EmailActionTest {
  api: string;
  requestType: string;
  requiresSettings: boolean;
}


/**
 * @return {object} A sample valid server response as returned from getAccountInfo
 *     endpoint.
 */
function getValidGetAccountInfoResponse() {
  const userResponse: object = {
    localId: 'abcdefghijklmnopqrstuvwxyz',
    email: 'user@gmail.com',
    emailVerified: true,
    displayName: 'John Doe',
    phoneNumber: '+11234567890',
    providerUserInfo: [
      {
        providerId: 'google.com',
        displayName: 'John Doe',
        photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
        federatedId: '1234567890',
        email: 'user@gmail.com',
        rawId: '1234567890',
      },
      {
        providerId: 'facebook.com',
        displayName: 'John Smith',
        photoUrl: 'https://facebook.com/0987654321/photo.jpg',
        federatedId: '0987654321',
        email: 'user@facebook.com',
        rawId: '0987654321',
      },
      {
        providerId: 'phone',
        phoneNumber: '+11234567890',
        rawId: '+11234567890',
      },
    ],
    photoUrl: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
    validSince: '1476136676',
    lastLoginAt: '1476235905000',
    createdAt: '1476136676000',
  };
  return {
    kind: 'identitytoolkit#GetAccountInfoResponse',
    users: [userResponse],
  };
}

/**
 * Returns a user record corresponding to the getAccountInfo response.
 *
 * @param {any} serverResponse Raw getAccountInfo response.
 * @return {Object} The corresponding user record.
 */
function getValidUserRecord(serverResponse: any) {
  return new UserRecord(serverResponse.users[0]);
}


/**
 * Generates a mock decoded ID token with the provided parameters.
 *
 * @param {string} uid The uid corresponding to the ID token.
 * @param {Date} authTime The authentication time of the ID token.
 * @return {DecodedIdToken} The generated decoded ID token.
 */
function getDecodedIdToken(uid: string, authTime: Date): DecodedIdToken {
  return {
    iss: 'https://securetoken.google.com/project123456789',
    aud: 'project123456789',
    auth_time: Math.floor(authTime.getTime() / 1000),
    sub: uid,
    iat: Math.floor(authTime.getTime() / 1000),
    exp: Math.floor(authTime.getTime() / 1000 + 3600),
    firebase: {
      identities: {},
      sign_in_provider: 'custom',
    },
  };
}


/**
 * Generates a mock decoded session cookie with the provided parameters.
 *
 * @param {string} uid The uid corresponding to the session cookie.
 * @param {Date} authTime The authentication time of the session cookie.
 * @return {DecodedIdToken} The generated decoded session cookie.
 */
function getDecodedSessionCookie(uid: string, authTime: Date): DecodedIdToken {
  return {
    iss: 'https://session.firebase.google.com/project123456789',
    aud: 'project123456789',
    auth_time: Math.floor(authTime.getTime() / 1000),
    sub: uid,
    iat: Math.floor(authTime.getTime() / 1000),
    exp: Math.floor(authTime.getTime() / 1000 + 3600),
    firebase: {
      identities: {},
      sign_in_provider: 'custom',
    },
  };
}


/**
 * Generates a mock OIDC config server response for the corresponding provider ID.
 *
 * @param {string} providerId The provider ID whose sample OIDCConfigServerResponse is to be returned.
 * @return {OIDCConfigServerResponse} The corresponding sample OIDCConfigServerResponse.
 */
function getOIDCConfigServerResponse(providerId: string): OIDCConfigServerResponse {
  return {
    name: `projects/project_id/oauthIdpConfigs/${providerId}`,
    displayName: 'OIDC_DISPLAY_NAME',
    enabled: true,
    clientId: 'CLIENT_ID',
    issuer: 'https://oidc.com/issuer',
  };
}

/**
 * Generates a mock SAML config server response for the corresponding provider ID.
 *
 * @param {string} providerId The provider ID whose sample SAMLConfigServerResponse is to be returned.
 * @return {SAMLConfigServerResponse} The corresponding sample SAMLConfigServerResponse.
 */
function getSAMLConfigServerResponse(providerId: string): SAMLConfigServerResponse {
  return {
    name: `projects/project_id/inboundSamlConfigs/${providerId}`,
    idpConfig: {
      idpEntityId: 'IDP_ENTITY_ID',
      ssoUrl: 'https://example.com/login',
      signRequest: true,
      idpCertificates: [
        {x509Certificate: 'CERT1'},
        {x509Certificate: 'CERT2'},
      ],
    },
    spConfig: {
      spEntityId: 'RP_ENTITY_ID',
      callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
    },
    displayName: 'SAML_DISPLAY_NAME',
    enabled: true,
  };
}


describe('Auth', () => {
  let auth: Auth;
  let mockApp: FirebaseApp;
  let getTokenStub: sinon.SinonStub;
  let oldProcessEnv: NodeJS.ProcessEnv;
  let nullAccessTokenAuth: Auth;
  let malformedAccessTokenAuth: Auth;
  let rejectedPromiseAccessTokenAuth: Auth;

  beforeEach(() => {
    mockApp = mocks.app();
    getTokenStub = utils.stubGetAccessToken(undefined, mockApp);
    auth = new Auth(mockApp);

    nullAccessTokenAuth = new Auth(mocks.appReturningNullAccessToken());
    malformedAccessTokenAuth = new Auth(mocks.appReturningMalformedAccessToken());
    rejectedPromiseAccessTokenAuth = new Auth(mocks.appRejectedWhileFetchingAccessToken());

    oldProcessEnv = process.env;
    // Project ID not set in the environment.
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
  });

  afterEach(() => {
    getTokenStub.restore();
    process.env = oldProcessEnv;
    return mockApp.delete();
  });


  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it('should throw given invalid app: ' + JSON.stringify(invalidApp), () => {
        expect(() => {
          const authAny: any = Auth;
          return new authAny(invalidApp);
        }).to.throw('First argument passed to admin.auth() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const authAny: any = Auth;
        return new authAny();
      }).to.throw('First argument passed to admin.auth() must be a valid Firebase app instance.');
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new Auth(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(auth.app).to.equal(mockApp);
    });

    it('is read-only', () => {
      expect(() => {
        (auth as any).app = mockApp;
      }).to.throw('Cannot set property app of #<Auth> which has only a getter');
    });
  });

  describe('createCustomToken()', () => {
    let spy: sinon.SinonSpy;
    beforeEach(() => {
      spy = sinon.spy(FirebaseTokenGenerator.prototype, 'createCustomToken');
    });

    afterEach(() => {
      spy.restore();
    });

    it('should throw if a cert credential is not specified', () => {
      const mockCredentialAuth = new Auth(mocks.mockCredentialApp());

      expect(() => {
        mockCredentialAuth.createCustomToken(mocks.uid, mocks.developerClaims);
      }).not.to.throw;
    });

    it('should forward on the call to the token generator\'s createCustomToken() method', () => {
      return auth.createCustomToken(mocks.uid, mocks.developerClaims)
        .then(() => {
          expect(spy)
            .to.have.been.calledOnce
            .and.calledWith(mocks.uid, mocks.developerClaims);
        });
    });

    it('should be fulfilled given an app which returns null access tokens', () => {
      // createCustomToken() does not rely on an access token and therefore works in this scenario.
      return nullAccessTokenAuth.createCustomToken(mocks.uid, mocks.developerClaims)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled given an app which returns invalid access tokens', () => {
      // createCustomToken() does not rely on an access token and therefore works in this scenario.
      return malformedAccessTokenAuth.createCustomToken(mocks.uid, mocks.developerClaims)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled given an app which fails to generate access tokens', () => {
      // createCustomToken() does not rely on an access token and therefore works in this scenario.
      return rejectedPromiseAccessTokenAuth.createCustomToken(mocks.uid, mocks.developerClaims)
        .should.eventually.be.fulfilled;
    });
  });

  it('verifyIdToken() should throw when project ID is not specified', () => {
    const mockCredentialAuth = new Auth(mocks.mockCredentialApp());
    const expected = 'Must initialize app with a cert credential or set your Firebase project ID ' +
      'as the GOOGLE_CLOUD_PROJECT environment variable to call verifyIdToken().';
    expect(() => {
      mockCredentialAuth.verifyIdToken(mocks.generateIdToken());
    }).to.throw(expected);
  });

  it('verifySessionCookie() should throw when project ID is not specified', () => {
    const mockCredentialAuth = new Auth(mocks.mockCredentialApp());
    const expected = 'Must initialize app with a cert credential or set your Firebase project ID ' +
      'as the GOOGLE_CLOUD_PROJECT environment variable to call verifySessionCookie().';
    expect(() => {
      mockCredentialAuth.verifySessionCookie(mocks.generateSessionCookie());
    }).to.throw(expected);
  });

  describe('verifyIdToken()', () => {
    let stub: sinon.SinonStub;
    let mockIdToken: string;
    const expectedUserRecord = getValidUserRecord(getValidGetAccountInfoResponse());
    // Set auth_time of token to expected user's tokensValidAfterTime.
    const validSince = new Date(expectedUserRecord.tokensValidAfterTime);
    // Set expected uid to expected user's.
    const uid = expectedUserRecord.uid;
    // Set expected decoded ID token with expected UID and auth time.
    const decodedIdToken = getDecodedIdToken(uid, validSince);
    let clock: sinon.SinonFakeTimers;

    // Stubs used to simulate underlying api calls.
    const stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .resolves(decodedIdToken);
      stubs.push(stub);
      mockIdToken = mocks.generateIdToken();
      clock = sinon.useFakeTimers(validSince.getTime());
    });
    afterEach(() => {
      _.forEach(stubs, (s) => s.restore());
      clock.restore();
    });

    it('should forward on the call to the token generator\'s verifyIdToken() method', () => {
      // Stub getUser call.
      const getUserStub = sinon.stub(Auth.prototype, 'getUser');
      stubs.push(getUserStub);
      return auth.verifyIdToken(mockIdToken).then((result) => {
        // Confirm getUser never called.
        expect(getUserStub).not.to.have.been.called;
        expect(result).to.deep.equal(decodedIdToken);
        expect(stub).to.have.been.calledOnce.and.calledWith(mockIdToken);
      });
    });

    it('should reject when underlying idTokenVerifier.verifyJWT() rejects with expected error', () =>  {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT, 'Decoding Firebase ID token failed');
      // Restore verifyIdToken stub.
      stub.restore();
      // Simulate ID token is invalid.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .rejects(expectedError);
      stubs.push(stub);
      return auth.verifyIdToken(mockIdToken)
        .should.eventually.be.rejectedWith('Decoding Firebase ID token failed');
    });

    it('should work with a non-cert credential when the GOOGLE_CLOUD_PROJECT environment variable is present', () => {
      process.env.GOOGLE_CLOUD_PROJECT = mocks.projectId;

      const mockCredentialAuth = new Auth(mocks.mockCredentialApp());

      return mockCredentialAuth.verifyIdToken(mockIdToken).then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mockIdToken);
      });
    });

    it('should work with a non-cert credential when the GCLOUD_PROJECT environment variable is present', () => {
      process.env.GCLOUD_PROJECT = mocks.projectId;

      const mockCredentialAuth = new Auth(mocks.mockCredentialApp());

      return mockCredentialAuth.verifyIdToken(mockIdToken).then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mockIdToken);
      });
    });

    it('should be fulfilled given an app which returns null access tokens', () => {
      // verifyIdToken() does not rely on an access token and therefore works in this scenario.
      return nullAccessTokenAuth.verifyIdToken(mockIdToken)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled given an app which returns invalid access tokens', () => {
      // verifyIdToken() does not rely on an access token and therefore works in this scenario.
      return malformedAccessTokenAuth.verifyIdToken(mockIdToken)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled given an app which fails to generate access tokens', () => {
      // verifyIdToken() does not rely on an access token and therefore works in this scenario.
      return rejectedPromiseAccessTokenAuth.verifyIdToken(mockIdToken)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled with checkRevoked set to true using an unrevoked ID token', () => {
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .resolves(expectedUserRecord);
      stubs.push(getUserStub);
      // Verify ID token while checking if revoked.
      return auth.verifyIdToken(mockIdToken, true)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          expect(result).to.deep.equal(decodedIdToken);
        });
    });

    it('should be rejected with checkRevoked set to true using a revoked ID token', () => {
      // One second before validSince.
      const oneSecBeforeValidSince = new Date(validSince.getTime() - 1000);
      // Restore verifyIdToken stub.
      stub.restore();
      // Simulate revoked ID token returned with auth_time one second before validSince.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .resolves(getDecodedIdToken(uid, oneSecBeforeValidSince));
      stubs.push(stub);
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .resolves(expectedUserRecord);
      stubs.push(getUserStub);
      // Verify ID token while checking if revoked.
      return auth.verifyIdToken(mockIdToken, true)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.have.property('code', 'auth/id-token-revoked');
        });
    });

    it('should be fulfilled with checkRevoked set to false using a revoked ID token', () => {
      // One second before validSince.
      const oneSecBeforeValidSince = new Date(validSince.getTime() - 1000);
      const oneSecBeforeValidSinceDecodedIdToken =
          getDecodedIdToken(uid, oneSecBeforeValidSince);
      // Restore verifyIdToken stub.
      stub.restore();
      // Simulate revoked ID token returned with auth_time one second before validSince.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .resolves(oneSecBeforeValidSinceDecodedIdToken);
      stubs.push(stub);
      // Verify ID token without checking if revoked.
      // This call should succeed.
      return auth.verifyIdToken(mockIdToken, false)
        .then((result) => {
          expect(result).to.deep.equal(oneSecBeforeValidSinceDecodedIdToken);
        });
    });

    it('should be rejected with checkRevoked set to true if underlying RPC fails', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .rejects(expectedError);
      stubs.push(getUserStub);
      // Verify ID token while checking if revoked.
      // This should fail with the underlying RPC error.
      return auth.verifyIdToken(mockIdToken, true)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });

    it('should be fulfilled with checkRevoked set to true when no validSince available', () => {
      // Simulate no validSince set on the user.
      const noValidSinceGetAccountInfoResponse = getValidGetAccountInfoResponse();
      delete (noValidSinceGetAccountInfoResponse.users[0] as any).validSince;
      const noValidSinceExpectedUserRecord =
         getValidUserRecord(noValidSinceGetAccountInfoResponse);
      // Confirm null tokensValidAfterTime on user.
      expect(noValidSinceExpectedUserRecord.tokensValidAfterTime).to.be.undefined;
      // Simulate getUser returns the expected user with no validSince.
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .resolves(noValidSinceExpectedUserRecord);
      stubs.push(getUserStub);
      // Verify ID token while checking if revoked.
      return auth.verifyIdToken(mockIdToken, true)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          expect(result).to.deep.equal(decodedIdToken);
        });
    });

    it('should be rejected with checkRevoked set to true using an invalid ID token', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CREDENTIAL);
      // Restore verifyIdToken stub.
      stub.restore();
      // Simulate ID token is invalid.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .rejects(expectedError);
      stubs.push(stub);
      // Verify ID token while checking if revoked.
      // This should fail with the underlying token generator verifyIdToken error.
      return auth.verifyIdToken(mockIdToken, true)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('verifySessionCookie()', () => {
    let stub: sinon.SinonStub;
    let mockSessionCookie: string;
    const expectedUserRecord = getValidUserRecord(getValidGetAccountInfoResponse());
    // Set auth_time of token to expected user's tokensValidAfterTime.
    const validSince = new Date(expectedUserRecord.tokensValidAfterTime);
    // Set expected uid to expected user's.
    const uid = expectedUserRecord.uid;
    // Set expected decoded session cookie with expected UID and auth time.
    const decodedSessionCookie = getDecodedSessionCookie(uid, validSince);
    let clock: sinon.SinonFakeTimers;

    // Stubs used to simulate underlying api calls.
    const stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .resolves(decodedSessionCookie);
      stubs.push(stub);
      mockSessionCookie = mocks.generateSessionCookie();
      clock = sinon.useFakeTimers(validSince.getTime());
    });
    afterEach(() => {
      _.forEach(stubs, (s) => s.restore());
      clock.restore();
    });

    it('should forward on the call to the token verifier\'s verifySessionCookie() method', () => {
      // Stub getUser call.
      const getUserStub = sinon.stub(Auth.prototype, 'getUser');
      stubs.push(getUserStub);
      return auth.verifySessionCookie(mockSessionCookie).then((result) => {
        // Confirm getUser never called.
        expect(getUserStub).not.to.have.been.called;
        expect(result).to.deep.equal(decodedSessionCookie);
        expect(stub).to.have.been.calledOnce.and.calledWith(mockSessionCookie);
      });
    });

    it('should reject when underlying sessionCookieVerifier.verifyJWT() rejects with expected error', () =>  {
      const expectedError = new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT, 'Decoding Firebase session cookie failed');
      // Restore verifySessionCookie stub.
      stub.restore();
      // Simulate session cookie is invalid.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .rejects(expectedError);
      stubs.push(stub);
      return auth.verifySessionCookie(mockSessionCookie)
        .should.eventually.be.rejectedWith('Decoding Firebase session cookie failed');
    });

    it('should work with a non-cert credential when the GOOGLE_CLOUD_PROJECT environment variable is present', () => {
      process.env.GOOGLE_CLOUD_PROJECT = mocks.projectId;

      const mockCredentialAuth = new Auth(mocks.mockCredentialApp());

      return mockCredentialAuth.verifySessionCookie(mockSessionCookie).then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mockSessionCookie);
      });
    });

    it('should work with a non-cert credential when the GCLOUD_PROJECT environment variable is present', () => {
      process.env.GCLOUD_PROJECT = mocks.projectId;

      const mockCredentialAuth = new Auth(mocks.mockCredentialApp());

      return mockCredentialAuth.verifySessionCookie(mockSessionCookie).then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mockSessionCookie);
      });
    });

    it('should be fulfilled given an app which returns null access tokens', () => {
      // verifySessionCookie() does not rely on an access token and therefore works in this scenario.
      return nullAccessTokenAuth.verifySessionCookie(mockSessionCookie)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled given an app which returns invalid access tokens', () => {
      // verifySessionCookie() does not rely on an access token and therefore works in this scenario.
      return malformedAccessTokenAuth.verifySessionCookie(mockSessionCookie)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled given an app which fails to generate access tokens', () => {
      // verifySessionCookie() does not rely on an access token and therefore works in this scenario.
      return rejectedPromiseAccessTokenAuth.verifySessionCookie(mockSessionCookie)
        .should.eventually.be.fulfilled;
    });

    it('should be fulfilled with checkRevoked set to true using an unrevoked session cookie', () => {
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .resolves(expectedUserRecord);
      stubs.push(getUserStub);
      // Verify ID token while checking if revoked.
      return auth.verifySessionCookie(mockSessionCookie, true)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          expect(result).to.deep.equal(decodedSessionCookie);
        });
    });

    it('should be rejected with checkRevoked set to true using a revoked session cookie', () => {
      // One second before validSince.
      const oneSecBeforeValidSince = new Date(validSince.getTime() - 1000);
      // Restore verifySessionCookie stub.
      stub.restore();
      // Simulate revoked session cookie returned with auth_time one second before validSince.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .resolves(getDecodedSessionCookie(uid, oneSecBeforeValidSince));
      stubs.push(stub);
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .resolves(expectedUserRecord);
      stubs.push(getUserStub);
      // Verify session cookie while checking if revoked.
      return auth.verifySessionCookie(mockSessionCookie, true)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.have.property('code', 'auth/session-cookie-revoked');
        });
    });

    it('should be fulfilled with checkRevoked set to false using a revoked session cookie', () => {
      // One second before validSince.
      const oneSecBeforeValidSince = new Date(validSince.getTime() - 1000);
      const oneSecBeforeValidSinceDecodedSessionCookie =
          getDecodedSessionCookie(uid, oneSecBeforeValidSince);
      // Restore verifySessionCookie stub.
      stub.restore();
      // Simulate revoked session cookie returned with auth_time one second before validSince.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .resolves(oneSecBeforeValidSinceDecodedSessionCookie);
      stubs.push(stub);
      // Verify session cookie without checking if revoked.
      // This call should succeed.
      return auth.verifySessionCookie(mockSessionCookie, false)
        .then((result) => {
          expect(result).to.deep.equal(oneSecBeforeValidSinceDecodedSessionCookie);
        });
    });

    it('should be rejected with checkRevoked set to true if underlying RPC fails', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .rejects(expectedError);
      stubs.push(getUserStub);
      // Verify session cookie while checking if revoked.
      // This should fail with the underlying RPC error.
      return auth.verifySessionCookie(mockSessionCookie, true)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });

    it('should be fulfilled with checkRevoked set to true when no validSince available', () => {
      // Simulate no validSince set on the user.
      const noValidSinceGetAccountInfoResponse = getValidGetAccountInfoResponse();
      delete (noValidSinceGetAccountInfoResponse.users[0] as any).validSince;
      const noValidSinceExpectedUserRecord =
         getValidUserRecord(noValidSinceGetAccountInfoResponse);
      // Confirm null tokensValidAfterTime on user.
      expect(noValidSinceExpectedUserRecord.tokensValidAfterTime).to.be.undefined;
      // Simulate getUser returns the expected user with no validSince.
      const getUserStub = sinon.stub(Auth.prototype, 'getUser')
        .resolves(noValidSinceExpectedUserRecord);
      stubs.push(getUserStub);
      // Verify session cookie while checking if revoked.
      return auth.verifySessionCookie(mockSessionCookie, true)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          expect(result).to.deep.equal(decodedSessionCookie);
        });
    });

    it('should be rejected with checkRevoked set to true using an invalid session cookie', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CREDENTIAL);
      // Restore verifySessionCookie stub.
      stub.restore();
      // Simulate session cookie is invalid.
      stub = sinon.stub(FirebaseTokenVerifier.prototype, 'verifyJWT')
        .rejects(expectedError);
      stubs.push(stub);
      // Verify session cookie while checking if revoked.
      // This should fail with the underlying token generator verifySessionCookie error.
      return auth.verifySessionCookie(mockSessionCookie, true)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('getUser()', () => {
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => sinon.spy(validator, 'isUid'));
    afterEach(() => {
      (validator.isUid as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no uid', () => {
      return (auth as any).getUser()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-uid');
    });

    it('should be rejected given an invalid uid', () => {
      const invalidUid = ('a' as any).repeat(129);
      return auth.getUser(invalidUid)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-uid');
          expect(validator.isUid).to.have.been.calledOnce.and.calledWith(invalidUid);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.getUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.getUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.getUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a UserRecord on success', () => {
      // Stub getAccountInfoByUid to return expected result.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .resolves(expectedGetAccountInfoResult);
      stubs.push(stub);
      return auth.getUser(uid)
        .then((userRecord) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected user record response returned.
          expect(userRecord).to.deep.equal(expectedUserRecord);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub getAccountInfoByUid to throw a backend error.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .rejects(expectedError);
      stubs.push(stub);
      return auth.getUser(uid)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('getUserByEmail()', () => {
    const email = 'user@gmail.com';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => sinon.spy(validator, 'isEmail'));
    afterEach(() => {
      (validator.isEmail as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no email', () => {
      return (auth as any).getUserByEmail()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-email');
    });

    it('should be rejected given an invalid email', () => {
      const invalidEmail = 'name-example-com';
      return auth.getUserByEmail(invalidEmail)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-email');
          expect(validator.isEmail).to.have.been.calledOnce.and.calledWith(invalidEmail);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.getUserByEmail(email)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.getUserByEmail(email)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.getUserByEmail(email)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a UserRecord on success', () => {
      // Stub getAccountInfoByEmail to return expected result.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByEmail')
        .resolves(expectedGetAccountInfoResult);
      stubs.push(stub);
      return auth.getUserByEmail(email)
        .then((userRecord) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(email);
          // Confirm expected user record response returned.
          expect(userRecord).to.deep.equal(expectedUserRecord);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub getAccountInfoByEmail to throw a backend error.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByEmail')
        .rejects(expectedError);
      stubs.push(stub);
      return auth.getUserByEmail(email)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(email);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('getUserByPhoneNumber()', () => {
    const phoneNumber = '+11234567890';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => sinon.spy(validator, 'isPhoneNumber'));
    afterEach(() => {
      (validator.isPhoneNumber as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no phone number', () => {
      return (auth as any).getUserByPhoneNumber()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-phone-number');
    });

    it('should be rejected given an invalid phone number', () => {
      const invalidPhoneNumber = 'invalid';
      return auth.getUserByPhoneNumber(invalidPhoneNumber)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-phone-number');
          expect(validator.isPhoneNumber)
            .to.have.been.calledOnce.and.calledWith(invalidPhoneNumber);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.getUserByPhoneNumber(phoneNumber)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.getUserByPhoneNumber(phoneNumber)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.getUserByPhoneNumber(phoneNumber)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a UserRecord on success', () => {
      // Stub getAccountInfoByPhoneNumber to return expected result.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByPhoneNumber')
        .resolves(expectedGetAccountInfoResult);
      stubs.push(stub);
      return auth.getUserByPhoneNumber(phoneNumber)
        .then((userRecord) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(phoneNumber);
          // Confirm expected user record response returned.
          expect(userRecord).to.deep.equal(expectedUserRecord);
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub getAccountInfoByPhoneNumber to throw a backend error.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByPhoneNumber')
        .rejects(expectedError);
      stubs.push(stub);
      return auth.getUserByPhoneNumber(phoneNumber)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(phoneNumber);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('deleteUser()', () => {
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedDeleteAccountResult = {kind: 'identitytoolkit#DeleteAccountResponse'};
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => sinon.spy(validator, 'isUid'));
    afterEach(() => {
      (validator.isUid as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no uid', () => {
      return (auth as any).deleteUser()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-uid');
    });

    it('should be rejected given an invalid uid', () => {
      const invalidUid = ('a' as any).repeat(129);
      return auth.deleteUser(invalidUid)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-uid');
          expect(validator.isUid).to.have.been.calledOnce.and.calledWith(invalidUid);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.deleteUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.deleteUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.deleteUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with void on success', () => {
      // Stub deleteAccount to return expected result.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteAccount')
        .resolves(expectedDeleteAccountResult);
      stubs.push(stub);
      return auth.deleteUser(uid)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected result is undefined.
          expect(result).to.be.undefined;
        });
    });

    it('should throw an error when the backend returns an error', () => {
      // Stub deleteAccount to throw a backend error.
      const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteAccount')
        .rejects(expectedError);
      stubs.push(stub);
      return auth.deleteUser(uid)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(stub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('createUser()', () => {
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to create the user record provided.');
    const unableToCreateUserError = new FirebaseAuthError(
      AuthClientErrorCode.INTERNAL_ERROR,
      'Unable to create the user record provided.');
    const propertiesToCreate = {
      displayName: expectedUserRecord.displayName,
      photoURL: expectedUserRecord.photoURL,
      email: expectedUserRecord.email,
      emailVerified: expectedUserRecord.emailVerified,
      password: 'password',
      phoneNumber: expectedUserRecord.phoneNumber,
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => sinon.spy(validator, 'isNonNullObject'));
    afterEach(() => {
      (validator.isNonNullObject as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no properties', () => {
      return (auth as any).createUser()
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given invalid properties', () => {
      return auth.createUser(null)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
          expect(validator.isNonNullObject).to.have.been.calledOnce.and.calledWith(null);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.createUser(propertiesToCreate)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.createUser(propertiesToCreate)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.createUser(propertiesToCreate)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a UserRecord on createNewAccount request success', () => {
      // Stub createNewAccount to return expected uid.
      const createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .resolves(uid);
      // Stub getAccountInfoByUid to return expected result.
      const getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .resolves(expectedGetAccountInfoResult);
      stubs.push(createUserStub);
      stubs.push(getUserStub);
      return auth.createUser(propertiesToCreate)
        .then((userRecord) => {
          // Confirm underlying API called with expected parameters.
          expect(createUserStub).to.have.been.calledOnce.and.calledWith(propertiesToCreate);
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected user record response returned.
          expect(userRecord).to.deep.equal(expectedUserRecord);
        });
    });

    it('should throw an error when createNewAccount returns an error', () => {
      // Stub createNewAccount to throw a backend error.
      const createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .rejects(expectedError);
      stubs.push(createUserStub);
      return auth.createUser(propertiesToCreate)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(createUserStub).to.have.been.calledOnce.and.calledWith(propertiesToCreate);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });

    it('should throw an error when getUser returns a User not found error', () => {
      // Stub createNewAccount to return expected uid.
      const createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .resolves(uid);
      // Stub getAccountInfoByUid to throw user not found error.
      const userNotFoundError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      const getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .rejects(userNotFoundError);
      stubs.push(createUserStub);
      stubs.push(getUserStub);
      return auth.createUser(propertiesToCreate)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(createUserStub).to.have.been.calledOnce.and.calledWith(propertiesToCreate);
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error.toString()).to.equal(unableToCreateUserError.toString());
        });
    });

    it('should echo getUser error if an error occurs while retrieving the user record', () => {
      // Stub createNewAccount to return expected uid.
      const createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .resolves(uid);
      // Stub getAccountInfoByUid to throw expected error.
      const getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .rejects(expectedError);
      stubs.push(createUserStub);
      stubs.push(getUserStub);
      return auth.createUser(propertiesToCreate)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(createUserStub).to.have.been.calledOnce.and.calledWith(propertiesToCreate);
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned (same error thrown by getUser).
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('updateUser()', () => {
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    const propertiesToEdit = {
      displayName: expectedUserRecord.displayName,
      photoURL: expectedUserRecord.photoURL,
      email: expectedUserRecord.email,
      emailVerified: expectedUserRecord.emailVerified,
      password: 'password',
      phoneNumber: expectedUserRecord.phoneNumber,
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      sinon.spy(validator, 'isUid');
      sinon.spy(validator, 'isNonNullObject');
    });
    afterEach(() => {
      (validator.isUid as any).restore();
      (validator.isNonNullObject as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no uid', () => {
      return (auth as any).updateUser(undefined, propertiesToEdit)
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-uid');
    });

    it('should be rejected given an invalid uid', () => {
      const invalidUid = ('a' as any).repeat(129);
      return auth.updateUser(invalidUid, propertiesToEdit)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-uid');
          expect(validator.isUid).to.have.been.calledOnce.and.calledWith(invalidUid);
        });
    });

    it('should be rejected given no properties', () => {
      return (auth as any).updateUser(uid)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given invalid properties', () => {
      return auth.updateUser(uid, null)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
          expect(validator.isNonNullObject).to.have.been.calledOnce.and.calledWith(null);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.updateUser(uid, propertiesToEdit)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.updateUser(uid, propertiesToEdit)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.updateUser(uid, propertiesToEdit)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve with a UserRecord on updateExistingAccount request success', () => {
      // Stub updateExistingAccount to return expected uid.
      const updateUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateExistingAccount')
        .resolves(uid);
      // Stub getAccountInfoByUid to return expected result.
      const getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .resolves(expectedGetAccountInfoResult);
      stubs.push(updateUserStub);
      stubs.push(getUserStub);
      return auth.updateUser(uid, propertiesToEdit)
        .then((userRecord) => {
          // Confirm underlying API called with expected parameters.
          expect(updateUserStub).to.have.been.calledOnce.and.calledWith(uid, propertiesToEdit);
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected user record response returned.
          expect(userRecord).to.deep.equal(expectedUserRecord);
        });
    });

    it('should throw an error when updateExistingAccount returns an error', () => {
      // Stub updateExistingAccount to throw a backend error.
      const updateUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateExistingAccount')
        .rejects(expectedError);
      stubs.push(updateUserStub);
      return auth.updateUser(uid, propertiesToEdit)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(updateUserStub).to.have.been.calledOnce.and.calledWith(uid, propertiesToEdit);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });

    it('should echo getUser error if an error occurs while retrieving the user record', () => {
      // Stub updateExistingAccount to return expected uid.
      const updateUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateExistingAccount')
        .resolves(uid);
      // Stub getAccountInfoByUid to throw an expected error.
      const getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .rejects(expectedError);
      stubs.push(updateUserStub);
      stubs.push(getUserStub);
      return auth.updateUser(uid, propertiesToEdit)
        .then((userRecord) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(updateUserStub).to.have.been.calledOnce.and.calledWith(uid, propertiesToEdit);
          expect(getUserStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned (same error thrown by getUser).
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('setCustomUserClaims()', () => {
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    const customClaims = {
      admin: true,
      groupId: '123456',
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      sinon.spy(validator, 'isUid');
      sinon.spy(validator, 'isObject');
    });
    afterEach(() => {
      (validator.isUid as any).restore();
      (validator.isObject as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no uid', () => {
      return (auth as any).setCustomUserClaims(undefined, customClaims)
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-uid');
    });

    it('should be rejected given an invalid uid', () => {
      const invalidUid = ('a' as any).repeat(129);
      return auth.setCustomUserClaims(invalidUid, customClaims)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-uid');
          expect(validator.isUid).to.have.been.calledOnce.and.calledWith(invalidUid);
        });
    });

    it('should be rejected given no custom user claims', () => {
      return (auth as any).setCustomUserClaims(uid)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given invalid custom user claims', () => {
      return auth.setCustomUserClaims(uid, 'invalid' as any)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
          expect(validator.isObject).to.have.been.calledOnce.and.calledWith('invalid');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.setCustomUserClaims(uid, customClaims)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.setCustomUserClaims(uid, customClaims)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.setCustomUserClaims(uid, customClaims)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve on setCustomUserClaims request success', () => {
      // Stub setCustomUserClaims to return expected uid.
      const setCustomUserClaimsStub = sinon
        .stub(FirebaseAuthRequestHandler.prototype, 'setCustomUserClaims')
        .resolves(uid);
      stubs.push(setCustomUserClaimsStub);
      return auth.setCustomUserClaims(uid, customClaims)
        .then((response) => {
          expect(response).to.be.undefined;
          // Confirm underlying API called with expected parameters.
          expect(setCustomUserClaimsStub)
            .to.have.been.calledOnce.and.calledWith(uid, customClaims);
        });
    });

    it('should throw an error when setCustomUserClaims returns an error', () => {
      // Stub setCustomUserClaims to throw a backend error.
      const setCustomUserClaimsStub = sinon
        .stub(FirebaseAuthRequestHandler.prototype, 'setCustomUserClaims')
        .rejects(expectedError);
      stubs.push(setCustomUserClaimsStub);
      return auth.setCustomUserClaims(uid, customClaims)
        .then(() => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(setCustomUserClaimsStub)
            .to.have.been.calledOnce.and.calledWith(uid, customClaims);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('listUsers()', () => {
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR);
    const pageToken = 'PAGE_TOKEN';
    const maxResult = 500;
    const downloadAccountResponse: any = {
      users: [
        {localId: 'UID1'},
        {localId: 'UID2'},
        {localId: 'UID3'},
      ],
      nextPageToken: 'NEXT_PAGE_TOKEN',
    };
    const expectedResult: any = {
      users: [
        new UserRecord({localId: 'UID1'}),
        new UserRecord({localId: 'UID2'}),
        new UserRecord({localId: 'UID3'}),
      ],
      pageToken: 'NEXT_PAGE_TOKEN',
    };
    const emptyDownloadAccountResponse: any = {
      users: [],
    };
    const emptyExpectedResult: any = {
      users: [],
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      sinon.spy(validator, 'isNonEmptyString');
      sinon.spy(validator, 'isNumber');
    });
    afterEach(() => {
      (validator.isNonEmptyString as any).restore();
      (validator.isNumber as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given an invalid page token', () => {
      const invalidToken = {};
      return auth.listUsers(undefined, invalidToken as any)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-page-token');
          expect(validator.isNonEmptyString)
            .to.have.been.calledOnce.and.calledWith(invalidToken);
        });
    });

    it('should be rejected given an invalid max result', () => {
      const invalidResults = 5000;
      return auth.listUsers(invalidResults)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/argument-error');
          expect(validator.isNumber)
            .to.have.been.calledOnce.and.calledWith(invalidResults);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.listUsers(maxResult)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.listUsers(maxResult)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.listUsers(maxResult)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve on downloadAccount request success with users in response', () => {
      // Stub downloadAccount to return expected response.
      const downloadAccountStub = sinon
        .stub(FirebaseAuthRequestHandler.prototype, 'downloadAccount')
        .resolves(downloadAccountResponse);
      stubs.push(downloadAccountStub);
      return auth.listUsers(maxResult, pageToken)
        .then((response) => {
          expect(response).to.deep.equal(expectedResult);
          // Confirm underlying API called with expected parameters.
          expect(downloadAccountStub)
            .to.have.been.calledOnce.and.calledWith(maxResult, pageToken);
        });
    });

    it('should resolve on downloadAccount request success with default options', () => {
      // Stub downloadAccount to return expected response.
      const downloadAccountStub = sinon
        .stub(FirebaseAuthRequestHandler.prototype, 'downloadAccount')
        .resolves(downloadAccountResponse);
      stubs.push(downloadAccountStub);
      return auth.listUsers()
        .then((response) => {
          expect(response).to.deep.equal(expectedResult);
          // Confirm underlying API called with expected parameters.
          expect(downloadAccountStub)
            .to.have.been.calledOnce.and.calledWith(undefined, undefined);
        });
    });


    it('should resolve on downloadAccount request success with no users in response', () => {
      // Stub downloadAccount to return expected response.
      const downloadAccountStub = sinon
        .stub(FirebaseAuthRequestHandler.prototype, 'downloadAccount')
        .resolves(emptyDownloadAccountResponse);
      stubs.push(downloadAccountStub);
      return auth.listUsers(maxResult, pageToken)
        .then((response) => {
          expect(response).to.deep.equal(emptyExpectedResult);
          // Confirm underlying API called with expected parameters.
          expect(downloadAccountStub)
            .to.have.been.calledOnce.and.calledWith(maxResult, pageToken);
        });
    });

    it('should throw an error when downloadAccount returns an error', () => {
      // Stub downloadAccount to throw a backend error.
      const downloadAccountStub = sinon
        .stub(FirebaseAuthRequestHandler.prototype, 'downloadAccount')
        .rejects(expectedError);
      stubs.push(downloadAccountStub);
      return auth.listUsers(maxResult, pageToken)
        .then((results) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(downloadAccountStub)
            .to.have.been.calledOnce.and.calledWith(maxResult, pageToken);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('revokeRefreshTokens()', () => {
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      sinon.spy(validator, 'isUid');
    });
    afterEach(() => {
      (validator.isUid as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no uid', () => {
      return (auth as any).revokeRefreshTokens(undefined)
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-uid');
    });

    it('should be rejected given an invalid uid', () => {
      const invalidUid = ('a' as any).repeat(129);
      return auth.revokeRefreshTokens(invalidUid)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-uid');
          expect(validator.isUid).to.have.been.calledOnce.and.calledWith(invalidUid);
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.revokeRefreshTokens(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.revokeRefreshTokens(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.revokeRefreshTokens(uid)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve on underlying revokeRefreshTokens request success', () => {
      // Stub revokeRefreshTokens to return expected uid.
      const revokeRefreshTokensStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'revokeRefreshTokens')
          .resolves(uid);
      stubs.push(revokeRefreshTokensStub);
      return auth.revokeRefreshTokens(uid)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(revokeRefreshTokensStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected response returned.
          expect(result).to.be.undefined;
        });
    });

    it('should throw when underlying revokeRefreshTokens request returns an error', () => {
      // Stub revokeRefreshTokens to throw a backend error.
      const revokeRefreshTokensStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'revokeRefreshTokens')
          .rejects(expectedError);
      stubs.push(revokeRefreshTokensStub);
      return auth.revokeRefreshTokens(uid)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(revokeRefreshTokensStub).to.have.been.calledOnce.and.calledWith(uid);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  describe('importUsers()', () => {
    const users = [
      {uid: '1234', email: 'user@example.com', passwordHash: Buffer.from('password')},
      {uid: '5678', phoneNumber: 'invalid'},
    ];
    const options = {
      hash: {
        algorithm: 'BCRYPT' as any,
      },
    };
    const expectedUserImportResultError =
        new FirebaseAuthError(AuthClientErrorCode.INVALID_PHONE_NUMBER);
    const expectedOptionsError =
        new FirebaseAuthError(AuthClientErrorCode.INVALID_HASH_ALGORITHM);
    const expectedServerError =
        new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR);
    const expectedUserImportResult = {
      successCount: 1,
      failureCount: 1,
      errors: [
        {
          index: 1,
          error: expectedUserImportResultError,
        },
      ],
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.importUsers(users, options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.importUsers(users, options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.importUsers(users, options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve on underlying uploadAccount request resolution', () => {
      // Stub uploadAccount to return expected result.
      const uploadAccountStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'uploadAccount')
          .resolves(expectedUserImportResult);
      stubs.push(uploadAccountStub);
      return auth.importUsers(users, options)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(uploadAccountStub).to.have.been.calledOnce.and.calledWith(users, options);
          // Confirm expected response returned.
          expect(result).to.be.equal(expectedUserImportResult);
        });
    });

    it('should reject when underlying uploadAccount request rejects with an error', () => {
      // Stub uploadAccount to reject with expected error.
      const uploadAccountStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'uploadAccount')
          .rejects(expectedServerError);
      stubs.push(uploadAccountStub);
      return auth.importUsers(users, options)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(uploadAccountStub).to.have.been.calledOnce.and.calledWith(users, options);
          // Confirm expected error returned.
          expect(error).to.equal(expectedServerError);
        });
    });

    it('should throw and fail quickly when underlying uploadAccount throws', () => {
      // Stub uploadAccount to throw with expected error.
      const uploadAccountStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'uploadAccount')
          .throws(expectedOptionsError);
      stubs.push(uploadAccountStub);
      expect(() => {
        return auth.importUsers(users, {hash: {algorithm: 'invalid' as any}});
      }).to.throw(expectedOptionsError);
    });
  });

  describe('createSessionCookie()', () => {
    const idToken = 'ID_TOKEN';
    const options = {expiresIn: 60 * 60 * 24 * 1000};
    const sessionCookie = 'SESSION_COOKIE';
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_ID_TOKEN);
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    beforeEach(() => {
      sinon.spy(validator, 'isNonEmptyString');
    });
    afterEach(() => {
      (validator.isNonEmptyString as any).restore();
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no ID token', () => {
      return (auth as any).createSessionCookie(undefined, options)
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-id-token');
    });

    it('should be rejected given an invalid ID token', () => {
      const invalidIdToken = {} as any;
      return auth.createSessionCookie(invalidIdToken, options)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-id-token');
          expect(validator.isNonEmptyString).to.have.been.calledOnce.and.calledWith(invalidIdToken);
        });
    });

    it('should be rejected given no session duration', () => {
      return (auth as any).createSessionCookie(idToken, undefined)
        .should.eventually.be.rejected.and.have.property(
           'code', 'auth/invalid-session-cookie-duration');
    });

    it('should be rejected given an invalid session duration', () => {
      // Invalid object.
      const invalidOptions = {} as any;
      return auth.createSessionCookie(idToken, invalidOptions)
        .should.eventually.be.rejected.and.have.property(
           'code', 'auth/invalid-session-cookie-duration');
    });

    it('should be rejected given out of range session duration', () => {
      // 1 minute duration.
      const invalidOptions = {expiresIn: 60 * 1000};
      return auth.createSessionCookie(idToken, invalidOptions)
        .should.eventually.be.rejected.and.have.property(
           'code', 'auth/invalid-session-cookie-duration');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return nullAccessTokenAuth.createSessionCookie(idToken, options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return malformedAccessTokenAuth.createSessionCookie(idToken, options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return rejectedPromiseAccessTokenAuth.createSessionCookie(idToken, options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should resolve on underlying createSessionCookie request success', () => {
      // Stub createSessionCookie to return expected sessionCookie.
      const createSessionCookieStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'createSessionCookie')
          .resolves(sessionCookie);
      stubs.push(createSessionCookieStub);
      return auth.createSessionCookie(idToken, options)
        .then((result) => {
          // Confirm underlying API called with expected parameters.
          expect(createSessionCookieStub)
            .to.have.been.calledOnce.and.calledWith(idToken, options.expiresIn);
          // Confirm expected response returned.
          expect(result).to.be.equal(sessionCookie);
        });
    });

    it('should throw when underlying createSessionCookie request returns an error', () => {
      // Stub createSessionCookie to throw a backend error.
      const createSessionCookieStub =
          sinon.stub(FirebaseAuthRequestHandler.prototype, 'createSessionCookie')
          .rejects(expectedError);
      stubs.push(createSessionCookieStub);
      return auth.createSessionCookie(idToken, options)
        .then((result) => {
          throw new Error('Unexpected success');
        }, (error) => {
          // Confirm underlying API called with expected parameters.
          expect(createSessionCookieStub)
            .to.have.been.calledOnce.and.calledWith(idToken, options.expiresIn);
          // Confirm expected error returned.
          expect(error).to.equal(expectedError);
        });
    });
  });

  const emailActionFlows: EmailActionTest[] = [
    {api: 'generatePasswordResetLink', requestType: 'PASSWORD_RESET', requiresSettings: false},
    {api: 'generateEmailVerificationLink', requestType: 'VERIFY_EMAIL', requiresSettings: false},
    {api: 'generateSignInWithEmailLink', requestType: 'EMAIL_SIGNIN', requiresSettings: true},
  ];
  emailActionFlows.forEach((emailActionFlow) => {
    describe(`${emailActionFlow.api}()`, () => {
      const email = 'user@example.com';
      const actionCodeSettings = {
        url: 'https://www.example.com/path/file?a=1&b=2',
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.example.ios',
        },
        android: {
          packageName: 'com.example.android',
          installApp: true,
          minimumVersion: '6',
        },
        dynamicLinkDomain: 'custom.page.link',
      };
      const expectedLink = 'https://custom.page.link?link=' +
          encodeURIComponent('https://projectId.firebaseapp.com/__/auth/action?oobCode=CODE') +
          '&apn=com.example.android&ibi=com.example.ios';
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      // Stubs used to simulate underlying api calls.
      let stubs: sinon.SinonStub[] = [];
      afterEach(() => {
        _.forEach(stubs, (stub) => stub.restore());
        stubs = [];
      });

      it('should be rejected given no email', () => {
        return (auth as any)[emailActionFlow.api](undefined, actionCodeSettings)
          .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-email');
      });

      it('should be rejected given an invalid email', () => {
        return (auth as any)[emailActionFlow.api]('invalid', actionCodeSettings)
          .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-email');
      });

      it('should be rejected given an invalid ActionCodeSettings object', () => {
        return (auth as any)[emailActionFlow.api](email, 'invalid')
          .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
      });

      it('should be rejected given an app which returns null access tokens', () => {
        return (nullAccessTokenAuth as any)[emailActionFlow.api](email, actionCodeSettings)
          .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
      });

      it('should be rejected given an app which returns invalid access tokens', () => {
        return (malformedAccessTokenAuth as any)[emailActionFlow.api](email, actionCodeSettings)
          .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
      });

      it('should be rejected given an app which fails to generate access tokens', () => {
        return (rejectedPromiseAccessTokenAuth as any)[emailActionFlow.api](email, actionCodeSettings)
          .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
      });

      it('should resolve when called with actionCodeSettings with a generated link on success', () => {
        // Stub getEmailActionLink to return expected link.
        const getEmailActionLinkStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getEmailActionLink')
          .resolves(expectedLink);
        stubs.push(getEmailActionLinkStub);
        return (auth as any)[emailActionFlow.api](email, actionCodeSettings)
          .then((actualLink: string) => {
            // Confirm underlying API called with expected parameters.
            expect(getEmailActionLinkStub).to.have.been.calledOnce.and.calledWith(
                emailActionFlow.requestType, email, actionCodeSettings);
            // Confirm expected user record response returned.
            expect(actualLink).to.equal(expectedLink);
          });
      });

      if (emailActionFlow.requiresSettings) {
        it('should reject when called without actionCodeSettings', () => {
          return (auth as any)[emailActionFlow.api](email, undefined)
            .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
        });
      } else {
        it('should resolve when called without actionCodeSettings with a generated link on success', () => {
          // Stub getEmailActionLink to return expected link.
          const getEmailActionLinkStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getEmailActionLink')
            .resolves(expectedLink);
          stubs.push(getEmailActionLinkStub);
          return (auth as any)[emailActionFlow.api](email)
            .then((actualLink: string) => {
              // Confirm underlying API called with expected parameters.
              expect(getEmailActionLinkStub).to.have.been.calledOnce.and.calledWith(
                  emailActionFlow.requestType, email, undefined);
              // Confirm expected user record response returned.
              expect(actualLink).to.equal(expectedLink);
            });
        });
      }

      it('should throw an error when getEmailAction returns an error', () => {
        // Stub getEmailActionLink to throw a backend error.
        const getEmailActionLinkStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getEmailActionLink')
          .rejects(expectedError);
        stubs.push(getEmailActionLinkStub);
        return (auth as any)[emailActionFlow.api](email, actionCodeSettings)
          .then((actualLink: string) => {
            throw new Error('Unexpected success');
          }, (error: any) => {
            // Confirm underlying API called with expected parameters.
            expect(getEmailActionLinkStub).to.have.been.calledOnce.and.calledWith(
                emailActionFlow.requestType, email, actionCodeSettings);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });
  });

  describe('getProviderConfig()', () => {
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no provider ID', () => {
      return (auth as any).getProviderConfig()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-provider-id');
    });

    const invalidProviderIds = [
        undefined, null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidProviderIds.forEach((invalidProviderId) => {
      it(`should be rejected given an invalid provider ID "${JSON.stringify(invalidProviderId)}"`, () => {
        return (auth as Auth).getProviderConfig(invalidProviderId as any)
          .then(() => {
            throw new Error('Unexpected success');
          })
          .catch((error) => {
            expect(error).to.have.property('code', 'auth/invalid-provider-id');
          });
      });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      const providerId = 'oidc.provider';
      return (nullAccessTokenAuth as Auth).getProviderConfig(providerId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      const providerId = 'oidc.provider';
      return (malformedAccessTokenAuth as Auth).getProviderConfig(providerId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      const providerId = 'oidc.provider';
      return (rejectedPromiseAccessTokenAuth as Auth).getProviderConfig(providerId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    describe('using OIDC configurations', () => {
      const providerId = 'oidc.provider';
      const serverResponse = {
        name: `projects/project_id/oauthIdpConfigs/${providerId}`,
        displayName: 'OIDC_DISPLAY_NAME',
        enabled: true,
        clientId: 'CLIENT_ID',
        issuer: 'https://oidc.com/issuer',
      };
      const expectedConfig = new OIDCConfig(serverResponse);
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);

      it('should resolve with an OIDCConfig on success', () => {
        // Stub getOAuthIdpConfig to return expected result.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getOAuthIdpConfig')
          .resolves(serverResponse);
        stubs.push(stub);
        return (auth as Auth).getProviderConfig(providerId)
          .then((result) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected config returned.
            expect(result).to.deep.equal(expectedConfig);
          });
      });

      it('should throw an error when the backend returns an error', () => {
        // Stub getOAuthIdpConfig to throw a backend error.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getOAuthIdpConfig')
          .rejects(expectedError);
        stubs.push(stub);
        return (auth as Auth).getProviderConfig(providerId)
          .then((config) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });

    describe('using SAML configurations', () => {
      const providerId = 'saml.provider';
      const serverResponse = {
        name: `projects/project_id/inboundSamlConfigs/${providerId}`,
        idpConfig: {
          idpEntityId: 'IDP_ENTITY_ID',
          ssoUrl: 'https://example.com/login',
          signRequest: true,
          idpCertificates: [
            {x509Certificate: 'CERT1'},
            {x509Certificate: 'CERT2'},
          ],
        },
        spConfig: {
          spEntityId: 'RP_ENTITY_ID',
          callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
        },
        displayName: 'SAML_DISPLAY_NAME',
        enabled: true,
      };
      const expectedConfig = new SAMLConfig(serverResponse);
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);

      it('should resolve with a SAMLConfig on success', () => {
        // Stub getInboundSamlConfig to return expected result.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getInboundSamlConfig')
          .resolves(serverResponse);
        stubs.push(stub);
        return (auth as Auth).getProviderConfig(providerId)
          .then((result) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected config returned.
            expect(result).to.deep.equal(expectedConfig);
          });
      });

      it('should throw an error when the backend returns an error', () => {
        // Stub getInboundSamlConfig to throw a backend error.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getInboundSamlConfig')
          .rejects(expectedError);
        stubs.push(stub);
        return (auth as Auth).getProviderConfig(providerId)
          .then((config) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });
  });

  describe('listProviderConfigs()', () => {
    const options: AuthProviderConfigFilter = {
      type: 'oidc',
    };
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no options', () => {
      return (auth as any).listProviderConfigs()
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given an invalid AuthProviderConfigFilter type', () => {
      const invalidOptions = {
        type: 'unsupported',
      };
      return (auth as Auth).listProviderConfigs(invalidOptions as any)
        .should.eventually.be.rejected.and.have.property('code', 'auth/argument-error');
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return (nullAccessTokenAuth as Auth).listProviderConfigs(options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return (malformedAccessTokenAuth as Auth).listProviderConfigs(options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return (rejectedPromiseAccessTokenAuth as Auth).listProviderConfigs(options)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    describe('using OIDC type filter', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR);
      const pageToken = 'PAGE_TOKEN';
      const maxResults = 50;
      const filterOptions: AuthProviderConfigFilter = {
        type: 'oidc',
        pageToken,
        maxResults,
      };
      const listConfigsResponse: any = {
        oauthIdpConfigs : [
          getOIDCConfigServerResponse('oidc.provider1'),
          getOIDCConfigServerResponse('oidc.provider2'),
        ],
        nextPageToken: 'NEXT_PAGE_TOKEN',
      };
      const expectedResult: any = {
        providerConfigs: [
          new OIDCConfig(listConfigsResponse.oauthIdpConfigs[0]),
          new OIDCConfig(listConfigsResponse.oauthIdpConfigs[1]),
        ],
        pageToken: 'NEXT_PAGE_TOKEN',
      };
      const emptyListConfigsResponse: any = {
        oauthIdpConfigs: [],
      };
      const emptyExpectedResult: any = {
        providerConfigs: [],
      };

      it('should resolve on success with configs in response', () => {
        // Stub listOAuthIdpConfigs to return expected response.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listOAuthIdpConfigs')
          .resolves(listConfigsResponse);
        stubs.push(listConfigsStub);
        return auth.listProviderConfigs(filterOptions)
          .then((response) => {
            expect(response).to.deep.equal(expectedResult);
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(maxResults, pageToken);
          });
      });

      it('should resolve on success with default options', () => {
        // Stub listOAuthIdpConfigs to return expected response.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listOAuthIdpConfigs')
          .resolves(listConfigsResponse);
        stubs.push(listConfigsStub);
        return (auth as Auth).listProviderConfigs({type: 'oidc'})
          .then((response) => {
            expect(response).to.deep.equal(expectedResult);
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(undefined, undefined);
          });
      });


      it('should resolve on success with no configs in response', () => {
        // Stub listOAuthIdpConfigs to return expected response.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listOAuthIdpConfigs')
          .resolves(emptyListConfigsResponse);
        stubs.push(listConfigsStub);
        return auth.listProviderConfigs(filterOptions)
          .then((response) => {
            expect(response).to.deep.equal(emptyExpectedResult);
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(maxResults, pageToken);
          });
      });

      it('should throw an error when listOAuthIdpConfigs returns an error', () => {
        // Stub listOAuthIdpConfigs to throw a backend error.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listOAuthIdpConfigs')
          .rejects(expectedError);
        stubs.push(listConfigsStub);
        return auth.listProviderConfigs(filterOptions)
          .then((results) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(maxResults, pageToken);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });

    describe('using SAML type filter', () => {
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR);
      const pageToken = 'PAGE_TOKEN';
      const maxResults = 50;
      const filterOptions: AuthProviderConfigFilter = {
        type: 'saml',
        pageToken,
        maxResults,
      };
      const listConfigsResponse: any = {
        inboundSamlConfigs : [
          getSAMLConfigServerResponse('saml.provider1'),
          getSAMLConfigServerResponse('saml.provider2'),
        ],
        nextPageToken: 'NEXT_PAGE_TOKEN',
      };
      const expectedResult: any = {
        providerConfigs: [
          new SAMLConfig(listConfigsResponse.inboundSamlConfigs[0]),
          new SAMLConfig(listConfigsResponse.inboundSamlConfigs[1]),
        ],
        pageToken: 'NEXT_PAGE_TOKEN',
      };
      const emptyListConfigsResponse: any = {
        inboundSamlConfigs: [],
      };
      const emptyExpectedResult: any = {
        providerConfigs: [],
      };

      it('should resolve on success with configs in response', () => {
        // Stub listInboundSamlConfigs to return expected response.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listInboundSamlConfigs')
          .resolves(listConfigsResponse);
        stubs.push(listConfigsStub);
        return auth.listProviderConfigs(filterOptions)
          .then((response) => {
            expect(response).to.deep.equal(expectedResult);
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(maxResults, pageToken);
          });
      });

      it('should resolve on success with default options', () => {
        // Stub listInboundSamlConfigs to return expected response.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listInboundSamlConfigs')
          .resolves(listConfigsResponse);
        stubs.push(listConfigsStub);
        return (auth as Auth).listProviderConfigs({type: 'saml'})
          .then((response) => {
            expect(response).to.deep.equal(expectedResult);
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(undefined, undefined);
          });
      });


      it('should resolve on success with no configs in response', () => {
        // Stub listInboundSamlConfigs to return expected response.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listInboundSamlConfigs')
          .resolves(emptyListConfigsResponse);
        stubs.push(listConfigsStub);
        return auth.listProviderConfigs(filterOptions)
          .then((response) => {
            expect(response).to.deep.equal(emptyExpectedResult);
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(maxResults, pageToken);
          });
      });

      it('should throw an error when listInboundSamlConfigs returns an error', () => {
        // Stub listInboundSamlConfigs to throw a backend error.
        const listConfigsStub = sinon
          .stub(FirebaseAuthRequestHandler.prototype, 'listInboundSamlConfigs')
          .rejects(expectedError);
        stubs.push(listConfigsStub);
        return auth.listProviderConfigs(filterOptions)
          .then((results) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(listConfigsStub)
              .to.have.been.calledOnce.and.calledWith(maxResults, pageToken);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });
  });

  describe('deleteProviderConfig()', () => {
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no provider ID', () => {
      return (auth as any).deleteProviderConfig()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-provider-id');
    });

    it('should be rejected given an invalid provider ID', () => {
      const invalidProviderId = '';
      return (auth as Auth).deleteProviderConfig(invalidProviderId)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-provider-id');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      const providerId = 'oidc.provider';
      return (nullAccessTokenAuth as Auth).deleteProviderConfig(providerId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      const providerId = 'oidc.provider';
      return (malformedAccessTokenAuth as Auth).deleteProviderConfig(providerId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      const providerId = 'oidc.provider';
      return (rejectedPromiseAccessTokenAuth as Auth).deleteProviderConfig(providerId)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    describe('using OIDC configurations', () => {
      const providerId = 'oidc.provider';
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);

      it('should resolve with void on success', () => {
        // Stub deleteOAuthIdpConfig to resolve.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteOAuthIdpConfig')
          .resolves();
        stubs.push(stub);
        return (auth as Auth).deleteProviderConfig(providerId)
          .then((result) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected result returned.
            expect(result).to.be.undefined;
          });
      });

      it('should throw an error when the backend returns an error', () => {
        // Stub deleteOAuthIdpConfig to throw a backend error.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteOAuthIdpConfig')
          .rejects(expectedError);
        stubs.push(stub);
        return (auth as Auth).deleteProviderConfig(providerId)
          .then((config) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });

    describe('using SAML configurations', () => {
      const providerId = 'saml.provider';
      const serverResponse = {};
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.CONFIGURATION_NOT_FOUND);

      it('should resolve with void on success', () => {
        // Stub deleteInboundSamlConfig to resolve.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteInboundSamlConfig')
          .resolves();
        stubs.push(stub);
        return (auth as Auth).deleteProviderConfig(providerId)
          .then((result) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected result returned.
            expect(result).to.be.undefined;
          });
      });

      it('should throw an error when the backend returns an error', () => {
        // Stub deleteInboundSamlConfig to throw a backend error.
        const stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteInboundSamlConfig')
          .rejects(expectedError);
        stubs.push(stub);
        return (auth as Auth).deleteProviderConfig(providerId)
          .then((config) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(stub).to.have.been.calledOnce.and.calledWith(providerId);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });
  });

  describe('updateProviderConfig()', () => {
    const oidcConfigOptions = {
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: true,
      clientId: 'CLIENT_ID',
      issuer: 'https://oidc.com/issuer',
    };
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no provider ID', () => {
      return (auth as any).updateProviderConfig(undefined, oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-provider-id');
    });

    it('should be rejected given an invalid provider ID', () => {
      const invalidProviderId = '';
      return (auth as Auth).updateProviderConfig(invalidProviderId, oidcConfigOptions)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-provider-id');
        });
    });

    it('should be rejected given no options', () => {
      const providerId = 'oidc.provider';
      return (auth as any).updateProviderConfig(providerId)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error: FirebaseAuthError) => {
          expect(error).to.have.property('code', 'auth/invalid-config');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      const providerId = 'oidc.provider';
      return (nullAccessTokenAuth as Auth).updateProviderConfig(providerId, oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      const providerId = 'oidc.provider';
      return (malformedAccessTokenAuth as Auth).updateProviderConfig(providerId, oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      const providerId = 'oidc.provider';
      return (rejectedPromiseAccessTokenAuth as Auth).updateProviderConfig(providerId, oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    describe('using OIDC configurations', () => {
      const providerId = 'oidc.provider';
      const configOptions = {
        displayName: 'OIDC_DISPLAY_NAME',
        enabled: true,
        clientId: 'CLIENT_ID',
        issuer: 'https://oidc.com/issuer',
      };
      const serverResponse = {
        name: `projects/project_id/oauthIdpConfigs/${providerId}`,
        displayName: 'OIDC_DISPLAY_NAME',
        enabled: true,
        clientId: 'CLIENT_ID',
        issuer: 'https://oidc.com/issuer',
      };
      const expectedConfig = new OIDCConfig(serverResponse);
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);

      it('should resolve with an OIDCConfig on updateOAuthIdpConfig request success', () => {
        // Stub updateOAuthIdpConfig to return expected server response.
        const updateConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateOAuthIdpConfig')
          .resolves(serverResponse);
        stubs.push(updateConfigStub);

        return auth.updateProviderConfig(providerId, configOptions)
          .then((actualConfig) => {
            // Confirm underlying API called with expected parameters.
            expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(providerId, configOptions);
            // Confirm expected config response returned.
            expect(actualConfig).to.deep.equal(expectedConfig);
          });
      });

      it('should throw an error when updateOAuthIdpConfig returns an error', () => {
        // Stub updateOAuthIdpConfig to throw a backend error.
        const updateConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateOAuthIdpConfig')
          .rejects(expectedError);
        stubs.push(updateConfigStub);

        return auth.updateProviderConfig(providerId, configOptions)
          .then((actualConfig) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(providerId, configOptions);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });

    describe('using SAML configurations', () => {
      const providerId = 'saml.provider';
      const configOptions = {
        displayName: 'SAML_DISPLAY_NAME',
        enabled: true,
        idpEntityId: 'IDP_ENTITY_ID',
        ssoURL: 'https://example.com/login',
        x509Certificates: ['CERT1', 'CERT2'],
        rpEntityId: 'RP_ENTITY_ID',
        callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
        enableRequestSigning: true,
      };
      const serverResponse = {
        name: `projects/project_id/inboundSamlConfigs/${providerId}`,
        idpConfig: {
          idpEntityId: 'IDP_ENTITY_ID',
          ssoUrl: 'https://example.com/login',
          signRequest: true,
          idpCertificates: [
            {x509Certificate: 'CERT1'},
            {x509Certificate: 'CERT2'},
          ],
        },
        spConfig: {
          spEntityId: 'RP_ENTITY_ID',
          callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
        },
        displayName: 'SAML_DISPLAY_NAME',
        enabled: true,
      };
      const expectedConfig = new SAMLConfig(serverResponse);
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);

      it('should resolve with a SAMLConfig on updateInboundSamlConfig request success', () => {
        // Stub updateInboundSamlConfig to return expected server response.
        const updateConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateInboundSamlConfig')
          .resolves(serverResponse);
        stubs.push(updateConfigStub);

        return auth.updateProviderConfig(providerId, configOptions)
          .then((actualConfig) => {
            // Confirm underlying API called with expected parameters.
            expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(providerId, configOptions);
            // Confirm expected config response returned.
            expect(actualConfig).to.deep.equal(expectedConfig);
          });
      });

      it('should throw an error when updateInboundSamlConfig returns an error', () => {
        // Stub updateInboundSamlConfig to throw a backend error.
        const updateConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateInboundSamlConfig')
          .rejects(expectedError);
        stubs.push(updateConfigStub);

        return auth.updateProviderConfig(providerId, configOptions)
          .then((actualConfig) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(updateConfigStub).to.have.been.calledOnce.and.calledWith(providerId, configOptions);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });
  });

  describe('createProviderConfig()', () => {
    const oidcConfigOptions = {
      providerId: 'oidc.provider',
      displayName: 'OIDC_DISPLAY_NAME',
      enabled: true,
      clientId: 'CLIENT_ID',
      issuer: 'https://oidc.com/issuer',
    };
    let stubs: sinon.SinonStub[] = [];

    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
      stubs = [];
    });

    it('should be rejected given no configuration options', () => {
      return (auth as any).createProviderConfig()
        .should.eventually.be.rejected.and.have.property('code', 'auth/invalid-config');
    });

    it('should be rejected given an invalid provider ID', () => {
      const invalidConfigOptions = deepCopy(oidcConfigOptions);
      invalidConfigOptions.providerId = 'unsupported';
      return (auth as Auth).createProviderConfig(invalidConfigOptions)
        .then(() => {
          throw new Error('Unexpected success');
        })
        .catch((error) => {
          expect(error).to.have.property('code', 'auth/invalid-provider-id');
        });
    });

    it('should be rejected given an app which returns null access tokens', () => {
      return (nullAccessTokenAuth as Auth).createProviderConfig(oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which returns invalid access tokens', () => {
      return (malformedAccessTokenAuth as Auth).createProviderConfig(oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    it('should be rejected given an app which fails to generate access tokens', () => {
      return (rejectedPromiseAccessTokenAuth as Auth).createProviderConfig(oidcConfigOptions)
        .should.eventually.be.rejected.and.have.property('code', 'app/invalid-credential');
    });

    describe('using OIDC configurations', () => {
      const providerId = 'oidc.provider';
      const configOptions = {
        providerId,
        displayName: 'OIDC_DISPLAY_NAME',
        enabled: true,
        clientId: 'CLIENT_ID',
        issuer: 'https://oidc.com/issuer',
      };
      const serverResponse = {
        name: `projects/project_id/oauthIdpConfigs/${providerId}`,
        displayName: 'OIDC_DISPLAY_NAME',
        enabled: true,
        clientId: 'CLIENT_ID',
        issuer: 'https://oidc.com/issuer',
      };
      const expectedConfig = new OIDCConfig(serverResponse);
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);

      it('should resolve with an OIDCConfig on createOAuthIdpConfig request success', () => {
        // Stub createOAuthIdpConfig to return expected server response.
        const createConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createOAuthIdpConfig')
          .resolves(serverResponse);
        stubs.push(createConfigStub);

        return (auth as Auth).createProviderConfig(configOptions)
          .then((actualConfig) => {
            // Confirm underlying API called with expected parameters.
            expect(createConfigStub).to.have.been.calledOnce.and.calledWith(configOptions);
            // Confirm expected config response returned.
            expect(actualConfig).to.deep.equal(expectedConfig);
          });
      });

      it('should throw an error when createOAuthIdpConfig returns an error', () => {
        // Stub createOAuthIdpConfig to throw a backend error.
        const createConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createOAuthIdpConfig')
          .rejects(expectedError);
        stubs.push(createConfigStub);

        return (auth as Auth).createProviderConfig(configOptions)
          .then((actualConfig) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(createConfigStub).to.have.been.calledOnce.and.calledWith(configOptions);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });

    describe('using SAML configurations', () => {
      const providerId = 'saml.provider';
      const configOptions = {
        providerId,
        displayName: 'SAML_DISPLAY_NAME',
        enabled: true,
        idpEntityId: 'IDP_ENTITY_ID',
        ssoURL: 'https://example.com/login',
        x509Certificates: ['CERT1', 'CERT2'],
        rpEntityId: 'RP_ENTITY_ID',
        callbackURL: 'https://projectId.firebaseapp.com/__/auth/handler',
        enableRequestSigning: true,
      };
      const serverResponse = {
        name: `projects/project_id/inboundSamlConfigs/${providerId}`,
        idpConfig: {
          idpEntityId: 'IDP_ENTITY_ID',
          ssoUrl: 'https://example.com/login',
          signRequest: true,
          idpCertificates: [
            {x509Certificate: 'CERT1'},
            {x509Certificate: 'CERT2'},
          ],
        },
        spConfig: {
          spEntityId: 'RP_ENTITY_ID',
          callbackUri: 'https://projectId.firebaseapp.com/__/auth/handler',
        },
        displayName: 'SAML_DISPLAY_NAME',
        enabled: true,
      };
      const expectedConfig = new SAMLConfig(serverResponse);
      const expectedError = new FirebaseAuthError(AuthClientErrorCode.INVALID_CONFIG);

      it('should resolve with a SAMLConfig on createInboundSamlConfig request success', () => {
        // Stub createInboundSamlConfig to return expected server response.
        const createConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createInboundSamlConfig')
          .resolves(serverResponse);
        stubs.push(createConfigStub);

        return (auth as Auth).createProviderConfig(configOptions)
          .then((actualConfig) => {
            // Confirm underlying API called with expected parameters.
            expect(createConfigStub).to.have.been.calledOnce.and.calledWith(configOptions);
            // Confirm expected config response returned.
            expect(actualConfig).to.deep.equal(expectedConfig);
          });
      });

      it('should throw an error when createInboundSamlConfig returns an error', () => {
        // Stub createInboundSamlConfig to throw a backend error.
        const createConfigStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createInboundSamlConfig')
          .rejects(expectedError);
        stubs.push(createConfigStub);

        return (auth as Auth).createProviderConfig(configOptions)
          .then((actualConfig) => {
            throw new Error('Unexpected success');
          }, (error) => {
            // Confirm underlying API called with expected parameters.
            expect(createConfigStub).to.have.been.calledOnce.and.calledWith(configOptions);
            // Confirm expected error returned.
            expect(error).to.equal(expectedError);
          });
      });
    });
  });

  describe('INTERNAL.delete()', () => {
    it('should delete Auth instance', () => {
      auth.INTERNAL.delete().should.eventually.be.fulfilled;
    });
  });
});

'use strict';

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from './utils';
import * as mocks from './resources/mocks';

import {Auth} from '../src/auth/auth';
import {UserRecord} from '../src/auth/user-record';
import {FirebaseApp} from '../src/firebase-app';
import {Certificate} from '../src/auth/credential';
import {GoogleOAuthAccessToken} from '../src/auth/credential';
import {FirebaseTokenGenerator} from '../src/auth/token-generator';
import {FirebaseAuthRequestHandler} from '../src/auth/auth-api-request';
import {AuthClientErrorCode, FirebaseAuthError} from '../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const ONE_HOUR_IN_SECONDS = 60 * 60;


/**
 * @return {Object} A sample valid server response as returned from getAccountInfo
 *     endpoint.
 */
function getValidGetAccountInfoResponse() {
  let userResponse: Object = {
    localId: 'abcdefghijklmnopqrstuvwxyz',
    email: 'user@gmail.com',
    emailVerified: true,
    displayName: 'John Doe',
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
 * Noop implementation of Credential.getToken that returns a Promise of null.
 */
class UnauthenticatedCredential {
  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    return Promise.resolve(null);
  }

  public getCertificate(): Certificate {
    return null;
  }
}

describe('Auth', () => {
  let mockApp: FirebaseApp;

  before(() => utils.mockFetchAccessTokenRequests());

  after(() => nock.cleanAll());

  beforeEach(() => {
    mockApp = mocks.app();
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
      const app = mockApp;
      const auth = new Auth(app);
      // We expect referential equality here
      expect(auth.app).to.equal(app);
    });

    it('is read-only', () => {
      const app = mockApp;
      const auth = new Auth(app);
      expect(() => {
        (auth as any).app = app;
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

    it('should throw if a cert credential is not specified (and env not set)', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const app = utils.createAppWithOptions({
        credential: new UnauthenticatedCredential(),
      });
      const auth = new Auth(app);
      expect(() => {
        auth.createCustomToken(mocks.uid, mocks.developerClaims);
      }).to.throw('Must initialize app with a cert credential to call auth().createCustomToken()');
    });

    it('should forward on the call to the token generator\'s createCustomToken() method', () => {
      const auth = new Auth(mockApp);
      return auth.createCustomToken(mocks.uid, mocks.developerClaims)
        .then(() => {
          expect(spy)
            .to.have.been.calledOnce
            .and.calledWith(mocks.uid, mocks.developerClaims);
        });
    });
  });

  describe('verifyIdToken()', () => {
    let stub: sinon.SinonStub;
    beforeEach(() => stub = sinon.stub(FirebaseTokenGenerator.prototype, 'verifyIdToken').returns(Promise.resolve()));
    afterEach(() => stub.restore());

    it('should throw if a cert credential is not specified (and env not set)', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const app = utils.createAppWithOptions({
        credential: new UnauthenticatedCredential(),
      });
      const auth = new Auth(app);
      const mockIdToken = mocks.generateIdToken();
      expect(() => {
        auth.verifyIdToken(mockIdToken);
      }).to.throw('Must initialize app with a cert credential to call auth().verifyIdToken()');
    });

    it('should forward on the call to the token generator\'s verifyIdToken() method', () => {
      const auth = new Auth(mockApp);
      const mockIdToken = mocks.generateIdToken();
      return auth.verifyIdToken(mockIdToken).then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mockIdToken);
      });
    });
  });

  describe('getUser()', () => {
    // Mock credential used to initialize the auth instance.
    const accessToken: GoogleOAuthAccessToken = {
      access_token: utils.generateRandomAccessToken(),
      expires_in: ONE_HOUR_IN_SECONDS,
    };
    const credential = {
      getAccessToken: () => Promise.resolve(accessToken),
    };
    const app = utils.createAppWithOptions({
      credential,
    });
    // Initialize all test variables, expected parameters and results.
    const auth = new Auth(app);
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
    });
    after(() => {
      stubs = [];
    });

    it('should resolve with a UserRecord on success', () => {
      // Stub getAccountInfoByUid to return expected result.
      let stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.resolve(expectedGetAccountInfoResult));
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
      let stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.reject(expectedError));
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
    // Mock credential used to initialize the auth instance.
    const accessToken: GoogleOAuthAccessToken = {
      access_token: utils.generateRandomAccessToken(),
      expires_in: ONE_HOUR_IN_SECONDS,
    };
    const credential = {
      getAccessToken: () => Promise.resolve(accessToken),
    };
    const app = utils.createAppWithOptions({
      credential,
    });
    // Initialize all test variables, expected parameters and results.
    const auth = new Auth(app);
    const email = 'user@gmail.com';
    const expectedGetAccountInfoResult = getValidGetAccountInfoResponse();
    const expectedUserRecord = getValidUserRecord(expectedGetAccountInfoResult);
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
    });
    after(() => {
      stubs = [];
    });

    it('should resolve with a UserRecord on success', () => {
      // Stub getAccountInfoByEmail to return expected result.
      let stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByEmail')
        .returns(Promise.resolve(expectedGetAccountInfoResult));
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
      let stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByEmail')
        .returns(Promise.reject(expectedError));
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

  describe('deleteUser()', () => {
    // Mock credential used to initialize the auth instance.
    const accessToken: GoogleOAuthAccessToken = {
      access_token: utils.generateRandomAccessToken(),
      expires_in: ONE_HOUR_IN_SECONDS,
    };
    const credential = {
      getAccessToken: () => Promise.resolve(accessToken),
    };
    const app = utils.createAppWithOptions({
      credential,
    });
    // Initialize all test variables, expected parameters and results.
    const auth = new Auth(app);
    const uid = 'abcdefghijklmnopqrstuvwxyz';
    const expectedDeleteAccountResult = {kind: 'identitytoolkit#DeleteAccountResponse'};
    const expectedError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);

    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
    });
    after(() => {
      stubs = [];
    });

    it('should resolve with void on success', () => {
      // Stub deleteAccount to return expected result.
      let stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteAccount')
        .returns(Promise.resolve(expectedDeleteAccountResult));
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
      let stub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'deleteAccount')
        .returns(Promise.reject(expectedError));
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
    // Mock credential used to initialize the auth instance.
    const accessToken: GoogleOAuthAccessToken = {
      access_token: utils.generateRandomAccessToken(),
      expires_in: ONE_HOUR_IN_SECONDS,
    };
    const credential = {
      getAccessToken: () => Promise.resolve(accessToken),
    };
    const app = utils.createAppWithOptions({
      credential,
    });
    // Initialize all test variables, expected parameters and results.
    const auth = new Auth(app);
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
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
    });
    after(() => {
      stubs = [];
    });

    it('should resolve with a UserRecord on createNewAccount request success', () => {
      // Stub createNewAccount to return expected uid.
      let createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .returns(Promise.resolve(uid));
      // Stub getAccountInfoByUid to return expected result.
      let getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.resolve(expectedGetAccountInfoResult));
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
      let createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .returns(Promise.reject(expectedError));
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
      let createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .returns(Promise.resolve(uid));
      // Stub getAccountInfoByUid to throw user not found error.
      let userNotFoundError = new FirebaseAuthError(AuthClientErrorCode.USER_NOT_FOUND);
      let getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.reject(userNotFoundError));
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
      let createUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'createNewAccount')
        .returns(Promise.resolve(uid));
      // Stub getAccountInfoByUid to throw expected error.
      let getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.reject(expectedError));
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
    // Mock credential used to initialize the auth instance.
    const accessToken: GoogleOAuthAccessToken = {
      access_token: utils.generateRandomAccessToken(),
      expires_in: ONE_HOUR_IN_SECONDS,
    };
    const credential = {
      getAccessToken: () => Promise.resolve(accessToken),
    };
    const app = utils.createAppWithOptions({
      credential,
    });
    // Initialize all test variables, expected parameters and results.
    const auth = new Auth(app);
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
    };
    // Stubs used to simulate underlying api calls.
    let stubs: sinon.SinonStub[] = [];
    afterEach(() => {
      _.forEach(stubs, (stub) => stub.restore());
    });
    after(() => {
      stubs = [];
    });

    it('should resolve with a UserRecord on updateExistingAccount request success', () => {
      // Stub updateExistingAccount to return expected uid.
      let updateUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateExistingAccount')
        .returns(Promise.resolve(uid));
      // Stub getAccountInfoByUid to return expected result.
      let getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.resolve(expectedGetAccountInfoResult));
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
      let updateUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateExistingAccount')
        .returns(Promise.reject(expectedError));
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
      let updateUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'updateExistingAccount')
        .returns(Promise.resolve(uid));
      // Stub getAccountInfoByUid to throw an expected error.
      let getUserStub = sinon.stub(FirebaseAuthRequestHandler.prototype, 'getAccountInfoByUid')
        .returns(Promise.reject(expectedError));
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

  describe('INTERNAL.delete()', () => {
    it('should delete auth instance', () => {
      const auth = new Auth(mockApp);
      auth.INTERNAL.delete().should.eventually.be.fulfilled;
    });
  });
});

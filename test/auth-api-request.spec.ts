'use strict';

// Use untyped import syntax for Node built-ins.
import fs = require('fs');
import path = require('path');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {mockFetchAccessTokenViaJwt, generateRandomAccessToken} from './utils';
import {CertCredential, Certificate} from '../src/auth/credential';
import {HttpRequestHandler} from '../src/utils/api-request';
import {
  FirebaseAuthRequestHandler, FIREBASE_AUTH_GET_ACCOUNT_INFO,
  FIREBASE_AUTH_DELETE_ACCOUNT,
} from '../src/auth/auth-api-request';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const certPath = path.resolve(__dirname, 'resources/mock.key.json');
const MOCK_CERTIFICATE_OBJECT = JSON.parse(fs.readFileSync(certPath).toString());


describe('FIREBASE_AUTH_GET_ACCOUNT_INFO', () => {
  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_GET_ACCOUNT_INFO.getEndpoint()).to.equal('getAccountInfo');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_GET_ACCOUNT_INFO.getHttpMethod()).to.equal('POST');
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_GET_ACCOUNT_INFO.getRequestValidator();
    it('should succeed with localId passed', () => {
      const validRequest = {localId: ['1234']};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should succeed with email passed', () => {
      const validRequest = {email: ['user@example.com']};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should fail when localId and email not passed', () => {
      const invalidRequest = {bla: ['1234']};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
    });
  });
  describe('responseValidator', () => {
    const responseValidator = FIREBASE_AUTH_GET_ACCOUNT_INFO.getResponseValidator();
    it('should succeed with users returned', () => {
      const validResponse = {users: []};
      expect(() => {
        return responseValidator(validResponse);
      }).not.to.throw();
    });
    it('should fail when users is not returned', () => {
      const invalidResponse = {};
      expect(() => {
        responseValidator(invalidResponse);
      }).to.throw();
    });
  });
});

describe('FIREBASE_AUTH_DELETE_ACCOUNT', () => {
  it('should return the correct endpoint', () => {
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getEndpoint()).to.equal('deleteAccount');
  });
  it('should return the correct http method', () => {
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getHttpMethod()).to.equal('POST');
  });
  it('should return empty response validator', () => {
    expect(FIREBASE_AUTH_DELETE_ACCOUNT.getResponseValidator()).to.not.be.null;
    expect(() => {
      const emptyResponse = {};
      const responseValidator = FIREBASE_AUTH_DELETE_ACCOUNT.getResponseValidator();
      responseValidator(emptyResponse);
    }).not.to.throw();
  });
  describe('requestValidator', () => {
    const requestValidator = FIREBASE_AUTH_DELETE_ACCOUNT.getRequestValidator();
    it('should succeed with localId passed', () => {
      const validRequest = {localId: '1234'};
      expect(() => {
        return requestValidator(validRequest);
      }).not.to.throw();
    });
    it('should fail when localId not passed', () => {
      const invalidRequest = {bla: '1234'};
      expect(() => {
        return requestValidator(invalidRequest);
      }).to.throw();
    });
  });
});

describe('FirebaseAuthRequestHandler', () => {
  let mockedRequests: nock.Scope[] = [];
  let stubs: Sinon.SinonStub[] = [];
  afterEach(() => {
    _.forEach(stubs, (stub) => stub.restore());
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
  });
  after(() => {
    stubs = [];
    nock.cleanAll();
  });
  describe('Constructor', () => {
    it('should succeed with a credential', () => {
      expect(() => {
        const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
        return new FirebaseAuthRequestHandler(cred);
      }).not.to.throw(Error);
    });
  });

  describe('getAccountInfoByEmail', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should be fulfilled given a valid email', () => {
      const expectedResult = {
        users : [
          {email: 'user@example.com'},
        ],
      };
      const data = {email: ['user@example.com']};
      const accessToken = generateRandomAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
    it('should be rejected given an invalid email', () => {
      const expectedResult = {
        kind: 'identitytoolkit#GetAccountInfoResponse',
      };
      const expectedError = new Error('User not found');
      const data = {email: ['user@example.com']};
      const accessToken = generateRandomAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.getAccountInfoByEmail('user@example.com')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
  });

  describe('getAccountInfoByUid', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should be fulfilled given a valid localId', () => {
      const expectedResult = {
        users : [
          {localId: 'uid'},
        ],
      };
      const data = {localId: ['uid']};
      const accessToken = generateRandomAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.getAccountInfoByUid('uid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
    it('should be rejected given an invalid localId', () => {
      const expectedResult = {
        kind: 'identitytoolkit#GetAccountInfoResponse',
      };
      const expectedError = new Error('User not found');
      const accessToken = generateRandomAccessToken();
      const data = {localId: ['uid']};
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.getAccountInfoByUid('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = {
        error: {
          message: 'INTERNAL_SERVER_ERROR',
        },
      };
      const expectedError = new Error('INTERNAL_SERVER_ERROR');
      const data = {localId: ['uid']};
      const accessToken = generateRandomAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.getAccountInfoByUid('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
  });

  describe('deleteAccount', () => {
    const httpMethod = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/deleteAccount';
    const timeout = 10000;
    it('should be fulfilled given a valid localId', () => {
      const expectedResult = {
        kind: 'identitytoolkit#DeleteAccountResponse',
      };
      const data = {localId: 'uid'};
      const accessToken = generateRandomAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.deleteAccount('uid')
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
    it('should be rejected when the backend returns an error', () => {
      const expectedResult = {
        error: {
          message: 'INTERNAL_SERVER_ERROR',
        },
      };
      const expectedError = new Error('INTERNAL_SERVER_ERROR');
      const data = {localId: 'uid'};
      const accessToken = generateRandomAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      };

      let stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult));
      stubs.push(stub);

      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new FirebaseAuthRequestHandler(cred);
      return requestHandler.deleteAccount('uid')
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expectedError);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
  });
});

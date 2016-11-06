'use strict';

// Use untyped import syntax for Node built-ins.
import fs = require('fs');
import path = require('path');
import https = require('https');
import stream = require('stream');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import {mockFetchAccessTokenViaJwt, generateRandomAccessToken} from './utils';
import {MockSocketEmitter, MockStream} from './resources/mocks';
import {
  CertCredential, Certificate,
} from '../src/auth/credential';
import {
  SignedApiRequestHandler, HttpRequestHandler, ApiSettings,
} from '../src/utils/api-request';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const certPath = path.resolve(__dirname, 'resources/mock.key.json');
const MOCK_CERTIFICATE_OBJECT = JSON.parse(fs.readFileSync(certPath).toString());

describe('HttpRequestHandler', () => {
  let httpStub;
  let request;
  let writeSpy;
  beforeEach(() => {
    request = new MockStream();
    httpStub = sinon.stub(https, 'request');
    writeSpy = sinon.spy(request, 'write');
  });
  afterEach(() => {
    httpStub.restore();
    writeSpy.restore();
  });
  const httpMethod: any = 'POST';
  const host = 'www.googleapis.com';
  const port = 443;
  const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
  const timeout = 10000;
  const data = {key: 'value'};
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': JSON.stringify(data).length,
  };
  const options = {
    method: httpMethod,
    host,
    port,
    path,
    headers,
  };
  describe('sendRequest', () => {
    it('should return a promise that rejects on unexpected error', () => {
      const expected = new Error('some error');
      httpStub.returns(request);
      let httpRequestHandler = new HttpRequestHandler();
      const p = httpRequestHandler.sendRequest(
          host, port, path, httpMethod, data, headers, timeout)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expected);
          expect(httpStub).to.have.been.calledOnce.and.calledWith(options);
          expect(writeSpy).to.have.been.calledOnce.and.calledWith(JSON.stringify(data));
        });
      request.emit('error', expected);
      return p;
    });

    it('should return a promise that rejects on network error', () => {
      const expected = new Error('Network timeout');
      httpStub.returns(request);
      const expectedSocket = new MockSocketEmitter();
      let httpRequestHandler = new HttpRequestHandler();
      const p = httpRequestHandler.sendRequest(
          host, port, path, httpMethod, data, headers, timeout)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error).to.deep.equal(expected);
          expect(httpStub).to.have.been.calledOnce.and.calledWith(options);
          expect(writeSpy).to.have.been.calledOnce.and.calledWith(JSON.stringify(data));
        });
      request.emit('socket', expectedSocket);
      expectedSocket.emit('timeout');
      return p;
    });

    it('should return a promise that rejects on json parsing error', () => {
      // Return an invalid json string in response.
      const response = new stream.PassThrough();
      response.write('invalid json');
      response.end();
      httpStub.callsArgWith(1, response)
        .returns(request);
      let httpRequestHandler = new HttpRequestHandler();
      const p = httpRequestHandler.sendRequest(
          host, port, path, httpMethod, data, headers, timeout)
        .then((resp) => {
          throw new Error('Unexpected success');
        }, (error) => {
          expect(error.toString()).to.include('SyntaxError');
          expect(httpStub).to.have.been.calledOnce.and.calledWith(options);
          expect(writeSpy).to.have.been.calledOnce.and.calledWith(JSON.stringify(data));
        });
      return p;
    });

    describe('with full parameter list', () => {
      it('should return a promise that resolves on success', () => {
        const expected: Object = {
          key1: 'value1',
          key2: 'value2',
        };
        const response = new stream.PassThrough();
        response.write(JSON.stringify(expected));
        response.end();
        httpStub.callsArgWith(1, response)
          .returns(request);
        let httpRequestHandler = new HttpRequestHandler();
        return httpRequestHandler.sendRequest(
            host, port, path, httpMethod, data, headers, timeout)
          .then((resp) => {
            expect(resp).to.deep.equal(expected);
            expect(httpStub).to.have.been.calledOnce.and.calledWith(options);
            expect(writeSpy).to.have.been.calledOnce.and.calledWith(JSON.stringify(data));
          });
      });
    });

    describe('with required parameters only', () => {
      it('should return a promise that resolves on success', () => {
        const expected: Object = {
          key1: 'value1',
          key2: 'value2',
        };
        const response = new stream.PassThrough();
        response.write(JSON.stringify(expected));
        response.end();
        httpStub.callsArgWith(1, response)
          .returns(request);
        let httpRequestHandler = new HttpRequestHandler();
        const options2 = {
          method: httpMethod,
          host,
          port,
          path,
          headers: undefined,
        };
        return httpRequestHandler.sendRequest(
            host, port, path, httpMethod)
          .then((resp) => {
            expect(resp).to.deep.equal(expected);
            expect(httpStub).to.have.been.calledOnce.and.calledWith(options2);
            expect(writeSpy.callCount).to.be.equal(0);
          });
      });
    });
  });
});

describe('SignedApiRequestHandler', () => {
  describe('Constructor', () => {
    it('should succeed with a credential', () => {
      expect(() => {
        const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
        const authRequestHandlerAny: any = SignedApiRequestHandler;
        return new authRequestHandlerAny(cred);
      }).not.to.throw(Error);
    });
  });

  describe('sendRequest', () => {
    let mockedRequests: nock.Scope[] = [];
    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];
    });
    after(() => {
      nock.cleanAll();
    });
    const expectedResult = {
      users : [
        {localId: 'uid'},
      ],
    };
    let stub: Sinon.SinonStub;
    beforeEach(() => stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult)));
    afterEach(() => stub.restore());
    const data = {localId: ['uid']};
    const accessToken = generateRandomAccessToken();
    const preHeaders = {
      'Content-Type': 'application/json',
    };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken,
    };
    const httpMethod: any = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should resolve successfully with a valid request', () => {
      mockedRequests.push(mockFetchAccessTokenViaJwt(accessToken));
      const cred = new CertCredential(new Certificate(MOCK_CERTIFICATE_OBJECT));
      const requestHandler = new SignedApiRequestHandler(cred);
      return requestHandler.sendRequest(
          host, port, path, httpMethod, data, preHeaders, timeout)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, data, headers, timeout);
        });
    });
  });
});

describe('ApiSettings', () => {
  describe('Constructor', () => {
    it('should throw an error with an unspecified endpoint', () => {
      expect(() => {
        const apiSettingsAny: any = ApiSettings;
        return new apiSettingsAny();
      }).to.throw();
    });

    it('should succeed with a specified endpoint and a default http method', () => {
      expect(() => {
        const apiSettingsAny: any = ApiSettings;
        return new apiSettingsAny('getAccountInfo');
      }).not.to.throw(Error);
    });

    it('should succeed with a specified endpoint and http method', () => {
      expect(() => {
        const apiSettingsAny: any = ApiSettings;
        return new apiSettingsAny('getAccountInfo', 'POST');
      }).not.to.throw(Error);
    });

    it('should populate default http method when not specified', () => {
      let apiSettings = new ApiSettings('getAccountInfo');
      expect(apiSettings.getHttpMethod()).to.equal('POST');
    });
  });

  describe('Getters and Setters', () => {
    describe('with unset properties', () => {
      let apiSettings: ApiSettings = new ApiSettings('getAccountInfo', 'GET');
      it('should resolve successfully for endpoint and http method', () => {
        expect(apiSettings.getEndpoint()).to.equal('getAccountInfo');
        expect(apiSettings.getHttpMethod()).to.equal('GET');
      });
      it('should not return null for unset requestValidator', () => {
        expect(apiSettings.getRequestValidator()).to.not.be.null;
      });
      it('should not return null for unset responseValidator', () => {
        expect(apiSettings.getResponseValidator()).to.not.be.null;
      });
    });
    describe('with null validators', () => {
      let apiSettings: ApiSettings = new ApiSettings('getAccountInfo', 'GET');
      apiSettings.setResponseValidator(null);
      apiSettings.setRequestValidator(null);
      it('should not return null for requestValidator', () => {
        let validator = apiSettings.getRequestValidator();
        expect(() => {
          return validator({});
        }).to.not.throw();
      });
      it('should not return null for responseValidator', () => {
        let validator = apiSettings.getResponseValidator();
        expect(() => {
          return validator({});
        }).to.not.throw();
      });
    });
    describe('with set properties', () => {
      let apiSettings: ApiSettings = new ApiSettings('getAccountInfo', 'GET');
      // Set all apiSettings properties.
      const requestValidator = (request) => undefined;
      const responseValidator = (response) => undefined;
      apiSettings.setRequestValidator(requestValidator);
      apiSettings.setResponseValidator(responseValidator);
      it('should return the correct requestValidator', () => {
        expect(apiSettings.getRequestValidator()).to.equal(requestValidator);
      });
      it('should return the correct responseValidator', () => {
        expect(apiSettings.getResponseValidator()).to.equal(responseValidator);
      });
    });
  });
});



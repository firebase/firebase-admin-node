'use strict';

// Use untyped import syntax for Node built-ins.
import https = require('https');
import stream = require('stream');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from './utils';
import * as mocks from './resources/mocks';

import {FirebaseApp} from '../src/firebase-app';
import {
  SignedApiRequestHandler, HttpRequestHandler, ApiSettings,
} from '../src/utils/api-request';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);


const mockPort = 443;
const mockHost = 'www.example.com';
const mockPath = '/foo/bar';

const mockSuccessResponse = {
  foo: 'one',
  bar: 2,
  baz: true,
};

const mockErrorResponse = {
  error: {
    code: 'error-code',
    message: 'Error message',
  },
};

const mockTextErrorResponse = 'Text error response';
const mockTextSuccessResponse = 'Text success response';

const mockRequestData = {
  foo: 'one',
  bar: 2,
  baz: true,
};

const mockRequestHeaders = {
  'content-type': 'application/json',
};

/**
 * Returns a mocked out successful response for a dummy URL.
 *
 * @param {string} [responseContentType] Optional response content type.
 * @param {string} [method] Optional request method.
 * @param {any} [response] Optional response.
 *
 * @return {Object} A nock response object.
 */
function mockRequest(
  responseContentType = 'application/json',
  method = 'GET',
  response?: any,
) {
  if (typeof response === 'undefined') {
    response = mockSuccessResponse;
    if (responseContentType === 'text/html') {
      response = mockTextSuccessResponse;
    }
  }

  return nock('https://' + mockHost)
    .intercept(mockPath, method)
    .reply(200, response, {
      'content-type': responseContentType,
    });
}

/**
 * Returns a mocked out error response for a dummy URL.
 *
 * @param {number} [statusCode] Optional response status code.
 * @param {string} [responseContentType] Optional response content type.
 * @param {any} [response] Optional response.
 *
 * @return {Object} A nock response object.
 */
function mockRequestWithError(
  statusCode = 400,
  responseContentType = 'application/json',
  response: any = mockErrorResponse,
) {
  if (responseContentType === 'text/html') {
    response = mockTextErrorResponse;
  }

  return nock('https://' + mockHost)
    .get(mockPath)
    .reply(statusCode, response, {
      'content-type': responseContentType,
    });
}


describe('HttpRequestHandler', () => {
  let mockedRequests: nock.Scope[] = [];
  let requestWriteSpy: sinon.SinonSpy;
  let httpsRequestStub: sinon.SinonStub;
  let mockRequestStream: mocks.MockStream;
  let httpRequestHandler = new HttpRequestHandler();

  beforeEach(() => {
    mockRequestStream = new mocks.MockStream();
  });

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];

    if (requestWriteSpy && requestWriteSpy.restore) {
      requestWriteSpy.restore();
    }

    if (httpsRequestStub && httpsRequestStub.restore) {
      httpsRequestStub.restore();
    }
  });


  describe('sendRequest', () => {
    it('should be rejected on an unexpected error', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.returns(mockRequestStream);

      const sendRequestPromise = httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET');

      mockRequestStream.emit('error', new Error('some error'));

      return sendRequestPromise
        .should.eventually.be.rejected.and.have.property('code', 'network-error');
     });

    it('should be rejected on a network error', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.returns(mockRequestStream);

      const mockSocket = new mocks.MockSocketEmitter();

      const sendRequestPromise = httpRequestHandler.sendRequest(
        mockHost, mockPort, mockPath, 'GET', undefined, undefined, 5000
      );

      mockRequestStream.emit('socket', mockSocket);
      mockSocket.emit('timeout');

      return sendRequestPromise
        .should.eventually.be.rejected.and.have.property('code', 'network-timeout');
    });

    it('should forward the provided options on to the underlying https.request() method', () => {
      requestWriteSpy = sinon.spy(mockRequestStream, 'write');

      const mockResponse = new stream.PassThrough();
      mockResponse.write(JSON.stringify(mockSuccessResponse));
      mockResponse.end();

      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.callsArgWith(1, mockResponse)
        .returns(mockRequestStream);

      return httpRequestHandler.sendRequest(
        mockHost, mockPort, mockPath, 'POST', mockRequestData, mockRequestHeaders
      )
        .then((response) => {
          expect(response).to.deep.equal(mockSuccessResponse);
          expect(httpsRequestStub).to.have.been.calledOnce;
          expect(httpsRequestStub.args[0][0]).to.deep.equal({
            method: 'POST',
            host: mockHost,
            port: mockPort,
            path: mockPath,
            headers: mockRequestHeaders,
          });
          expect(requestWriteSpy).to.have.been.calledOnce.and.calledWith(JSON.stringify(mockRequestData));
        });
    });

    describe('with JSON response', () => {
      it('should be rejected given a 4xx response', () => {
        mockedRequests.push(mockRequestWithError(400));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.deep.equal(mockErrorResponse);
      });

      it('should be rejected given a 5xx response', () => {
        mockedRequests.push(mockRequestWithError(500));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.deep.equal(mockErrorResponse);
      });

      it('should be rejected given an error when parsing the JSON response', () => {
        mockedRequests.push(mockRequestWithError(400, undefined, mockTextErrorResponse));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.have.property('code', 'unable-to-parse-response');
      });

      it('should be fulfilled given a 2xx response', () => {
        mockedRequests.push(mockRequest());

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.fulfilled.and.deep.equal(mockSuccessResponse);
      });

      it('should accept additional parameters', () => {
        mockedRequests.push(mockRequest(undefined, 'POST'));

        return httpRequestHandler.sendRequest(
          mockHost, mockPort, mockPath, 'POST', mockRequestData, mockRequestHeaders, 10000
        ).should.eventually.be.fulfilled.and.deep.equal(mockSuccessResponse);
      });
    });

    describe('with text response', () => {
      it('should be rejected given a 4xx response', () => {
        mockedRequests.push(mockRequestWithError(400, 'text/html'));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejectedWith('Text error');
      });

      it('should be rejected given a 5xx response', () => {
        mockedRequests.push(mockRequestWithError(500, 'text/html'));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejectedWith('Text error');
      });

      it('should be fulfilled given a 2xx response', () => {
        mockedRequests.push(mockRequest('text/html'));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.fulfilled.and.deep.equal(mockTextSuccessResponse);
      });

      it('should accept additional parameters', () => {
        mockedRequests.push(mockRequest('text/html', 'POST'));

        return httpRequestHandler.sendRequest(
          mockHost, mockPort, mockPath, 'POST', mockRequestData, mockRequestHeaders, 10000
        ).should.eventually.be.fulfilled.and.deep.equal(mockTextSuccessResponse);
      });
    });
  });
});


describe('SignedApiRequestHandler', () => {
  let mockApp: FirebaseApp;
  let mockAccessToken: string = utils.generateRandomAccessToken();

  before(() => utils.mockFetchAccessTokenRequests(mockAccessToken));

  after(() => nock.cleanAll());

  beforeEach(() => {
    mockApp = mocks.app();
  });

  describe('Constructor', () => {
    it('should succeed with a FirebaseApp instance', () => {
      expect(() => {
        const authRequestHandlerAny: any = SignedApiRequestHandler;
        return new authRequestHandlerAny(mockApp);
      }).not.to.throw(Error);
    });
  });

  describe('sendRequest', () => {
    let mockedRequests: nock.Scope[] = [];
    afterEach(() => {
      _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
      mockedRequests = [];
    });

    const expectedResult = {
      users : [
        {localId: 'uid'},
      ],
    };
    let stub: sinon.SinonStub;
    beforeEach(() => stub = sinon.stub(HttpRequestHandler.prototype, 'sendRequest')
        .returns(Promise.resolve(expectedResult)));
    afterEach(() => stub.restore());
    const data = {localId: ['uid']};
    const preHeaders = {
      'Content-Type': 'application/json',
    };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + mockAccessToken,
    };
    const httpMethod: any = 'POST';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should resolve successfully with a valid request', () => {
      const requestHandler = new SignedApiRequestHandler(mockApp);
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



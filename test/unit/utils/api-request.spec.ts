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

// Use untyped import syntax for Node built-ins.
import https = require('https');
import stream = require('stream');

import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {FirebaseApp} from '../../../src/firebase-app';
import {
  SignedApiRequestHandler, HttpRequestHandler, ApiSettings, HttpClient, HttpError, AuthorizedHttpClient,
} from '../../../src/utils/api-request';
import { AppErrorCodes } from '../../../src/utils/error';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const mockPort = 443;
const mockHost = 'www.example.com';
const mockPath = '/foo/bar';
const mockUrl = `https://${mockHost}${mockPath}`;

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
 * Returns a mocked out HTTP error response for a dummy URL.
 *
 * @param {number} [statusCode] Optional response status code.
 * @param {string} [responseContentType] Optional response content type.
 * @param {any} [response] Optional response.
 *
 * @return {Object} A nock response object.
 */
function mockRequestWithHttpError(
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

/**
 * Returns a mocked out error response for a dummy URL, useful for simulating
 * network errors.
 *
 * @param {Error} [err] The request error.
 *
 * @return {Object} A nock response object.
 */
function mockRequestWithError(err: any) {
  return nock('https://' + mockHost)
    .get(mockPath)
    .replyWithError(err);
}

describe('HttpClient', () => {
  let mockedRequests: nock.Scope[] = [];

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];
  });

  it('should be fulfilled for a 2xx response with a json payload', () => {
    const respData = {foo: 'bar'};
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.text).to.equal(JSON.stringify(respData));
      expect(resp.data).to.deep.equal(respData);
    });
  });

  it('should be fulfilled for a 2xx response with a text payload', () => {
    const respData = 'foo bar';
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'text/plain',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('text/plain');
      expect(resp.text).to.equal(respData);
      expect(() => { resp.data; }).to.throw('Error while parsing response data');
    });
  });

  it('should make a POST request with the provided headers and data', () => {
    const reqData = {request: 'data'};
    const respData = {success: true};
    const scope = nock('https://' + mockHost, {
      reqheaders: {
        'Authorization': 'Bearer token',
        'Content-Type': (header) => {
          return header.startsWith('application/json'); // auto-inserted by Axios
        },
        'My-Custom-Header': 'CustomValue',
      },
    }).post(mockPath, reqData)
    .reply(200, respData, {
      'content-type': 'application/json',
    });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'POST',
      url: mockUrl,
      headers: {
        'authorization': 'Bearer token',
        'My-Custom-Header': 'CustomValue',
      },
      data: reqData,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
    });
  });

  it('should fail with an HttpError for a 4xx response', () => {
    const data = {error: 'data'};
    mockedRequests.push(mockRequestWithHttpError(400, 'application/json', data));
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 400.');
      const resp = err.response;
      expect(resp.status).to.equal(400);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(data);
    });
  });

  it('should fail with an HttpError for a 5xx response', () => {
    const data = {error: 'data'};
    mockedRequests.push(mockRequestWithHttpError(500, 'application/json', data));
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 500.');
      const resp = err.response;
      expect(resp.status).to.equal(500);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(data);
    });
  });

  it('should fail with a FirebaseAppError for a network error', () => {
    const data = {foo: 'bar'};
    mockedRequests.push(mockRequestWithError({message: 'test error', code: 'AWFUL_ERROR'}));
    const client = new HttpClient();
    const err = 'Error while making request: test error. Error code: AWFUL_ERROR';
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should timeout when the response is delayed', () => {
    const respData = {foo: 'bar'};
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .twice()
      .delay(1000)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const err = 'Error while making request: timeout of 50ms exceeded.';
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-timeout');
  });

  it('should timeout when a socket timeout is encountered', () => {
    const respData = {foo: 'bar timeout'};
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .twice()
      .socketDelay(2000)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const err = 'Error while making request: timeout of 50ms exceeded.';
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-timeout');
  });

  it('should be rejected, after 1 retry, on multiple network errors', () => {
    mockedRequests.push(mockRequestWithError({message: 'connection reset 1', code: 'ECONNRESET'}));
    mockedRequests.push(mockRequestWithError({message: 'connection reset 2', code: 'ECONNRESET'}));
    const client = new HttpClient();
    const err = 'Error while making request: connection reset 2';
    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should succeed, after 1 retry, on a single network error', () => {
    mockedRequests.push(mockRequestWithError({message: 'connection reset 1', code: 'ECONNRESET'}));
    const respData = {foo: 'bar'};
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.data).to.deep.equal(respData);
    });
  });
});

describe('AuthorizedHttpClient', () => {
  let mockApp: FirebaseApp;
  let mockedRequests: nock.Scope[] = [];

  const mockAccessToken: string = utils.generateRandomAccessToken();
  const requestHeaders = {
    reqheaders: {
      Authorization: `Bearer ${mockAccessToken}`,
    },
  };

  before(() => utils.mockFetchAccessTokenRequests(mockAccessToken));

  after(() => nock.cleanAll());

  beforeEach(() => {
    mockApp = mocks.app();
  });

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];
    return mockApp.delete();
  });

  it('should be fulfilled for a 2xx response with a json payload', () => {
    const respData = {foo: 'bar'};
    const scope = nock('https://' + mockHost, requestHeaders)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new AuthorizedHttpClient(mockApp);
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.text).to.equal(JSON.stringify(respData));
      expect(resp.data).to.deep.equal(respData);
    });
  });

  it('should make a POST request with the provided headers and data', () => {
    const reqData = {request: 'data'};
    const respData = {success: true};
    const options = {
      reqheaders: {
        'Authorization': 'Bearer token',
        'Content-Type': (header) => {
          return header.startsWith('application/json'); // auto-inserted by Axios
        },
        'My-Custom-Header': 'CustomValue',
      },
    };
    Object.assign(options.reqheaders, requestHeaders.reqheaders);
    const scope = nock('https://' + mockHost, options)
      .post(mockPath, reqData)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new AuthorizedHttpClient(mockApp);
    return client.send({
      method: 'POST',
      url: mockUrl,
      headers: {
        'My-Custom-Header': 'CustomValue',
      },
      data: reqData,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
    });
  });
});

describe('HttpRequestHandler', () => {
  let mockedRequests: nock.Scope[] = [];
  let requestWriteSpy: sinon.SinonSpy;
  let httpsRequestStub: sinon.SinonStub;
  let mockRequestStream: mocks.MockStream;
  const httpRequestHandler = new HttpRequestHandler();

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
    it('should be rejected, after 1 retry, on multiple network errors', () => {
      mockedRequests.push(mockRequestWithError(new Error('first error')));
      mockedRequests.push(mockRequestWithError(new Error('second error')));

      const sendRequestPromise = httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET');

      return sendRequestPromise
        .then(() => {
          throw new Error('Unexpected success.');
        })
        .catch((response) => {
          expect(response).to.have.keys(['error', 'statusCode']);
          expect(response.error).to.have.property('code', 'app/network-error');
          expect(response.statusCode).to.equal(502);
        });
    });

    it('should succeed, after 1 retry, on a single network error', () => {
      mockedRequests.push(mockRequestWithError(new Error('first error')));
      mockedRequests.push(mockRequest());

      return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
        .should.eventually.be.fulfilled.and.deep.equal(mockSuccessResponse);
    });

    it('should be rejected on a network timeout', () => {
      httpsRequestStub = sinon.stub(https, 'request');
      httpsRequestStub.returns(mockRequestStream);

      const mockSocket = new mocks.MockSocketEmitter();

      const sendRequestPromise = httpRequestHandler.sendRequest(
        mockHost, mockPort, mockPath, 'GET', undefined, undefined, 5000,
      );

      mockRequestStream.emit('socket', mockSocket);
      mockSocket.emit('timeout');

      return sendRequestPromise
        .then(() => {
          throw new Error('Unexpected success.');
        })
        .catch((response) => {
          expect(response).to.have.keys(['error', 'statusCode']);
          expect(response.error).to.have.property('code', 'app/network-timeout');
          expect(response.statusCode).to.equal(408);
        });
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
        mockHost, mockPort, mockPath, 'POST', mockRequestData, mockRequestHeaders,
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
        mockedRequests.push(mockRequestWithHttpError(400));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.deep.equal({
            error: mockErrorResponse,
            statusCode: 400,
          });
      });

      it('should be rejected given a 5xx response', () => {
        mockedRequests.push(mockRequestWithHttpError(500));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.deep.equal({
            error: mockErrorResponse,
            statusCode: 500,
          });
      });

      it('should be rejected given an error when parsing the JSON response', () => {
        mockedRequests.push(mockRequestWithHttpError(400, undefined, mockTextErrorResponse));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .then(() => {
            throw new Error('Unexpected success.');
          })
          .catch((response) => {
            expect(response).to.have.keys(['error', 'statusCode']);
            expect(response.error).to.have.property('code', 'app/unable-to-parse-response');
            expect(response.statusCode).to.equal(400);
          });
      });

      it('should be fulfilled given a 2xx response', () => {
        mockedRequests.push(mockRequest());

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.fulfilled.and.deep.equal(mockSuccessResponse);
      });

      it('should accept additional parameters', () => {
        mockedRequests.push(mockRequest(undefined, 'POST'));

        return httpRequestHandler.sendRequest(
          mockHost, mockPort, mockPath, 'POST', mockRequestData, mockRequestHeaders, 10000,
        ).should.eventually.be.fulfilled.and.deep.equal(mockSuccessResponse);
      });
    });

    describe('with text response', () => {
      it('should be rejected given a 4xx response', () => {
        mockedRequests.push(mockRequestWithHttpError(400, 'text/html'));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.deep.equal({
            error: mockTextErrorResponse,
            statusCode: 400,
          });
      });

      it('should be rejected given a 5xx response', () => {
        mockedRequests.push(mockRequestWithHttpError(500, 'text/html'));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.rejected.and.deep.equal({
            error: mockTextErrorResponse,
            statusCode: 500,
          });
      });

      it('should be fulfilled given a 2xx response', () => {
        mockedRequests.push(mockRequest('text/html'));

        return httpRequestHandler.sendRequest(mockHost, mockPort, mockPath, 'GET')
          .should.eventually.be.fulfilled.and.deep.equal(mockTextSuccessResponse);
      });

      it('should accept additional parameters', () => {
        mockedRequests.push(mockRequest('text/html', 'POST'));

        return httpRequestHandler.sendRequest(
          mockHost, mockPort, mockPath, 'POST', mockRequestData, mockRequestHeaders, 10000,
        ).should.eventually.be.fulfilled.and.deep.equal(mockTextSuccessResponse);
      });
    });
  });
});


describe('SignedApiRequestHandler', () => {
  let mockApp: FirebaseApp;
  const mockAccessToken: string = utils.generateRandomAccessToken();

  before(() => utils.mockFetchAccessTokenRequests(mockAccessToken));

  after(() => nock.cleanAll());

  beforeEach(() => {
    mockApp = mocks.app();
  });

  afterEach(() => {
    return mockApp.delete();
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
      'Authorization': 'Bearer ' + mockAccessToken,
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

  describe('sendDeleteRequest', () => {
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
    const headers = {
      Authorization: 'Bearer ' + mockAccessToken,
    };
    const httpMethod: any = 'DELETE';
    const host = 'www.googleapis.com';
    const port = 443;
    const path = '/identitytoolkit/v3/relyingparty/getAccountInfo';
    const timeout = 10000;
    it('should resolve successfully with a valid request', () => {
      const requestHandler = new SignedApiRequestHandler(mockApp);
      return requestHandler.sendRequest(
          host, port, path, httpMethod, undefined, undefined, timeout)
        .then((result) => {
          expect(result).to.deep.equal(expectedResult);
          expect(stub).to.have.been.calledOnce.and.calledWith(
              host, port, path, httpMethod, undefined, headers, timeout);
        });
    });
  });
});

describe('ApiSettings', () => {
  describe('Constructor', () => {
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
      const apiSettings = new ApiSettings('getAccountInfo');
      expect(apiSettings.getHttpMethod()).to.equal('POST');
    });
  });

  describe('Getters and Setters', () => {
    describe('with unset properties', () => {
      const apiSettings: ApiSettings = new ApiSettings('getAccountInfo', 'GET');
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
      const apiSettings: ApiSettings = new ApiSettings('getAccountInfo', 'GET');
      apiSettings.setResponseValidator(null);
      apiSettings.setRequestValidator(null);
      it('should not return null for requestValidator', () => {
        const validator = apiSettings.getRequestValidator();
        expect(() => {
          return validator({});
        }).to.not.throw();
      });
      it('should not return null for responseValidator', () => {
        const validator = apiSettings.getResponseValidator();
        expect(() => {
          return validator({});
        }).to.not.throw();
      });
    });
    describe('with set properties', () => {
      const apiSettings: ApiSettings = new ApiSettings('getAccountInfo', 'GET');
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


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
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import {FirebaseApp} from '../../../src/firebase-app';
import {
  ApiSettings, HttpClient, HttpError, AuthorizedHttpClient, ApiCallbackFunction,
} from '../../../src/utils/api-request';
import {Agent} from 'http';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const mockHost = 'www.example.com';
const mockPath = '/foo/bar';
const mockUrl = `https://${mockHost}${mockPath}`;

const mockErrorResponse = {
  error: {
    code: 'error-code',
    message: 'Error message',
  },
};

const mockTextErrorResponse = 'Text error response';

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
  let transportSpy: sinon.SinonSpy = null;

  afterEach(() => {
    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];
    if (transportSpy) {
      transportSpy.restore();
      transportSpy = null;
    }
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
      expect(resp.isJson()).to.be.true;
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
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should use the specified HTTP agent', () => {
    const respData = {success: true};
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    const httpAgent = new Agent();
    const https = require('https');
    transportSpy = sinon.spy(https, 'request');
    return client.send({
      method: 'GET',
      url: mockUrl,
      httpAgent,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(transportSpy.callCount).to.equal(1);
      const options = transportSpy.args[0][0];
      expect(options.agent).to.equal(httpAgent);
    });
  });

  it('should make a POST request with the provided headers and data', () => {
    const reqData = {request: 'data'};
    const respData = {success: true};
    const scope = nock('https://' + mockHost, {
      reqheaders: {
        'Authorization': 'Bearer token',
        'Content-Type': (header) => {
          return header.startsWith('application/json'); // auto-inserted
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
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should make a GET request with the provided headers and data', () => {
    const reqData = {key1: 'value1', key2: 'value2'};
    const respData = {success: true};
    const scope = nock('https://' + mockHost, {
      reqheaders: {
        'Authorization': 'Bearer token',
        'My-Custom-Header': 'CustomValue',
      },
    }).get(mockPath)
    .query(reqData)
    .reply(200, respData, {
      'content-type': 'application/json',
    });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
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
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should fail with a GET request containing non-object data', () => {
    const err = 'GET requests cannot have a body.';
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
      data: 'non-object-data',
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should make a HEAD request with the provided headers and data', () => {
    const reqData = {key1: 'value1', key2: 'value2'};
    const respData = {success: true};
    const scope = nock('https://' + mockHost, {
      reqheaders: {
        'Authorization': 'Bearer token',
        'My-Custom-Header': 'CustomValue',
      },
    }).head(mockPath)
    .query(reqData)
    .reply(200, respData, {
      'content-type': 'application/json',
    });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'HEAD',
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
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should fail with a HEAD request containing non-object data', () => {
    const err = 'HEAD requests cannot have a body.';
    const client = new HttpClient();
    return client.send({
      method: 'HEAD',
      url: mockUrl,
      timeout: 50,
      data: 'non-object-data',
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
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
      expect(resp.isJson()).to.be.true;
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
      expect(resp.isJson()).to.be.true;
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

  describe('HTTP Agent', () => {
    let transportSpy: sinon.SinonSpy = null;
    let mockAppWithAgent: FirebaseApp;
    let agentForApp: Agent;

    beforeEach(() => {
      const options = mockApp.options;
      options.httpAgent = new Agent();
      const https = require('https');
      transportSpy = sinon.spy(https, 'request');
      mockAppWithAgent = mocks.appWithOptions(options);
      agentForApp = options.httpAgent;
    });

    afterEach(() => {
      transportSpy.restore();
      transportSpy = null;
      return mockAppWithAgent.delete();
    });

    it('should use the HTTP agent set in request', () => {
      const respData = {success: true};
      const scope = nock('https://' + mockHost, requestHeaders)
        .get(mockPath)
        .reply(200, respData, {
          'content-type': 'application/json',
        });
      mockedRequests.push(scope);
      const client = new AuthorizedHttpClient(mockAppWithAgent);
      const httpAgent = new Agent();
      return client.send({
        method: 'GET',
        url: mockUrl,
        httpAgent,
      }).then((resp) => {
        expect(resp.status).to.equal(200);
        // First call is to the token server
        expect(transportSpy.callCount).to.equal(2);
        const options = transportSpy.args[1][0];
        expect(options.agent).to.equal(httpAgent);
      });
    });

    it('should use the HTTP agent set in AppOptions', () => {
      const respData = {success: true};
      const scope = nock('https://' + mockHost, requestHeaders)
        .get(mockPath)
        .reply(200, respData, {
          'content-type': 'application/json',
        });
      mockedRequests.push(scope);
      const client = new AuthorizedHttpClient(mockAppWithAgent);
      return client.send({
        method: 'GET',
        url: mockUrl,
      }).then((resp) => {
        expect(resp.status).to.equal(200);
        // First call is to the token server
        expect(transportSpy.callCount).to.equal(2);
        const options = transportSpy.args[1][0];
        expect(options.agent).to.equal(agentForApp);
      });
    });
  });

  it('should make a POST request with the provided headers and data', () => {
    const reqData = {request: 'data'};
    const respData = {success: true};
    const options = {
      reqheaders: {
        'Authorization': 'Bearer token',
        'Content-Type': (header: string) => {
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
      const requestValidator: ApiCallbackFunction = (request) => undefined;
      const responseValidator: ApiCallbackFunction = (response) => undefined;
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

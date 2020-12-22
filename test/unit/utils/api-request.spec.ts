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

import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import { FirebaseApp } from '../../../src/firebase-app';
import {
  ApiSettings, HttpClient, HttpError, AuthorizedHttpClient, ApiCallbackFunction, HttpRequestConfig,
  HttpResponse, parseHttpResponse, RetryConfig, defaultRetryConfig,
} from '../../../src/utils/api-request';
import { deepCopy } from '../../../src/utils/deep-copy';
import { Agent } from 'http';
import * as zlib from 'zlib';

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
): nock.Scope {
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
function mockRequestWithError(err: any): nock.Scope {
  return nock('https://' + mockHost)
    .get(mockPath)
    .replyWithError(err);
}

/**
 * Returns a new RetryConfig instance for testing. This is same as the default
 * RetryConfig, with the backOffFactor set to 0 to avoid delays.
 *
 * @return {RetryConfig} A new RetryConfig instance.
 */
function testRetryConfig(): RetryConfig {
  const config = defaultRetryConfig();
  config.backOffFactor = 0;
  return config;
}

describe('HttpClient', () => {
  let mockedRequests: nock.Scope[] = [];
  let transportSpy: sinon.SinonSpy | null = null;
  let delayStub: sinon.SinonStub | null = null;
  let clock: sinon.SinonFakeTimers | null = null;

  const sampleMultipartData = '--boundary\r\n'
      + 'Content-type: application/json\r\n\r\n'
      + '{"foo": 1}\r\n'
      + '--boundary\r\n'
      + 'Content-type: text/plain\r\n\r\n'
      + 'foo bar\r\n'
      + '--boundary--\r\n';

  afterEach(() => {
    mockedRequests.forEach((mockedRequest) => mockedRequest.done());
    mockedRequests = [];
    if (transportSpy) {
      transportSpy.restore();
      transportSpy = null;
    }
    if (delayStub) {
      delayStub.restore();
      delayStub = null;
    }
    if (clock) {
      clock.restore();
      clock = null;
    }
  });

  const invalidNumbers: any[] = ['string', null, undefined, {}, [], true, false, NaN, -1];
  const invalidArrays: any[] = ['string', null, {}, true, false, NaN, 0, 1];

  invalidNumbers.forEach((maxRetries: any) => {
    it(`should throw when maxRetries is: ${maxRetries}`, () => {
      expect(() => {
        new HttpClient({ maxRetries } as any);
      }).to.throw('maxRetries must be a non-negative integer');
    });
  });

  invalidNumbers.forEach((backOffFactor: any) => {
    if (typeof backOffFactor !== 'undefined') {
      it(`should throw when backOffFactor is: ${backOffFactor}`, () => {
        expect(() => {
          new HttpClient({ maxRetries: 1, backOffFactor } as any);
        }).to.throw('backOffFactor must be a non-negative number');
      });
    }
  });

  invalidNumbers.forEach((maxDelayInMillis: any) => {
    it(`should throw when maxDelayInMillis is: ${maxDelayInMillis}`, () => {
      expect(() => {
        new HttpClient({ maxRetries: 1, maxDelayInMillis } as any);
      }).to.throw('maxDelayInMillis must be a non-negative integer');
    });
  });

  invalidArrays.forEach((ioErrorCodes: any) => {
    it(`should throw when ioErrorCodes is: ${ioErrorCodes}`, () => {
      expect(() => {
        new HttpClient({ maxRetries: 1, maxDelayInMillis: 10000, ioErrorCodes } as any);
      }).to.throw('ioErrorCodes must be an array');
    });
  });

  invalidArrays.forEach((statusCodes: any) => {
    it(`should throw when statusCodes is: ${statusCodes}`, () => {
      expect(() => {
        new HttpClient({ maxRetries: 1, maxDelayInMillis: 10000, statusCodes } as any);
      }).to.throw('statusCodes must be an array');
    });
  });

  it('should be fulfilled for a 2xx response with a json payload', () => {
    const respData = { foo: 'bar' };
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
      expect(resp.multipart).to.be.undefined;
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
      expect(resp.multipart).to.be.undefined;
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should be fulfilled for a 2xx response with an empty multipart payload', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, '--boundary--\r\n', {
        'content-type': 'multipart/mixed; boundary=boundary',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('multipart/mixed; boundary=boundary');
      expect(resp.multipart).to.not.be.undefined;
      expect(resp.multipart!.length).to.equal(0);
      expect(() => { resp.text; }).to.throw('Unable to parse multipart payload as text');
      expect(() => { resp.data; }).to.throw('Unable to parse multipart payload as JSON');
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should be fulfilled for a 2xx response with a multipart payload', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, sampleMultipartData, {
        'content-type': 'multipart/mixed; boundary=boundary',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('multipart/mixed; boundary=boundary');
      expect(resp.multipart).to.exist;
      expect(resp.multipart!.map((buffer) => buffer.toString('utf-8'))).to.deep.equal(['{"foo": 1}', 'foo bar']);
      expect(() => { resp.text; }).to.throw('Unable to parse multipart payload as text');
      expect(() => { resp.data; }).to.throw('Unable to parse multipart payload as JSON');
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should be fulfilled for a 2xx response with any multipart payload', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, sampleMultipartData, {
        'content-type': 'multipart/something; boundary=boundary',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('multipart/something; boundary=boundary');
      expect(resp.multipart).to.exist;
      expect(resp.multipart!.map((buffer) => buffer.toString('utf-8'))).to.deep.equal(['{"foo": 1}', 'foo bar']);
      expect(() => { resp.text; }).to.throw('Unable to parse multipart payload as text');
      expect(() => { resp.data; }).to.throw('Unable to parse multipart payload as JSON');
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should handle as a text response when boundary not present', () => {
    const respData = 'foo bar';
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'multipart/mixed',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('multipart/mixed');
      expect(resp.multipart).to.be.undefined;
      expect(resp.text).to.equal(respData);
      expect(() => { resp.data; }).to.throw('Error while parsing response data');
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should be fulfilled for a 2xx response with a compressed payload', () => {
    const deflated: Buffer = zlib.deflateSync('foo bar');
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, deflated, {
        'content-type': 'text/plain',
        'content-encoding': 'deflate',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('text/plain');
      expect(resp.headers['content-encoding']).to.be.undefined;
      expect(resp.multipart).to.be.undefined;
      expect(resp.text).to.equal('foo bar');
      expect(() => { resp.data; }).to.throw('Error while parsing response data');
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should use the specified HTTP agent', () => {
    const respData = { success: true };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    const httpAgent = new Agent();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const https = require('https');
    transportSpy = sinon.spy(https, 'request');
    return client.send({
      method: 'GET',
      url: mockUrl,
      httpAgent,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(transportSpy!.callCount).to.equal(1);
      const options = transportSpy!.args[0][0];
      expect(options.agent).to.equal(httpAgent);
    });
  });

  it('should use the default RetryConfig', () => {
    const client = new HttpClient();
    const config = (client as any).retry as RetryConfig;
    expect(defaultRetryConfig()).to.deep.equal(config);
  });

  it('should make a POST request with the provided headers and data', () => {
    const reqData = { request: 'data' };
    const respData = { success: true };
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

  it('should use the specified content-type header for the body', () => {
    const reqData = { request: 'data' };
    const respData = { success: true };
    const scope = nock('https://' + mockHost, {
      reqheaders: {
        'Content-Type': (header) => {
          return header.startsWith('custom/type');
        },
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
        'content-type': 'custom/type',
      },
      data: reqData,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should not mutate the arguments', () => {
    const reqData = { request: 'data' };
    const scope = nock('https://' + mockHost, {
      reqheaders: {
        'Authorization': 'Bearer token',
        'Content-Type': (header) => {
          return header.startsWith('application/json'); // auto-inserted
        },
        'My-Custom-Header': 'CustomValue',
      },
    }).post(mockPath, reqData)
      .reply(200, { success: true }, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    const request: HttpRequestConfig = {
      method: 'POST',
      url: mockUrl,
      headers: {
        'authorization': 'Bearer token',
        'My-Custom-Header': 'CustomValue',
      },
      data: reqData,
    };
    const requestCopy = deepCopy(request);
    return client.send(request).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(request).to.deep.equal(requestCopy);
    });
  });

  it('should make a GET request with the provided headers and data', () => {
    const reqData = { key1: 'value1', key2: 'value2' };
    const respData = { success: true };
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

  it('should merge query parameters in URL with data', () => {
    const reqData = { key1: 'value1', key2: 'value2' };
    const mergedData = { ...reqData, key3: 'value3' };
    const respData = { success: true };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .query(mergedData)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl + '?key3=value3',
      data: reqData,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should urlEncode query parameters in URL', () => {
    const reqData = { key1: 'value 1!', key2: 'value 2!' };
    const mergedData = { ...reqData, key3: 'value 3!' };
    const respData = { success: true };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .query(mergedData)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl + '?key3=value+3%21',
      data: reqData,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should default to https when protocol not specified', () => {
    const respData = { foo: 'bar' };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl.substring('https://'.length),
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.text).to.equal(JSON.stringify(respData));
      expect(resp.data).to.deep.equal(respData);
      expect(resp.multipart).to.be.undefined;
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
    const reqData = { key1: 'value1', key2: 'value2' };
    const respData = { success: true };
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
    const data = { error: 'data' };
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
    const data = { error: 'data' };
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

  it('should fail for an error response with a multipart payload', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(500, sampleMultipartData, {
        'content-type': 'multipart/mixed; boundary=boundary',
      });
    mockedRequests.push(scope);
    const client = new HttpClient();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 500.');
      const resp = err.response;
      expect(resp.status).to.equal(500);
      expect(resp.headers['content-type']).to.equal('multipart/mixed; boundary=boundary');
      expect(resp.multipart).to.exist;
      expect(resp.multipart!.map((buffer) => buffer.toString('utf-8'))).to.deep.equal(['{"foo": 1}', 'foo bar']);
      expect(() => { resp.text; }).to.throw('Unable to parse multipart payload as text');
      expect(() => { resp.data; }).to.throw('Unable to parse multipart payload as JSON');
      expect(resp.isJson()).to.be.false;
    });
  });

  it('should fail with a FirebaseAppError for a network error', () => {
    mockedRequests.push(mockRequestWithError({ message: 'test error', code: 'AWFUL_ERROR' }));
    const client = new HttpClient();
    const err = 'Error while making request: test error. Error code: AWFUL_ERROR';
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should timeout when the response is repeatedly delayed', () => {
    const respData = { foo: 'bar' };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(5)
      .delay(1000)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);

    const err = 'Error while making request: timeout of 50ms exceeded.';
    const client = new HttpClient(testRetryConfig());

    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-timeout');
  });

  it('should timeout when multiple socket timeouts encountered', () => {
    const respData = { foo: 'bar timeout' };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(5)
      .delayConnection(2000)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);

    const err = 'Error while making request: timeout of 50ms exceeded.';
    const client = new HttpClient(testRetryConfig());

    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-timeout');
  });

  it('should be rejected, after 4 retries, on multiple network errors', () => {
    for (let i = 0; i < 5; i++) {
      mockedRequests.push(mockRequestWithError({ message: `connection reset ${i + 1}`, code: 'ECONNRESET' }));
    }

    const client = new HttpClient(testRetryConfig());
    const err = 'Error while making request: connection reset 5';

    return client.send({
      method: 'GET',
      url: mockUrl,
      timeout: 50,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should be rejected, after 4 retries, on multiple 503 errors', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(5)
      .reply(503, {}, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);

    const client = new HttpClient(testRetryConfig());

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 503.');
      const resp = err.response;
      expect(resp.status).to.equal(503);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal({});
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should succeed, after 1 retry, on a single network error', () => {
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 1', code: 'ECONNRESET' }));
    const respData = { foo: 'bar' };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient(defaultRetryConfig());
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.data).to.deep.equal(respData);
    });
  });

  it('should not retry when RetryConfig is explicitly null', () => {
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 1', code: 'ECONNRESET' }));
    const client = new HttpClient(null);
    const err = 'Error while making request: connection reset 1';
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should not retry when maxRetries is set to 0', () => {
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 1', code: 'ECONNRESET' }));
    const client = new HttpClient({
      maxRetries: 0,
      ioErrorCodes: ['ECONNRESET'],
      maxDelayInMillis: 10000,
    });
    const err = 'Error while making request: connection reset 1';
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should not retry when error codes are not configured', () => {
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 1', code: 'ECONNRESET' }));
    const client = new HttpClient({
      maxRetries: 1,
      maxDelayInMillis: 10000,
    });
    const err = 'Error while making request: connection reset 1';
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should succeed after a retry on a configured I/O error', () => {
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 1', code: 'ETESTCODE' }));
    const respData = { foo: 'bar' };
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient({
      maxRetries: 1,
      maxDelayInMillis: 1000,
      ioErrorCodes: ['ETESTCODE'],
    });
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.data).to.deep.equal(respData);
    });
  });

  it('should succeed after a retry on a configured HTTP error', () => {
    const scope1 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(503, {}, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope1);
    const respData = { foo: 'bar' };
    const scope2 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope2);
    const client = new HttpClient(testRetryConfig());
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.data).to.deep.equal(respData);
    });
  });

  it('should not retry more than maxRetries', () => {
    // simulate 2 low-level errors
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 1', code: 'ECONNRESET' }));
    mockedRequests.push(mockRequestWithError({ message: 'connection reset 2', code: 'ECONNRESET' }));

    // followed by 3 HTTP errors
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(3)
      .reply(503, {}, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);

    const client = new HttpClient(testRetryConfig());

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 503.');
      const resp = err.response;
      expect(resp.status).to.equal(503);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal({});
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should not retry when retry-after exceeds maxDelayInMillis', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .reply(503, {}, {
        'content-type': 'application/json',
        'retry-after': '61',
      });
    mockedRequests.push(scope);
    const client = new HttpClient({
      maxRetries: 1,
      maxDelayInMillis: 60 * 1000,
      statusCodes: [503],
    });
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 503.');
      const resp = err.response;
      expect(resp.status).to.equal(503);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal({});
      expect(resp.isJson()).to.be.true;
    });
  });

  it('should retry with exponential back off', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(5)
      .reply(503, {}, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient(defaultRetryConfig());
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 503.');
      const resp = err.response;
      expect(resp.status).to.equal(503);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal({});
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(4);
      const delays = delayStub!.args.map((args) => args[0]);
      expect(delays).to.deep.equal([0, 1000, 2000, 4000]);
    });
  });

  it('delay should not exceed maxDelayInMillis', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(5)
      .reply(503, {}, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient({
      maxRetries: 4,
      backOffFactor: 1,
      maxDelayInMillis: 4 * 1000,
      statusCodes: [503],
    });
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 503.');
      const resp = err.response;
      expect(resp.status).to.equal(503);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal({});
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(4);
      const delays = delayStub!.args.map((args) => args[0]);
      expect(delays).to.deep.equal([0, 2000, 4000, 4000]);
    });
  });

  it('should retry without delays when backOffFactor is not set', () => {
    const scope = nock('https://' + mockHost)
      .get(mockPath)
      .times(5)
      .reply(503, {}, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient({
      maxRetries: 4,
      maxDelayInMillis: 60 * 1000,
      statusCodes: [503],
    });
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();
    return client.send({
      method: 'GET',
      url: mockUrl,
    }).catch((err: HttpError) => {
      expect(err.message).to.equal('Server responded with status 503.');
      const resp = err.response;
      expect(resp.status).to.equal(503);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal({});
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(4);
      const delays = delayStub!.args.map((args) => args[0]);
      expect(delays).to.deep.equal([0, 0, 0, 0]);
    });
  });

  it('should wait when retry-after expressed as seconds', () => {
    const scope1 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(503, {}, {
        'content-type': 'application/json',
        'retry-after': '30',
      });
    mockedRequests.push(scope1);
    const respData = { foo: 'bar' };
    const scope2 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope2);

    const client = new HttpClient(defaultRetryConfig());
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp: HttpResponse) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(1);
      expect(delayStub!.args[0][0]).to.equal(30 * 1000);
    });
  });

  it('should wait when retry-after expressed as a timestamp', () => {
    clock = sinon.useFakeTimers();
    clock.setSystemTime(1000);
    const timestamp = new Date(clock.now + 30 * 1000);

    const scope1 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(503, {}, {
        'content-type': 'application/json',
        'retry-after': timestamp.toUTCString(),
      });
    mockedRequests.push(scope1);
    const respData = { foo: 'bar' };
    const scope2 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope2);

    const client = new HttpClient(defaultRetryConfig());
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp: HttpResponse) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(1);
      expect(delayStub!.args[0][0]).to.equal(30 * 1000);
    });
  });

  it('should not wait when retry-after timestamp is expired', () => {
    const timestamp = new Date(Date.now() - 30 * 1000);

    const scope1 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(503, {}, {
        'content-type': 'application/json',
        'retry-after': timestamp.toUTCString(),
      });
    mockedRequests.push(scope1);
    const respData = { foo: 'bar' };
    const scope2 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope2);

    const client = new HttpClient(defaultRetryConfig());
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp: HttpResponse) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(1);
      expect(delayStub!.args[0][0]).to.equal(0);
    });
  });

  it('should not wait when retry-after is malformed', () => {
    const scope1 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(503, {}, {
        'content-type': 'application/json',
        'retry-after': 'invalid',
      });
    mockedRequests.push(scope1);
    const respData = { foo: 'bar' };
    const scope2 = nock('https://' + mockHost)
      .get(mockPath)
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope2);

    const client = new HttpClient(defaultRetryConfig());
    delayStub = sinon.stub(client as any, 'waitForRetry').resolves();

    return client.send({
      method: 'GET',
      url: mockUrl,
    }).then((resp: HttpResponse) => {
      expect(resp.status).to.equal(200);
      expect(resp.headers['content-type']).to.equal('application/json');
      expect(resp.data).to.deep.equal(respData);
      expect(resp.isJson()).to.be.true;
      expect(delayStub!.callCount).to.equal(1);
      expect(delayStub!.args[0][0]).to.equal(0);
    });
  });

  it('should reject if the request payload is invalid', () => {
    const client = new HttpClient(defaultRetryConfig());
    const err = 'Error while making request: Request data must be a string, a Buffer '
      + 'or a json serializable object';
    return client.send({
      method: 'POST',
      url: mockUrl,
      data: 1 as any,
    }).should.eventually.be.rejectedWith(err).and.have.property('code', 'app/network-error');
  });

  it('should use the port 80 for http URLs', () => {
    const respData = { foo: 'bar' };
    const scope = nock('http://' + mockHost + ':80')
      .get('/')
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient(defaultRetryConfig());
    return client.send({
      method: 'GET',
      url: 'http://' + mockHost,
    }).then((resp) => {
      expect(resp.status).to.equal(200);
    });
  });

  it('should use the port specified in the URL', () => {
    const respData = { foo: 'bar' };
    const scope = nock('https://' + mockHost + ':8080')
      .get('/')
      .reply(200, respData, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new HttpClient(defaultRetryConfig());
    return client.send({
      method: 'GET',
      url: 'https://' + mockHost + ':8080',
    }).then((resp) => {
      expect(resp.status).to.equal(200);
    });
  });
});

describe('AuthorizedHttpClient', () => {
  let mockApp: FirebaseApp;
  let mockedRequests: nock.Scope[] = [];
  let getTokenStub: sinon.SinonStub;

  const mockAccessToken: string = utils.generateRandomAccessToken();
  const requestHeaders = {
    reqheaders: {
      Authorization: `Bearer ${mockAccessToken}`,
    },
  };

  before(() => {
    getTokenStub = utils.stubGetAccessToken(mockAccessToken);
  });

  after(() => {
    getTokenStub.restore();
  });

  beforeEach(() => {
    mockApp = mocks.app();
  });

  afterEach(() => {
    mockedRequests.forEach((mockedRequest) => mockedRequest.done());
    mockedRequests = [];
    return mockApp.delete();
  });

  it('should be fulfilled for a 2xx response with a json payload', () => {
    const respData = { foo: 'bar' };
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
    let transportSpy: sinon.SinonSpy | null = null;
    let mockAppWithAgent: FirebaseApp;
    let agentForApp: Agent;

    beforeEach(() => {
      const options = mockApp.options;
      options.httpAgent = new Agent();

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const https = require('https');
      transportSpy = sinon.spy(https, 'request');
      mockAppWithAgent = mocks.appWithOptions(options);
      agentForApp = options.httpAgent;
    });

    afterEach(() => {
      transportSpy!.restore();
      transportSpy = null;
      return mockAppWithAgent.delete();
    });

    it('should use the HTTP agent set in request', () => {
      const respData = { success: true };
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
        expect(transportSpy!.callCount).to.equal(1);
        const options = transportSpy!.args[0][0];
        expect(options.agent).to.equal(httpAgent);
      });
    });

    it('should use the HTTP agent set in AppOptions', () => {
      const respData = { success: true };
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
        expect(transportSpy!.callCount).to.equal(1);
        const options = transportSpy!.args[0][0];
        expect(options.agent).to.equal(agentForApp);
      });
    });
  });

  it('should make a POST request with the provided headers and data', () => {
    const reqData = { request: 'data' };
    const respData = { success: true };
    const options = {
      reqheaders: {
        'Content-Type': (header: string) => {
          return header.startsWith('application/json'); // auto-inserted
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

  it('should not mutate the arguments', () => {
    const reqData = { request: 'data' };
    const options = {
      reqheaders: {
        'Content-Type': (header: string) => {
          return header.startsWith('application/json'); // auto-inserted
        },
        'My-Custom-Header': 'CustomValue',
      },
    };
    Object.assign(options.reqheaders, requestHeaders.reqheaders);
    const scope = nock('https://' + mockHost, options)
      .post(mockPath, reqData)
      .reply(200, { success: true }, {
        'content-type': 'application/json',
      });
    mockedRequests.push(scope);
    const client = new AuthorizedHttpClient(mockApp);
    const request: HttpRequestConfig = {
      method: 'POST',
      url: mockUrl,
      headers: {
        'My-Custom-Header': 'CustomValue',
      },
      data: reqData,
    };
    const requestCopy = deepCopy(request);
    return client.send(request).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(request).to.deep.equal(requestCopy);
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
      const requestValidator: ApiCallbackFunction = () => undefined;
      const responseValidator: ApiCallbackFunction = () => undefined;
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

describe('parseHttpResponse()', () => {
  const config: HttpRequestConfig = {
    method: 'GET',
    url: 'https://example.com',
  };

  it('should parse a successful response with json content', () => {
    const text = 'HTTP/1.1 200 OK\r\n'
      + 'Content-type: application/json\r\n'
      + 'Date: Thu, 07 Feb 2019 19:20:34 GMT\r\n'
      + '\r\n'
      + '{"foo": 1}';

    const response = parseHttpResponse(text, config);

    expect(response.status).to.equal(200);
    expect(Object.keys(response.headers).length).to.equal(2);
    expect(response.headers).to.have.property('content-type', 'application/json');
    expect(response.headers).to.have.property('date', 'Thu, 07 Feb 2019 19:20:34 GMT');
    expect(response.isJson()).to.be.true;
    expect(response.data).to.deep.equal({ foo: 1 });
    expect(response.text).to.equal('{"foo": 1}');
  });

  it('should parse an error response with json content', () => {
    const text = 'HTTP/1.1 400 Bad Request\r\n'
      + 'Content-type: application/json\r\n'
      + 'Date: Thu, 07 Feb 2019 19:20:34 GMT\r\n'
      + '\r\n'
      + '{"foo": 1}';

    const response = parseHttpResponse(text, config);

    expect(response.status).to.equal(400);
    expect(Object.keys(response.headers).length).to.equal(2);
    expect(response.headers).to.have.property('content-type', 'application/json');
    expect(response.headers).to.have.property('date', 'Thu, 07 Feb 2019 19:20:34 GMT');
    expect(response.isJson()).to.be.true;
    expect(response.data).to.deep.equal({ foo: 1 });
    expect(response.text).to.equal('{"foo": 1}');
  });

  it('should parse a response with text content', () => {
    const text = 'HTTP/1.1 200 OK\r\n'
      + 'Content-type: text/plain\r\n'
      + 'Date: Thu, 07 Feb 2019 19:20:34 GMT\r\n'
      + '\r\n'
      + 'foo bar';

    const response = parseHttpResponse(text, config);

    expect(response.status).to.equal(200);
    expect(Object.keys(response.headers).length).to.equal(2);
    expect(response.headers).to.have.property('content-type', 'text/plain');
    expect(response.headers).to.have.property('date', 'Thu, 07 Feb 2019 19:20:34 GMT');
    expect(response.isJson()).to.be.false;
    expect(response.text).to.equal('foo bar');
  });

  it('should parse given a buffer', () => {
    const text = 'HTTP/1.1 200 OK\r\n'
      + 'Content-type: text/plain\r\n'
      + 'Date: Thu, 07 Feb 2019 19:20:34 GMT\r\n'
      + '\r\n'
      + 'foo bar';

    const response = parseHttpResponse(Buffer.from(text), config);

    expect(response.status).to.equal(200);
    expect(Object.keys(response.headers).length).to.equal(2);
    expect(response.headers).to.have.property('content-type', 'text/plain');
    expect(response.headers).to.have.property('date', 'Thu, 07 Feb 2019 19:20:34 GMT');
    expect(response.isJson()).to.be.false;
    expect(response.text).to.equal('foo bar');
  });

  it('should remove any trailing white space in the payload', () => {
    const text = 'HTTP/1.1 200 OK\r\n'
      + 'Content-type: text/plain\r\n'
      + 'Date: Thu, 07 Feb 2019 19:20:34 GMT\r\n'
      + '\r\n'
      + 'foo bar\r\n';

    const response = parseHttpResponse(text, config);

    expect(response.isJson()).to.be.false;
    expect(response.text).to.equal('foo bar');
  });

  it('should throw when the header is malformed', () => {
    const text = 'malformed http header\r\n'
      + 'Content-type: application/json\r\n'
      + 'Date: Thu, 07 Feb 2019 19:20:34 GMT\r\n'
      + '\r\n'
      + '{"foo": 1}';

    expect(() => parseHttpResponse(text, config)).to.throw('Malformed HTTP status line.');
  });
});

describe('defaultRetryConfig()', () => {
  it('should return a RetryConfig with default settings', () => {
    const config = defaultRetryConfig();
    expect(config.maxRetries).to.equal(4);
    expect(config.ioErrorCodes).to.deep.equal(['ECONNRESET', 'ETIMEDOUT']);
    expect(config.statusCodes).to.deep.equal([503]);
    expect(config.maxDelayInMillis).to.equal(60000);
    expect(config.backOffFactor).to.equal(0.5);
  });

  it('should return a new instance on each invocation', () => {
    const config1 = defaultRetryConfig();
    const config2 = defaultRetryConfig();
    expect(config1).to.not.equal(config2);
  });
});

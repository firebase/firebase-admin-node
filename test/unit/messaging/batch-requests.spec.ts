/*!
 * Copyright 2019 Google Inc.
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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';

import { HttpClient, HttpResponse, HttpRequestConfig, HttpError } from '../../../src/utils/api-request';
import { SubRequest, BatchRequestClient } from '../../../src/messaging/batch-request-internal';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

function parseHttpRequest(text: string | Buffer): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const httpMessageParser = require('http-message-parser');
  return httpMessageParser(text);
}

function getParsedPartData(obj: object): string {
  const json = JSON.stringify(obj);
  return 'POST https://example.com HTTP/1.1\r\n'
    + `Content-Length: ${json.length}\r\n`
    + 'Content-Type: application/json; charset=UTF-8\r\n'
    + '\r\n'
    + `${json}`;
}

function createMultipartResponse(success: object[], failures: object[] = []): HttpResponse {
  const multipart: Buffer[] = [];
  success.forEach((part) => {
    let payload = '';
    payload += 'HTTP/1.1 200 OK\r\n';
    payload += 'Content-type: application/json\r\n\r\n';
    payload += `${JSON.stringify(part)}\r\n`;
    multipart.push(Buffer.from(payload, 'utf-8'));
  });
  failures.forEach((part) => {
    let payload = '';
    payload += 'HTTP/1.1 500 Internal Server Error\r\n';
    payload += 'Content-type: application/json\r\n\r\n';
    payload += `${JSON.stringify(part)}\r\n`;
    multipart.push(Buffer.from(payload, 'utf-8'));
  });
  return {
    status: 200,
    headers: { 'Content-Type': 'multipart/mixed; boundary=boundary' },
    multipart,
    text: '',
    data: null,
    isJson: () => false,
  };
}

describe('BatchRequestClient', () => {

  const batchUrl = 'https://batch.url';
  const responseObject = { success: true };
  const httpClient = new HttpClient();

  let stubs: sinon.SinonStub[] = [];

  afterEach(() => {
    stubs.forEach((mock) => {
      mock.restore();
    });
    stubs = [];
  });

  it('should serialize a batch with a single request', async () => {
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject]));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 } },
    ];
    const batch = new BatchRequestClient(httpClient, batchUrl);

    const responses: HttpResponse[] = await batch.send(requests);

    expect(responses.length).to.equal(1);
    expect(responses[0].status).to.equal(200);
    expect(responses[0].data).to.deep.equal(responseObject);
    checkOutgoingRequest(stub, requests);
  });

  it('should serialize a batch with multiple requests', async () => {
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject, responseObject, responseObject]));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 } },
      { url: 'https://example.com', body: { foo: 2 } },
      { url: 'https://example.com', body: { foo: 3 } },
    ];
    const batch = new BatchRequestClient(httpClient, batchUrl);

    const responses: HttpResponse[] = await batch.send(requests);

    expect(responses.length).to.equal(3);
    responses.forEach((response) => {
      expect(response.status).to.equal(200);
      expect(response.data).to.deep.equal(responseObject);
    });
    checkOutgoingRequest(stub, requests);
  });

  it('should handle both success and failure HTTP responses in a batch', async () => {
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject, responseObject], [responseObject]));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 } },
      { url: 'https://example.com', body: { foo: 2 } },
      { url: 'https://example.com', body: { foo: 3 } },
    ];
    const batch = new BatchRequestClient(httpClient, batchUrl);

    const responses: HttpResponse[] = await batch.send(requests);

    expect(responses.length).to.equal(3);
    responses.forEach((response, idx) => {
      const expectedStatus = idx < 2 ? 200 : 500;
      expect(response.status).to.equal(expectedStatus);
      expect(response.data).to.deep.equal(responseObject);
    });
    checkOutgoingRequest(stub, requests);
  });

  it('should reject on top-level HTTP error responses', async () => {
    const stub = sinon.stub(httpClient, 'send').rejects(
      utils.errorFrom({ error: 'test' }));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 } },
      { url: 'https://example.com', body: { foo: 2 } },
      { url: 'https://example.com', body: { foo: 3 } },
    ];
    const batch = new BatchRequestClient(httpClient, batchUrl);

    try {
      await batch.send(requests);
      sinon.assert.fail('No error thrown for HTTP error');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpError);
      expect((err as HttpError).response.status).to.equal(500);
      checkOutgoingRequest(stub, requests);
    }
  });

  it('should add common headers to the parent and sub requests in a batch', async () => {
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject]));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 } },
      { url: 'https://example.com', body: { foo: 2 } },
    ];
    const commonHeaders = { 'X-Custom-Header': 'value' };
    const batch = new BatchRequestClient(httpClient, batchUrl, commonHeaders);

    const responses: HttpResponse[] = await batch.send(requests);

    expect(responses.length).to.equal(1);
    expect(stub).to.have.been.calledOnce;
    const args: HttpRequestConfig = stub.getCall(0).args[0];
    expect(args.headers).to.have.property('X-Custom-Header', 'value');

    const parsedRequest = parseHttpRequest(args.data as Buffer);
    expect(parsedRequest.multipart.length).to.equal(requests.length);
    parsedRequest.multipart.forEach((sub: {body: Buffer}) => {
      const parsedSubRequest: {headers: object} = parseHttpRequest(sub.body.toString().trim());
      expect(parsedSubRequest.headers).to.have.property('X-Custom-Header', 'value');
    });
  });

  it('should add sub request headers to the payload', async () => {
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject]));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 }, headers: { 'X-Custom-Header': 'value' } },
      { url: 'https://example.com', body: { foo: 1 }, headers: { 'X-Custom-Header': 'value' } },
    ];
    const batch = new BatchRequestClient(httpClient, batchUrl);

    const responses: HttpResponse[] = await batch.send(requests);

    expect(responses.length).to.equal(1);
    expect(stub).to.have.been.calledOnce;
    const args: HttpRequestConfig = stub.getCall(0).args[0];
    const parsedRequest = parseHttpRequest(args.data as Buffer);
    expect(parsedRequest.multipart.length).to.equal(requests.length);
    parsedRequest.multipart.forEach((sub: {body: Buffer}) => {
      const parsedSubRequest: {headers: object} = parseHttpRequest(sub.body.toString().trim());
      expect(parsedSubRequest.headers).to.have.property('X-Custom-Header', 'value');
    });
  });

  it('sub request headers should get precedence', async () => {
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject]));
    stubs.push(stub);
    const requests: SubRequest[] = [
      { url: 'https://example.com', body: { foo: 1 }, headers: { 'X-Custom-Header': 'overwrite' } },
      { url: 'https://example.com', body: { foo: 1 }, headers: { 'X-Custom-Header': 'overwrite' } },
    ];
    const commonHeaders = { 'X-Custom-Header': 'value' };
    const batch = new BatchRequestClient(httpClient, batchUrl, commonHeaders);

    const responses: HttpResponse[] = await batch.send(requests);

    expect(responses.length).to.equal(1);
    expect(stub).to.have.been.calledOnce;
    const args: HttpRequestConfig = stub.getCall(0).args[0];
    const parsedRequest = parseHttpRequest(args.data as Buffer);
    expect(parsedRequest.multipart.length).to.equal(requests.length);
    parsedRequest.multipart.forEach((part: {body: Buffer}) => {
      const parsedPart: {headers: object} = parseHttpRequest(part.body.toString().trim());
      expect(parsedPart.headers).to.have.property('X-Custom-Header', 'overwrite');
    });
  });

  function checkOutgoingRequest(stub: sinon.SinonStub, requests: SubRequest[]): void {
    expect(stub).to.have.been.calledOnce;
    const args: HttpRequestConfig = stub.getCall(0).args[0];
    expect(args.method).to.equal('POST');
    expect(args.url).to.equal(batchUrl);
    expect(args.headers).to.have.property(
      'Content-Type', 'multipart/mixed; boundary=__END_OF_PART__');
    expect(args.timeout).to.equal(10000);
    const parsedRequest = parseHttpRequest(args.data as Buffer);
    expect(parsedRequest.multipart.length).to.equal(requests.length);

    if (requests.length === 1) {
      // http-message-parser handles single-element batches slightly differently. Specifically, the
      // payload contents are exposed through body instead of multipart, and the body string uses
      // \n instead of \r\n for line breaks.
      let expectedPartData = getParsedPartData(requests[0].body);
      expectedPartData = expectedPartData.replace(/\r\n/g, '\n');
      expect(parsedRequest.body.trim()).to.equal(expectedPartData);
    } else {
      requests.forEach((req, idx) => {
        const part = parsedRequest.multipart[idx].body.toString().trim();
        expect(part).to.equal(getParsedPartData(req.body));
      });
    }
  }
});

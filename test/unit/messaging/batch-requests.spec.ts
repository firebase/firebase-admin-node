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

import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';

import { HttpClient, HttpResponse, HttpRequestConfig } from '../../../src/utils/api-request';
import { BatchRequestElement, BatchRequestClient } from '../../../src/messaging/batch-request';

const httpMessageParser = require('http-message-parser');

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe.only('BatchRequestClient', () => {

  const httpClient = new HttpClient();

  let stubs: sinon.SinonStub[] = [];

  afterEach(() => {
    stubs.forEach((mock) => {
      mock.restore();
    });
    stubs = [];
  });

  it('should serialize a single-element batch correcly', async () => {
    const responseObject = { success: true };
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject]));
    stubs.push(stub);
    const elements: BatchRequestElement[] = [
      {url: 'https://example.com', body: {foo: 1}},
    ];
    const batch = new BatchRequestClient(httpClient, 'https://batch.url');

    const responses = await batch.send(elements);

    expect(responses.length).to.equal(1);
    expect(stub).calledOnce;
    expect(responses[0]).to.equal(JSON.stringify(responseObject));

    const args: HttpRequestConfig = stub.getCall(0).args[0];
    expect(args.url).to.equal('https://batch.url');
    const parsedRequest = httpMessageParser(args.data);
    expect(parsedRequest.multipart.length).to.equal(1);

    // http-message-parser handles single-element batches slightly differently. Specifically, the
    // payload contents are exposed through body instead of multipart, and the body string uses
    // \n instead of \r\n for line breaks.
    let expectedPartData = getParsedPartData(elements[0].body);
    expectedPartData = expectedPartData.replace(/\r\n/g, '\n');
    expect(parsedRequest.body.trim()).to.equal(expectedPartData);
  });

  it('should serialize a multi-element batch correcly', async () => {
    const responseObject = { success: true };
    const stub = sinon.stub(httpClient, 'send').resolves(
      createMultipartResponse([responseObject, responseObject, responseObject]));
    stubs.push(stub);
    const elements: BatchRequestElement[] = [
      {url: 'https://example.com', body: {foo: 1}},
      {url: 'https://example.com', body: {foo: 2}},
      {url: 'https://example.com', body: {foo: 3}},
    ];
    const batch = new BatchRequestClient(httpClient, 'https://batch.url');

    const responses = await batch.send(elements);

    expect(responses.length).to.equal(3);
    expect(stub).calledOnce;

    const args: HttpRequestConfig = stub.getCall(0).args[0];
    const parsedRequest = httpMessageParser(args.data);
    expect(parsedRequest.multipart.length).to.equal(3);

    responses.forEach((response, idx) => {
      expect(response).to.equal(JSON.stringify(responseObject));
      const part = parsedRequest.multipart[idx].body.toString().trim();
      expect(part).to.equal(getParsedPartData(elements[idx].body));
    });
  });

  it('should reject on HTTP error responses', () => {
    const stub = sinon.stub(httpClient, 'send').rejects(utils.errorFrom({error: 'test'}));
    stubs.push(stub);
    const elements: BatchRequestElement[] = [
      {url: 'https://example.com', body: {foo: 1}},
      {url: 'https://example.com', body: {foo: 2}},
      {url: 'https://example.com', body: {foo: 3}},
    ];
    const batch = new BatchRequestClient(httpClient, 'https://batch.url');

    expect(batch.send(elements)).to.be.rejectedWith(
      'An unknown server error was returned. Raw server response: "{"error":"test"}"');
    expect(stub).calledOnce;

    const args: HttpRequestConfig = stub.getCall(0).args[0];
    const parsedRequest = httpMessageParser(args.data);
    expect(parsedRequest.multipart.length).to.equal(3);

    elements.forEach((elem, idx) => {
      const part = parsedRequest.multipart[idx].body.toString().trim();
      expect(part).to.equal(getParsedPartData(elem.body));
    });
  });
});

function getParsedPartData(obj: object): string {
  const json = JSON.stringify(obj);
  return 'POST https://example.com HTTP/1.1\r\n'
    + `Content-Length: ${json.length}\r\n`
    + 'Content-Type: application/json; charset=UTF-8\r\n'
    + '\r\n'
    + `${json}`;
}

function createMultipartResponse(parts: object[]): HttpResponse {
  return utils.responseFrom(createMultipartPayload(parts), 200, {
    'Content-Type': 'multipart/mixed; boundary=boundary',
  })
}

function createMultipartPayload(parts: object[]): string {
  const boundary = 'boundary';
  let payload = '';
  parts.forEach((part) => {
    payload += `--${boundary}\r\n`
    payload += 'Content-type: application/http\r\n\r\n'
    payload += `${JSON.stringify(part)}\r\n`;
  });
  payload += `--${boundary}\r\n--`
  return payload;
}

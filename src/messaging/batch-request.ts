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

import {
  HttpClient, HttpRequestConfig, parseMultipartResponse, HttpResponse, parseHttpResponse,
} from '../utils/api-request';

const PART_DELIMITER: string = '__END_OF_PART__';
const TEN_SECONDS_IN_MILLIS = 10000;

/**
 * An HTTP client that can be used to make batch requests. This client is not tied to any service
 * (FCM or otherwise). Therefore it can be used to make batch requests to any service that allows
 * it. If this requirement ever arises we can move this implementation to the utils module
 * where it can be easily shared among other modules.
 */
export class BatchRequestClient {

  constructor(
    private readonly httpClient: HttpClient,
    private readonly batchUrl: string,
    private readonly commonHeaders?: object) {
  }

  public send(requests: SubRequest[]): Promise<HttpResponse[]> {
    const requestHeaders = {
      'Content-Type': `multipart/mixed; boundary=${PART_DELIMITER}`,
    };
    const request: HttpRequestConfig = {
      method: 'POST',
      url: this.batchUrl,
      data: this.getMultipartPayload(requests),
      headers: Object.assign({}, this.commonHeaders, requestHeaders),
      timeout: TEN_SECONDS_IN_MILLIS,
    };
    return this.httpClient.send(request).then((response) => {
      return parseMultipartResponse(response.text);
    }).then((responses: string[]) => {
      return responses.map((resp) => {
        return parseHttpResponse(resp, request);
      });
    });
  }

  private getMultipartPayload(requests: SubRequest[]): Buffer {
    let buffer: string = '';
    requests.forEach((request: SubRequest, idx: number) => {
      buffer += createPart(request, PART_DELIMITER, idx);
    });
    buffer += `--${PART_DELIMITER}--\r\n`;
    return Buffer.from(buffer, 'utf-8');
  }
}

/**
 * Represents a request that can be sent as part of an HTTP batch request.
 */
export interface SubRequest {
  url: string;
  body: object;
  headers?: {[key: string]: any};
}

function createPart(request: SubRequest, delim: string, idx: number): string {
  const serializedRequest: string = serializeSubRequest(request);
  let part: string = `--${delim}\r\n`;
  part += `Content-Length: ${serializedRequest.length}\r\n`;
  part += 'Content-Type: application/http\r\n';
  part += `content-id: ${idx + 1}\r\n`;
  part += 'content-transfer-encoding: binary\r\n';
  part += '\r\n';
  part += `${serializedRequest}\r\n`;
  return part;
}

function serializeSubRequest(request: SubRequest): string {
  const requestBody: string = JSON.stringify(request.body);
  let messagePayload: string = `POST ${request.url} HTTP/1.1\r\n`;
  messagePayload += `Content-Length: ${requestBody.length}\r\n`;
  messagePayload += 'Content-Type: application/json; charset=UTF-8\r\n';
  if (request.headers) {
    Object.keys(request.headers).forEach((key) => {
      messagePayload += `${key}: ${request.headers[key]}\r\n`;
    });
  }
  messagePayload += '\r\n';
  messagePayload += requestBody;
  return messagePayload;
}

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

import { FirebaseError } from '../utils/error';
import {
  HttpClient, HttpRequestConfig, parseMultipartResponse,
  HttpError, parseHttpResponse,
} from '../utils/api-request';
import { createFirebaseError } from './messaging-errors';

const PART_DELIMITER: string = '__END_OF_PART__';
const FIREBASE_MESSAGING_BATCH_URL = 'https://fcm.googleapis.com/batch';
const POST_METHOD = 'POST';
const TEN_SECONDS_IN_MILLIS = 10000;

export interface BatchRequestElement {
  url: string;
  body: object;
  headers?: {[key: string]: any};
}

export class BatchRequestClient {

  constructor(
    private readonly httpClient: HttpClient,
    private readonly batchUrl: string,
    private readonly commonHeaders?: object) {
  }

  public send(messages: BatchRequestElement[]): Promise<string[]> {
    const requestHeaders = {
      'Content-Type': `multipart/mixed; boundary=${PART_DELIMITER}`,
    };
    const request: HttpRequestConfig = {
      method: POST_METHOD,
      url: this.batchUrl,
      data: this.getMultipartPayload(messages),
      headers: Object.assign({}, this.commonHeaders, requestHeaders),
      timeout: TEN_SECONDS_IN_MILLIS,
    };
    return this.httpClient.send(request).then((response) => {
      return parseMultipartResponse(response.text);
    })
    .catch((err) => {
      if (err instanceof HttpError) {
        throw createFirebaseError(err);
      }
      // Re-throw the error if it already has the proper format.
      throw err;
    });
  }

  private getMultipartPayload(messages: BatchRequestElement[]): Buffer {
    let buffer: string = '';
    messages.forEach((message: BatchRequestElement, idx: number) => {
      buffer += this.serializePart(message, idx);
    });
    buffer += `--${PART_DELIMITER}--\r\n`;
    const result = Buffer.from(buffer, 'utf-8');
    return result;
  }

  private serializePart(message: BatchRequestElement, idx: number): string {
    const serializedMessage: string = this.serializeMessage(message);
    let part: string = `--${PART_DELIMITER}\r\n`;
    part += `Content-Length: ${serializedMessage.length}\r\n`;
    part += 'Content-Type: application/http\r\n';
    part += `content-id: ${idx + 1}\r\n`;
    part += 'content-transfer-encoding: binary\r\n';
    part += '\r\n';
    part += serializedMessage;
    part += '\r\n';
    return part;
  }

  private serializeMessage(message: BatchRequestElement): string {
    const messageBody: string = JSON.stringify(message.body);
    let messagePayload: string = `POST ${message.url} HTTP/1.1\r\n`;
    messagePayload += `Content-Length: ${messageBody.length}\r\n`;
    messagePayload += 'Content-Type: application/json; charset=UTF-8\r\n';
    if (message.headers) {
      Object.keys(message.headers).forEach((key) => {
        messagePayload += `${key}: ${message.headers[key]}\r\n`;
      });
    }
    messagePayload += '\r\n';
    messagePayload += messageBody;
    return messagePayload;
  }
}

export class MessagingBatchRequestClient extends BatchRequestClient {

  constructor(httpClient: HttpClient, commonHeaders?: object) {
      super(httpClient, FIREBASE_MESSAGING_BATCH_URL, commonHeaders);
  }

  public sendFcmBatchRequest(messages: BatchRequestElement[]): Promise<SendResponse[]> {
    return super.send(messages).then((parts) => {
      return parts.map((part, idx) => {
        const elem = messages[idx];
        const request: HttpRequestConfig = {
          method: POST_METHOD,
          url: elem.url,
        };
        return this.buildSendResponse(part, request);
      });
    });
  }

  private buildSendResponse(text: string, config: HttpRequestConfig): SendResponse {
    const httpResponse = parseHttpResponse(text, config);
    const result: SendResponse = {
      success: httpResponse.status === 200,
    };
    if (result.success) {
      result.messageId = httpResponse.data.name;
    } else {
      result.error = createFirebaseError(new HttpError(httpResponse));
    }
    return result;
  }
}

export interface SendResponse {
  success: boolean;
  messageId?: string;
  error?: FirebaseError;
}


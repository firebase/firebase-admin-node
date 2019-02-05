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

import * as validator from '../utils/validator';
import { FirebaseMessagingError, MessagingClientErrorCode, FirebaseError } from '../utils/error';

const PART_DELIMITER: string = '__END_OF_PART__';

export interface BatchRequestElement {
  url: string;
  body: object;
  headers?: {[key: string]: any};
}

export class BatchRequest {

  constructor(private readonly messages: BatchRequestElement[]) {
    if (!validator.isNonEmptyArray(messages)) {
      throw new FirebaseMessagingError(
        MessagingClientErrorCode.INVALID_ARGUMENT, 'messages must be a non-empty array');
    }
  }

  public getContentType(): string {
    return `multipart/mixed; boundary=${PART_DELIMITER}`;
  }

  public getMultipartPayload(): Buffer {
    let buffer: string = '';
    this.messages.forEach((message: BatchRequestElement, idx: number) => {
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

export interface SendResponse {
  success: boolean;
  messageId?: string;
  error?: FirebaseError;
}


/*!
 * @license
 * Copyright 2017 Google LLC
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

import { RequestResponse } from './api-request';

/**
 * Represents the raw HTTP response object.
 */
export interface HttpResponse {
  /** The HTTP status code of the response. */
  status: number;
  /** The HTTP headers of the response. */
  headers: { [key: string]: any; };
  /** The response data payload. */
  data?: string | object;
}

/**
 * Maps a RequestResponse to a clean HttpResponse, preserving raw text if not JSON.
 *
 * @param resp - The RequestResponse to map.
 * @returns A clean HttpResponse object.
 * @internal
 */
export function toHttpResponse(resp: RequestResponse): HttpResponse {
  return {
    status: resp.status,
    headers: resp.headers,
    data: resp.isJson() ? resp.data : resp.text,
  };
}

/**
 * Defines error info type. This includes a code and message string.
 */
export interface ErrorInfo {
  /** The string error code. */
  code: string;
  /** The error message. */
  message: string;
  /** The HTTP response associated with this error, if any. */
  httpResponse?: HttpResponse;
  /** The original wrapped error that triggered this error, if any. */
  cause?: Error;
}

/**
 * `FirebaseError` is a subclass of the standard JavaScript `Error` object. In
 * addition to a message string and stack trace, it contains a string code.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface FirebaseError {
  /**
   * Error codes are strings using the following format: `"service/string-code"`.
   * Some examples include `"auth/invalid-uid"` and
   * `"messaging/invalid-recipient"`.
   *
   * While the message for a given error can change, the code will remain the same
   * between backward-compatible versions of the Firebase SDK.
   */
  code: string;

  /**
   * An explanatory message for the error that just occurred.
   *
   * This message is designed to be helpful to you, the developer. Because
   * it generally does not convey meaningful information to end users,
   * this message should not be displayed in your application.
   */
  message: string;

  /**
   * A string value containing the execution backtrace when the error originally
   * occurred.
   *
   * This information can be useful for troubleshooting the cause of the error with
   * {@link https://firebase.google.com/support | Firebase Support}.
   */
  stack?: string;

  /**
   * The HTTP response associated with this error, if any.
   */
  httpResponse?: HttpResponse;

  /**
   * The original wrapped error that triggered this error, if any.
   */
  cause?: Error;

  /**
   * Returns a JSON-serializable object representation of this error.
   *
   * @returns A JSON-serializable representation of this object.
   */
  toJSON(): object;
}

/**
 * Firebase error code structure. This extends Error.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class FirebaseError extends Error implements FirebaseError {
  /**
   * @param errorInfo - The error information (code and message).
   */
  constructor(errorInfo: ErrorInfo) {
    super(errorInfo.message);
    this.code = errorInfo.code;
    if (errorInfo.cause !== undefined) {
      this.cause = errorInfo.cause;
    }
    if (errorInfo.httpResponse !== undefined) {
      this.httpResponse = errorInfo.httpResponse;
    }

  }

  /** @returns The object representation of the error. */
  public toJSON(): object {
    const json: any = {
      code: this.code,
      message: this.message,
    };
    if (this.httpResponse) {
      json.httpResponse = {
        status: this.httpResponse.status,
        headers: this.httpResponse.headers,
        data: this.httpResponse.data,
      };
    }
    if (this.cause) {
      json.cause = {
        name: this.cause.name || 'Error',
        message: this.cause.message || String(this.cause),
        stack: this.cause.stack
      };
    }
    return json;
  }
}

/**
 * A FirebaseError with a prefix in front of the error code.
 */
export class PrefixedFirebaseError extends FirebaseError {
  /**
   * @param codePrefix - The prefix to apply to the error code.
   * @param code - The error code.
   * @param message - The error message.
   * @internal
   */
  constructor(private codePrefix: string, code: string, message: string, httpResponse?: HttpResponse, cause?: Error) {
    const errorInfo: ErrorInfo = {
      code: `${codePrefix}/${code}`,
      message,
    };
    if (httpResponse !== undefined) {
      errorInfo.httpResponse = httpResponse;
    }
    if (cause !== undefined) {
      errorInfo.cause = cause;
    }
    super(errorInfo);

  }

  /**
   * Allows the error type to be checked without needing to know implementation details
   * of the code prefixing.
   *
   * @param code - The non-prefixed error code to test against.
   * @returns True if the code matches, false otherwise.
   */
  public hasCode(code: string): boolean {
    return `${this.codePrefix}/${code}` === this.code;
  }
}

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

import {deepCopy} from './deep-copy';
import {FirebaseApp} from '../firebase-app';
import {AppErrorCodes, FirebaseAppError} from './error';
import * as validator from './validator';

import http = require('http');
import https = require('https');
import url = require('url');
import {EventEmitter} from 'events';
import * as stream from 'stream';
import * as zlibmod from 'zlib';

/** Http method type definition. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
/** API callback function type definition. */
export type ApiCallbackFunction = (data: object) => void;

/**
 * Configuration for constructing a new HTTP request.
 */
export interface HttpRequestConfig {
  method: HttpMethod;
  /** Target URL of the request. Should be a well-formed URL including protocol, hostname, port and path. */
  url: string;
  headers?: {[key: string]: string};
  data?: string | object | Buffer;
  /** Connect and read timeout (in milliseconds) for the outgoing request. */
  timeout?: number;
}

/**
 * Represents an HTTP response received from a remote server.
 */
export interface HttpResponse {
  readonly status: number;
  readonly headers: any;
  /** Response data as a raw string. */
  readonly text: string;
  /** Response data as a parsed JSON object. */
  readonly data: any;
  /**
   * Indicates if the response content is JSON-formatted or not. If true, data field can be used
   * to retrieve the content as a parsed JSON object.
   */
  isJson(): boolean;
}

interface LowLevelResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  request: http.ClientRequest;
  data: string;
  config: HttpRequestConfig;
}

interface LowLevelError extends Error {
  config: HttpRequestConfig;
  code?: string;
  request?: http.ClientRequest;
  response?: LowLevelResponse;
}

class DefaultHttpResponse implements HttpResponse {

  public readonly status: number;
  public readonly headers: any;
  public readonly text: string;

  private readonly parsedData: any;
  private readonly parseError: Error;
  private readonly request: string;

  /**
   * Constructs a new HttpResponse from the given LowLevelResponse.
   */
  constructor(resp: LowLevelResponse) {
    this.status = resp.status;
    this.headers = resp.headers;
    this.text = resp.data;
    try {
      this.parsedData = JSON.parse(resp.data);
    } catch (err) {
      this.parsedData = undefined;
      this.parseError = err;
    }
    this.request = `${resp.config.method} ${resp.config.url}`;
  }

  get data(): any {
    if (this.isJson()) {
      return this.parsedData;
    }
    throw new FirebaseAppError(
      AppErrorCodes.UNABLE_TO_PARSE_RESPONSE,
      `Error while parsing response data: "${ this.parseError.toString() }". Raw server ` +
      `response: "${ this.text }". Status code: "${ this.status }". Outgoing ` +
      `request: "${ this.request }."`,
    );
  }

  public isJson(): boolean {
    return typeof this.parsedData !== 'undefined';
  }
}

export class HttpError extends Error {
  constructor(public readonly response: HttpResponse) {
    super(`Server responded with status ${response.status}.`);
    // Set the prototype so that instanceof checks will work correctly.
    // See: https://github.com/Microsoft/TypeScript/issues/13965
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export class HttpClient {

  /**
   * Sends an HTTP request to a remote server. If the server responds with a successful response (2xx), the returned
   * promise resolves with an HttpResponse. If the server responds with an error (3xx, 4xx, 5xx), the promise rejects
   * with an HttpError. In case of all other errors, the promise rejects with a FirebaseAppError. If a request fails
   * due to a low-level network error, transparently retries the request once before rejecting the promise.
   *
   * If the request data is specified as an object, it will be serialized into a JSON string. The application/json
   * content-type header will also be automatically set in this case. For all other payload types, the content-type
   * header should be explicitly set by the caller. To send a JSON leaf value (e.g. "foo", 5), parse it into JSON,
   * and pass as a string or a Buffer along with the appropriate content-type header.
   *
   * @param {HttpRequest} request HTTP request to be sent.
   * @return {Promise<HttpResponse>} A promise that resolves with the response details.
   */
  public send(config: HttpRequestConfig): Promise<HttpResponse> {
    return this.sendWithRetry(config);
  }

  /**
   * Sends an HTTP request, and retries it once in case of low-level network errors.
   */
  private sendWithRetry(config: HttpRequestConfig, attempts: number = 0): Promise<HttpResponse> {
    return sendRequest(config)
      .then((resp) => {
        return new DefaultHttpResponse(resp);
      }).catch((err: LowLevelError) => {
        const retryCodes = ['ECONNRESET', 'ETIMEDOUT'];
        if (retryCodes.indexOf(err.code) !== -1 && attempts === 0) {
          return this.sendWithRetry(config, attempts + 1);
        }
        if (err.response) {
          throw new HttpError(new DefaultHttpResponse(err.response));
        }
        if (err.code === 'ETIMEDOUT') {
          throw new FirebaseAppError(
            AppErrorCodes.NETWORK_TIMEOUT,
            `Error while making request: ${err.message}.`);
        }
        throw new FirebaseAppError(
          AppErrorCodes.NETWORK_ERROR,
          `Error while making request: ${err.message}. Error code: ${err.code}`);
      });
  }
}

/**
 * Sends an HTTP request based on the provided configuration. This is a wrapper around the http and https
 * packages of Node.js, providing content processing, timeouts and error handling.
 */
function sendRequest(httpRequestConfig: HttpRequestConfig): Promise<LowLevelResponse> {
  const config: HttpRequestConfig = deepCopy(httpRequestConfig);
  return new Promise((resolve, reject) => {
    let data: Buffer;
    const headers = config.headers || {};
    let fullUrl: string = config.url;
    if (config.data) {
      // GET and HEAD do not support body in request.
      if (config.method === 'GET' || config.method === 'HEAD') {
        if (!validator.isObject(config.data)) {
          return reject(createError(
            `${config.method} requests cannot have a body`,
            config,
          ));
        }

        // Parse URL and append data to query string.
        const configUrl = new url.URL(fullUrl);
        for (const key in config.data as any) {
          if (config.data.hasOwnProperty(key)) {
            configUrl.searchParams.append(
                key,
                (config.data as {[key: string]: string})[key]);
          }
        }
        fullUrl = configUrl.toString();
      } else if (validator.isObject(config.data)) {
        data = Buffer.from(JSON.stringify(config.data), 'utf-8');
        if (typeof headers['Content-Type'] === 'undefined') {
          headers['Content-Type'] = 'application/json;charset=utf-8';
        }
      } else if (validator.isString(config.data)) {
        data = Buffer.from(config.data as string, 'utf-8');
      } else if (validator.isBuffer(config.data)) {
        data = config.data as Buffer;
      } else {
        return reject(createError(
          'Request data must be a string, a Buffer or a json serializable object',
          config,
        ));
      }
      // Add Content-Length header if data exists
      if (data) {
        headers['Content-Length'] = data.length.toString();
      }
    }
    const parsed = url.parse(fullUrl);
    const protocol = parsed.protocol || 'https:';
    const isHttps = protocol === 'https:';
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.path,
      method: config.method,
      headers,
    };
    const transport: any = isHttps ? https : http;
    const req: http.ClientRequest = transport.request(options, (res: http.IncomingMessage) => {
      if (req.aborted) {
        return;
      }
      // Uncompress the response body transparently if required.
      let respStream: stream.Readable = res;
      const encodings = ['gzip', 'compress', 'deflate'];
      if (encodings.indexOf(res.headers['content-encoding']) !== -1) {
        // Add the unzipper to the body stream processing pipeline.
        const zlib: typeof zlibmod = require('zlib');
        respStream = respStream.pipe(zlib.createUnzip());
        // Remove the content-encoding in order to not confuse downstream operations.
        delete res.headers['content-encoding'];
      }

      const response: LowLevelResponse = {
        status: res.statusCode,
        headers: res.headers,
        request: req,
        data: undefined,
        config,
      };

      const responseBuffer: Buffer[] = [];
      respStream.on('data', (chunk: Buffer) => {
        responseBuffer.push(chunk);
      });

      respStream.on('error', (err) => {
        if (req.aborted) {
          return;
        }
        reject(enhanceError(err, config, null, req));
      });

      respStream.on('end', () => {
        const responseData = Buffer.concat(responseBuffer).toString();
        response.data = responseData;
        finalizeRequest(resolve, reject, response);
      });
    });

    // Handle errors
    req.on('error', (err) => {
      if (req.aborted) {
        return;
      }
      reject(enhanceError(err, config, null, req));
    });
    if (config.timeout) {
      // Listen to timeouts and throw an error.
      req.setTimeout(config.timeout, () => {
        req.abort();
        reject(createError(`timeout of ${config.timeout}ms exceeded`, config, 'ETIMEDOUT', req));
      });
    }
    // Send the request
    req.end(data);
  });
}

/**
 * Creates a new error from the given message, and enhances it with other information available.
 */
function createError(
  message: string,
  config: HttpRequestConfig,
  code?: string,
  request?: http.ClientRequest,
  response?: LowLevelResponse): LowLevelError {

  const error = new Error(message);
  return enhanceError(error, config, code, request, response);
}

/**
 * Enhances the given error by adding more information to it. Specifically, the HttpRequestConfig,
 * the underlying request and response will be attached to the error.
 */
function enhanceError(
  error: any,
  config: HttpRequestConfig,
  code: string,
  request: http.ClientRequest,
  response?: LowLevelResponse): LowLevelError {

  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
}

/**
 * Finalizes the current request in-flight by either resolving or rejecting the associated promise. In the event
 * of an error, adds additional useful information to the returned error.
 */
function finalizeRequest(resolve: (_: any) => void, reject: (_: any) => void, response: LowLevelResponse) {
  if (response.status >= 200 && response.status < 300) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response,
    ));
  }
}

export class AuthorizedHttpClient extends HttpClient {
  constructor(private readonly app: FirebaseApp) {
    super();
  }

  public send(request: HttpRequestConfig): Promise<HttpResponse> {
    return this.app.INTERNAL.getToken().then((accessTokenObj) => {
      const requestCopy = deepCopy(request);
      requestCopy.headers = requestCopy.headers || {};
      const authHeader = 'Authorization';
      requestCopy.headers[authHeader] = `Bearer ${accessTokenObj.accessToken}`;
      return super.send(requestCopy);
    });
  }
}

/**
 * Class that defines all the settings for the backend API endpoint.
 *
 * @param {string} endpoint The Firebase Auth backend endpoint.
 * @param {HttpMethod} httpMethod The http method for that endpoint.
 * @constructor
 */
export class ApiSettings {
  private requestValidator: ApiCallbackFunction;
  private responseValidator: ApiCallbackFunction;

  constructor(private endpoint: string, private httpMethod: HttpMethod = 'POST') {
    this.setRequestValidator(null)
        .setResponseValidator(null);
  }

  /** @return {string} The backend API endpoint. */
  public getEndpoint(): string {
    return this.endpoint;
  }

  /** @return {HttpMethod} The request HTTP method. */
  public getHttpMethod(): HttpMethod {
    return this.httpMethod;
  }

  /**
   * @param {ApiCallbackFunction} requestValidator The request validator.
   * @return {ApiSettings} The current API settings instance.
   */
  public setRequestValidator(requestValidator: ApiCallbackFunction): ApiSettings {
    const nullFunction: (_: object) => void = (_: object) => undefined;
    this.requestValidator = requestValidator || nullFunction;
    return this;
  }

  /** @return {ApiCallbackFunction} The request validator. */
  public getRequestValidator(): ApiCallbackFunction {
    return this.requestValidator;
  }

  /**
   * @param {ApiCallbackFunction} responseValidator The response validator.
   * @return {ApiSettings} The current API settings instance.
   */
  public setResponseValidator(responseValidator: ApiCallbackFunction): ApiSettings {
    const nullFunction: (_: object) => void = (_: object) => undefined;
    this.responseValidator = responseValidator || nullFunction;
    return this;
  }

  /** @return {ApiCallbackFunction} The response validator. */
  public getResponseValidator(): ApiCallbackFunction {
    return this.responseValidator;
  }
}

/**
 * Class used for polling an endpoint with exponential backoff.
 *
 * Example usage:
 * ```
 * const poller = new ExponentialBackoffPoller();
 * poller
 *     .poll(() => {
 *       return myRequestToPoll()
 *           .then((responseData: any) => {
 *             if (!isValid(responseData)) {
 *               // Continue polling.
 *               return null;
 *             }
 *
 *             // Polling complete. Resolve promise with final response data.
 *             return responseData;
 *           });
 *     })
 *     .then((responseData: any) => {
 *       console.log(`Final response: ${responseData}`);
 *     });
 * ```
 */
export class ExponentialBackoffPoller extends EventEmitter {
  private numTries = 0;
  private completed = false;

  private masterTimer: NodeJS.Timer;
  private repollTimer: NodeJS.Timer;

  private pollCallback: () => Promise<object>;
  private resolve: (result: object) => void;
  private reject: (err: object) => void;

  constructor(
      private readonly initialPollingDelayMillis: number = 1000,
      private readonly maxPollingDelayMillis: number = 10000,
      private readonly masterTimeoutMillis: number = 60000) {
    super();
  }

  /**
   * Poll the provided callback with exponential backoff.
   *
   * @param {() => Promise<object>} callback The callback to be called for each poll. If the
   *     callback resolves to a falsey value, polling will continue. Otherwise, the truthy
   *     resolution will be used to resolve the promise returned by this method.
   * @return {Promise<object>} A Promise which resolves to the truthy value returned by the provided
   *     callback when polling is complete.
   */
  public poll(callback: () => Promise<object>): Promise<object> {
    if (this.pollCallback) {
      throw new Error('poll() can only be called once per instance of ExponentialBackoffPoller');
    }

    this.pollCallback = callback;
    this.on('poll', this.repoll);

    this.masterTimer = setTimeout(() => {
      if (this.completed) {
        return;
      }

      this.markCompleted();
      this.reject(new Error('ExponentialBackoffPoller deadline exceeded - Master timeout reached'));
    }, this.masterTimeoutMillis);

    return new Promise<object>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.repoll();
    });
  }

  private repoll(): void {
    this.pollCallback()
        .then((result) => {
          if (this.completed) {
            return;
          }

          if (!result) {
            this.repollTimer =
                setTimeout(() => this.emit('poll'), this.getPollingDelayMillis());
            this.numTries++;
            return;
          }

          this.markCompleted();
          this.resolve(result);
        })
        .catch((err) => {
          if (this.completed) {
            return;
          }

          this.markCompleted();
          this.reject(err);
        });
  }

  private getPollingDelayMillis(): number {
    const increasedPollingDelay = Math.pow(2, this.numTries) * this.initialPollingDelayMillis;
    return Math.min(increasedPollingDelay, this.maxPollingDelayMillis);
  }

  private markCompleted(): void {
    this.completed = true;
    if (this.masterTimer) {
      clearTimeout(this.masterTimer);
    }
    if (this.repollTimer) {
      clearTimeout(this.repollTimer);
    }
  }
}

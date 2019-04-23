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

import {FirebaseApp} from '../firebase-app';
import {AppErrorCodes, FirebaseAppError} from './error';
import * as validator from './validator';

import http = require('http');
import https = require('https');
import url = require('url');
import {EventEmitter} from 'events';
import {Readable} from 'stream';
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
  httpAgent?: http.Agent;
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
  /** For multipart responses, the payloads of individual parts. */
  readonly multipart?: Buffer[];
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
  multipart?: Buffer[];
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

/**
 * Represents a multipart HTTP response. Parts that constitute the response body can be accessed
 * via the multipart getter. Getters for text and data throw errors.
 */
class MultipartHttpResponse implements HttpResponse {

  public readonly status: number;
  public readonly headers: any;
  public readonly multipart: Buffer[];

  constructor(resp: LowLevelResponse) {
    this.status = resp.status;
    this.headers = resp.headers;
    this.multipart = resp.multipart;
  }

  get text(): string {
    throw new FirebaseAppError(
      AppErrorCodes.UNABLE_TO_PARSE_RESPONSE,
      'Unable to parse multipart payload as text',
    );
  }

  get data(): any {
    throw new FirebaseAppError(
      AppErrorCodes.UNABLE_TO_PARSE_RESPONSE,
      'Unable to parse multipart payload as JSON',
    );
  }

  public isJson(): boolean {
    return false;
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
    return AsyncHttpCall.invoke(config)
      .then((resp) => {
        return this.createHttpResponse(resp);
      }).catch((err: LowLevelError) => {
        const retryCodes = ['ECONNRESET', 'ETIMEDOUT'];
        if (retryCodes.indexOf(err.code) !== -1 && attempts === 0) {
          return this.sendWithRetry(config, attempts + 1);
        }
        if (err.response) {
          throw new HttpError(this.createHttpResponse(err.response));
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

  private createHttpResponse(resp: LowLevelResponse): HttpResponse {
    if (resp.multipart) {
      return new MultipartHttpResponse(resp);
    }
    return new DefaultHttpResponse(resp);
  }
}

/**
 * Parses a full HTTP response message containing both a header and a body.
 *
 * @param {string|Buffer} response The HTTP response to be parsed.
 * @param {HttpRequestConfig} config The request configuration that resulted in the HTTP response.
 * @return {HttpResponse} An object containing the parsed HTTP status, headers and the body.
 */
export function parseHttpResponse(
  response: string | Buffer, config: HttpRequestConfig): HttpResponse {

  const responseText: string = validator.isBuffer(response) ?
    response.toString('utf-8') : response as string;
  const endOfHeaderPos: number = responseText.indexOf('\r\n\r\n');
  const headerLines: string[] = responseText.substring(0, endOfHeaderPos).split('\r\n');

  const statusLine: string = headerLines[0];
  const status: string = statusLine.trim().split(/\s/)[1];

  const headers: {[key: string]: string} = {};
  headerLines.slice(1).forEach((line) => {
    const colonPos = line.indexOf(':');
    const name = line.substring(0, colonPos).trim().toLowerCase();
    const value = line.substring(colonPos + 1).trim();
    headers[name] = value;
  });

  let data = responseText.substring(endOfHeaderPos + 4);
  if (data.endsWith('\n')) {
    data = data.slice(0, -1);
  }
  if (data.endsWith('\r')) {
    data = data.slice(0, -1);
  }

  const lowLevelResponse: LowLevelResponse = {
    status: parseInt(status, 10),
    headers,
    data,
    config,
    request: null,
  };
  if (!validator.isNumber(lowLevelResponse.status)) {
    throw new FirebaseAppError(AppErrorCodes.INTERNAL_ERROR, 'Malformed HTTP status line.');
  }
  return new DefaultHttpResponse(lowLevelResponse);
}

/**
 * A helper class for sending HTTP requests over the wire. This is a wrapper around the standard
 * http and https packages of Node.js, providing content processing, timeouts and error handling.
 * It also wraps the callback API of the Node.js standard library in a more flexible Promise API.
 */
class AsyncHttpCall {

  private readonly config: HttpRequestConfigImpl;
  private readonly options: https.RequestOptions;
  private readonly entity: Buffer;
  private readonly promise: Promise<LowLevelResponse>;

  private resolve: (_: any) => void;
  private reject: (_: any) => void;

  /**
   * Sends an HTTP request based on the provided configuration.
   */
  public static invoke(config: HttpRequestConfig): Promise<LowLevelResponse> {
    return new AsyncHttpCall(config).promise;
  }

  private constructor(config: HttpRequestConfig) {
    try {
      this.config = new HttpRequestConfigImpl(config);
      this.options = this.config.buildRequestOptions();
      this.entity = this.config.buildEntity(this.options.headers);
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
        this.execute();
      });
    } catch (err) {
      this.promise = Promise.reject(this.enhanceError(err, null));
    }
  }

  private execute() {
    const transport: any = this.options.protocol === 'https:' ? https : http;
    const req: http.ClientRequest = transport.request(this.options, (res: http.IncomingMessage) => {
      this.handleResponse(res, req);
    });

    // Handle errors
    req.on('error', (err) => {
      if (req.aborted) {
        return;
      }
      this.enhanceAndReject(err, null, req);
    });

    const timeout: number = this.config.timeout;
    if (timeout) {
      // Listen to timeouts and throw an error.
      req.setTimeout(this.config.timeout, () => {
        req.abort();
        this.rejectWithError(`timeout of ${timeout}ms exceeded`, 'ETIMEDOUT', req);
      });
    }

    // Send the request
    req.end(this.entity);
  }

  private handleResponse(res: http.IncomingMessage, req: http.ClientRequest) {
    if (req.aborted) {
      return;
    }

    const response: LowLevelResponse = {
      status: res.statusCode,
      headers: res.headers,
      request: req,
      data: undefined,
      config: this.config,
    };
    const boundary = this.getMultipartBoundary(res.headers);
    const respStream: Readable = this.uncompressResponse(res);

    if (boundary) {
      this.handleMultipartResponse(response, respStream, boundary);
    } else {
      this.handleRegularResponse(response, respStream);
    }
  }

  /**
   * Extracts multipart boundary from the HTTP header. The content-type header of a multipart
   * response has the form 'multipart/subtype; boundary=string'.
   */
  private getMultipartBoundary(headers: http.IncomingHttpHeaders): string {
    const contentType = headers['content-type'];
    if (!contentType.startsWith('multipart/')) {
      return null;
    }

    const segments: string[] = contentType.split(';');
    const emptyObject: {[key: string]: string} = {};
    const headerParams = segments.slice(1)
      .map((segment) => segment.trim().split('='))
      .reduce((curr, params) => {
        // Parse key=value pairs in the content-type header into properties of an object.
        if (params.length === 2) {
          const keyValuePair: {[key: string]: string} = {};
          keyValuePair[params[0]] = params[1];
          return Object.assign(curr, keyValuePair);
        }
        return curr;
      }, emptyObject);

    return headerParams.boundary;
  }

  private uncompressResponse(res: http.IncomingMessage): Readable {
    // Uncompress the response body transparently if required.
    let respStream: Readable = res;
    const encodings = ['gzip', 'compress', 'deflate'];
    if (encodings.indexOf(res.headers['content-encoding']) !== -1) {
      // Add the unzipper to the body stream processing pipeline.
      const zlib: typeof zlibmod = require('zlib');
      respStream = respStream.pipe(zlib.createUnzip());
      // Remove the content-encoding in order to not confuse downstream operations.
      delete res.headers['content-encoding'];
    }
    return respStream;
  }

  private handleMultipartResponse(
    response: LowLevelResponse, respStream: Readable, boundary: string) {

    const dicer = require('dicer');
    const multipartParser = new dicer({boundary});
    const responseBuffer: Buffer[] = [];
    multipartParser.on('part', (part: any) => {
      const tempBuffers: Buffer[] = [];

      part.on('data', (partData: Buffer) => {
        tempBuffers.push(partData);
      });

      part.on('end', () => {
        responseBuffer.push(Buffer.concat(tempBuffers));
      });
    });

    multipartParser.on('finish', () => {
      response.data = null;
      response.multipart = responseBuffer;
      this.finalizeResponse(response);
    });

    respStream.pipe(multipartParser);
  }

  private handleRegularResponse(response: LowLevelResponse, respStream: Readable) {
    const responseBuffer: Buffer[] = [];
    respStream.on('data', (chunk: Buffer) => {
      responseBuffer.push(chunk);
    });

    respStream.on('error', (err) => {
      const req: http.ClientRequest = response.request;
      if (req.aborted) {
        return;
      }
      this.enhanceAndReject(err, null, req);
    });

    respStream.on('end', () => {
      response.data = Buffer.concat(responseBuffer).toString();
      this.finalizeResponse(response);
    });
  }

  /**
   * Finalizes the current HTTP call in-flight by either resolving or rejecting the associated
   * promise. In the event of an error, adds additional useful information to the returned error.
   */
  private finalizeResponse(response: LowLevelResponse) {
    if (response.status >= 200 && response.status < 300) {
      this.resolve(response);
    } else {
      this.rejectWithError(
        'Request failed with status code ' + response.status,
        null,
        response.request,
        response,
      );
    }
  }

  /**
   * Creates a new error from the given message, and enhances it with other information available.
   * Then the promise associated with this HTTP call is rejected with the resulting error.
   */
  private rejectWithError(
    message: string,
    code?: string,
    request?: http.ClientRequest,
    response?: LowLevelResponse) {

    const error = new Error(message);
    this.enhanceAndReject(error, code, request, response);
  }

  private enhanceAndReject(
    error: any,
    code: string,
    request?: http.ClientRequest,
    response?: LowLevelResponse) {

    this.reject(this.enhanceError(error, code, request, response));
  }

  /**
   * Enhances the given error by adding more information to it. Specifically, the HttpRequestConfig,
   * the underlying request and response will be attached to the error.
   */
  private enhanceError(
    error: any,
    code: string,
    request?: http.ClientRequest,
    response?: LowLevelResponse): LowLevelError {

    error.config = this.config;
    if (code) {
      error.code = code;
    }
    error.request = request;
    error.response = response;
    return error;
  }
}

/**
 * An adapter class for extracting options and entity data from an HttpRequestConfig.
 */
class HttpRequestConfigImpl implements HttpRequestConfig {

  constructor(private readonly config: HttpRequestConfig) {

  }

  get method(): HttpMethod {
    return this.config.method;
  }

  get url(): string {
    return this.config.url;
  }

  get headers(): {[key: string]: string} | undefined {
    return this.config.headers;
  }

  get data(): string | object | Buffer | undefined {
    return this.config.data;
  }

  get timeout(): number | undefined {
    return this.config.timeout;
  }

  get httpAgent(): http.Agent | undefined {
    return this.config.httpAgent;
  }

  public buildRequestOptions(): https.RequestOptions {
    const parsed = this.buildUrl();
    const protocol = parsed.protocol;
    let port: string = parsed.port;
    if (!port) {
      const isHttps = protocol === 'https:';
      port = isHttps ? '443' : '80';
    }

    return {
      protocol,
      hostname: parsed.hostname,
      port,
      path: parsed.path,
      method: this.method,
      agent: this.httpAgent,
      headers: Object.assign({}, this.headers),
    };
  }

  public buildEntity(headers: http.OutgoingHttpHeaders): Buffer {
    let data: Buffer;
    if (!this.hasEntity() || !this.isEntityEnclosingRequest()) {
      return data;
    }

    if (validator.isBuffer(this.data)) {
      data = this.data as Buffer;
    } else if (validator.isObject(this.data)) {
      data = Buffer.from(JSON.stringify(this.data), 'utf-8');
      if (typeof headers['content-type'] === 'undefined') {
        headers['content-type'] = 'application/json;charset=utf-8';
      }
    } else if (validator.isString(this.data)) {
      data = Buffer.from(this.data as string, 'utf-8');
    } else {
      throw new Error('Request data must be a string, a Buffer or a json serializable object');
    }

    // Add Content-Length header if data exists.
    headers['Content-Length'] = data.length.toString();
    return data;
  }

  private buildUrl(): url.UrlWithStringQuery {
    const fullUrl: string = this.urlWithProtocol();
    if (!this.hasEntity() || this.isEntityEnclosingRequest()) {
      return url.parse(fullUrl);
    }

    if (!validator.isObject(this.data)) {
      throw new Error(`${this.method} requests cannot have a body`);
    }

    // Parse URL and append data to query string.
    const parsedUrl = new url.URL(fullUrl);
    const dataObj = this.data as {[key: string]: string};
    for (const key in dataObj) {
      if (dataObj.hasOwnProperty(key)) {
        parsedUrl.searchParams.append(key, dataObj[key]);
      }
    }

    return url.parse(parsedUrl.toString());
  }

  private urlWithProtocol(): string {
    const fullUrl: string = this.url;
    if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
      return fullUrl;
    }
    return `https://${fullUrl}`;
  }

  private hasEntity(): boolean {
    return !!this.data;
  }

  private isEntityEnclosingRequest(): boolean {
    // GET and HEAD requests do not support entity (body) in request.
    return this.method !== 'GET' && this.method !== 'HEAD';
  }
}

export class AuthorizedHttpClient extends HttpClient {
  constructor(private readonly app: FirebaseApp) {
    super();
  }

  public send(request: HttpRequestConfig): Promise<HttpResponse> {
    return this.app.INTERNAL.getToken().then((accessTokenObj) => {
      const requestCopy = Object.assign({}, request);
      requestCopy.headers = Object.assign({}, request.headers);
      const authHeader = 'Authorization';
      requestCopy.headers[authHeader] = `Bearer ${accessTokenObj.accessToken}`;

      if (!requestCopy.httpAgent && this.app.options.httpAgent) {
        requestCopy.httpAgent = this.app.options.httpAgent;
      }
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

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
import {OutgoingHttpHeaders} from 'http';

import http = require('http');
import https = require('https');
import url = require('url');
import zlib = require('zlib');
import stream = require('stream');

/** Http method type definition. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
/** API callback function type definition. */
export type ApiCallbackFunction = (data: object) => void;

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers?: {[key: string]: string};
  data?: any;
  timeout?: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: any;
  readonly text: string;
  readonly data: any;
}

class DefaultHttpResponse implements HttpResponse {

  public readonly status: number;
  public readonly headers: any;
  public readonly text: string;

  private readonly data_: any;
  private readonly request_: string;

  constructor(resp: LowLevelResponse) {
    this.status = resp.status;
    this.headers = resp.headers;
    this.text = resp.data;
    try {
      this.data_ = JSON.parse(resp.data);
    } catch (err) {
      this.data_ = undefined;
    }
    this.request_ = `${resp.config.method} ${resp.config.url}`;
  }

  get data(): any {
    if (typeof this.data_ !== 'undefined') {
      return this.data_;
    }
    try {
      return JSON.parse(this.text);
    } catch (error) {
      throw new FirebaseAppError(
        AppErrorCodes.UNABLE_TO_PARSE_RESPONSE,
        `Error while parsing response data: "${ error.toString() }". Raw server ` +
        `response: "${ this.text }". Status code: "${ this.status }". Outgoing ` +
        `request: "${ this.request_ }."`,
      );
    }
  }
}

export class HttpError extends Error {

  public readonly response: HttpResponse;

  constructor(resp: LowLevelResponse) {
    super(`Server responded with status ${resp.status}.`);
    this.response = new DefaultHttpResponse(resp);
  }
}

export class HttpClient {

  /**
   * Sends an HTTP request to a remote server. If the server responds with a successful response (2xx), the returned
   * promise resolves with an HttpResponse. If the server responds with an error (3xx, 4xx, 5xx), the promise rejects
   * with an HttpError. In case of all other errors, the promise rejects with a FirebaseAppError.
   *
   * @param {HttpRequest} request HTTP request to be sent.
   * @return {Promise<HttpResponse>} A promise that resolves with the response details.
   */
  public send(config: HttpRequestConfig): Promise<HttpResponse> {
    return this.sendWithRetry(config);
  }

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
          throw new HttpError(err.response);
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

interface LowLevelResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  request: http.ClientRequest;
  data?: string;
  config: HttpRequestConfig;
}

interface LowLevelError extends Error {
  code?: string;
  config: HttpRequestConfig;
  request?: http.ClientRequest;
  response?: LowLevelResponse;
}

function sendRequest(config: HttpRequestConfig): Promise<LowLevelResponse> {
  return new Promise((resolve, reject) => {
    let data = config.data;
    const headers = config.headers || {};
    if (data) {
      if (typeof data === 'object') {
        data = JSON.stringify(data);
        if (typeof headers['Content-Type'] === 'undefined') {
          headers['Content-Type'] = 'application/json;charset=utf-8';
        }
      }
      if (typeof data === 'string') {
        data = new Buffer(data, 'utf-8');
      } else if (!(data instanceof Buffer)) {
        return reject(createError(
          'Request data must be a string, a Buffer or a json serializable object',
          config,
        ));
      }
      // Add Content-Length header if data exists
      headers['Content-Length'] = data.length;
    }
    const parsed = url.parse(config.url);
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
      // uncompress the response body transparently if required
      let respStream: stream.Readable = res;
      const encodings = ['gzip', 'compress', 'deflate'];
      if (encodings.indexOf(res.headers['content-encoding']) !== -1) {
        // add the unzipper to the body stream processing pipeline
        respStream = respStream.pipe(zlib.createUnzip());
        // remove the content-encoding in order to not confuse downstream operations
        delete res.headers['content-encoding'];
      }

      const response: LowLevelResponse = {
        status: res.statusCode,
        headers: res.headers,
        request: req,
        data: undefined,
        config,
      };

      const responseBuffer = [];
      respStream.on('data', function handleStreamData(chunk) {
        responseBuffer.push(chunk);
      });

      respStream.on('error', function handleStreamError(err) {
        if (req.aborted) {
          return;
        }
        reject(enhanceError(err, config, null, req));
      });

      respStream.on('end', function handleStreamEnd() {
        const responseData = Buffer.concat(responseBuffer).toString();
        response.data = responseData;
        settle(resolve, reject, response);
      });
    });

    // Handle errors
    req.on('error', function handleRequestError(err) {
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

function createError(
  message: string,
  config: HttpRequestConfig,
  code?: string,
  request?: http.ClientRequest,
  response?: LowLevelResponse): LowLevelError {

  const error = new Error(message);
  return enhanceError(error, config, code, request, response);
}

function enhanceError(
  error,
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

function settle(resolve, reject, response: LowLevelResponse) {
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
 * Base class for handling HTTP requests.
 */
export class HttpRequestHandler {
  /**
   * Sends HTTP requests and returns a promise that resolves with the result.
   * Will retry once if the first attempt encounters an AppErrorCodes.NETWORK_ERROR.
   *
   * @param {string} host The HTTP host.
   * @param {number} port The port number.
   * @param {string} path The endpoint path.
   * @param {HttpMethod} httpMethod The http method.
   * @param {object} [data] The request JSON.
   * @param {object} [headers] The request headers.
   * @param {number} [timeout] The request timeout in milliseconds.
   * @return {Promise<object>} A promise that resolves with the response.
   */
  public sendRequest(
      host: string,
      port: number,
      path: string,
      httpMethod: HttpMethod,
      data?: object,
      headers?: object,
      timeout?: number): Promise<object> {
    // Convenience for calling the real _sendRequest() method with the original params.
    const sendOneRequest = () => {
      return this._sendRequest(host, port, path, httpMethod, data, headers, timeout);
    };

    return sendOneRequest()
      .catch ((response: { statusCode: number, error: string | object }) => {
        // Retry if the request failed due to a network error.
        if (response.error instanceof FirebaseAppError) {
          if ((response.error as FirebaseAppError).hasCode(AppErrorCodes.NETWORK_ERROR)) {
            return sendOneRequest();
          }
        }
        return Promise.reject(response);
      });
  }

  /**
   * Sends HTTP requests and returns a promise that resolves with the result.
   *
   * @param {string} host The HTTP host.
   * @param {number} port The port number.
   * @param {string} path The endpoint path.
   * @param {HttpMethod} httpMethod The http method.
   * @param {object} [data] The request JSON.
   * @param {object} [headers] The request headers.
   * @param {number} [timeout] The request timeout in milliseconds.
   * @return {Promise<object>} A promise that resolves with the response.
   */
  private _sendRequest(
      host: string,
      port: number,
      path: string,
      httpMethod: HttpMethod,
      data?: object,
      headers?: object,
      timeout?: number): Promise<any> {
    let requestData;
    if (data) {
      try {
        requestData = JSON.stringify(data);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    const options: https.RequestOptions = {
      method: httpMethod,
      host,
      port,
      path,
      headers: headers as OutgoingHttpHeaders,
    };
    // Only https endpoints.
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const buffers: Buffer[] = [];
        res.on('data', (buffer: Buffer) => buffers.push(buffer));
        res.on('end', () => {
          const response = Buffer.concat(buffers).toString();

          const statusCode = res.statusCode || 200;

          const responseHeaders = res.headers || {};
          const contentType = responseHeaders['content-type'] || 'application/json';

          if (contentType.indexOf('text/html') !== -1 || contentType.indexOf('text/plain') !== -1) {
            // Text response
            if (statusCode >= 200 && statusCode < 300) {
              resolve(response);
            } else {
              reject({
                statusCode,
                error: response,
              });
            }
          } else {
            // JSON response
            try {
              const json = JSON.parse(response);

              if (statusCode >= 200 && statusCode < 300) {
                resolve(json);
              } else {
                reject({
                  statusCode,
                  error: json,
                });
              }
            } catch (error) {
              const parsingError = new FirebaseAppError(
                AppErrorCodes.UNABLE_TO_PARSE_RESPONSE,
                `Failed to parse response data: "${ error.toString() }". Raw server` +
                `response: "${ response }". Status code: "${ res.statusCode }". Outgoing ` +
                `request: "${ options.method } ${options.host}${ options.path }"`,
              );
              reject({
                statusCode,
                error: parsingError,
              });
            }
          }
        });
      });

      if (timeout) {
        // Listen to timeouts and throw a network error.
        req.on('socket', (socket) => {
          socket.setTimeout(timeout);
          socket.on('timeout', () => {
            req.abort();

            const networkTimeoutError = new FirebaseAppError(
              AppErrorCodes.NETWORK_TIMEOUT,
              `${ host } network timeout. Please try again.`,
            );
            reject({
              statusCode: 408,
              error: networkTimeoutError,
            });
          });
        });
      }

      req.on('error', (error) => {
        const networkRequestError = new FirebaseAppError(
          AppErrorCodes.NETWORK_ERROR,
          `A network request error has occurred: ${ error && error.message }`,
        );
        reject({
          statusCode: 502,
          error: networkRequestError,
        });
      });

      if (requestData) {
        req.write(requestData);
      }

      req.end();
    });
  }
}

/**
 * Class that extends HttpRequestHandler and signs HTTP requests with a service
 * credential access token.
 *
 * @param {Credential} credential The service account credential used to
 *     sign HTTP requests.
 * @constructor
 */
export class SignedApiRequestHandler extends HttpRequestHandler {
  constructor(private app_: FirebaseApp) {
    super();
  }

  /**
   * Sends HTTP requests and returns a promise that resolves with the result.
   *
   * @param {string} host The HTTP host.
   * @param {number} port The port number.
   * @param {string} path The endpoint path.
   * @param {HttpMethod} httpMethod The http method.
   * @param {object} data The request JSON.
   * @param {object} headers The request headers.
   * @param {number} timeout The request timeout in milliseconds.
   * @return {Promise} A promise that resolves with the response.
   */
  public sendRequest(
      host: string,
      port: number,
      path: string,
      httpMethod: HttpMethod,
      data?: object,
      headers?: object,
      timeout?: number): Promise<object> {
    return this.app_.INTERNAL.getToken().then((accessTokenObj) => {
      const headersCopy: object = (headers && deepCopy(headers)) || {};
      const authorizationHeaderKey = 'Authorization';
      headersCopy[authorizationHeaderKey] = 'Bearer ' + accessTokenObj.accessToken;
      return super.sendRequest(host, port, path, httpMethod, data, headersCopy, timeout);
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
    const nullFunction = (request: object) => undefined;
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
    const nullFunction = (request: object) => undefined;
    this.responseValidator = responseValidator || nullFunction;
    return this;
  }

  /** @return {ApiCallbackFunction} The response validator. */
  public getResponseValidator(): ApiCallbackFunction {
    return this.responseValidator;
  }
}

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
import axios, {AxiosInstance, AxiosTransformer, AxiosResponse, AxiosError} from 'axios';
import {OutgoingHttpHeaders} from 'http';

import https = require('https');

/** Http method type definition. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
/** API callback function type definition. */
export type ApiCallbackFunction = (data: object) => void;

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: {[key: string]: string};
  data?: any;
  timeout?: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: {[key: string]: string};
  readonly text: string;
  readonly data: any;
}

class AxiosHttpResponse implements HttpResponse {

  public readonly status: number;
  public readonly headers: {[key: string]: string};
  public readonly text: string;

  private readonly data_: any;
  private readonly request_: string;

  constructor(resp: AxiosResponse) {
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

  constructor(resp: AxiosResponse) {
    super(`Server responded with status ${resp.status}.`);
    this.response = new AxiosHttpResponse(resp);
  }
}

const identityTransform: AxiosTransformer = (data, header) => {
  return data;
};

function retryOnError(err) {
  const retryCodes = ['ECONNRESET'];
  if (retryCodes.indexOf(err.code) !== -1 && err.config && !err.config.__isRetryRequest) {
    err.config.__isRetryRequest = true;
    return axios(err.config);
  }
  throw err;
}
axios.interceptors.response.use(undefined, retryOnError);

export class HttpClient {

  /**
   * Sends an HTTP request to a remote server. If the server responds with a successful response (2xx), the returned
   * promise resolves with an HttpResponse. If the server responds with an error (4xx, 5xx), the promise rejects with
   * an HttpError. In case of all other errors, the promise rejects with a FirebaseAppError.
   *
   * @param {HttpRequest} request HTTP request to be sent.
   * @return {Promise<HttpResponse>} A promise that resolves with the response details.
   */
  public send(request: HttpRequest): Promise<HttpResponse> {
    return axios({
      method: request.method,
      url: request.url,
      headers: request.headers,
      data: request.data,
      timeout: request.timeout || 10000,
      transformResponse: identityTransform,
    }).then((resp) => {
      return new AxiosHttpResponse(resp);
    }).catch((err: AxiosError) => {
      if (err.response) {
        throw new HttpError(err.response);
      }
      if (err.code === 'ECONNABORTED' && err.message.match('^timeout.*exceeded$')) {
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

export class AuthorizedHttpClient extends HttpClient {
  constructor(private readonly app: FirebaseApp) {
    super();
  }

  public send(request: HttpRequest): Promise<HttpResponse> {
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

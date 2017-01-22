import {deepCopy} from './deep-copy';
import {FirebaseApp} from '../firebase-app';
import {FirebaseError} from './error';

import https = require('https');

/** Http method type definition. */
export type HttpMethod = 'GET' | 'POST';
/** API callback function type definition. */
export type ApiCallbackFunction = (data: Object) => void;

/**
 * Base class for handling HTTP requests.
 */
export class HttpRequestHandler {
  /**
   * Sends HTTP requests and returns a promise that resolves with the result.
   *
   * @param {string} host The HTTP host.
   * @param {number} port The port number.
   * @param {string} path The endpoint path.
   * @param {HttpMethod} httpMethod The http method.
   * @param {Object} [data] The request JSON.
   * @param {Object} [headers] The request headers.
   * @param {number} [timeout] The request timeout in milliseconds.
   * @return {Promise<Object>} A promise that resolves with the response.
   */
  public sendRequest(
      host: string,
      port: number,
      path: string,
      httpMethod: HttpMethod,
      data?: Object,
      headers?: Object,
      timeout?: number): Promise<Object> {
    let requestData;
    if (data) {
      try {
        requestData = JSON.stringify(data);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    const options = {
      method: httpMethod,
      host,
      port,
      path,
      headers,
    };
    // Only https endpoints.
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let buffers: Buffer[] = [];
        res.on('data', (buffer: Buffer) => buffers.push(buffer));
        res.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(buffers).toString());
            resolve(json);
          } catch (err) {
            reject('Failed to parse response data: ' + err.toString());
          }
        });
      });

      if (timeout) {
        // Listen to timeouts and throw a network error.
        req.on('socket', (socket) => {
          socket.setTimeout(timeout);
          socket.on('timeout', () => {
            req.abort();

            const networkTimeoutError = new FirebaseError({
              code: 'network-timeout',
              message: `${ host } network timeout. Please try again.`,
            });
            reject(networkTimeoutError);
          });
        });
      }

      req.on('error', (error) => {
        const networkRequestError = new FirebaseError({
          code: 'network-error',
          message: `A network request error has occurred: ${ error && error.message }`,
        });
        reject(networkRequestError);
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
   * @param {Object} data The request JSON.
   * @param {Object} headers The request headers.
   * @param {number} timeout The request timeout in milliseconds.
   * @return {Promise} A promise that resolves with the response.
   */
  public sendRequest(
      host: string,
      port: number,
      path: string,
      httpMethod: HttpMethod,
      data: Object,
      headers: Object,
      timeout: number): Promise<Object> {
    let ancestorSendRequest = super.sendRequest;

    return this.app_.INTERNAL.getToken().then((accessTokenObj) => {
      if (accessTokenObj == null) {
        return Promise.reject('Unable to fetch Google OAuth2 access token. ' +
            'Make sure you initialized the SDK with a credential that can f' +
            'etch access tokens.');
      }
      let headersCopy: Object = deepCopy(headers);
      let authorizationHeaderKey = 'Authorization';
      headersCopy[authorizationHeaderKey] = 'Bearer ' + accessTokenObj.accessToken;
      return ancestorSendRequest(host, port, path, httpMethod, data, headersCopy, timeout);
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
    if (!endpoint) {
      throw new Error(`INTERNAL ASSERT FAILED: Unspecified API settings endpoint: ${ endpoint }`);
    }
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
    let nullFunction = (request: Object) => undefined;
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
    let nullFunction = (request: Object) => undefined;
    this.responseValidator = responseValidator || nullFunction;
    return this;
  }

  /** @return {ApiCallbackFunction} The response validator. */
  public getResponseValidator(): ApiCallbackFunction {
    return this.responseValidator;
  }
}

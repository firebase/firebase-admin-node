/*!
 * Copyright 2020 Google Inc.
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

import fs = require('fs');
import {Credential, GoogleOAuthAccessToken} from './credential';
import {Agent} from 'http';
import {HttpClient, HttpRequestConfig, HttpError, HttpResponse} from '../internal/api-request';
import {AppErrorCodes, FirebaseAppError} from '../internal/error';
import * as util from '../internal/validator';

const GOOGLE_TOKEN_AUDIENCE = 'https://accounts.google.com/o/oauth2/token';
const GOOGLE_AUTH_TOKEN_HOST = 'accounts.google.com';
const GOOGLE_AUTH_TOKEN_PATH = '/o/oauth2/token';

// NOTE: the Google Metadata Service uses HTTP over a vlan
const GOOGLE_METADATA_SERVICE_HOST = 'metadata.google.internal';
const GOOGLE_METADATA_SERVICE_TOKEN_PATH = '/computeMetadata/v1/instance/service-accounts/default/token';
const GOOGLE_METADATA_SERVICE_PROJECT_ID_PATH = '/computeMetadata/v1/project/project-id';

const ONE_HOUR_IN_SECONDS = 60 * 60;
const JWT_ALGORITHM = 'RS256';


/**
 * Implementation of Credential that uses a service account.
 */
export class ServiceAccountCredential implements Credential {
  public readonly projectId: string;
  public readonly privateKey: string;
  public readonly clientEmail: string;

  private readonly httpClient: HttpClient;

  /**
   * Creates a new ServiceAccountCredential from the given parameters.
   *
   * @param serviceAccountPathOrObject Service account json object or path to a service account json file.
   * @param httpAgent Optional http.Agent to use when calling the remote token server.
   * @param implicit An optinal boolean indicating whether this credential was implicitly discovered from the
   *   environment, as opposed to being explicitly specified by the developer.
   *
   * @constructor
   */
  constructor(
    serviceAccountPathOrObject: string | object,
    private readonly httpAgent?: Agent,
    readonly implicit: boolean = false) {

    const serviceAccount = (typeof serviceAccountPathOrObject === 'string') ?
      ServiceAccount.fromPath(serviceAccountPathOrObject)
      : new ServiceAccount(serviceAccountPathOrObject);
    this.projectId = serviceAccount.projectId;
    this.privateKey = serviceAccount.privateKey;
    this.clientEmail = serviceAccount.clientEmail;
    this.httpClient = new HttpClient();
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const token = this.createAuthJwt_();
    const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3A' +
      'grant-type%3Ajwt-bearer&assertion=' + token;
    const request: HttpRequestConfig = {
      method: 'POST',
      url: `https://${GOOGLE_AUTH_TOKEN_HOST}${GOOGLE_AUTH_TOKEN_PATH}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: postData,
      httpAgent: this.httpAgent,
    };
    return requestAccessToken(this.httpClient, request);
  }

  private createAuthJwt_(): string {
    const claims = {
      scope: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase.database',
        'https://www.googleapis.com/auth/firebase.messaging',
        'https://www.googleapis.com/auth/identitytoolkit',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');
    // This method is actually synchronous so we can capture and return the buffer.
    return jwt.sign(claims, this.privateKey, {
      audience: GOOGLE_TOKEN_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this.clientEmail,
      algorithm: JWT_ALGORITHM,
    });
  }
}



/**
 * Implementation of Credential that gets access tokens from the metadata service available
 * in the Google Cloud Platform. This authenticates the process as the default service account
 * of an App Engine instance or Google Compute Engine machine.
 */
export class ComputeEngineCredential implements Credential {

  private readonly httpClient = new HttpClient();
  private readonly httpAgent?: Agent;
  private projectId?: string;

  constructor(httpAgent?: Agent) {
    this.httpAgent = httpAgent;
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const request = this.buildRequest(GOOGLE_METADATA_SERVICE_TOKEN_PATH);
    return requestAccessToken(this.httpClient, request);
  }

  public getProjectId(): Promise<string> {
    if (this.projectId) {
      return Promise.resolve(this.projectId);
    }

    const request = this.buildRequest(GOOGLE_METADATA_SERVICE_PROJECT_ID_PATH);
    return this.httpClient.send(request)
      .then((resp) => {
        this.projectId = resp.text!;
        return this.projectId;
      })
      .catch((err) => {
        const detail: string = (err instanceof HttpError) ? getDetailFromResponse(err.response) : err.message;
        throw new FirebaseAppError(
          AppErrorCodes.INVALID_CREDENTIAL,
          `Failed to determine project ID: ${detail}`);
      });
  }

  private buildRequest(urlPath: string): HttpRequestConfig {
    return {
      method: 'GET',
      url: `http://${GOOGLE_METADATA_SERVICE_HOST}${urlPath}`,
      headers: {
        'Metadata-Flavor': 'Google',
      },
      httpAgent: this.httpAgent,
    };
  }
}


/**
 * A struct containing the properties necessary to use service account JSON credentials.
 */
class ServiceAccount {

  public readonly projectId: string;
  public readonly privateKey: string;
  public readonly clientEmail: string;

  public static fromPath(filePath: string): ServiceAccount {
    try {
      return new ServiceAccount(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse service account json file: ' + error,
      );
    }
  }

  constructor(json: object) {
    if (!util.isNonNullObject(json)) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Service account must be an object.',
      );
    }

    copyAttr(this, json, 'projectId', 'project_id');
    copyAttr(this, json, 'privateKey', 'private_key');
    copyAttr(this, json, 'clientEmail', 'client_email');

    let errorMessage;
    if (!util.isNonEmptyString(this.projectId)) {
      errorMessage = 'Service account object must contain a string "project_id" property.';
    } else if (!util.isNonEmptyString(this.privateKey)) {
      errorMessage = 'Service account object must contain a string "private_key" property.';
    } else if (!util.isNonEmptyString(this.clientEmail)) {
      errorMessage = 'Service account object must contain a string "client_email" property.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const forge = require('node-forge');
    try {
      forge.pki.privateKeyFromPem(this.privateKey);
    } catch (error) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse private key: ' + error);
    }
  }
}

/**
 * Obtain a new OAuth2 token by making a remote service call.
 */
export function requestAccessToken(client: HttpClient, request: HttpRequestConfig): Promise<GoogleOAuthAccessToken> {
  return client.send(request).then((resp) => {
    const json = resp.data;
    if (!json.access_token || !json.expires_in) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        `Unexpected response while fetching access token: ${ JSON.stringify(json) }`,
      );
    }
    return json;
  }).catch((err) => {
    throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, getErrorMessage(err));
  });
}

/**
 * Constructs a human-readable error message from the given Error.
 */
function getErrorMessage(err: Error): string {
  const detail: string = (err instanceof HttpError) ? getDetailFromResponse(err.response) : err.message;
  return `Error fetching access token: ${detail}`;
}


/**
 * Extracts details from the given HTTP error response, and returns a human-readable description. If
 * the response is JSON-formatted, looks up the error and error_description fields sent by the
 * Google Auth servers. Otherwise returns the entire response payload as the error detail.
 */
function getDetailFromResponse(response: HttpResponse): string {
  if (response.isJson() && response.data.error) {
    const json = response.data;
    let detail = json.error;
    if (json.error_description) {
      detail += ' (' + json.error_description + ')';
    }
    return detail;
  }
  return response.text || 'Missing error payload';
}


/**
 * Copies the specified property from one object to another.
 *
 * If no property exists by the given "key", looks for a property identified by "alt", and copies it instead.
 * This can be used to implement behaviors such as "copy property myKey or my_key".
 *
 * @param to Target object to copy the property into.
 * @param from Source object to copy the property from.
 * @param key Name of the property to copy.
 * @param alt Alternative name of the property to copy.
 */
export function copyAttr(to: {[key: string]: any}, from: {[key: string]: any}, key: string, alt: string): void {
  const tmp = from[key] || from[alt];
  if (typeof tmp !== 'undefined') {
    to[key] = tmp;
  }
}
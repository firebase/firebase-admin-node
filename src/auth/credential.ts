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

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import os = require('os');
import path = require('path');

import {AppErrorCodes, FirebaseAppError} from '../utils/error';
import {HttpClient, HttpRequestConfig} from '../utils/api-request';
import {Agent} from 'http';

const GOOGLE_TOKEN_AUDIENCE = 'https://accounts.google.com/o/oauth2/token';
const GOOGLE_AUTH_TOKEN_HOST = 'accounts.google.com';
const GOOGLE_AUTH_TOKEN_PATH = '/o/oauth2/token';

// NOTE: the Google Metadata Service uses HTTP over a vlan
const GOOGLE_METADATA_SERVICE_HOST = 'metadata.google.internal';
const GOOGLE_METADATA_SERVICE_PATH = '/computeMetadata/v1beta1/instance/service-accounts/default/token';

const configDir = (() => {
  // Windows has a dedicated low-rights location for apps at ~/Application Data
  const sys = os.platform();
  if (sys && sys.length >= 3 && sys.substring(0, 3).toLowerCase() === 'win') {
    return process.env.APPDATA;
  }

  // On *nix the gcloud cli creates a . dir.
  return process.env.HOME && path.resolve(process.env.HOME, '.config');
})();

const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
const GCLOUD_CREDENTIAL_PATH = configDir && path.resolve(configDir, GCLOUD_CREDENTIAL_SUFFIX);

const REFRESH_TOKEN_HOST = 'www.googleapis.com';
const REFRESH_TOKEN_PATH = '/oauth2/v4/token';

const ONE_HOUR_IN_SECONDS = 60 * 60;
const JWT_ALGORITHM = 'RS256';


function copyAttr(to: {[key: string]: any}, from: {[key: string]: any}, key: string, alt: string) {
  const tmp = from[key] || from[alt];
  if (typeof tmp !== 'undefined') {
    to[key] = tmp;
  }
}

export class RefreshToken {
  public clientId: string;
  public clientSecret: string;
  public refreshToken: string;
  public type: string;

  /*
   * Tries to load a RefreshToken from a path. If the path is not present, returns null.
   * Throws if data at the path is invalid.
   */
  public static fromPath(filePath: string): RefreshToken {
    let jsonString: string;

    try {
      jsonString = fs.readFileSync(filePath, 'utf8');
    } catch (ignored) {
      // Ignore errors if the file is not present, as this is sometimes an expected condition
      return null;
    }

    try {
      return new RefreshToken(JSON.parse(jsonString));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse refresh token file: ' + error,
      );
    }
  }

  constructor(json: object) {
    copyAttr(this, json, 'clientId', 'client_id');
    copyAttr(this, json, 'clientSecret', 'client_secret');
    copyAttr(this, json, 'refreshToken', 'refresh_token');
    copyAttr(this, json, 'type', 'type');

    let errorMessage;
    if (typeof this.clientId !== 'string' || !this.clientId) {
      errorMessage = 'Refresh token must contain a "client_id" property.';
    } else if (typeof this.clientSecret !== 'string' || !this.clientSecret) {
      errorMessage = 'Refresh token must contain a "client_secret" property.';
    } else if (typeof this.refreshToken !== 'string' || !this.refreshToken) {
      errorMessage = 'Refresh token must contain a "refresh_token" property.';
    } else if (typeof this.type !== 'string' || !this.type) {
      errorMessage = 'Refresh token must contain a "type" property.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    }
  }
}

/**
 * A struct containing the properties necessary to use service-account JSON credentials.
 */
export class Certificate {
  public projectId: string;
  public privateKey: string;
  public clientEmail: string;

  public static fromPath(filePath: string): Certificate {
    // Node bug encountered in v6.x. fs.readFileSync hangs when path is a 0 or 1.
    if (typeof filePath !== 'string') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse certificate key file: TypeError: path must be a string',
      );
    }
    try {
      return new Certificate(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse certificate key file: ' + error,
      );
    }
  }

  constructor(json: object) {
    if (typeof json !== 'object' || json === null) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Certificate object must be an object.',
      );
    }

    copyAttr(this, json, 'projectId', 'project_id');
    copyAttr(this, json, 'privateKey', 'private_key');
    copyAttr(this, json, 'clientEmail', 'client_email');

    let errorMessage;
    if (typeof this.privateKey !== 'string' || !this.privateKey) {
      errorMessage = 'Certificate object must contain a string "private_key" property.';
    } else if (typeof this.clientEmail !== 'string' || !this.clientEmail) {
      errorMessage = 'Certificate object must contain a string "client_email" property.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    }

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
 * Interface for Google OAuth 2.0 access tokens.
 */
export interface GoogleOAuthAccessToken {
  /* tslint:disable:variable-name */
  access_token: string;
  expires_in: number;
  /* tslint:enable:variable-name */
}

/**
 * Obtain a new OAuth2 token by making a remote service call.
 */
function requestAccessToken(client: HttpClient, request: HttpRequestConfig): Promise<GoogleOAuthAccessToken> {
  return client.send(request).then((resp) => {
    const json = resp.data;
    if (json.error) {
      let errorMessage = 'Error fetching access token: ' + json.error;
      if (json.error_description) {
        errorMessage += ' (' + json.error_description + ')';
      }
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    } else if (!json.access_token || !json.expires_in) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        `Unexpected response while fetching access token: ${ JSON.stringify(json) }`,
      );
    } else {
      return json;
    }
  }).catch((err) => {
    throw new FirebaseAppError(
      AppErrorCodes.INVALID_CREDENTIAL,
      `Failed to parse access token response: ${err.toString()}`,
    );
  });
}

/**
 * Implementation of Credential that uses a service account certificate.
 */
export class CertCredential implements Credential {

  private readonly certificate: Certificate;
  private readonly httpClient: HttpClient;
  private readonly httpAgent: Agent;

  constructor(serviceAccountPathOrObject: string | object, httpAgent?: Agent) {
    this.certificate = (typeof serviceAccountPathOrObject === 'string') ?
      Certificate.fromPath(serviceAccountPathOrObject) : new Certificate(serviceAccountPathOrObject);
    this.httpClient = new HttpClient();
    this.httpAgent = httpAgent;
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

  public getCertificate(): Certificate {
    return this.certificate;
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

    const jwt = require('jsonwebtoken');
    // This method is actually synchronous so we can capture and return the buffer.
    return jwt.sign(claims, this.certificate.privateKey, {
      audience: GOOGLE_TOKEN_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this.certificate.clientEmail,
      algorithm: JWT_ALGORITHM,
    });
  }
}

/**
 * Interface for things that generate access tokens.
 */
export interface Credential {
  getAccessToken(): Promise<GoogleOAuthAccessToken>;
  getCertificate(): Certificate;
}

/**
 * Implementation of Credential that gets access tokens from refresh tokens.
 */
export class RefreshTokenCredential implements Credential {

  private readonly refreshToken: RefreshToken;
  private readonly httpClient: HttpClient;
  private readonly httpAgent: Agent;

  constructor(refreshTokenPathOrObject: string | object, httpAgent?: Agent) {
    this.refreshToken = (typeof refreshTokenPathOrObject === 'string') ?
      RefreshToken.fromPath(refreshTokenPathOrObject) : new RefreshToken(refreshTokenPathOrObject);
    this.httpClient = new HttpClient();
    this.httpAgent = httpAgent;
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const postData =
      'client_id=' + this.refreshToken.clientId + '&' +
      'client_secret=' + this.refreshToken.clientSecret + '&' +
      'refresh_token=' + this.refreshToken.refreshToken + '&' +
      'grant_type=refresh_token';
    const request: HttpRequestConfig = {
      method: 'POST',
      url: `https://${REFRESH_TOKEN_HOST}${REFRESH_TOKEN_PATH}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: postData,
      httpAgent: this.httpAgent,
    };
    return requestAccessToken(this.httpClient, request);
  }

  public getCertificate(): Certificate {
    return null;
  }
}


/**
 * Implementation of Credential that gets access tokens from the metadata service available
 * in the Google Cloud Platform. This authenticates the process as the default service account
 * of an App Engine instance or Google Compute Engine machine.
 */
export class MetadataServiceCredential implements Credential {

  private readonly httpClient = new HttpClient();
  private readonly httpAgent: Agent;

  constructor(httpAgent?: Agent) {
    this.httpAgent = httpAgent;
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const request: HttpRequestConfig = {
      method: 'GET',
      url: `http://${GOOGLE_METADATA_SERVICE_HOST}${GOOGLE_METADATA_SERVICE_PATH}`,
      httpAgent: this.httpAgent,
    };
    return requestAccessToken(this.httpClient, request);
  }

  public getCertificate(): Certificate {
    return null;
  }
}


/**
 * ApplicationDefaultCredential implements the process for loading credentials as
 * described in https://developers.google.com/identity/protocols/application-default-credentials
 */
export class ApplicationDefaultCredential implements Credential {
  private credential_: Credential;

  constructor(httpAgent?: Agent) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.credential_ = credentialFromFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, httpAgent);
      return;
    }

    // It is OK to not have this file. If it is present, it must be valid.
    const refreshToken = RefreshToken.fromPath(GCLOUD_CREDENTIAL_PATH);
    if (refreshToken) {
      this.credential_ = new RefreshTokenCredential(refreshToken, httpAgent);
      return;
    }

    this.credential_ = new MetadataServiceCredential(httpAgent);
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    return this.credential_.getAccessToken();
  }

  public getCertificate(): Certificate {
    return this.credential_.getCertificate();
  }

  // Used in testing to verify we are delegating to the correct implementation.
  public getCredential(): Credential {
    return this.credential_;
  }
}

function credentialFromFile(filePath: string, httpAgent?: Agent): Credential {
  const credentialsFile = readCredentialFile(filePath);
  if (typeof credentialsFile !== 'object') {
    throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse contents of the credentials file as an object',
    );
  }
  if (credentialsFile.type === 'service_account') {
    return new CertCredential(credentialsFile, httpAgent);
  }
  if (credentialsFile.type === 'authorized_user') {
    return new RefreshTokenCredential(credentialsFile, httpAgent);
  }
  throw new FirebaseAppError(
      AppErrorCodes.INVALID_CREDENTIAL,
      'Invalid contents in the credentials file',
  );
}

function readCredentialFile(filePath: string): {[key: string]: any} {
  if (typeof filePath !== 'string') {
    throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse credentials file: TypeError: path must be a string',
    );
  }
  let fileText: string;
  try {
    fileText = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        `Failed to read credentials from file ${filePath}: ` + error,
    );
  }
  try {
    return JSON.parse(fileText);
  } catch (error) {
    throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse contents of the credentials file as an object: ' + error,
    );
  }
}

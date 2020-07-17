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

// Use untyped import syntax for Node built-ins
import os = require('os');
import fs = require('fs');
import path = require('path');

import {AppErrorCodes, FirebaseAppError} from '../internal/error';
import {HttpClient, HttpRequestConfig} from '../internal/api-request';
import {ServiceAccountCredential, ComputeEngineCredential, requestAccessToken, copyAttr} from './credential-internal';
import {Agent} from 'http';
import * as util from '../internal/validator';

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
 * Interface for things that generate access tokens.
 */
export interface Credential {
  getAccessToken(): Promise<GoogleOAuthAccessToken>;
}

/**
 * Implementation of Credential that gets access tokens from refresh tokens.
 */
export class RefreshTokenCredential implements Credential {

  private readonly refreshToken: RefreshToken;
  private readonly httpClient: HttpClient;

  /**
   * Creates a new RefreshTokenCredential from the given parameters.
   *
   * @param refreshTokenPathOrObject Refresh token json object or path to a refresh token (user credentials) json file.
   * @param httpAgent Optional http.Agent to use when calling the remote token server.
   * @param implicit An optinal boolean indicating whether this credential was implicitly discovered from the
   *   environment, as opposed to being explicitly specified by the developer.
   *
   * @constructor
   */
  constructor(
    refreshTokenPathOrObject: string | object,
    private readonly httpAgent?: Agent,
    readonly implicit: boolean = false) {

    this.refreshToken = (typeof refreshTokenPathOrObject === 'string') ?
      RefreshToken.fromPath(refreshTokenPathOrObject)
      : new RefreshToken(refreshTokenPathOrObject);
    this.httpClient = new HttpClient();
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
}

class RefreshToken {

  public readonly clientId: string;
  public readonly clientSecret: string;
  public readonly refreshToken: string;
  public readonly type: string;

  /*
   * Tries to load a RefreshToken from a path. Throws if the path doesn't exist or the
   * data at the path is invalid.
   */
  public static fromPath(filePath: string): RefreshToken {
    try {
      return new RefreshToken(JSON.parse(fs.readFileSync(filePath, 'utf8')));
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
    if (!util.isNonEmptyString(this.clientId)) {
      errorMessage = 'Refresh token must contain a "client_id" property.';
    } else if (!util.isNonEmptyString(this.clientSecret)) {
      errorMessage = 'Refresh token must contain a "client_secret" property.';
    } else if (!util.isNonEmptyString(this.refreshToken)) {
      errorMessage = 'Refresh token must contain a "refresh_token" property.';
    } else if (!util.isNonEmptyString(this.type)) {
      errorMessage = 'Refresh token must contain a "type" property.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    }
  }
}

export function getApplicationDefault(httpAgent?: Agent): Credential {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return credentialFromFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, httpAgent);
  }

  // It is OK to not have this file. If it is present, it must be valid.
  if (GCLOUD_CREDENTIAL_PATH) {
    const refreshToken = readCredentialFile(GCLOUD_CREDENTIAL_PATH, true);
    if (refreshToken) {
      return new RefreshTokenCredential(refreshToken, httpAgent, true);
    }
  }

  return new ComputeEngineCredential(httpAgent);
}

/**
 * Checks if the given credential was loaded via the application default credentials mechanism. This
 * includes all ComputeEngineCredential instances, and the ServiceAccountCredential and RefreshTokenCredential
 * instances that were loaded from well-known files or environment variables, rather than being explicitly
 * instantiated.
 *
 * @param credential The credential instance to check.
 */
export function isApplicationDefault(credential?: Credential): boolean {
  return credential instanceof ComputeEngineCredential ||
    (credential instanceof ServiceAccountCredential && credential.implicit) ||
    (credential instanceof RefreshTokenCredential && credential.implicit);
}


function credentialFromFile(filePath: string, httpAgent?: Agent): Credential {
  const credentialsFile = readCredentialFile(filePath);
  if (typeof credentialsFile !== 'object' || credentialsFile === null) {
    throw new FirebaseAppError(
      AppErrorCodes.INVALID_CREDENTIAL,
      'Failed to parse contents of the credentials file as an object',
    );
  }

  if (credentialsFile.type === 'service_account') {
    return new ServiceAccountCredential(credentialsFile, httpAgent, true);
  }

  if (credentialsFile.type === 'authorized_user') {
    return new RefreshTokenCredential(credentialsFile, httpAgent, true);
  }

  throw new FirebaseAppError(
    AppErrorCodes.INVALID_CREDENTIAL,
    'Invalid contents in the credentials file',
  );
}

function readCredentialFile(filePath: string, ignoreMissing?: boolean): {[key: string]: any} | null {
  let fileText: string;
  try {
    fileText = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (ignoreMissing) {
      return null;
    }

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
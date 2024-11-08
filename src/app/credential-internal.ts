/*!
 * @license
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

import { Credentials as GoogleAuthCredentials, GoogleAuth, Compute, AnyAuthClient } from 'google-auth-library'
import { Agent } from 'http';
import { Credential, GoogleOAuthAccessToken } from './credential';
import { AppErrorCodes, FirebaseAppError } from '../utils/error';
import * as util from '../utils/validator';

const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Implementation of ADC that uses google-auth-library-nodejs.
 */
export class ApplicationDefaultCredential implements Credential {

  private readonly googleAuth: GoogleAuth;
  private authClient: AnyAuthClient;
  private projectId?: string;
  private quotaProjectId?: string;
  private accountId?: string;

  constructor(httpAgent?: Agent) {
    this.googleAuth = new GoogleAuth({
      scopes: SCOPES,
      clientOptions: {
        transporterOptions: {
          agent: httpAgent,
        },
      },
    });
  }

  public async getAccessToken(): Promise<GoogleOAuthAccessToken> {
    if (!this.authClient) {
      this.authClient = await this.googleAuth.getClient();
    }
    await this.authClient.getAccessToken();
    const credentials = this.authClient.credentials;
    this.quotaProjectId = this.authClient.quotaProjectId;
    return populateCredential(credentials);
  }

  public async getProjectId(): Promise<string> {
    if (!this.projectId) {
      this.projectId = await this.googleAuth.getProjectId();
    }
    return Promise.resolve(this.projectId);
  }

  public getQuotaProjectId(): string | undefined {
    if (!this.quotaProjectId) {
      this.quotaProjectId = this.authClient?.quotaProjectId;
    }
    return this.quotaProjectId;
  }

  public async isComputeEngineCredential(): Promise<boolean> {
    if (!this.authClient) {
      this.authClient = await this.googleAuth.getClient();
    }
    return Promise.resolve(this.authClient instanceof Compute);
  }

  /**
 * getIDToken returns a OIDC token from the compute metadata service 
 * that can be used to make authenticated calls to audience
 * @param audience the URL the returned ID token will be used to call.
*/
  public async getIDToken(audience: string): Promise<string> {
    if (await this.isComputeEngineCredential()) {
      return (this.authClient as Compute).fetchIdToken(audience);
    }
    else {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Credentials type should be Compute Engine Credentials.',
      );
    }
  }

  public async getServiceAccountEmail(): Promise<string> {
    if (this.accountId) {
      return Promise.resolve(this.accountId);
    }

    const { client_email: clientEmail } = await this.googleAuth.getCredentials();
    this.accountId = clientEmail ?? '';
    return Promise.resolve(this.accountId);
  }
}

/**
 * Implementation of Credential that uses a service account.
 */
export class ServiceAccountCredential implements Credential {

  public readonly projectId: string;
  public readonly privateKey: string;
  public readonly clientEmail: string;

  private googleAuth: GoogleAuth;
  private authClient: AnyAuthClient | undefined;

  /**
   * Creates a new ServiceAccountCredential from the given parameters.
   *
   * @param serviceAccountPathOrObject - Service account json object or path to a service account json file.
   * @param httpAgent - Optional http.Agent to use when calling the remote token server.
   * @param implicit - An optional boolean indicating whether this credential was implicitly discovered from the
   *   environment, as opposed to being explicitly specified by the developer.
   *
   * @constructor
   */
  constructor(
    private readonly serviceAccountPathOrObject: string | object,
    private readonly httpAgent?: Agent,
    readonly implicit: boolean = false) {

    const serviceAccount = (typeof serviceAccountPathOrObject === 'string') ?
      ServiceAccount.fromPath(serviceAccountPathOrObject)
      : new ServiceAccount(serviceAccountPathOrObject);
    this.projectId = serviceAccount.projectId;
    this.privateKey = serviceAccount.privateKey;
    this.clientEmail = serviceAccount.clientEmail;
  }

  private getGoogleAuth(): GoogleAuth {
    if (this.googleAuth) {
      return this.googleAuth;
    }
    const { auth, client } = populateGoogleAuth(this.serviceAccountPathOrObject, this.httpAgent);
    this.googleAuth = auth;
    this.authClient = client;
    return this.googleAuth;
  }

  public async getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const googleAuth = this.getGoogleAuth();
    if (this.authClient === undefined) {
      this.authClient = await googleAuth.getClient();
    }
    await this.authClient.getAccessToken();
    const credentials = this.authClient.credentials;
    return populateCredential(credentials);
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
 * Implementation of Credential that gets access tokens from refresh tokens.
 */
export class RefreshTokenCredential implements Credential {

  private googleAuth: GoogleAuth;
  private authClient: AnyAuthClient | undefined;

  /**
   * Creates a new RefreshTokenCredential from the given parameters.
   *
   * @param refreshTokenPathOrObject - Refresh token json object or path to a refresh token
   *   (user credentials) json file.
   * @param httpAgent - Optional http.Agent to use when calling the remote token server.
   * @param implicit - An optinal boolean indicating whether this credential was implicitly
   *   discovered from the environment, as opposed to being explicitly specified by the developer.
   *
   * @constructor
   */
  constructor(
    private readonly refreshTokenPathOrObject: string | object,
    private readonly httpAgent?: Agent,
    readonly implicit: boolean = false) {

    (typeof refreshTokenPathOrObject === 'string') ?
      RefreshToken.validateFromPath(refreshTokenPathOrObject)
      : RefreshToken.validateFromJSON(refreshTokenPathOrObject);
  }

  private getGoogleAuth(): GoogleAuth {
    if (this.googleAuth) {
      return this.googleAuth;
    }
    const { auth, client } = populateGoogleAuth(this.refreshTokenPathOrObject, this.httpAgent);
    this.googleAuth = auth;
    this.authClient = client;
    return this.googleAuth;
  }

  public async getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const googleAuth = this.getGoogleAuth();
    if (this.authClient === undefined) {
      this.authClient = await googleAuth.getClient();
    }
    await this.authClient.getAccessToken();
    const credentials = this.authClient.credentials;
    return populateCredential(credentials);
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
  public static validateFromPath(filePath: string): void {
    try {
      RefreshToken.validateFromJSON(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse refresh token file: ' + error,
      );
    }
  }

  public static validateFromJSON(json: object): void {

    const creds = { clientId: '', clientSecret: '', refreshToken: '', type: '' };

    copyAttr(creds, json, 'clientId', 'client_id');
    copyAttr(creds, json, 'clientSecret', 'client_secret');
    copyAttr(creds, json, 'refreshToken', 'refresh_token');
    copyAttr(creds, json, 'type', 'type');

    let errorMessage;
    if (!util.isNonEmptyString(creds.clientId)) {
      errorMessage = 'Refresh token must contain a "client_id" property.';
    } else if (!util.isNonEmptyString(creds.clientSecret)) {
      errorMessage = 'Refresh token must contain a "client_secret" property.';
    } else if (!util.isNonEmptyString(creds.refreshToken)) {
      errorMessage = 'Refresh token must contain a "refresh_token" property.';
    } else if (!util.isNonEmptyString(creds.type)) {
      errorMessage = 'Refresh token must contain a "type" property.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    }
  }
}

/**
 * Implementation of Credential that uses impersonated service account.
 */
export class ImpersonatedServiceAccountCredential implements Credential {

  private googleAuth: GoogleAuth;
  private authClient: AnyAuthClient | undefined;

  /**
   * Creates a new ImpersonatedServiceAccountCredential from the given parameters.
   *
   * @param impersonatedServiceAccountPathOrObject - Impersonated Service account json object or
   * path to a service account json file.
   * @param httpAgent - Optional http.Agent to use when calling the remote token server.
   * @param implicit - An optional boolean indicating whether this credential was implicitly
   *   discovered from the environment, as opposed to being explicitly specified by the developer.
   *
   * @constructor
   */
  constructor(
    private readonly impersonatedServiceAccountPathOrObject: string | object,
    private readonly httpAgent?: Agent,
    readonly implicit: boolean = false) {

    (typeof impersonatedServiceAccountPathOrObject === 'string') ?
      ImpersonatedServiceAccount.validateFromPath(impersonatedServiceAccountPathOrObject)
      : ImpersonatedServiceAccount.validateFromJSON(impersonatedServiceAccountPathOrObject);
  }

  private getGoogleAuth(): GoogleAuth {
    if (this.googleAuth) {
      return this.googleAuth;
    }
    const { auth, client } = populateGoogleAuth(this.impersonatedServiceAccountPathOrObject, this.httpAgent);
    this.googleAuth = auth;
    this.authClient = client;
    return this.googleAuth;
  }

  public async getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const googleAuth = this.getGoogleAuth();
    if (this.authClient === undefined) {
      this.authClient = await googleAuth.getClient();
    }
    await this.authClient.getAccessToken();
    const credentials = this.authClient.credentials;
    return populateCredential(credentials);
  }
}

/**
 * A helper class to validate the properties necessary to use impersonated service account credentials.
 */
class ImpersonatedServiceAccount {

  /*
   * Tries to load a ImpersonatedServiceAccount from a path. Throws if the path doesn't exist or the
   * data at the path is invalid.
   */
  public static validateFromPath(filePath: string): void {
    try {
      ImpersonatedServiceAccount.validateFromJSON(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Failed to parse impersonated service account file: ' + error,
      );
    }
  }

  public static validateFromJSON(json: object): void {
    const {
      client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, type
    } = (json as { [key: string]: any })['source_credentials'];

    let errorMessage;
    if (!util.isNonEmptyString(clientId)) {
      errorMessage = 'Impersonated Service Account must contain a "source_credentials.client_id" property.';
    } else if (!util.isNonEmptyString(clientSecret)) {
      errorMessage = 'Impersonated Service Account must contain a "source_credentials.client_secret" property.';
    } else if (!util.isNonEmptyString(refreshToken)) {
      errorMessage = 'Impersonated Service Account must contain a "source_credentials.refresh_token" property.';
    } else if (!util.isNonEmptyString(type)) {
      errorMessage = 'Impersonated Service Account must contain a "source_credentials.type" property.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
    }
  }
}

/**
 * Checks if the given credential was loaded via the application default credentials mechanism.
 *
 * @param credential - The credential instance to check.
 */
export function isApplicationDefault(credential?: Credential): boolean {
  return credential instanceof ApplicationDefaultCredential ||
    (credential instanceof RefreshTokenCredential && credential.implicit);
}

export function getApplicationDefault(httpAgent?: Agent): Credential {
  return new ApplicationDefaultCredential(httpAgent);
}

/**
 * Copies the specified property from one object to another.
 *
 * If no property exists by the given "key", looks for a property identified by "alt", and copies it instead.
 * This can be used to implement behaviors such as "copy property myKey or my_key".
 *
 * @param to - Target object to copy the property into.
 * @param from - Source object to copy the property from.
 * @param key - Name of the property to copy.
 * @param alt - Alternative name of the property to copy.
 */
function copyAttr(to: { [key: string]: any }, from: { [key: string]: any }, key: string, alt: string): void {
  const tmp = from[key] || from[alt];
  if (typeof tmp !== 'undefined') {
    to[key] = tmp;
  }
}

/**
 * Populate google-auth-library GoogleAuth credentials type.
 */
function populateGoogleAuth(keyFile: string | object, httpAgent?: Agent)
  : { auth: GoogleAuth, client: AnyAuthClient | undefined } {
  let client: AnyAuthClient | undefined;
  const auth = new GoogleAuth({
    scopes: SCOPES,
    clientOptions: {
      transporterOptions: {
        agent: httpAgent,
      },
    },
    keyFile: (typeof keyFile === 'string') ? keyFile : undefined,
  });

  if (typeof keyFile === 'object') {
    if (!util.isNonNullObject(keyFile)) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_CREDENTIAL,
        'Service account must be an object.',
      );
    }
    client = auth.fromJSON(keyFile);
  }
  return { auth, client };
}

/**
 * Populate GoogleOAuthAccessToken credentials from google-auth-library Credentials type.
 */
function populateCredential(credentials?: GoogleAuthCredentials): GoogleOAuthAccessToken {
  const accessToken = credentials?.access_token;
  const expiryDate = credentials?.expiry_date;

  if (typeof accessToken !== 'string')
    throw new FirebaseAppError(
      AppErrorCodes.INVALID_CREDENTIAL,
      'Failed to parse Google auth credential: access_token must be a non empty string.',
    );
  if (typeof expiryDate !== 'number')
    throw new FirebaseAppError(
      AppErrorCodes.INVALID_CREDENTIAL,
      'Failed to parse Google auth credential: Invalid expiry_date.',
    );

  return {
    ...credentials,
    access_token: accessToken,
    // inverse operation of following
    // https://github.com/googleapis/google-auth-library-nodejs/blob/5ed910513451c82e2551777a3e2212964799ef8e/src/auth/baseexternalclient.ts#L446-L446
    expires_in: Math.floor((expiryDate - new Date().getTime()) / 1000),
  }
}

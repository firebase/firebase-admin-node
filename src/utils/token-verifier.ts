/*!
 * Copyright 2021 Google Inc.
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

import * as util from './index';
import * as validator from './validator';
import * as jwt from 'jsonwebtoken';
import { HttpClient, HttpRequestConfig, HttpError } from './api-request';
import { FirebaseApp } from '../firebase-app';
import { ErrorCodeConfig, ErrorInfo, PrefixedFirebaseError } from './error';
import { auth } from '../auth/index';

import DecodedIdToken = auth.DecodedIdToken;

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

/** Interface that defines token related user facing information. */
export interface FirebaseTokenInfo {
  /** Documentation URL. */
  url: string;
  /** verify API name. */
  verifyApiName: string;
  /** The JWT full name. */
  jwtName: string;
  /** The JWT short name. */
  shortName: string;
  /** Error code config of the public error type. */
  errorCodeConfig: ErrorCodeConfig;
  /** Public error type. */
  errorType: new (info: ErrorInfo, message?: string) => PrefixedFirebaseError;
}

/**
 * Class for verifying general purpose Firebase JWTs. This verifies ID tokens and session cookies.
 */
export class FirebaseTokenVerifier {
  private publicKeys: {[key: string]: string};
  private publicKeysExpireAt: number;
  private readonly shortNameArticle: string;

  constructor(private clientCertUrl: string, private algorithm: jwt.Algorithm,
              private issuer: string, private tokenInfo: FirebaseTokenInfo,
              private readonly app: FirebaseApp) {

    if (!validator.isURL(clientCertUrl)) {
      throw new Error('The provided public client certificate URL is an invalid URL.');
    } else if (!validator.isNonEmptyString(algorithm)) {
      throw new Error('The provided JWT algorithm is an empty string.');
    } else if (!validator.isURL(issuer)) {
      throw new Error('The provided JWT issuer is an invalid URL.');
    } else if (!validator.isNonNullObject(tokenInfo)) {
      throw new Error('The provided JWT information is not an object or null.');
    } else if (!validator.isURL(tokenInfo.url)) {
      throw new Error('The provided JWT verification documentation URL is invalid.');
    } else if (!validator.isNonEmptyString(tokenInfo.verifyApiName)) {
      throw new Error('The JWT verify API name must be a non-empty string.');
    } else if (!validator.isNonEmptyString(tokenInfo.jwtName)) {
      throw new Error('The JWT public full name must be a non-empty string.');
    } else if (!validator.isNonEmptyString(tokenInfo.shortName)) {
      throw new Error('The JWT public short name must be a non-empty string.');
    } else if (!(typeof tokenInfo.errorType === 'function' && tokenInfo.errorType !== null)) {
      throw new Error('The provided error type must be a non-null PrefixedFirebaseError type.');
    } else if (!validator.isNonNullObject(tokenInfo.errorCodeConfig) ||
      !('invalidArg' in tokenInfo.errorCodeConfig ||
        'invalidCredential' in tokenInfo.errorCodeConfig ||
        'internalError' in tokenInfo.errorCodeConfig ||
        'expiredError' in tokenInfo.errorCodeConfig)) {
      throw new Error('The provided error code config must be a non-null ErrorCodeInfo object.');
    }
    this.shortNameArticle = tokenInfo.shortName.charAt(0).match(/[aeiou]/i) ? 'an' : 'a';

    // For backward compatibility, the project ID is validated in the verification call.
  }

  /**
   * Verifies the format and signature of a Firebase Auth JWT token.
   *
   * @param {string} jwtToken The Firebase Auth JWT token to verify.
   * @param {boolean=} isEmulator Whether to accept Auth Emulator tokens.
   * @return {Promise<DecodedIdToken>} A promise fulfilled with the decoded claims of the Firebase Auth ID
   *                           token.
   */
  public verifyJWT(jwtToken: string, isEmulator = false): Promise<DecodedIdToken> {
    if (!validator.isString(jwtToken)) {
      throw new this.tokenInfo.errorType(
        this.tokenInfo.errorCodeConfig.invalidArg,
        `First argument to ${this.tokenInfo.verifyApiName} must be a ${this.tokenInfo.jwtName} string.`,
      );
    }

    return util.findProjectId(this.app)
      .then((projectId) => {
        return this.verifyJWTWithProjectId(jwtToken, projectId, isEmulator);
      });
  }

  private verifyJWTWithProjectId(
    jwtToken: string,
    projectId: string | null,
    isEmulator: boolean
  ): Promise<DecodedIdToken> {
    if (!validator.isNonEmptyString(projectId)) {
      throw new this.tokenInfo.errorType(
        this.tokenInfo.errorCodeConfig.invalidCredential,
        'Must initialize app with a cert credential or set your Firebase project ID as the ' +
        `GOOGLE_CLOUD_PROJECT environment variable to call ${this.tokenInfo.verifyApiName}.`,
      );
    }

    const fullDecodedToken: any = jwt.decode(jwtToken, {
      complete: true,
    });

    const header = fullDecodedToken && fullDecodedToken.header;
    const payload = fullDecodedToken && fullDecodedToken.payload;

    const projectIdMatchMessage = ` Make sure the ${this.tokenInfo.shortName} comes from the same ` +
      'Firebase project as the service account used to authenticate this SDK.';
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
      `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;

    let errorMessage: string | undefined;
    if (!fullDecodedToken) {
      errorMessage = `Decoding ${this.tokenInfo.jwtName} failed. Make sure you passed the entire string JWT ` +
        `which represents ${this.shortNameArticle} ${this.tokenInfo.shortName}.` + verifyJwtTokenDocsMessage;
    } else if (!isEmulator && typeof header.kid === 'undefined') {
      const isCustomToken = (payload.aud === FIREBASE_AUDIENCE);
      const isLegacyCustomToken = (header.alg === 'HS256' && payload.v === 0 && 'd' in payload && 'uid' in payload.d);

      if (isCustomToken) {
        errorMessage = `${this.tokenInfo.verifyApiName} expects ${this.shortNameArticle} ` +
          `${this.tokenInfo.shortName}, but was given a custom token.`;
      } else if (isLegacyCustomToken) {
        errorMessage = `${this.tokenInfo.verifyApiName} expects ${this.shortNameArticle} ` +
          `${this.tokenInfo.shortName}, but was given a legacy custom token.`;
      } else {
        errorMessage = 'Firebase ID token has no "kid" claim.';
      }

      errorMessage += verifyJwtTokenDocsMessage;
    } else if (!isEmulator && header.alg !== this.algorithm) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect algorithm. Expected "` + this.algorithm + '" but got ' +
        '"' + header.alg + '".' + verifyJwtTokenDocsMessage;
    } else if (payload.aud !== projectId) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "aud" (audience) claim. Expected "` +
        projectId + '" but got "' + payload.aud + '".' + projectIdMatchMessage +
        verifyJwtTokenDocsMessage;
    } else if (payload.iss !== this.issuer + projectId) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "iss" (issuer) claim. Expected ` +
        `"${this.issuer}` + projectId + '" but got "' +
        payload.iss + '".' + projectIdMatchMessage + verifyJwtTokenDocsMessage;
    } else if (typeof payload.sub !== 'string') {
      errorMessage = `${this.tokenInfo.jwtName} has no "sub" (subject) claim.` + verifyJwtTokenDocsMessage;
    } else if (payload.sub === '') {
      errorMessage = `${this.tokenInfo.jwtName} has an empty string "sub" (subject) claim.` + verifyJwtTokenDocsMessage;
    } else if (payload.sub.length > 128) {
      errorMessage = `${this.tokenInfo.jwtName} has "sub" (subject) claim longer than 128 characters.` +
        verifyJwtTokenDocsMessage;
    }
    if (errorMessage) {
      return Promise.reject(new this.tokenInfo.errorType(this.tokenInfo.errorCodeConfig.invalidArg, errorMessage));
    }

    if (isEmulator) {
      // Signature checks skipped for emulator; no need to fetch public keys.
      return this.verifyJwtSignatureWithKey(jwtToken, null);
    }

    return this.fetchPublicKeys().then((publicKeys) => {
      if (!Object.prototype.hasOwnProperty.call(publicKeys, header.kid)) {
        return Promise.reject(
          new this.tokenInfo.errorType(
            this.tokenInfo.errorCodeConfig.invalidArg,
            `${this.tokenInfo.jwtName} has "kid" claim which does not correspond to a known public key. ` +
            `Most likely the ${this.tokenInfo.shortName} is expired, so get a fresh token from your ` +
            'client app and try again.',
          ),
        );
      } else {
        return this.verifyJwtSignatureWithKey(jwtToken, publicKeys[header.kid]);
      }

    });
  }

  /**
   * Verifies the JWT signature using the provided public key.
   * @param {string} jwtToken The JWT token to verify.
   * @param {string} publicKey The public key certificate.
   * @return {Promise<DecodedIdToken>} A promise that resolves with the decoded JWT claims on successful
   *     verification.
   */
  private verifyJwtSignatureWithKey(jwtToken: string, publicKey: string | null): Promise<DecodedIdToken> {
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
      `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;
    return new Promise((resolve, reject) => {
      const verifyOptions: jwt.VerifyOptions = {};
      if (publicKey !== null) {
        verifyOptions.algorithms = [this.algorithm];
      }
      jwt.verify(jwtToken, publicKey || '', verifyOptions,
        (error: jwt.VerifyErrors | null, decodedToken: object | undefined) => {
          if (error) {
            if (error.name === 'TokenExpiredError') {
              const errorMessage = `${this.tokenInfo.jwtName} has expired. Get a fresh ${this.tokenInfo.shortName}` +
                ` from your client app and try again (auth/${this.tokenInfo.errorCodeConfig.expiredError.code}).` +
                verifyJwtTokenDocsMessage;
              return reject(new this.tokenInfo.errorType(this.tokenInfo.errorCodeConfig.expiredError, errorMessage));
            } else if (error.name === 'JsonWebTokenError') {
              const errorMessage = `${this.tokenInfo.jwtName} has invalid signature.` + verifyJwtTokenDocsMessage;
              return reject(new this.tokenInfo.errorType(this.tokenInfo.errorCodeConfig.invalidArg, errorMessage));
            }
            return reject(new this.tokenInfo.errorType(this.tokenInfo.errorCodeConfig.invalidArg, error.message));
          } else {
            const decodedIdToken = (decodedToken as DecodedIdToken);
            decodedIdToken.uid = decodedIdToken.sub;
            resolve(decodedIdToken);
          }
        });
    });
  }

  /**
   * Fetches the public keys for the Google certs.
   *
   * @return {Promise<object>} A promise fulfilled with public keys for the Google certs.
   */
  private fetchPublicKeys(): Promise<{[key: string]: string}> {
    const publicKeysExist = (typeof this.publicKeys !== 'undefined');
    const publicKeysExpiredExists = (typeof this.publicKeysExpireAt !== 'undefined');
    const publicKeysStillValid = (publicKeysExpiredExists && Date.now() < this.publicKeysExpireAt);
    if (publicKeysExist && publicKeysStillValid) {
      return Promise.resolve(this.publicKeys);
    }

    const client = new HttpClient();
    const request: HttpRequestConfig = {
      method: 'GET',
      url: this.clientCertUrl,
      httpAgent: this.app.options.httpAgent,
    };
    return client.send(request).then((resp) => {
      if (!resp.isJson() || resp.data.error) {
        // Treat all non-json messages and messages with an 'error' field as
        // error responses.
        throw new HttpError(resp);
      }
      if (Object.prototype.hasOwnProperty.call(resp.headers, 'cache-control')) {
        const cacheControlHeader: string = resp.headers['cache-control'];
        const parts = cacheControlHeader.split(',');
        parts.forEach((part) => {
          const subParts = part.trim().split('=');
          if (subParts[0] === 'max-age') {
            const maxAge: number = +subParts[1];
            this.publicKeysExpireAt = Date.now() + (maxAge * 1000);
          }
        });
      }
      this.publicKeys = resp.data;
      return resp.data;
    }).catch((err) => {
      if (err instanceof HttpError) {
        let errorMessage = 'Error fetching public keys for Google certs: ';
        const resp = err.response;
        if (resp.isJson() && resp.data.error) {
          errorMessage += `${resp.data.error}`;
          if (resp.data.error_description) {
            errorMessage += ' (' + resp.data.error_description + ')';
          }
        } else {
          errorMessage += `${resp.text}`;
        }
        throw new this.tokenInfo.errorType(this.tokenInfo.errorCodeConfig.internalError, errorMessage);
      }
      throw err;
    });
  }
}

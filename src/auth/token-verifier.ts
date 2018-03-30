/*!
 * Copyright 2018 Google Inc.
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

import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';

import * as validator from '../utils/validator';

import * as jwt from 'jsonwebtoken';

// Use untyped import syntax for Node built-ins
import https = require('https');

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
  /** JWT Expiration error code. */
  expiredErrorCode: string;
}

/**
 * Class for verifying general purpose Firebase JWTs. This verifies ID tokens and session cookies.
 */
export class FirebaseTokenVerifier {
  private publicKeys: object;
  private publicKeysExpireAt: number;
  private shortNameArticle: string;

  constructor(private clientCertUrl: string, private algorithm: string,
              private issuer: string, private projectId: string,
              private tokenInfo: FirebaseTokenInfo) {
    if (!validator.isURL(clientCertUrl)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The provided public client certificate URL is an invalid URL.`,
      );
    } else if (!validator.isNonEmptyString(algorithm)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The provided JWT algorithm is an empty string.`,
      );
    } else if (!validator.isURL(issuer)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The provided JWT issuer is an invalid URL.`,
      );
    } else if (!validator.isNonNullObject(tokenInfo)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The provided JWT information is not an object or null.`,
      );
    } else if (!validator.isURL(tokenInfo.url)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The provided JWT verification documentation URL is invalid.`,
      );
    } else if (!validator.isNonEmptyString(tokenInfo.verifyApiName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The JWT verify API name must be a non-empty string.`,
      );
    } else if (!validator.isNonEmptyString(tokenInfo.jwtName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The JWT public full name must be a non-empty string.`,
      );
    } else if (!validator.isNonEmptyString(tokenInfo.shortName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The JWT public short name must be a non-empty string.`,
      );
    } else if (!validator.isNonEmptyString(tokenInfo.expiredErrorCode)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `The JWT expiration error code must be a non-empty string.`,
      );
    }
    this.shortNameArticle = tokenInfo.shortName.charAt(0).match(/[aeiou]/i) ? 'an' : 'a';

    // For backward compatibility, the project ID is validated in the verification call.
  }

  /**
   * Verifies the format and signature of a Firebase Auth JWT token.
   *
   * @param {string} jwtToken The Firebase Auth JWT token to verify.
   * @return {Promise<object>} A promise fulfilled with the decoded claims of the Firebase Auth ID
   *                           token.
   */
  public verifyJWT(jwtToken: string): Promise<object> {
    if (!validator.isString(jwtToken)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `First argument to ${this.tokenInfo.verifyApiName} must be a ${this.tokenInfo.jwtName} string.`,
      );
    }

    if (!validator.isNonEmptyString(this.projectId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        `${this.tokenInfo.verifyApiName} requires a certificate with "project_id" set.`,
      );
    }

    const fullDecodedToken: any = jwt.decode(jwtToken, {
      complete: true,
    });

    const header = fullDecodedToken && fullDecodedToken.header;
    const payload = fullDecodedToken && fullDecodedToken.payload;

    const projectIdMatchMessage = ` Make sure the ${this.tokenInfo.shortName} comes from the same ` +
      `Firebase project as the service account used to authenticate this SDK.`;
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
      `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;

    let errorMessage: string;
    if (!fullDecodedToken) {
      errorMessage = `Decoding ${this.tokenInfo.jwtName} failed. Make sure you passed the entire string JWT ` +
        `which represents ${this.shortNameArticle} ${this.tokenInfo.shortName}.` + verifyJwtTokenDocsMessage;
    } else if (typeof header.kid === 'undefined') {
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
    } else if (header.alg !== this.algorithm) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect algorithm. Expected "` + this.algorithm + `" but got ` +
        `"` + header.alg + `".` + verifyJwtTokenDocsMessage;
    } else if (payload.aud !== this.projectId) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "aud" (audience) claim. Expected "` +
        this.projectId + `" but got "` + payload.aud + `".` + projectIdMatchMessage +
        verifyJwtTokenDocsMessage;
    } else if (payload.iss !== this.issuer + this.projectId) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "iss" (issuer) claim. Expected ` +
        `"${this.issuer}"` + this.projectId + `" but got "` +
        payload.iss + `".` + projectIdMatchMessage + verifyJwtTokenDocsMessage;
    } else if (typeof payload.sub !== 'string') {
      errorMessage = `${this.tokenInfo.jwtName} has no "sub" (subject) claim.` + verifyJwtTokenDocsMessage;
    } else if (payload.sub === '') {
      errorMessage = `${this.tokenInfo.jwtName} has an empty string "sub" (subject) claim.` + verifyJwtTokenDocsMessage;
    } else if (payload.sub.length > 128) {
      errorMessage = `${this.tokenInfo.jwtName} has "sub" (subject) claim longer than 128 characters.` +
        verifyJwtTokenDocsMessage;
    }
    if (typeof errorMessage !== 'undefined') {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage));
    }

    return this.fetchPublicKeys().then((publicKeys) => {
      if (!publicKeys.hasOwnProperty(header.kid)) {
        return Promise.reject(
          new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            `${this.tokenInfo.jwtName} has "kid" claim which does not correspond to a known public key. ` +
            `Most likely the ${this.tokenInfo.shortName} is expired, so get a fresh token from your ` +
            `client app and try again.`,
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
   * @return {Promise<object>} A promise that resolves with the decoded JWT claims on successful
   *     verification.
   */
  private verifyJwtSignatureWithKey(jwtToken: string, publicKey: string): Promise<object> {
    let errorMessage: string;
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
      `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;
    return new Promise((resolve, reject) => {
      jwt.verify(jwtToken, publicKey, {
        algorithms: [this.algorithm],
      }, (error, decodedToken: any) => {
        if (error) {
          if (error.name === 'TokenExpiredError') {
            errorMessage = `${this.tokenInfo.jwtName} has expired. Get a fresh token from your client ` +
              `app and try again (${this.tokenInfo.expiredErrorCode}).` + verifyJwtTokenDocsMessage;
          } else if (error.name === 'JsonWebTokenError') {
            errorMessage = `${this.tokenInfo.jwtName} has invalid signature.` + verifyJwtTokenDocsMessage;
          }

          return reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage));
        } else {
          decodedToken.uid = decodedToken.sub;
          resolve(decodedToken);
        }
      });
    });
  }

  /**
   * Fetches the public keys for the Google certs.
   *
   * @return {Promise<object>} A promise fulfilled with public keys for the Google certs.
   */
  private fetchPublicKeys(): Promise<object> {
    const publicKeysExist = (typeof this.publicKeys !== 'undefined');
    const publicKeysExpiredExists = (typeof this.publicKeysExpireAt !== 'undefined');
    const publicKeysStillValid = (publicKeysExpiredExists && Date.now() < this.publicKeysExpireAt);
    if (publicKeysExist && publicKeysStillValid) {
      return Promise.resolve(this.publicKeys);
    }

    return new Promise((resolve, reject) => {
      https.get(this.clientCertUrl, (res) => {
        const buffers: Buffer[] = [];

        res.on('data', (buffer) => buffers.push(buffer as Buffer));

        res.on('end', () => {
          try {
            const response = JSON.parse(Buffer.concat(buffers).toString());

            if (response.error) {
              let errorMessage = 'Error fetching public keys for Google certs: ' + response.error;
              /* istanbul ignore else */
              if (response.error_description) {
                errorMessage += ' (' + response.error_description + ')';
              }

              reject(new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR, errorMessage));
            } else {
              /* istanbul ignore else */
              if (res.headers.hasOwnProperty('cache-control')) {
                const cacheControlHeader: string = res.headers['cache-control'] as string;
                const parts = cacheControlHeader.split(',');
                parts.forEach((part) => {
                  const subParts = part.trim().split('=');
                  if (subParts[0] === 'max-age') {
                    const maxAge: number = +subParts[1];
                    this.publicKeysExpireAt = Date.now() + (maxAge * 1000);
                  }
                });
              }

              this.publicKeys = response;
              resolve(response);
            }
          } catch (e) {
            /* istanbul ignore next */
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
}

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

import {Certificate} from './credential';
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';

import * as validator from '../utils/validator';

import * as jwt from 'jsonwebtoken';

// Use untyped import syntax for Node built-ins
import https = require('https');


const ALGORITHM = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

// URL containing the public keys for the Google certs (whose private keys are used to sign Firebase
// Auth ID tokens)
const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

interface JWTPayload {
  claims?: object;
  uid?: string;
}

/**
 * Class for generating and verifying different types of Firebase Auth tokens (JWTs).
 */
export class FirebaseTokenGenerator {
  private certificate_: Certificate;
  private publicKeys_: object;
  private publicKeysExpireAt_: number;

  constructor(certificate: Certificate) {
    if (!certificate) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a certificate to use FirebaseTokenGenerator.',
      );
    }
    this.certificate_ = certificate;
  }

  /**
   * Creates a new Firebase Auth Custom token.
   *
   * @param {string} uid The user ID to use for the generated Firebase Auth Custom token.
   * @param {object} [developerClaims] Optional developer claims to include in the generated Firebase
   *                 Auth Custom token.
   * @return {Promise<string>} A Promise fulfilled with a Firebase Auth Custom token signed with a
   *                           service account key and containing the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: object): Promise<string> {
    let errorMessage: string;
    if (typeof uid !== 'string' || uid === '') {
      errorMessage = 'First argument to createCustomToken() must be a non-empty string uid.';
    } else if (uid.length > 128) {
      errorMessage = 'First argument to createCustomToken() must a uid with less than or equal to 128 characters.';
    } else if (!this.isDeveloperClaimsValid_(developerClaims)) {
      errorMessage = 'Second argument to createCustomToken() must be an object containing the developer claims.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage);
    }

    if (!validator.isNonEmptyString(this.certificate_.privateKey)) {
      errorMessage = 'createCustomToken() requires a certificate with "private_key" set.';
    } else if (!validator.isNonEmptyString(this.certificate_.clientEmail)) {
      errorMessage = 'createCustomToken() requires a certificate with "client_email" set.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_CREDENTIAL, errorMessage);
    }

    const jwtPayload: JWTPayload = {};

    if (typeof developerClaims !== 'undefined') {
      const claims = {};

      for (const key in developerClaims) {
        /* istanbul ignore else */
        if (developerClaims.hasOwnProperty(key)) {
          if (BLACKLISTED_CLAIMS.indexOf(key) !== -1) {
            throw new FirebaseAuthError(
              AuthClientErrorCode.INVALID_ARGUMENT,
              `Developer claim "${key}" is reserved and cannot be specified.`,
            );
          }

          claims[key] = developerClaims[key];
        }
      }
      jwtPayload.claims = claims;
    }
    jwtPayload.uid = uid;

    const customToken = jwt.sign(jwtPayload, this.certificate_.privateKey, {
      audience: FIREBASE_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this.certificate_.clientEmail,
      subject: this.certificate_.clientEmail,
      algorithm: ALGORITHM,
    });

    return Promise.resolve(customToken);
  }

  /**
   * Verifies the format and signature of a Firebase Auth ID token.
   *
   * @param {string} idToken The Firebase Auth ID token to verify.
   * @return {Promise<object>} A promise fulfilled with the decoded claims of the Firebase Auth ID
   *                           token.
   */
  public verifyIdToken(idToken: string): Promise<object> {
    if (typeof idToken !== 'string') {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'First argument to verifyIdToken() must be a Firebase ID token string.',
      );
    }

    if (!validator.isNonEmptyString(this.certificate_.projectId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'verifyIdToken() requires a certificate with "project_id" set.',
      );
    }

    const fullDecodedToken: any = jwt.decode(idToken, {
      complete: true,
    });

    const header = fullDecodedToken && fullDecodedToken.header;
    const payload = fullDecodedToken && fullDecodedToken.payload;

    const projectIdMatchMessage = ' Make sure the ID token comes from the same Firebase project as the ' +
      'service account used to authenticate this SDK.';
    const verifyIdTokenDocsMessage = ' See https://firebase.google.com/docs/auth/admin/verify-id-tokens ' +
      'for details on how to retrieve an ID token.';

    let errorMessage: string;
    if (!fullDecodedToken) {
      errorMessage = 'Decoding Firebase ID token failed. Make sure you passed the entire string JWT ' +
        'which represents an ID token.' + verifyIdTokenDocsMessage;
    } else if (typeof header.kid === 'undefined') {
      const isCustomToken = (payload.aud === FIREBASE_AUDIENCE);
      const isLegacyCustomToken = (header.alg === 'HS256' && payload.v === 0 && 'd' in payload && 'uid' in payload.d);

      if (isCustomToken) {
        errorMessage = 'verifyIdToken() expects an ID token, but was given a custom token.';
      } else if (isLegacyCustomToken) {
        errorMessage = 'verifyIdToken() expects an ID token, but was given a legacy custom token.';
      } else {
        errorMessage = 'Firebase ID token has no "kid" claim.';
      }

      errorMessage += verifyIdTokenDocsMessage;
    } else if (header.alg !== ALGORITHM) {
      errorMessage = 'Firebase ID token has incorrect algorithm. Expected "' + ALGORITHM + '" but got ' +
        '"' + header.alg + '".' + verifyIdTokenDocsMessage;
    } else if (payload.aud !== this.certificate_.projectId) {
      errorMessage = 'Firebase ID token has incorrect "aud" (audience) claim. Expected "' +
        this.certificate_.projectId + '" but got "' + payload.aud + '".' + projectIdMatchMessage +
        verifyIdTokenDocsMessage;
    } else if (payload.iss !== 'https://securetoken.google.com/' + this.certificate_.projectId) {
      errorMessage = 'Firebase ID token has incorrect "iss" (issuer) claim. Expected ' +
        '"https://securetoken.google.com/' + this.certificate_.projectId + '" but got "' +
        payload.iss + '".' + projectIdMatchMessage + verifyIdTokenDocsMessage;
    } else if (typeof payload.sub !== 'string') {
      errorMessage = 'Firebase ID token has no "sub" (subject) claim.' + verifyIdTokenDocsMessage;
    } else if (payload.sub === '') {
      errorMessage = 'Firebase ID token has an empty string "sub" (subject) claim.' + verifyIdTokenDocsMessage;
    } else if (payload.sub.length > 128) {
      errorMessage = 'Firebase ID token has "sub" (subject) claim longer than 128 characters.' +
        verifyIdTokenDocsMessage;
    }

    if (typeof errorMessage !== 'undefined') {
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage));
    }

    return this.fetchPublicKeys_().then((publicKeys) => {
      if (!publicKeys.hasOwnProperty(header.kid)) {
        return Promise.reject(
          new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
            'Firebase ID token has "kid" claim which does not correspond to a known public key. ' +
            'Most likely the ID token is expired, so get a fresh token from your client app and ' +
            'try again.' + verifyIdTokenDocsMessage,
          ),
        );
      }

      return new Promise((resolve, reject) => {
        jwt.verify(idToken, publicKeys[header.kid], {
          algorithms: [ALGORITHM],
        }, (error, decodedToken: any) => {
          if (error) {
            if (error.name === 'TokenExpiredError') {
              errorMessage = 'Firebase ID token has expired. Get a fresh token from your client app and try ' +
                'again (auth/id-token-expired).' + verifyIdTokenDocsMessage;
            } else if (error.name === 'JsonWebTokenError') {
              errorMessage = 'Firebase ID token has invalid signature.' + verifyIdTokenDocsMessage;
            }

            return reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage));
          } else {
            decodedToken.uid = decodedToken.sub;
            resolve(decodedToken);
          }
        });
      });
    });
  }


  /**
   * Returns whether or not the provided developer claims are valid.
   *
   * @param {object} [developerClaims] Optional developer claims to validate.
   * @return {boolean} True if the provided claims are valid; otherwise, false.
   */
  private isDeveloperClaimsValid_(developerClaims?: object): boolean {
    if (typeof developerClaims === 'undefined') {
      return true;
    }
    return validator.isNonNullObject(developerClaims);
  }


  /**
   * Fetches the public keys for the Google certs.
   *
   * @return {Promise<object>} A promise fulfilled with public keys for the Google certs.
   */
  private fetchPublicKeys_(): Promise<object> {
    const publicKeysExist = (typeof this.publicKeys_ !== 'undefined');
    const publicKeysExpiredExists = (typeof this.publicKeysExpireAt_ !== 'undefined');
    const publicKeysStillValid = (publicKeysExpiredExists && Date.now() < this.publicKeysExpireAt_);
    if (publicKeysExist && publicKeysStillValid) {
      return Promise.resolve(this.publicKeys_);
    }

    return new Promise((resolve, reject) => {
      https.get(CLIENT_CERT_URL, (res) => {
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
                    this.publicKeysExpireAt_ = Date.now() + (maxAge * 1000);
                  }
                });
              }

              this.publicKeys_ = response;
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

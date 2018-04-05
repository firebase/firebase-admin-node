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
import * as tokenVerify from './token-verifier';

import * as jwt from 'jsonwebtoken';

// Use untyped import syntax for Node built-ins
import https = require('https');


const ALGORITHM_RS256 = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

// URL containing the public keys for the Google certs (whose private keys are used to sign Firebase
// Auth ID tokens)
const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// URL containing the public keys for Firebase session cookies. This will be updated to a different URL soon.
const SESSION_COOKIE_CERT_URL = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

interface JWTPayload {
  claims?: object;
  uid?: string;
}

/** User facing token information related to the Firebase session cookie. */
export const SESSION_COOKIE_INFO: tokenVerify.FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/manage-cookies',
  verifyApiName: 'verifySessionCookie()',
  jwtName: 'Firebase session cookie',
  shortName: 'session cookie',
  expiredErrorCode: 'auth/session-cookie-expired',
};

/** User facing token information related to the Firebase ID token. */
export const ID_TOKEN_INFO: tokenVerify.FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/verify-id-tokens',
  verifyApiName: 'verifyIdToken()',
  jwtName: 'Firebase ID token',
  shortName: 'ID token',
  expiredErrorCode: 'auth/id-token-expired',
};


/**
 * Class for generating and verifying different types of Firebase Auth tokens (JWTs).
 */
export class FirebaseTokenGenerator {
  private certificate_: Certificate;
  private sessionCookieVerifier: tokenVerify.FirebaseTokenVerifier;
  private idTokenVerifier: tokenVerify.FirebaseTokenVerifier;

  constructor(certificate: Certificate) {
    if (!certificate) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a certificate to use FirebaseTokenGenerator.',
      );
    }
    this.certificate_ = certificate;
    this.sessionCookieVerifier = new tokenVerify.FirebaseTokenVerifier(
        SESSION_COOKIE_CERT_URL,
        ALGORITHM_RS256,
        'https://session.firebase.google.com/',
        this.certificate_.projectId,
        SESSION_COOKIE_INFO,
    );
    this.idTokenVerifier = new tokenVerify.FirebaseTokenVerifier(
        CLIENT_CERT_URL,
        ALGORITHM_RS256,
        'https://securetoken.google.com/',
        this.certificate_.projectId,
        ID_TOKEN_INFO,
    );
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
      algorithm: ALGORITHM_RS256,
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
    return this.idTokenVerifier.verifyJWT(idToken);
  }

  /**
   * Verifies the format and signature of a Firebase session cookie JWT.
   *
   * @param {string} sessionCookie The Firebase session cookie to verify.
   * @return {Promise<object>} A promise fulfilled with the decoded claims of the Firebase session
   *                           cookie.
   */
  public verifySessionCookie(sessionCookie: string): Promise<object> {
    return this.sessionCookieVerifier.verifyJWT(sessionCookie);
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
}


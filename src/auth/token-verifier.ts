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

import { FirebaseApp } from '../firebase-app';
import { AuthClientErrorCode, ErrorCodeConfig, FirebaseAuthError } from '../utils/error';
import { FirebaseTokenInfo, FirebaseTokenVerifier } from '../utils/token-verifier';

const ALGORITHM_RS256 = 'RS256';

// URL containing the public keys for the Google certs (whose private keys are used to sign Firebase
// Auth ID tokens)
const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// URL containing the public keys for Firebase session cookies. This will be updated to a different URL soon.
const SESSION_COOKIE_CERT_URL = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';

/** Matching Auth error code config for ID token */
export const ID_TOKEN_ERROR_CODE_CONFIG: ErrorCodeConfig = {
  invalidArg: AuthClientErrorCode.INVALID_ARGUMENT,
  invalidCredential: AuthClientErrorCode.INVALID_CREDENTIAL,
  internalError: AuthClientErrorCode.INTERNAL_ERROR,
  expiredError: AuthClientErrorCode.ID_TOKEN_EXPIRED,
}

/** Matching Auth error code config for session cookie */
export const SESSION_COOKIE_ERROR_CODE_CONFIG: ErrorCodeConfig = {
  invalidArg: AuthClientErrorCode.INVALID_ARGUMENT,
  invalidCredential: AuthClientErrorCode.INVALID_CREDENTIAL,
  internalError: AuthClientErrorCode.INTERNAL_ERROR,
  expiredError: AuthClientErrorCode.SESSION_COOKIE_EXPIRED,
}

/** User facing token information related to the Firebase ID token. */
export const ID_TOKEN_INFO: FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/verify-id-tokens',
  verifyApiName: 'verifyIdToken()',
  jwtName: 'Firebase ID token',
  shortName: 'ID token',
  errorCodeConfig: ID_TOKEN_ERROR_CODE_CONFIG,
  errorType: FirebaseAuthError,
};

/** User facing token information related to the Firebase session cookie. */
export const SESSION_COOKIE_INFO: FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/manage-cookies',
  verifyApiName: 'verifySessionCookie()',
  jwtName: 'Firebase session cookie',
  shortName: 'session cookie',
  errorCodeConfig: SESSION_COOKIE_ERROR_CODE_CONFIG,
  errorType: FirebaseAuthError,
};

/**
 * Creates a new FirebaseTokenVerifier to verify Firebase ID tokens.
 *
 * @param {FirebaseApp} app Firebase app instance.
 * @return {FirebaseTokenVerifier}
 */
export function createIdTokenVerifier(app: FirebaseApp): FirebaseTokenVerifier {
  return new FirebaseTokenVerifier(
    CLIENT_CERT_URL,
    ALGORITHM_RS256,
    'https://securetoken.google.com/',
    ID_TOKEN_INFO,
    app
  );
}

/**
 * Creates a new FirebaseTokenVerifier to verify Firebase session cookies.
 *
 * @param {FirebaseApp} app Firebase app instance.
 * @return {FirebaseTokenVerifier}
 */
export function createSessionCookieVerifier(app: FirebaseApp): FirebaseTokenVerifier {
  return new FirebaseTokenVerifier(
    SESSION_COOKIE_CERT_URL,
    ALGORITHM_RS256,
    'https://session.firebase.google.com/',
    SESSION_COOKIE_INFO,
    app
  );
}

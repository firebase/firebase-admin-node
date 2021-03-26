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

import { AuthClientErrorCode, FirebaseAuthError, ErrorInfo } from '../utils/error';
import * as util from '../utils/index';
import * as validator from '../utils/validator';
import { 
  DecodedToken, decodeJwt, JwtError, JwtErrorCode,
  EmulatorSignatureVerifier, PublicKeySignatureVerifier, ALGORITHM_RS256, SignatureVerifier,
} from '../utils/jwt';
import { FirebaseApp } from '../firebase-app';
import { auth } from './index';

import DecodedIdToken = auth.DecodedIdToken;

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

// URL containing the public keys for the Google certs (whose private keys are used to sign Firebase
// Auth ID tokens)
const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// URL containing the public keys for Firebase session cookies. This will be updated to a different URL soon.
const SESSION_COOKIE_CERT_URL = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';

const EMULATOR_VERIFIER = new EmulatorSignatureVerifier();

/** User facing token information related to the Firebase ID token. */
export const ID_TOKEN_INFO: FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/verify-id-tokens',
  verifyApiName: 'verifyIdToken()',
  jwtName: 'Firebase ID token',
  shortName: 'ID token',
  expiredErrorCode: AuthClientErrorCode.ID_TOKEN_EXPIRED,
};

/** User facing token information related to the Firebase session cookie. */
export const SESSION_COOKIE_INFO: FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/manage-cookies',
  verifyApiName: 'verifySessionCookie()',
  jwtName: 'Firebase session cookie',
  shortName: 'session cookie',
  expiredErrorCode: AuthClientErrorCode.SESSION_COOKIE_EXPIRED,
};

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
  expiredErrorCode: ErrorInfo;
}

/**
 * Class for verifying ID tokens and session cookies.
 */
export class FirebaseTokenVerifier {
  private readonly shortNameArticle: string;
  private readonly signatureVerifier: SignatureVerifier;

  constructor(clientCertUrl: string, private issuer: string, private tokenInfo: FirebaseTokenInfo,
              private readonly app: FirebaseApp) {

    if (!validator.isURL(clientCertUrl)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The provided public client certificate URL is an invalid URL.',
      );
    } else if (!validator.isURL(issuer)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The provided JWT issuer is an invalid URL.',
      );
    } else if (!validator.isNonNullObject(tokenInfo)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The provided JWT information is not an object or null.',
      );
    } else if (!validator.isURL(tokenInfo.url)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The provided JWT verification documentation URL is invalid.',
      );
    } else if (!validator.isNonEmptyString(tokenInfo.verifyApiName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The JWT verify API name must be a non-empty string.',
      );
    } else if (!validator.isNonEmptyString(tokenInfo.jwtName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The JWT public full name must be a non-empty string.',
      );
    } else if (!validator.isNonEmptyString(tokenInfo.shortName)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The JWT public short name must be a non-empty string.',
      );
    } else if (!validator.isNonNullObject(tokenInfo.expiredErrorCode) || !('code' in tokenInfo.expiredErrorCode)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The JWT expiration error code must be a non-null ErrorInfo object.',
      );
    }
    this.shortNameArticle = tokenInfo.shortName.charAt(0).match(/[aeiou]/i) ? 'an' : 'a';

    this.signatureVerifier =
      PublicKeySignatureVerifier.withCertificateUrl(clientCertUrl, app.options.httpAgent);

    // For backward compatibility, the project ID is validated in the verification call.
  }

  /**
   * Verifies the format and signature of a Firebase Auth JWT token.
   *
   * @param jwtToken The Firebase Auth JWT token to verify.
   * @param isEmulator Whether to accept Auth Emulator tokens.
   * @return A promise fulfilled with the decoded claims of the Firebase Auth ID token.
   */
  public verifyJWT(jwtToken: string, isEmulator = false): Promise<DecodedIdToken> {
    if (!validator.isString(jwtToken)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `First argument to ${this.tokenInfo.verifyApiName} must be a ${this.tokenInfo.jwtName} string.`,
      );
    }

    return this.ensureProjectId()
      .then((projectId) => {
        return this.decodeAndVerify(jwtToken, projectId, isEmulator);
      })
      .then((decoded) => {
        const decodedIdToken = decoded.payload as DecodedIdToken;
        decodedIdToken.uid = decodedIdToken.sub;
        return decodedIdToken;
      });
  }

  private ensureProjectId(): Promise<string> {
    return util.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseAuthError(
            AuthClientErrorCode.INVALID_CREDENTIAL,
            'Must initialize app with a cert credential or set your Firebase project ID as the ' +
            `GOOGLE_CLOUD_PROJECT environment variable to call ${this.tokenInfo.verifyApiName}.`,
          );
        }
        return Promise.resolve(projectId);
      })
  }

  private decodeAndVerify(token: string, projectId: string, isEmulator: boolean): Promise<DecodedToken> {
    return this.safeDecode(token)
      .then((decodedToken) => {
        this.verifyContent(decodedToken, projectId, isEmulator);
        return this.verifySignature(token, isEmulator)
          .then(() => decodedToken);
      });
  }

  private safeDecode(jwtToken: string): Promise<DecodedToken> {
    return decodeJwt(jwtToken)
      .catch((err: JwtError) => {
        if (err.code == JwtErrorCode.INVALID_ARGUMENT) {
          const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
            `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;
          const errorMessage = `Decoding ${this.tokenInfo.jwtName} failed. Make sure you passed ` +
            `the entire string JWT which represents ${this.shortNameArticle} ` +
            `${this.tokenInfo.shortName}.` + verifyJwtTokenDocsMessage;
          throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT,
            errorMessage);
        }
        throw new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR, err.message);
      });
  }

  /**
   * Verifies the content of a Firebase Auth JWT.
   *
   * @param fullDecodedToken The decoded JWT.
   * @param projectId The Firebase Project Id.
   * @param isEmulator Whether the token is an Emulator token.
   */
  private verifyContent(
    fullDecodedToken: DecodedToken,
    projectId: string | null,
    isEmulator: boolean): void {
  
    const header = fullDecodedToken && fullDecodedToken.header;
    const payload = fullDecodedToken && fullDecodedToken.payload;

    const projectIdMatchMessage = ` Make sure the ${this.tokenInfo.shortName} comes from the same ` +
      'Firebase project as the service account used to authenticate this SDK.';
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
      `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;

    let errorMessage: string | undefined;
    if (!isEmulator && typeof header.kid === 'undefined') {
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
    } else if (!isEmulator && header.alg !== ALGORITHM_RS256) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect algorithm. Expected "` + ALGORITHM_RS256 + '" but got ' +
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
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage);
    }
  }

  private verifySignature(jwtToken: string, isEmulator: boolean):
    Promise<void> {
    const verifier = isEmulator ? EMULATOR_VERIFIER : this.signatureVerifier;
    return verifier.verify(jwtToken)
      .catch((error) => {
        throw this.mapJwtErrorToAuthError(error);
      });
  }

  /**
   * Maps JwtError to FirebaseAuthError
   * 
   * @param error JwtError to be mapped.
   * @returns FirebaseAuthError or Error instance.
   */
  private mapJwtErrorToAuthError(error: JwtError): Error {
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
      `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;
    if (error.code === JwtErrorCode.TOKEN_EXPIRED) {
      const errorMessage = `${this.tokenInfo.jwtName} has expired. Get a fresh ${this.tokenInfo.shortName}` +
        ` from your client app and try again (auth/${this.tokenInfo.expiredErrorCode.code}).` +
        verifyJwtTokenDocsMessage;
      return new FirebaseAuthError(this.tokenInfo.expiredErrorCode, errorMessage);
    } else if (error.code === JwtErrorCode.INVALID_SIGNATURE) {
      const errorMessage = `${this.tokenInfo.jwtName} has invalid signature.` + verifyJwtTokenDocsMessage;
      return new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage);
    } else if (error.code === JwtErrorCode.NO_MATCHING_KID) {
      const errorMessage = `${this.tokenInfo.jwtName} has "kid" claim which does not ` +
        `correspond to a known public key. Most likely the ${this.tokenInfo.shortName} ` +
        'is expired, so get a fresh token from your client app and try again.';
      return new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage);
    }
    return new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, error.message);
  }
}

/**
 * Creates a new FirebaseTokenVerifier to verify Firebase ID tokens.
 *
 * @param app Firebase app instance.
 * @return FirebaseTokenVerifier
 */
export function createIdTokenVerifier(app: FirebaseApp): FirebaseTokenVerifier {
  return new FirebaseTokenVerifier(
    CLIENT_CERT_URL,
    'https://securetoken.google.com/',
    ID_TOKEN_INFO,
    app
  );
}

/**
 * Creates a new FirebaseTokenVerifier to verify Firebase session cookies.
 *
 * @param app Firebase app instance.
 * @return FirebaseTokenVerifier
 */
export function createSessionCookieVerifier(app: FirebaseApp): FirebaseTokenVerifier {
  return new FirebaseTokenVerifier(
    SESSION_COOKIE_CERT_URL,
    'https://session.firebase.google.com/',
    SESSION_COOKIE_INFO,
    app
  );
}

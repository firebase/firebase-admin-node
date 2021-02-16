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
import * as jwt from 'jsonwebtoken';
import { HttpClient, HttpRequestConfig, HttpError } from '../utils/api-request';
import { App } from '../app';

/**
 * Interface representing a decoded Firebase ID token, returned from the
 * {@link auth.Auth.verifyIdToken `verifyIdToken()`} method.
 *
 * Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs).
 * See the
 * [ID Token section of the OpenID Connect spec](http://openid.net/specs/openid-connect-core-1_0.html#IDToken)
 * for more information about the specific properties below.
 */
export interface DecodedIdToken {

  /**
   * The audience for which this token is intended.
   *
   * This value is a string equal to your Firebase project ID, the unique
   * identifier for your Firebase project, which can be found in [your project's
   * settings](https://console.firebase.google.com/project/_/settings/general/android:com.random.android).
   */
  aud: string;

  /**
   * Time, in seconds since the Unix epoch, when the end-user authentication
   * occurred.
   *
   * This value is not set when this particular ID token was created, but when the
   * user initially logged in to this session. In a single session, the Firebase
   * SDKs will refresh a user's ID tokens every hour. Each ID token will have a
   * different [`iat`](#iat) value, but the same `auth_time` value.
   */
  auth_time: number;

  /**
   * The email of the user to whom the ID token belongs, if available.
   */
  email?: string;

  /**
   * Whether or not the email of the user to whom the ID token belongs is
   * verified, provided the user has an email.
   */
  email_verified?: boolean;

  /**
   * The ID token's expiration time, in seconds since the Unix epoch. That is, the
   * time at which this ID token expires and should no longer be considered valid.
   *
   * The Firebase SDKs transparently refresh ID tokens every hour, issuing a new
   * ID token with up to a one hour expiration.
   */
  exp: number;

  /**
   * Information about the sign in event, including which sign in provider was
   * used and provider-specific identity details.
   *
   * This data is provided by the Firebase Authentication service and is a
   * reserved claim in the ID token.
   */
  firebase: {

    /**
     * Provider-specific identity details corresponding
     * to the provider used to sign in the user.
     */
    identities: {
      [key: string]: any;
    };

    /**
     * The ID of the provider used to sign in the user.
     * One of `"anonymous"`, `"password"`, `"facebook.com"`, `"github.com"`,
     * `"google.com"`, `"twitter.com"`, `"apple.com"`, `"microsoft.com"`,
     * "yahoo.com"`, `"phone"`, `"playgames.google.com"`, `"gc.apple.com"`,
     * or `"custom"`.
     *
     * Additional Identity Platform provider IDs include `"linkedin.com"`,
     * OIDC and SAML identity providers prefixed with `"saml."` and `"oidc."`
     * respectively.
     */
    sign_in_provider: string;

    /**
     * The type identifier or `factorId` of the second factor, provided the
     * ID token was obtained from a multi-factor authenticated user.
     * For phone, this is `"phone"`.
     */
    sign_in_second_factor?: string;

    /**
     * The `uid` of the second factor used to sign in, provided the
     * ID token was obtained from a multi-factor authenticated user.
     */
    second_factor_identifier?: string;

    /**
     * The ID of the tenant the user belongs to, if available.
     */
    tenant?: string;
    [key: string]: any;
  };

  /**
   * The ID token's issued-at time, in seconds since the Unix epoch. That is, the
   * time at which this ID token was issued and should start to be considered
   * valid.
   *
   * The Firebase SDKs transparently refresh ID tokens every hour, issuing a new
   * ID token with a new issued-at time. If you want to get the time at which the
   * user session corresponding to the ID token initially occurred, see the
   * [`auth_time`](#auth_time) property.
   */
  iat: number;

  /**
   * The issuer identifier for the issuer of the response.
   *
   * This value is a URL with the format
   * `https://securetoken.google.com/<PROJECT_ID>`, where `<PROJECT_ID>` is the
   * same project ID specified in the [`aud`](#aud) property.
   */
  iss: string;

  /**
   * The phone number of the user to whom the ID token belongs, if available.
   */
  phone_number?: string;

  /**
   * The photo URL for the user to whom the ID token belongs, if available.
   */
  picture?: string;

  /**
   * The `uid` corresponding to the user who the ID token belonged to.
   *
   * As a convenience, this value is copied over to the [`uid`](#uid) property.
   */
  sub: string;

  /**
   * The `uid` corresponding to the user who the ID token belonged to.
   *
   * This value is not actually in the JWT token claims itself. It is added as a
   * convenience, and is set as the value of the [`sub`](#sub) property.
   */
  uid: string;

  /**
   * Other arbitrary claims included in the ID token.
   */
  [key: string]: any;
}

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

export const ALGORITHM_RS256 = 'RS256';

// URL containing the public keys for the Google certs (whose private keys are used to sign Firebase
// Auth ID tokens)
const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// URL containing the public keys for Firebase session cookies. This will be updated to a different URL soon.
const SESSION_COOKIE_CERT_URL = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';

/**
 * User facing token information related to the Firebase ID token.
 *
 * @internal
 */
export const ID_TOKEN_INFO: FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/verify-id-tokens',
  verifyApiName: 'verifyIdToken()',
  jwtName: 'Firebase ID token',
  shortName: 'ID token',
  expiredErrorCode: AuthClientErrorCode.ID_TOKEN_EXPIRED,
};

/**
 * User facing token information related to the Firebase session cookie.
 *
 * @internal
 */
export const SESSION_COOKIE_INFO: FirebaseTokenInfo = {
  url: 'https://firebase.google.com/docs/auth/admin/manage-cookies',
  verifyApiName: 'verifySessionCookie()',
  jwtName: 'Firebase session cookie',
  shortName: 'session cookie',
  expiredErrorCode: AuthClientErrorCode.SESSION_COOKIE_EXPIRED,
};

/**
 * Interface that defines token related user facing information.
 *
 * @internal
 */
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
 * Class for verifying general purpose Firebase JWTs. This verifies ID tokens and session cookies.
 *
 * @internal
 */
export class FirebaseTokenVerifier {
  private publicKeys: {[key: string]: string};
  private publicKeysExpireAt: number;
  private readonly shortNameArticle: string;

  constructor(private clientCertUrl: string, private algorithm: jwt.Algorithm,
              private issuer: string, private tokenInfo: FirebaseTokenInfo,
              private readonly app: App) {

    if (!validator.isURL(clientCertUrl)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The provided public client certificate URL is an invalid URL.',
      );
    } else if (!validator.isNonEmptyString(algorithm)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'The provided JWT algorithm is an empty string.',
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

    // For backward compatibility, the project ID is validated in the verification call.
  }

  /**
   * Verifies the format and signature of a Firebase Auth JWT token.
   *
   * @param {string} jwtToken The Firebase Auth JWT token to verify.
   * @return {Promise<DecodedIdToken>} A promise fulfilled with the decoded claims of the Firebase Auth ID
   *                           token.
   */
  public verifyJWT(jwtToken: string): Promise<DecodedIdToken> {
    if (!validator.isString(jwtToken)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        `First argument to ${this.tokenInfo.verifyApiName} must be a ${this.tokenInfo.jwtName} string.`,
      );
    }

    return util.findProjectId(this.app)
      .then((projectId) => {
        return this.verifyJWTWithProjectId(jwtToken, projectId);
      });
  }

  /**
   * Override the JWT signing algorithm.
   * @param algorithm the new signing algorithm.
   */
  public setAlgorithm(algorithm: jwt.Algorithm): void {
    this.algorithm = algorithm;
  }

  private verifyJWTWithProjectId(jwtToken: string, projectId: string | null): Promise<DecodedIdToken> {
    if (!validator.isNonEmptyString(projectId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
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
    } else if (typeof header.kid === 'undefined' && this.algorithm !== 'none') {
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
      errorMessage = `${this.tokenInfo.jwtName} has incorrect algorithm. Expected "` + this.algorithm + '" but got ' +
        '"' + header.alg + '".' + verifyJwtTokenDocsMessage;
    } else if (payload.aud !== projectId) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "aud" (audience) claim. Expected "` +
        projectId + '" but got "' + payload.aud + '".' + projectIdMatchMessage +
        verifyJwtTokenDocsMessage;
    } else if (payload.iss !== this.issuer + projectId) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "iss" (issuer) claim. Expected ` +
        `"${this.issuer}"` + projectId + '" but got "' +
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
      return Promise.reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage));
    }

    // When the algorithm is set to 'none' there will be no signature and therefore we don't check
    // the public keys.
    if (this.algorithm === 'none') {
      return this.verifyJwtSignatureWithKey(jwtToken, null);
    }

    return this.fetchPublicKeys().then((publicKeys) => {
      if (!Object.prototype.hasOwnProperty.call(publicKeys, header.kid)) {
        return Promise.reject(
          new FirebaseAuthError(
            AuthClientErrorCode.INVALID_ARGUMENT,
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
      jwt.verify(jwtToken, publicKey || '', {
        algorithms: [this.algorithm],
      }, (error: jwt.VerifyErrors | null, decodedToken: object | undefined) => {
        if (error) {
          if (error.name === 'TokenExpiredError') {
            const errorMessage = `${this.tokenInfo.jwtName} has expired. Get a fresh ${this.tokenInfo.shortName}` +
              ` from your client app and try again (auth/${this.tokenInfo.expiredErrorCode.code}).` +
              verifyJwtTokenDocsMessage;
            return reject(new FirebaseAuthError(this.tokenInfo.expiredErrorCode, errorMessage));
          } else if (error.name === 'JsonWebTokenError') {
            const errorMessage = `${this.tokenInfo.jwtName} has invalid signature.` + verifyJwtTokenDocsMessage;
            return reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage));
          }
          return reject(new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, error.message));
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
        throw new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR, errorMessage);
      }
      throw err;
    });
  }
}

/**
 * Creates a new FirebaseTokenVerifier to verify Firebase ID tokens.
 *
 * @param {FirebaseApp} app Firebase app instance.
 * @return {FirebaseTokenVerifier}
 *
 * @internal
 */
export function createIdTokenVerifier(app: App): FirebaseTokenVerifier {
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
 *
 * @internal
 */
export function createSessionCookieVerifier(app: App): FirebaseTokenVerifier {
  return new FirebaseTokenVerifier(
    SESSION_COOKIE_CERT_URL,
    ALGORITHM_RS256,
    'https://session.firebase.google.com/',
    SESSION_COOKIE_INFO,
    app
  );
}

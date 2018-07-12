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

import { FirebaseApp } from '../firebase-app';
import {Certificate} from './credential';
import {AuthClientErrorCode, FirebaseAuthError, FirebaseError} from '../utils/error';
import { AuthorizedHttpClient, HttpError, HttpRequestConfig, HttpClient } from '../utils/api-request';

import * as validator from '../utils/validator';
import { toWebSafeBase64 } from '../utils';


const ALGORITHM_RS256 = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

/**
 * CryptoSigner interface represents an object that can be used to sign JWTs.
 */
export interface CryptoSigner {
  /**
   * Cryptographically signs a buffer of data.
   *
   * @param {Buffer} buffer The data to be signed.
   * @return {Promise<Buffer>} A promise that resolves with the raw bytes of a signature.
   */
  sign(buffer: Buffer): Promise<Buffer>;

  /**
   * Returns the ID of the service account used to sign tokens.
   *
   * @return {Promise<string>} A promise that resolves with a service account ID.
   */
  getAccountId(): Promise<string>;
}

/**
 * Represents the header of a JWT.
 */
interface JWTHeader {
  alg: string;
  typ: string;
}

/**
 * Represents the body of a JWT.
 */
interface JWTBody {
  claims?: object;
  uid: string;
  aud: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
}

/**
 * A CryptoSigner implementation that uses an explicitly specified service account private key to
 * sign data. Performs all operations locally, and does not make any RPC calls.
 */
export class ServiceAccountSigner implements CryptoSigner {
  private readonly certificate: Certificate;

  /**
   * Creates a new CryptoSigner instance from the given service account certificate.
   *
   * @param {Certificate} certificate A service account certificate.
   */
  constructor(certificate: Certificate) {
    if (!certificate) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a certificate to initialize ServiceAccountSigner.',
      );
    }
    if (!validator.isNonEmptyString(certificate.clientEmail) || !validator.isNonEmptyString(certificate.privateKey)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a certificate with validate clientEmail and privateKey to ' +
        'initialize ServiceAccountSigner.',
      );
    }
    this.certificate = certificate;
  }

  /**
   * @inheritDoc
   */
  public sign(buffer: Buffer): Promise<Buffer> {
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(buffer);
    return Promise.resolve(sign.sign(this.certificate.privateKey));
  }

  /**
   * @inheritDoc
   */
  public getAccountId(): Promise<string> {
    return Promise.resolve(this.certificate.clientEmail);
  }
}

/**
 * A CryptoSigner implementation that uses the remote IAM service to sign data. If initialized without
 * a service account ID, attempts to discover a service account ID by consulting the local Metadata
 * service. This will succeed in managed environments like Google Cloud Functions and App Engine.
 *
 * @see https://cloud.google.com/iam/reference/rest/v1/projects.serviceAccounts/signBlob
 * @see https://cloud.google.com/compute/docs/storing-retrieving-metadata
 */
export class IAMSigner implements CryptoSigner {
  private readonly httpClient: AuthorizedHttpClient;
  private serviceAccountId: string;

  constructor(httpClient: AuthorizedHttpClient, serviceAccountId?: string) {
    if (!httpClient) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'INTERNAL ASSERT: Must provide a HTTP client to initialize IAMSigner.',
      );
    }
    if (typeof serviceAccountId !== 'undefined' && !validator.isNonEmptyString(serviceAccountId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        'INTERNAL ASSERT: Service account ID must be undefined or a non-empty string.',
      );
    }
    this.httpClient = httpClient;
    this.serviceAccountId = serviceAccountId;
  }

  /**
   * @inheritDoc
   */
  public sign(buffer: Buffer): Promise<Buffer> {
    return this.getAccountId().then((serviceAccount) => {
      const request: HttpRequestConfig = {
        method: 'POST',
        url: `https://iam.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:signBlob`,
        data: {bytesToSign: buffer.toString('base64')},
      };
      return this.httpClient.send(request);
    }).then((response: any) => {
      // Response from IAM is base64 encoded. Decode it into a buffer and return.
      return Buffer.from(response.data.signature, 'base64');
    }).catch((err) => {
      if (err instanceof HttpError) {
        const error = err.response.data;
        let errorCode: string;
        let errorMsg: string;
        if (validator.isNonNullObject(error) && error.error) {
          errorCode = error.error.status || null;
          const description = 'Please refer to https://firebase.google.com/docs/auth/admin/create-custom-tokens ' +
            'for more details on how to use and troubleshoot this feature.';
          errorMsg = `${error.error.message}; ${description}` || null;
        }
        throw FirebaseAuthError.fromServerError(errorCode, errorMsg, error);
      }
      throw err;
    });
  }

  /**
   * @inheritDoc
   */
  public getAccountId(): Promise<string> {
    if (validator.isNonEmptyString(this.serviceAccountId)) {
      return Promise.resolve(this.serviceAccountId);
    }
    const request: HttpRequestConfig = {
      method: 'GET',
      url: 'http://metadata/computeMetadata/v1/instance/service-accounts/default/email',
      headers: {
        'Metadata-Flavor': 'Google',
      },
    };
    const client = new HttpClient();
    return client.send(request).then((response) => {
      this.serviceAccountId = response.text;
      return this.serviceAccountId;
    }).catch((err) => {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        `Failed to determine service account. Make sure to initialize ` +
        `the SDK with a service account credential. Alternatively specify a service ` +
        `account with iam.serviceAccounts.signBlob permission. Original error: ${err}`,
      );
    });
  }
}

/**
 * Create a new CryptoSigner instance for the given app. If the app has been initialized with a service
 * account credential, creates a ServiceAccountSigner. Otherwise creates an IAMSigner.
 *
 * @param {FirebaseApp} app A FirebaseApp instance.
 * @return {CryptoSigner} A CryptoSigner instance.
 */
export function cryptoSignerFromApp(app: FirebaseApp): CryptoSigner {
  const cert = app.options.credential.getCertificate();
  if (cert != null && validator.isNonEmptyString(cert.privateKey) && validator.isNonEmptyString(cert.clientEmail)) {
    return new ServiceAccountSigner(cert);
  }
  return new IAMSigner(new AuthorizedHttpClient(app), app.options.serviceAccountId);
}

/**
 * Class for generating different types of Firebase Auth tokens (JWTs).
 */
export class FirebaseTokenGenerator {

  private readonly signer: CryptoSigner;

  constructor(signer: CryptoSigner) {
    if (!validator.isNonNullObject(signer)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a CryptoSigner to use FirebaseTokenGenerator.',
      );
    }
    this.signer = signer;
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

    const claims = {};
    if (typeof developerClaims !== 'undefined') {
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
    }
    return this.signer.getAccountId().then((account) => {
      const header: JWTHeader = {
        alg: ALGORITHM_RS256,
        typ: 'JWT',
      };
      const iat = Math.floor(Date.now() / 1000);
      const body: JWTBody = {
        aud: FIREBASE_AUDIENCE,
        iat,
        exp: iat + ONE_HOUR_IN_SECONDS,
        iss: account,
        sub: account,
        uid,
      };
      if (Object.keys(claims).length > 0) {
        body.claims = claims;
      }
      const token = `${this.encodeSegment(header)}.${this.encodeSegment(body)}`;
      const signPromise = this.signer.sign(Buffer.from(token));
      return Promise.all([token, signPromise]);
    }).then(([token, signature]) => {
      return `${token}.${this.encodeSegment(signature)}`;
    });
  }

  private encodeSegment(segment: object | Buffer) {
    const buffer: Buffer = (segment instanceof Buffer) ? segment : Buffer.from(JSON.stringify(segment));
    return toWebSafeBase64(buffer).replace(/\=+$/, '');
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


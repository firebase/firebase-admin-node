/*!
 * @license
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
import { ServiceAccountCredential } from '../credential/credential-internal';
import { AuthClientErrorCode, FirebaseAuthError } from '../utils/error';
import { AuthorizedHttpClient, HttpError, HttpRequestConfig, HttpClient } from '../utils/api-request';

import * as validator from '../utils/validator';
import { toWebSafeBase64 } from '../utils';
import { Algorithm } from 'jsonwebtoken';


const ALGORITHM_RS256: Algorithm = 'RS256' as const;
const ALGORITHM_NONE: Algorithm = 'none' as const;

const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
export const BLACKLISTED_CLAIMS = [
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
   * The name of the signing algorithm.
   */
  readonly algorithm: Algorithm;

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
  tenant_id?: string;
}

/**
 * A CryptoSigner implementation that uses an explicitly specified service account private key to
 * sign data. Performs all operations locally, and does not make any RPC calls.
 */
export class ServiceAccountSigner implements CryptoSigner {

  algorithm = ALGORITHM_RS256;

  /**
   * Creates a new CryptoSigner instance from the given service account credential.
   *
   * @param {ServiceAccountCredential} credential A service account credential.
   */
  constructor(private readonly credential: ServiceAccountCredential) {
    if (!credential) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a service account credential to initialize ServiceAccountSigner.',
      );
    }
  }

  /**
   * @inheritDoc
   */
  public sign(buffer: Buffer): Promise<Buffer> {
    const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(buffer);
    return Promise.resolve(sign.sign(this.credential.privateKey));
  }

  /**
   * @inheritDoc
   */
  public getAccountId(): Promise<string> {
    return Promise.resolve(this.credential.clientEmail);
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
  algorithm = ALGORITHM_RS256;

  private readonly httpClient: AuthorizedHttpClient;
  private serviceAccountId?: string;

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
        url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:signBlob`,
        data: { payload: buffer.toString('base64') },
      };
      return this.httpClient.send(request);
    }).then((response: any) => {
      // Response from IAM is base64 encoded. Decode it into a buffer and return.
      return Buffer.from(response.data.signedBlob, 'base64');
    }).catch((err) => {
      if (err instanceof HttpError) {
        const error = err.response.data;
        if (validator.isNonNullObject(error) && error.error) {
          const errorCode = error.error.status;
          const description = 'Please refer to https://firebase.google.com/docs/auth/admin/create-custom-tokens ' +
            'for more details on how to use and troubleshoot this feature.';
          const errorMsg = `${error.error.message}; ${description}`;

          throw FirebaseAuthError.fromServerError(errorCode, errorMsg, error);
        }
        throw new FirebaseAuthError(
          AuthClientErrorCode.INTERNAL_ERROR,
          'Error returned from server: ' + error + '. Additionally, an ' +
            'internal error occurred while attempting to extract the ' +
            'errorcode from the error.',
        );
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
      if (!response.text) {
        throw new FirebaseAuthError(
          AuthClientErrorCode.INTERNAL_ERROR,
          'HTTP Response missing payload',
        );
      }
      this.serviceAccountId = response.text;
      return response.text;
    }).catch((err) => {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'Failed to determine service account. Make sure to initialize ' +
        'the SDK with a service account credential. Alternatively specify a service ' +
        `account with iam.serviceAccounts.signBlob permission. Original error: ${err}`,
      );
    });
  }
}

/**
 * A CryptoSigner implementation that is used when communicating with the Auth emulator.
 * It produces unsigned tokens.
 */
export class EmulatedSigner implements CryptoSigner {

  algorithm = ALGORITHM_NONE;

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public sign(buffer: Buffer): Promise<Buffer> {
    return Promise.resolve(Buffer.from(''));
  }

  /**
   * @inheritDoc
   */
  public getAccountId(): Promise<string> {
    return Promise.resolve('firebase-auth-emulator@example.com');
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
  const credential = app.options.credential;
  if (credential instanceof ServiceAccountCredential) {
    return new ServiceAccountSigner(credential);
  }

  return new IAMSigner(new AuthorizedHttpClient(app), app.options.serviceAccountId);
}

/**
 * Class for generating different types of Firebase Auth tokens (JWTs).
 */
export class FirebaseTokenGenerator {

  private readonly signer: CryptoSigner;

  /**
   * @param tenantId The tenant ID to use for the generated Firebase Auth
   *     Custom token. If absent, then no tenant ID claim will be set in the
   *     resulting JWT.
   */
  constructor(signer: CryptoSigner, public readonly tenantId?: string) {
    if (!validator.isNonNullObject(signer)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a CryptoSigner to use FirebaseTokenGenerator.',
      );
    }
    if (typeof this.tenantId !== 'undefined' && !validator.isNonEmptyString(this.tenantId)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_ARGUMENT,
        '`tenantId` argument must be a non-empty string.');
    }
    this.signer = signer;
  }

  /**
   * Creates a new Firebase Auth Custom token.
   *
   * @param uid The user ID to use for the generated Firebase Auth Custom token.
   * @param developerClaims Optional developer claims to include in the generated Firebase
   *     Auth Custom token.
   * @return A Promise fulfilled with a Firebase Auth Custom token signed with a
   *     service account key and containing the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: {[key: string]: any}): Promise<string> {
    let errorMessage: string | undefined;
    if (!validator.isNonEmptyString(uid)) {
      errorMessage = '`uid` argument must be a non-empty string uid.';
    } else if (uid.length > 128) {
      errorMessage = '`uid` argument must a uid with less than or equal to 128 characters.';
    } else if (!this.isDeveloperClaimsValid_(developerClaims)) {
      errorMessage = '`developerClaims` argument must be a valid, non-null object containing the developer claims.';
    }

    if (errorMessage) {
      throw new FirebaseAuthError(AuthClientErrorCode.INVALID_ARGUMENT, errorMessage);
    }

    const claims: {[key: string]: any} = {};
    if (typeof developerClaims !== 'undefined') {
      for (const key in developerClaims) {
        /* istanbul ignore else */
        if (Object.prototype.hasOwnProperty.call(developerClaims, key)) {
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
        alg: this.signer.algorithm,
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
      if (this.tenantId) {
        // eslint-disable-next-line @typescript-eslint/camelcase
        body.tenant_id = this.tenantId;
      }
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

  private encodeSegment(segment: object | Buffer): string {
    const buffer: Buffer = (segment instanceof Buffer) ? segment : Buffer.from(JSON.stringify(segment));
    return toWebSafeBase64(buffer).replace(/=+$/, '');
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


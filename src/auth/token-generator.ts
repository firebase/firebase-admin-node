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
import {AuthClientErrorCode, FirebaseAuthError} from '../utils/error';
import { SignedApiRequestHandler } from '../utils/api-request';

import * as validator from '../utils/validator';


const ALGORITHM_RS256 = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

export interface JWTPayload {
  claims?: object;
  uid?: string;
}

export interface CryptoSigner {
  sign(payload: JWTPayload, options: JWTOptions): Promise<string>;
  getAccount(): string;
}

export interface JWTOptions {
  readonly algorithm: string;
  readonly audience: string;
  readonly expiresIn: number;
  readonly issuer: string;
  readonly subject: string;
}

export class ServiceAccountSigner implements CryptoSigner {
  private readonly certificate_: Certificate;

  constructor(certificate: Certificate) {
    if (!certificate) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a certificate to initialize ServiceAccountSigner.',
      );
    }
    this.certificate_ = certificate;
  }

  public sign(payload: JWTPayload, options: JWTOptions): Promise<string> {
    return Promise.resolve().then(() => {
      const jwt = require('jsonwebtoken');
      return jwt.sign(payload, this.certificate_.privateKey, options);
    });
  }

  public getAccount(): string {
    return this.certificate_.clientEmail;
  }
}

export class IAMSigner implements CryptoSigner {
  private readonly requestHandler_: SignedApiRequestHandler;
  private serviceAccount_: string;

  constructor(requestHandler: SignedApiRequestHandler, serviceAccount?: string) {
    this.requestHandler_ = requestHandler;
    this.serviceAccount_ = serviceAccount;
  }

  public sign(payload: JWTPayload, options: JWTOptions): Promise<string> {
    return this.getServiceAccount().then((serviceAccount) => {
      const header = {
        alg: 'RS256',
        typ: 'JWT',
      };
      const body = {
        uid: payload.uid,
        claims: payload.claims,
        iss: options.issuer,
        aud: options.audience,
        sub: options.subject,
        exp: options.expiresIn,
        iat: Math.floor(Date.now() / 1000),
      };
      const token = `${this.encodeSegment(header)}.${this.encodeSegment(body)}`;
      const request = {bytesToSign: Buffer.from(token).toString('base64')};
      const promise: Promise<any> = this.requestHandler_.sendRequest(
        'iam.googleapis.com',
        443,
        `v1/projects/-/serviceAccounts/${serviceAccount}:signBlob`,
        'POST',
        request);
      return Promise.all([promise, token]);
    }).then(([response, token]) => {
      return `${token}.${response.signature}`;
    });
  }

  public getAccount(): string {
    return this.serviceAccount_;
  }

  private getServiceAccount(): Promise<string> {
    if (validator.isNonEmptyString(this.serviceAccount_)) {
      return Promise.resolve(this.serviceAccount_);
    }
    const options = {
      method: 'GET',
      host: 'metadata',
      path: '/computeMetadata/v1/instance/service-accounts/default/email',
      headers: {
        'Metadata-Flavor': 'Google',
      },
    };
    const http = require('http');
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        const buffers: Buffer[] = [];
        res.on('data', (buffer) => buffers.push(buffer));
        res.on('end', () => {
          try {
            const serviceAccount = Buffer.concat(buffers).toString();
            this.serviceAccount_ = serviceAccount;
            resolve(serviceAccount);
          } catch (err) {
            reject(new FirebaseAuthError(
              AuthClientErrorCode.INVALID_CREDENTIAL,
              `Failed to determine service account: ${err.toString()}. Make sure to initialize ` +
              `the SDK with a service account credential. Alternatively specify a service ` +
              `account with iam.serviceAccounts.signJwt permission.`,
            ));
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  private encodeSegment(segment: object) {
    return Buffer.from(JSON.stringify(segment)).toString('base64');
  }
}

export function signerFromApp(app: FirebaseApp): CryptoSigner {
  const cert = app.options.credential.getCertificate();
  if (cert != null && validator.isNonEmptyString(cert.privateKey) && validator.isNonEmptyString(cert.clientEmail)) {
    return new ServiceAccountSigner(cert);
  }
  return new IAMSigner(new SignedApiRequestHandler(app), app.options.serviceAccount);
}

/**
 * Class for generating and verifying different types of Firebase Auth tokens (JWTs).
 */
export class FirebaseTokenGenerator {

  private readonly signer_: CryptoSigner;

  constructor(signer: CryptoSigner) {
    if (!validator.isNonNullObject(signer)) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a CryptoSigner to use FirebaseTokenGenerator.',
      );
    }
    this.signer_ = signer;
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
    const options: JWTOptions = {
      audience: FIREBASE_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this.signer_.getAccount(),
      subject: this.signer_.getAccount(),
      algorithm: ALGORITHM_RS256,
    };
    return this.signer_.sign(jwtPayload, options);
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


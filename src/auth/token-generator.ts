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
import { SignedApiRequestHandler } from '../utils/api-request';

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

export interface CryptoSigner {
  sign(buffer: Buffer): Promise<Buffer>;
  getAccount(): Promise<string>;
}

interface JWTHeader {
  alg: string;
}

interface JWTBody {
  claims?: object;
  uid: string;
  aud: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
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

  public sign(buffer: Buffer): Promise<Buffer> {
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(buffer);
    return Promise.resolve(sign.sign(this.certificate_.privateKey));
  }

  public getAccount(): Promise<string> {
    return Promise.resolve(this.certificate_.clientEmail);
  }
}

export class IAMSigner implements CryptoSigner {
  private readonly requestHandler_: SignedApiRequestHandler;
  private serviceAccountId_: string;

  constructor(requestHandler: SignedApiRequestHandler, serviceAccountId?: string) {
    if (!requestHandler) {
      throw new FirebaseAuthError(
        AuthClientErrorCode.INVALID_CREDENTIAL,
        'INTERNAL ASSERT: Must provide a request handler to initialize IAMSigner.',
      );
    }
    this.requestHandler_ = requestHandler;
    this.serviceAccountId_ = serviceAccountId;
  }

  public sign(buffer: Buffer): Promise<Buffer> {
    return this.getAccount().then((serviceAccount) => {
      const request = {bytesToSign: buffer.toString('base64')};
      return this.requestHandler_.sendRequest(
        'iam.googleapis.com',
        443,
        `/v1/projects/-/serviceAccounts/${serviceAccount}:signBlob`,
        'POST',
        request);
    }).then((response: any) => {
      // Response from IAM is base64 encoded. Decode it into a buffer and return.
      return new Buffer(response.signature, 'base64');
    }).catch((response) => {
      const error = (typeof response === 'object' && 'statusCode' in response) ?
        response.error : response;
      if (error instanceof FirebaseError) {
        throw error;
      }
      let errorCode: string;
      let errorMsg: string;
      if (validator.isNonNullObject(error) && error.error) {
        errorCode = error.error.status || null;
        errorMsg = error.error.message || null;
      }
      throw FirebaseAuthError.fromServerError(errorCode, errorMsg, error);
    });
  }

  public getAccount(): Promise<string> {
    if (validator.isNonEmptyString(this.serviceAccountId_)) {
      return Promise.resolve(this.serviceAccountId_);
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
          this.serviceAccountId_ = Buffer.concat(buffers).toString();
          resolve(this.serviceAccountId_);
        });
      });
      req.on('error', (err) => {
        reject(new FirebaseAuthError(
          AuthClientErrorCode.INVALID_CREDENTIAL,
          `Failed to determine service account: ${err.toString()}. Make sure to initialize ` +
          `the SDK with a service account credential. Alternatively specify a service ` +
          `account with iam.serviceAccounts.signBlob permission.`,
        ));
      });
      req.end();
    });
  }
}

export function signerFromApp(app: FirebaseApp): CryptoSigner {
  const cert = app.options.credential.getCertificate();
  if (cert != null && validator.isNonEmptyString(cert.privateKey) && validator.isNonEmptyString(cert.clientEmail)) {
    return new ServiceAccountSigner(cert);
  }
  return new IAMSigner(new SignedApiRequestHandler(app), app.options.serviceAccountId);
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
    return this.signer_.getAccount().then((account) => {
      const header: JWTHeader = {
        alg: ALGORITHM_RS256,
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
      const signPromise = this.signer_.sign(Buffer.from(token));
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


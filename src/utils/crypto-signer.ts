/*!
 * @license
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

import { App } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { ServiceAccountCredential } from '../app/credential-internal';
import { AuthorizedHttpClient, HttpRequestConfig, HttpClient, HttpError } from './api-request';

import { Algorithm } from 'jsonwebtoken';
import { ErrorInfo } from '../utils/error';
import * as validator from '../utils/validator';

const ALGORITHM_RS256: Algorithm = 'RS256' as const;

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
   * @param buffer - The data to be signed.
   * @returns A promise that resolves with the raw bytes of a signature.
   */
  sign(buffer: Buffer): Promise<Buffer>;

  /**
   * Returns the ID of the service account used to sign tokens.
   *
   * @returns A promise that resolves with a service account ID.
   */
  getAccountId(): Promise<string>;
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
   * @param credential - A service account credential.
   */
  constructor(private readonly credential: ServiceAccountCredential) {
    if (!credential) {
      throw new CryptoSignerError({
        code: CryptoSignerErrorCode.INVALID_CREDENTIAL,
        message: 'INTERNAL ASSERT: Must provide a service account credential to initialize ServiceAccountSigner.',
      });
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
      throw new CryptoSignerError({
        code: CryptoSignerErrorCode.INVALID_ARGUMENT,
        message: 'INTERNAL ASSERT: Must provide a HTTP client to initialize IAMSigner.',
      });
    }
    if (typeof serviceAccountId !== 'undefined' && !validator.isNonEmptyString(serviceAccountId)) {
      throw new CryptoSignerError({
        code: CryptoSignerErrorCode.INVALID_ARGUMENT,
        message: 'INTERNAL ASSERT: Service account ID must be undefined or a non-empty string.',
      });
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
        throw new CryptoSignerError({
          code: CryptoSignerErrorCode.SERVER_ERROR,
          message: err.message,
          cause: err
        });
      }
      throw err
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
        throw new CryptoSignerError({
          code: CryptoSignerErrorCode.INTERNAL_ERROR,
          message: 'HTTP Response missing payload',
        });
      }
      this.serviceAccountId = response.text;
      return response.text;
    }).catch((err) => {
      throw new CryptoSignerError({
        code: CryptoSignerErrorCode.INVALID_CREDENTIAL,
        message: 'Failed to determine service account. Make sure to initialize ' +
          'the SDK with a service account credential. Alternatively specify a service ' +
          `account with iam.serviceAccounts.signBlob permission. Original error: ${err}`,
      });
    });
  }
}

/**
 * Creates a new CryptoSigner instance for the given app. If the app has been initialized with a
 * service account credential, creates a ServiceAccountSigner.
 *
 * @param app - A FirebaseApp instance.
 * @returns A CryptoSigner instance.
 */
export function cryptoSignerFromApp(app: App): CryptoSigner {
  const credential = app.options.credential;
  if (credential instanceof ServiceAccountCredential) {
    return new ServiceAccountSigner(credential);
  }

  return new IAMSigner(new AuthorizedHttpClient(app as FirebaseApp), app.options.serviceAccountId);
}

/**
 * Defines extended error info type. This includes a code, message string, and error data.
 */
export interface ExtendedErrorInfo extends ErrorInfo {
  cause?: Error;
}

/**
 * CryptoSigner error code structure.
 *
 * @param errorInfo - The error information (code and message).
 * @constructor
 */
export class CryptoSignerError extends Error {
  constructor(private errorInfo: ExtendedErrorInfo) {
    super(errorInfo.message);

    /* tslint:disable:max-line-length */
    // Set the prototype explicitly. See the following link for more details:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    /* tslint:enable:max-line-length */
    (this as any).__proto__ = CryptoSignerError.prototype;
  }

  /** @returns The error code. */
  public get code(): string {
    return this.errorInfo.code;
  }

  /** @returns The error message. */
  public get message(): string {
    return this.errorInfo.message;
  }

  /** @returns The error data. */
  public get cause(): Error | undefined {
    return this.errorInfo.cause;
  }
}

/**
 * Crypto Signer error codes and their default messages.
 */
export class CryptoSignerErrorCode {
  public static INVALID_ARGUMENT = 'invalid-argument';
  public static INTERNAL_ERROR = 'internal-error';
  public static INVALID_CREDENTIAL = 'invalid-credential';
  public static SERVER_ERROR = 'server-error';
}

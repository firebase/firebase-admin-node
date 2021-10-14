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

import * as validator from '../utils/validator';
import * as util from '../utils/index';
import { FirebaseAppCheckError } from './app-check-api-client-internal';
import {
  ALGORITHM_RS256, DecodedToken, decodeJwt, JwtError,
  JwtErrorCode, PublicKeySignatureVerifier, SignatureVerifier
} from '../utils/jwt';

import { DecodedAppCheckToken } from './app-check-api'
import { App } from '../app';

const APP_CHECK_ISSUER = 'https://firebaseappcheck.googleapis.com/';
const JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1beta/jwks';

/**
 * Class for verifying Firebase App Check tokens.
 *
 * @internal
 */
export class AppCheckTokenVerifier {
  private readonly signatureVerifier: SignatureVerifier;

  constructor(private readonly app: App) {
    this.signatureVerifier = PublicKeySignatureVerifier.withJwksUrl(JWKS_URL);
  }

  /**
   * Verifies the format and signature of a Firebase App Check token.
   *
   * @param token - The Firebase Auth JWT token to verify.
   * @returns A promise fulfilled with the decoded claims of the Firebase App Check token.
   */
  public verifyToken(token: string): Promise<DecodedAppCheckToken> {
    if (!validator.isString(token)) {
      throw new FirebaseAppCheckError(
        'invalid-argument',
        'App check token must be a non-null string.',
      );
    }

    return this.ensureProjectId()
      .then((projectId) => {
        return this.decodeAndVerify(token, projectId);
      })
      .then((decoded) => {
        const decodedAppCheckToken = decoded.payload as DecodedAppCheckToken;
        // eslint-disable-next-line @typescript-eslint/camelcase
        decodedAppCheckToken.app_id = decodedAppCheckToken.sub;
        return decodedAppCheckToken;
      });
  }

  private ensureProjectId(): Promise<string> {
    return util.findProjectId(this.app)
      .then((projectId) => {
        if (!validator.isNonEmptyString(projectId)) {
          throw new FirebaseAppCheckError(
            'invalid-credential',
            'Must initialize app with a cert credential or set your Firebase project ID as the ' +
            'GOOGLE_CLOUD_PROJECT environment variable to verify an App Check token.'
          );
        }
        return projectId;
      })
  }

  private decodeAndVerify(token: string, projectId: string): Promise<DecodedToken> {
    return this.safeDecode(token)
      .then((decodedToken) => {
        this.verifyContent(decodedToken, projectId);
        return this.verifySignature(token)
          .then(() => decodedToken);
      });
  }

  private safeDecode(jwtToken: string): Promise<DecodedToken> {
    return decodeJwt(jwtToken)
      .catch(() => {
        const errorMessage = 'Decoding App Check token failed. Make sure you passed ' +
          'the entire string JWT which represents the Firebase App Check token.';
        throw new FirebaseAppCheckError('invalid-argument', errorMessage);
      });
  }

  /**
   * Verifies the content of a Firebase App Check JWT.
   *
   * @param fullDecodedToken - The decoded JWT.
   * @param projectId - The Firebase Project Id.
   */
  private verifyContent(fullDecodedToken: DecodedToken, projectId: string | null): void {
    const header = fullDecodedToken.header;
    const payload = fullDecodedToken.payload;

    const projectIdMatchMessage = ' Make sure the App Check token comes from the same ' +
      'Firebase project as the service account used to authenticate this SDK.';
    const scopedProjectId = `projects/${projectId}`;

    let errorMessage: string | undefined;
    if (header.alg !== ALGORITHM_RS256) {
      errorMessage = 'The provided App Check token has incorrect algorithm. Expected "' +
        ALGORITHM_RS256 + '" but got ' + '"' + header.alg + '".';
    } else if (!validator.isNonEmptyArray(payload.aud) || !payload.aud.includes(scopedProjectId)) {
      errorMessage = 'The provided App Check token has incorrect "aud" (audience) claim. Expected "' +
      scopedProjectId + '" but got "' + payload.aud + '".' + projectIdMatchMessage;
    } else if (typeof payload.iss !== 'string' ||  !payload.iss.startsWith(APP_CHECK_ISSUER)) {
      errorMessage = 'The provided App Check token has incorrect "iss" (issuer) claim.';
    } else if (typeof payload.sub !== 'string') {
      errorMessage = 'The provided App Check token has no "sub" (subject) claim.';
    } else if (payload.sub === '') {
      errorMessage = 'The provided App Check token has an empty string "sub" (subject) claim.';
    }
    if (errorMessage) {
      throw new FirebaseAppCheckError('invalid-argument', errorMessage);
    }
  }

  private verifySignature(jwtToken: string):
    Promise<void> {
    return this.signatureVerifier.verify(jwtToken)
      .catch((error: JwtError) => {
        throw this.mapJwtErrorToAppCheckError(error);
      });
  }

  /**
   * Maps JwtError to FirebaseAppCheckError
   *
   * @param error - JwtError to be mapped.
   * @returns FirebaseAppCheckError instance.
   */
  private mapJwtErrorToAppCheckError(error: JwtError): FirebaseAppCheckError {
    if (error.code === JwtErrorCode.TOKEN_EXPIRED) {
      const errorMessage = 'The provided App Check token has expired. Get a fresh App Check token' +
        ' from your client app and try again.'
      return new FirebaseAppCheckError('app-check-token-expired', errorMessage);
    } else if (error.code === JwtErrorCode.INVALID_SIGNATURE) {
      const errorMessage = 'The provided App Check token has invalid signature.';
      return new FirebaseAppCheckError('invalid-argument', errorMessage);
    } else if (error.code === JwtErrorCode.NO_MATCHING_KID) {
      const errorMessage = 'The provided App Check token has "kid" claim which does not ' +
        'correspond to a known public key. Most likely the provided App Check token ' +
        'is expired, so get a fresh token from your client app and try again.';
      return new FirebaseAppCheckError('invalid-argument', errorMessage);
    }
    return new FirebaseAppCheckError('invalid-argument', error.message);
  }
}

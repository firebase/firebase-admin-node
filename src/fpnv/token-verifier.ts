/*!
 * @license
 * Copyright 2025 Google LLC
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
import { FpnvErrorCode, FirebasePnvError, ErrorInfo } from '../utils/error';
import { FpnvToken } from './fpnv-api';
import * as util from '../utils/index';
import * as validator from '../utils/validator';
import {
  DecodedToken, decodeJwt, JwtError, JwtErrorCode,
  PublicKeySignatureVerifier, ALGORITHM_ES256, SignatureVerifier,
} from '../utils/jwt';

const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';


const PN_TOKEN_INFO: FirebasePhoneNumberTokenInfo = {
  url: 'https://firebase.google.com/docs/phone-number-verification',
  verifyApiName: 'verifyToken()',
  jwtName: 'Firebase Phone Verification token',
  shortName: 'FPNV token',
  typ: 'JWT',
  expiredErrorCode: FpnvErrorCode.EXPIRED_TOKEN,
};

interface FirebasePhoneNumberTokenInfo {
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
    /** The JWT typ" (Type) */
    typ: string;
}

export class FirebasePhoneNumberTokenVerifier {

  private readonly shortNameArticle: string;
  private readonly signatureVerifier: SignatureVerifier;

  constructor(
    clientCertUrl: string,
        private issuer: string,
        private tokenInfo: FirebasePhoneNumberTokenInfo,
        private readonly app: App
  ) {

    if (!validator.isURL(clientCertUrl)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The provided public client certificate URL is an invalid URL.',
      );
    } else if (!validator.isURL(issuer)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The provided JWT issuer is an invalid URL.',
      );
    } else if (!validator.isNonNullObject(tokenInfo)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The provided JWT information is not an object or null.',
      );
    } else if (!validator.isURL(tokenInfo.url)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The provided JWT verification documentation URL is invalid.',
      );
    } else if (!validator.isNonEmptyString(tokenInfo.verifyApiName)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The JWT verify API name must be a non-empty string.',
      );
    } else if (!validator.isNonEmptyString(tokenInfo.jwtName)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The JWT public full name must be a non-empty string.',
      );
    } else if (!validator.isNonEmptyString(tokenInfo.shortName)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The JWT public short name must be a non-empty string.',
      );
    } else if (!validator.isNonNullObject(tokenInfo.expiredErrorCode) || !('code' in tokenInfo.expiredErrorCode)) {
      throw new FirebasePnvError(
        FpnvErrorCode.INVALID_ARGUMENT,
        'The JWT expiration error code must be a non-null ErrorInfo object.',
      );
    }
    this.shortNameArticle = tokenInfo.shortName.charAt(0).match(/[aeiou]/i) ? 'an' : 'a';

    this.signatureVerifier =
            PublicKeySignatureVerifier.withCertificateUrl(clientCertUrl, app.options.httpAgent);

    // For backward compatibility, the project ID is validated in the verification call.
  }

  public async verifyJWT(jwtToken: string): Promise<FpnvToken> {
    if (!validator.isString(jwtToken)) {
      throw new FirebasePnvError(
        FpnvErrorCode.PROJECT_NOT_FOUND,
        `First argument to ${this.tokenInfo.verifyApiName} must be a ${this.tokenInfo.jwtName} string.`,
      );
    }

    const projectId = await this.ensureProjectId();
    const decoded = await this.decodeAndVerify(jwtToken, projectId);
    const decodedIdToken = decoded.payload as FpnvToken;
    decodedIdToken.getPhoneNumber = () => decodedIdToken.sub;
    return decodedIdToken;
  }

  private async ensureProjectId(): Promise<string> {
    const projectId = await util.findProjectId(this.app);
    if (!validator.isNonEmptyString(projectId)) {
      throw new FirebasePnvError(
        FpnvErrorCode.PROJECT_NOT_FOUND,
        'Must initialize app with a cert credential or set your Firebase project ID as the ' +
                `GOOGLE_CLOUD_PROJECT environment variable to call ${this.tokenInfo.verifyApiName}.`);
    }
    return projectId;
  }

  private async decodeAndVerify(
    token: string,
    projectId: string,
  ): Promise<DecodedToken> {
    const decodedToken = await this.safeDecode(token);
    this.verifyContent(decodedToken, projectId);
    await this.verifySignature(token);
    return decodedToken;
  }

  private async safeDecode(jwtToken: string): Promise<DecodedToken> {
    try {
      return await decodeJwt(jwtToken);
    } catch (err) {
      if (err.code === JwtErrorCode.INVALID_ARGUMENT) {
        const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
                    `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;
        const errorMessage = `Decoding ${this.tokenInfo.jwtName} failed. Make sure you passed ` +
                    `the entire string JWT which represents ${this.shortNameArticle} ` +
                    `${this.tokenInfo.shortName}.` + verifyJwtTokenDocsMessage;
        throw new FirebasePnvError(FpnvErrorCode.INVALID_ARGUMENT,
          errorMessage);
      }
      throw new FirebasePnvError(FpnvErrorCode.INVALID_ARGUMENT, err.message);
    }
  }


  private verifyContent(
    fullDecodedToken: DecodedToken,
    projectId: string | null,
  ): void {
    const header = fullDecodedToken && fullDecodedToken.header;
    const payload = fullDecodedToken && fullDecodedToken.payload;

    const projectIdMatchMessage = ` Make sure the ${this.tokenInfo.shortName} comes from the same ` +
            'Firebase project as the service account used to authenticate this SDK.';
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
            `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;

    let errorMessage: string | undefined;

    // JWT Header
    if (typeof header.kid === 'undefined') {
      errorMessage = `${this.tokenInfo.jwtName} has no "kid" claim.`;
      errorMessage += verifyJwtTokenDocsMessage;
    } else if (header.alg !== ALGORITHM_ES256) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect algorithm. Expected ` + 
      `"${ALGORITHM_ES256}" but got "${header.alg}". ${verifyJwtTokenDocsMessage}`;
    } else if (header.typ !== this.tokenInfo.typ) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect typ. Expected "${this.tokenInfo.typ}" but got ` +
                '"' + header.typ + '".' + verifyJwtTokenDocsMessage;
    }
    // FPNV Token
    else if (!((Array.isArray(payload.aud) ? payload.aud : []).some(item => item === this.issuer + projectId))) {
      errorMessage = `${this.tokenInfo.jwtName} has incorrect "aud" (audience) claim. Expected "` +
                this.issuer + projectId + '" to be one of "' + payload.aud + '".' + projectIdMatchMessage +
                verifyJwtTokenDocsMessage;
    } else if (typeof payload.sub !== 'string') {
      errorMessage = `${this.tokenInfo.jwtName} has no "sub" (subject) claim.` + verifyJwtTokenDocsMessage;
    } else if (payload.sub === '') {
      errorMessage = `${this.tokenInfo.jwtName} has an empty "sub" (subject) claim.` +
                verifyJwtTokenDocsMessage;
    }

    if (errorMessage) {
      throw new FirebasePnvError(FpnvErrorCode.INVALID_ARGUMENT, errorMessage);
    }
  }

  private async verifySignature(jwtToken: string): Promise<void> {
    try {
      return await this.signatureVerifier.verify(jwtToken);
    } catch (error) {
      throw this.mapJwtErrorToAuthError(error);
    }
  }

  private mapJwtErrorToAuthError(error: JwtError): Error {
    const verifyJwtTokenDocsMessage = ` See ${this.tokenInfo.url} ` +
            `for details on how to retrieve ${this.shortNameArticle} ${this.tokenInfo.shortName}.`;
    if (error.code === JwtErrorCode.TOKEN_EXPIRED) {
      const errorMessage = `${this.tokenInfo.jwtName} has expired. Get a fresh ${this.tokenInfo.shortName}` +
                ` from your client app and try again (auth/${this.tokenInfo.expiredErrorCode.code}).` +
                verifyJwtTokenDocsMessage;
      return new FirebasePnvError(this.tokenInfo.expiredErrorCode, errorMessage);
    } else if (error.code === JwtErrorCode.INVALID_SIGNATURE) {
      const errorMessage = `${this.tokenInfo.jwtName} has invalid signature.` + verifyJwtTokenDocsMessage;
      return new FirebasePnvError(FpnvErrorCode.INVALID_ARGUMENT, errorMessage);
    } else if (error.code === JwtErrorCode.NO_MATCHING_KID) {
      const errorMessage = `${this.tokenInfo.jwtName} has "kid" claim which does not ` +
                `correspond to a known public key. Most likely the ${this.tokenInfo.shortName} ` +
                'is expired, so get a fresh token from your client app and try again.';
      return new FirebasePnvError(FpnvErrorCode.INVALID_ARGUMENT, errorMessage);
    }
    return new FirebasePnvError(FpnvErrorCode.INVALID_ARGUMENT, error.message);
  }

}

export function createFPNTVerifier(app: App): FirebasePhoneNumberTokenVerifier {
  return new FirebasePhoneNumberTokenVerifier(
    CLIENT_CERT_URL,
    'https://fpnv.googleapis.com/projects/',
    PN_TOKEN_INFO,
    app
  );
}

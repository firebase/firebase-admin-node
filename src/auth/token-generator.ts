import {Certificate} from './credential';

import * as jwt from 'jsonwebtoken';

// Use untyped import syntax for Node built-ins
import https = require('https');


const ALGORITHM = 'RS256';
const ONE_HOUR_IN_SECONDS = 60 * 60;

// List of blacklisted claims which cannot be provided when creating a custom token
const BLACKLISTED_CLAIMS = [
  'acr', 'amr', 'at_hash', 'aud', 'auth_time', 'azp', 'cnf', 'c_hash', 'exp', 'iat', 'iss', 'jti',
  'nbf', 'nonce',
];

// URL containing the public keys for the Google certs (whose private keys are used to sign Firebase
// Auth ID tokens)
const CLIENT_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Audience to use for Firebase Auth Custom tokens
const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

interface JWTPayload {
  claims?: Object;
  uid?: string;
}

/**
 * Class for generating and verifying different types of Firebase Auth tokens (JWTs).
 */
export class FirebaseTokenGenerator {
  private certificate_: Certificate;
  private publicKeys_: Object;
  private publicKeysExpireAt_: number;

  constructor(certificate: Certificate) {
    if (!certificate) {
      throw new Error('Must provide a service account to use FirebaseTokenGenerator');
    }
    this.certificate_ = certificate;
  }

  /**
   * Creates a new Firebase Auth Custom token.
   *
   * @param {string} uid The user ID to use for the generated Firebase Auth Custom token.
   * @param {Object} [developerClaims] Optional developer claims to include in the generated Firebase
   *                 Auth Custom token.
   * @return {string} A Firebase Auth Custom token signed with a service account key and containing
   *                  the provided payload.
   */
  public createCustomToken(uid: string, developerClaims?: Object): string {
    if (typeof uid !== 'string' || uid === '') {
      throw new Error('First argument to createCustomToken() must be a non-empty string uid');
    } else if (uid.length > 128) {
      throw new Error('First argument to createCustomToken() must a uid with less than or equal to 128 characters');
    } else if (typeof developerClaims !== 'undefined' && (typeof developerClaims !== 'object' || developerClaims === null || developerClaims instanceof Array)) {
      throw new Error('Optional second argument to createCustomToken() must be an object containing the developer claims');
    }

    let jwtPayload: JWTPayload = {};

    if (typeof developerClaims !== 'undefined') {
      let claims = {};

      for (const key in developerClaims) {
        /* istanbul ignore else */
        if (developerClaims.hasOwnProperty(key)) {
          if (BLACKLISTED_CLAIMS.indexOf(key) !== -1) {
            throw new Error('Developer claim "' + key + '" is reserved and cannot be specified');
          }

          claims[key] = developerClaims[key];
        }
      }
      jwtPayload.claims = claims;
    }
    jwtPayload.uid = uid;

    return jwt.sign(jwtPayload, this.certificate_.privateKey, {
      audience: FIREBASE_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this.certificate_.clientEmail,
      subject: this.certificate_.clientEmail,
      algorithm: ALGORITHM,
    });
  }

  /**
   * Verifies the format and signature of a Firebase Auth ID token.
   *
   * @param {string} idToken The Firebase Auth ID token to verify.
   * @return {Promise<Object>} A promise fulfilled with the decoded claims of the Firebase Auth ID
   *                           token.
   */
  public verifyIdToken(idToken: string): Promise<Object> {
    if (typeof idToken !== 'string') {
      throw new Error('First argument to verifyIdToken() must be a Firebase ID token');
    }

    if (typeof this.certificate_.projectId !== 'string' || this.certificate_.projectId === '') {
      throw new Error('verifyIdToken() requires a service account with "project_id" set');
    }

    const fullDecodedToken = jwt.decode(idToken, {
      complete: true,
    });

    const header = fullDecodedToken && fullDecodedToken.header;
    const payload = fullDecodedToken && fullDecodedToken.payload;

    const projectIdMatchMessage = ' Make sure the ID token comes from the same Firebase project as the ' +
      'service account used to authenticate this SDK.';
    const verifyIdTokenDocsMessage = ' See https://firebase.google.com/docs/auth/server/verify-id-tokens ' +
      'for details on how to retrieve an ID token.';

    let errorMessage: string;
    if (!fullDecodedToken) {
      errorMessage = 'Decoding Firebase ID token failed. Make sure you passed the entire string JWT ' +
        'which represents an ID token.' + verifyIdTokenDocsMessage;
    } else if (typeof header.kid === 'undefined') {
      const isCustomToken = (payload.aud === FIREBASE_AUDIENCE);
      const isLegacyCustomToken = (header.alg === 'HS256' && payload.v === 0 && 'd' in payload && 'uid' in payload.d);

      if (isCustomToken) {
        errorMessage = 'verifyIdToken() expects an ID token, but was given a custom token.';
      } else if (isLegacyCustomToken) {
        errorMessage = 'verifyIdToken() expects an ID token, but was given a legacy custom token.';
      } else {
        errorMessage = 'Firebase ID token has no "kid" claim.';
      }

      errorMessage += verifyIdTokenDocsMessage;
    } else if (header.alg !== ALGORITHM) {
      errorMessage = 'Firebase ID token has incorrect algorithm. Expected "' + ALGORITHM + '" but got ' +
        '"' + header.alg + '".' + verifyIdTokenDocsMessage;
    } else if (payload.aud !== this.certificate_.projectId) {
      errorMessage = 'Firebase ID token has incorrect "aud" (audience) claim. Expected "' + this.certificate_.projectId +
        '" but got "' + payload.aud + '".' + projectIdMatchMessage + verifyIdTokenDocsMessage;
    } else if (payload.iss !== 'https://securetoken.google.com/' + this.certificate_.projectId) {
      errorMessage = 'Firebase ID token has incorrect "iss" (issuer) claim. Expected "https://securetoken.google.com/' +
        this.certificate_.projectId + '" but got "' + payload.iss + '".' + projectIdMatchMessage + verifyIdTokenDocsMessage;
    } else if (typeof payload.sub !== 'string') {
      errorMessage = 'Firebase ID token has no "sub" (subject) claim.' + verifyIdTokenDocsMessage;
    } else if (payload.sub === '') {
      errorMessage = 'Firebase ID token has an empty string "sub" (subject) claim.' + verifyIdTokenDocsMessage;
    } else if (payload.sub.length > 128) {
      errorMessage = 'Firebase ID token has "sub" (subject) claim longer than 128 characters.' + verifyIdTokenDocsMessage;
    }

    if (typeof errorMessage !== 'undefined') {
      return Promise.reject(new Error(errorMessage));
    }

    return this.fetchPublicKeys_().then((publicKeys) => {
      if (!publicKeys.hasOwnProperty(header.kid)) {
        errorMessage = 'Firebase ID token has "kid" claim which does not correspond to a known ' +
          'public key. Most likely the ID token is expired, so get a fresh token from your client ' +
          'app and try again.' + verifyIdTokenDocsMessage;
        return Promise.reject(new Error(errorMessage));
      }

      return new Promise((resolve, reject) => {
        jwt.verify(idToken, publicKeys[header.kid], {
          algorithms: [ALGORITHM],
        }, (error, decodedToken) => {
          if (error) {
            if (error.name === 'TokenExpiredError') {
              errorMessage = 'Firebase ID token has expired. Get a fresh token from your client app and try ' +
                'again.' + verifyIdTokenDocsMessage;
            } else if (error.name === 'JsonWebTokenError') {
              errorMessage = 'Firebase ID token has invalid signature.' + verifyIdTokenDocsMessage;
            }
            reject(new Error(errorMessage));
          } else {
            decodedToken.uid = decodedToken.sub;
            resolve(decodedToken);
          }
        });
      });
    });
  }


  /**
   * Fetches the public keys for the Google certs.
   *
   * @return {Promise<Object>} A promise fulfilled with public keys for the Google certs.
   */
  private fetchPublicKeys_(): Promise<Object> {
    if (typeof this.publicKeys_ !== 'undefined' && typeof this.publicKeysExpireAt_ !== 'undefined' && Date.now() < this.publicKeysExpireAt_) {
      return Promise.resolve(this.publicKeys_);
    }

    return new Promise((resolve, reject) => {
      https.get(CLIENT_CERT_URL, (res) => {
        const buffers: Buffer[] = [];

        res.on('data', (buffer) => buffers.push(buffer));

        res.on('end', () => {
          try {
            const response = JSON.parse(Buffer.concat(buffers).toString());

            if (response.error) {
              let errorMessage = 'Error fetching public keys for Google certs: ' + response.error;
              /* istanbul ignore else */
              if (response.error_description) {
                errorMessage += ' (' + response.error_description + ')';
              }
              reject(new Error(errorMessage));
            } else {
              /* istanbul ignore else */
              if (res.headers.hasOwnProperty('cache-control')) {
                const cacheControlHeader = res.headers['cache-control'];
                const parts = cacheControlHeader.split(',');
                parts.forEach((part) => {
                  const subParts = part.trim().split('=');
                  if (subParts[0] === 'max-age') {
                    const maxAge = subParts[1];
                    this.publicKeysExpireAt_ = Date.now() + (maxAge * 1000);
                  }
                });
              }

              this.publicKeys_ = response;
              resolve(response);
            }
          } catch (e) {
            /* istanbul ignore next */
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
}

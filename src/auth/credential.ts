import * as jwt from 'jsonwebtoken';

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import os = require('os');
import http = require('http');
import path = require('path');
import https = require('https');


const GOOGLE_TOKEN_AUDIENCE = 'https://accounts.google.com/o/oauth2/token';
const GOOGLE_AUTH_TOKEN_HOST = 'accounts.google.com';
const GOOGLE_AUTH_TOKEN_PATH = '/o/oauth2/token';
const GOOGLE_AUTH_TOKEN_PORT = 443;

// NOTE: the Google Metadata Service uses HTTP over a vlan
const GOOGLE_METADATA_SERVICE_HOST = 'metadata.google.internal';
const GOOGLE_METADATA_SERVICE_PATH = '/computeMetadata/v1beta1/instance/service-accounts/default/token';

const configDir = (() => {
  // Windows has a dedicated low-rights location for apps at ~/Application Data
  const sys = os.platform();
  if (sys && sys.length >= 3 && sys.substring(0, 3).toLowerCase() === 'win') {
    return process.env.APPDATA;
  }

  // On *nix the gcloud cli creates a . dir.
  return process.env.HOME && path.resolve(process.env.HOME, '.config');
})();

const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
const GCLOUD_CREDENTIAL_PATH = configDir && path.resolve(configDir, GCLOUD_CREDENTIAL_SUFFIX);

const REFRESH_TOKEN_HOST = 'www.googleapis.com';
const REFRESH_TOKEN_PORT = 443;
const REFRESH_TOKEN_PATH = '/oauth2/v4/token';

const ONE_HOUR_IN_SECONDS = 60 * 60;
const JWT_ALGORITHM = 'RS256';


function copyAttr(to: Object, from: Object, key: string, alt: string) {
  const tmp = from[key] || from[alt];
  if (typeof tmp !== 'undefined') {
    to[key] = tmp;
  }
}

export class RefreshToken {
  public clientId: string;
  public clientSecret: string;
  public refreshToken: string;
  public type: string;

  /*
   * Tries to load a RefreshToken from a path. If the path is not present, returns null.
   * Throws if data at the path is invalid.
   */
  public static fromPath(path: string): RefreshToken {
    let jsonString: string;

    try {
      jsonString = fs.readFileSync(path, 'utf8');
    } catch (ignored) {
      // Ignore errors if the file is not present, as this is sometimes an expected condition
      return null;
    }

    try {
      return new RefreshToken(JSON.parse(jsonString));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new Error('Failed to parse refresh token file: ' + error);
    }
  }

  constructor(json: Object) {
    copyAttr(this, json, 'clientId', 'client_id');
    copyAttr(this, json, 'clientSecret', 'client_secret');
    copyAttr(this, json, 'refreshToken', 'refresh_token');
    copyAttr(this, json, 'type', 'type');

    if (typeof this.clientId !== 'string' || !this.clientId) {
      throw new Error('Refresh token must contain a "client_id" property');
    } else if (typeof this.clientSecret !== 'string' || !this.clientSecret) {
      throw new Error('Refresh token must contain a "client_secret" property');
    } else if (typeof this.refreshToken !== 'string' || !this.refreshToken) {
      throw new Error('Refresh token must contain a "refresh_token" property');
    } else if (typeof this.type !== 'string' || !this.type) {
      throw new Error('Refresh token must contain a "type" property');
    }
  }
}

/**
 * A struct containing the properties necessary to use service-account JSON credentials.
 */
export class Certificate {
  public projectId: string;
  public privateKey: string;
  public clientEmail: string;

  public static fromPath(path: string): Certificate {
    // Node bug encountered in v6.x. fs.readFileSync hangs when path is a 0 or 1.
    if (typeof path !== 'string') {
      throw new Error('Failed to parse certificate key file: TypeError: path must be a string');
    }
    try {
      return new Certificate(JSON.parse(fs.readFileSync(path, 'utf8')));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new Error('Failed to parse certificate key file: ' + error);
    }
  }

  constructor(json: Object) {
    if (typeof json !== 'object' || json === null) {
      throw new Error('Certificate object must be an object.');
    }

    copyAttr(this, json, 'projectId', 'project_id');
    copyAttr(this, json, 'privateKey', 'private_key');
    copyAttr(this, json, 'clientEmail', 'client_email');

    if (typeof this.privateKey !== 'string' || !this.privateKey) {
      throw new Error('Certificate object must contain a string "private_key" property');
    } else if (typeof this.clientEmail !== 'string' || !this.clientEmail) {
      throw new Error('Certificate object must contain a string "client_email" property');
    }
  }
}

/**
 * Interface for Google OAuth 2.0 access tokens.
 */
export type GoogleOAuthAccessToken = {
  /* tslint:disable:variable-name */
  access_token: string;
  expires_in: number;
  /* tslint:enable:variable-name */
}

/**
 * A wrapper around the http and https request libraries to simplify & promisify JSON requests.
 * TODO(inlined): Create a type for "transit".
 */
function requestAccessToken(transit, options: Object, data?: Object): Promise<GoogleOAuthAccessToken> {
  return new Promise((resolve, reject) => {
    const req = transit.request(options, (res) => {
      let buffers: Buffer[] = [];
      res.on('data', (buffer) => buffers.push(buffer));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(buffers).toString());
          if (json.error) {
            let msg = 'Error fetching access token: ' + json.error;
            if (json.error_description) {
              msg += ' (' + json.error_description + ')';
            }
            reject(new Error(msg));
          } else if (!json.access_token || !json.expires_in) {
            reject(new Error('Unexpected response from server'));
          } else {
            resolve(json);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Implementation of Credential that uses a service account certificate.
 */
export class CertCredential implements Credential {
  private certificate_: Certificate;

  constructor(serviceAccountPathOrObject: string|Object) {
    if (typeof serviceAccountPathOrObject === 'string') {
      this.certificate_ = Certificate.fromPath(serviceAccountPathOrObject);
    } else {
      this.certificate_ = new Certificate(serviceAccountPathOrObject);
    }
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const token = this.createAuthJwt_();
    const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3A' +
      'grant-type%3Ajwt-bearer&assertion=' +
      token;
    const options = {
      method: 'POST',
      host: GOOGLE_AUTH_TOKEN_HOST,
      port: GOOGLE_AUTH_TOKEN_PORT,
      path: GOOGLE_AUTH_TOKEN_PATH,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    };
    return requestAccessToken(https, options, postData);
  }

  public getCertificate(): Certificate {
    return this.certificate_;
  }

  private createAuthJwt_(): string {
    const claims = {
      scope: [
        'https://www.googleapis.com/auth/firebase.database',
        'https://www.googleapis.com/auth/firebase.messaging',
        'https://www.googleapis.com/auth/identitytoolkit',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    // This method is actually synchronous so we can capture and return the buffer.
    return jwt.sign(claims, this.certificate_.privateKey, {
      audience: GOOGLE_TOKEN_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this.certificate_.clientEmail,
      algorithm: JWT_ALGORITHM,
    });
  }
}

/**
 * Interface for things that generate access tokens.
 */
export interface Credential {
  getAccessToken(): Promise<GoogleOAuthAccessToken>;
  getCertificate(): Certificate;
}

/**
 * Implementation of Credential that gets access tokens from refresh tokens.
 */
export class RefreshTokenCredential implements Credential {
  private refreshToken_: RefreshToken;

  constructor(refreshTokenPathOrObject: string|Object) {
    if (typeof refreshTokenPathOrObject === 'string') {
      this.refreshToken_ = RefreshToken.fromPath(refreshTokenPathOrObject);
    } else {
      this.refreshToken_ = new RefreshToken(refreshTokenPathOrObject);
    }
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const postData =
      'client_id=' + this.refreshToken_.clientId + '&' +
      'client_secret=' + this.refreshToken_.clientSecret + '&' +
      'refresh_token=' + this.refreshToken_.refreshToken + '&' +
      'grant_type=refresh_token';

    const options = {
      method: 'POST',
      host: REFRESH_TOKEN_HOST,
      port: REFRESH_TOKEN_PORT,
      path: REFRESH_TOKEN_PATH,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    };
    return requestAccessToken(https, options, postData);
  };

  public getCertificate(): Certificate {
    return null;
  }
}


/**
 * Implementation of Credential that gets access tokens from the metadata service available
 * in the Google Cloud Platform. This authenticates the process as the default service account
 * of an App Engine instance or Google Compute Engine machine.
 */
export class MetadataServiceCredential implements Credential {
  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    const options = {
      method: 'GET',
      host: GOOGLE_METADATA_SERVICE_HOST,
      path: GOOGLE_METADATA_SERVICE_PATH,
      headers: {
        'Content-Length': 0,
      },
    };
    return requestAccessToken(http, options);
  }

  public getCertificate(): Certificate {
    return null;
  }
}


/**
 * ApplicationDefaultCredential implements the process for loading credentials as
 * described in https://developers.google.com/identity/protocols/application-default-credentials
 */
export class ApplicationDefaultCredential implements Credential {
  private credential_: Credential;

  constructor() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = Certificate.fromPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      this.credential_ = new CertCredential(serviceAccount);
      return;
    }

    // It is OK to not have this file. If it is present, it must be valid.
    const refreshToken = RefreshToken.fromPath(GCLOUD_CREDENTIAL_PATH);
    if (refreshToken) {
      this.credential_ = new RefreshTokenCredential(refreshToken);
      return;
    }

    this.credential_ = new MetadataServiceCredential();
  }

  public getAccessToken(): Promise<GoogleOAuthAccessToken> {
    return this.credential_.getAccessToken();
  }

  public getCertificate(): Certificate {
    return this.credential_.getCertificate();
  }

  // Used in testing to verify we are delegating to the correct implementation.
  public getCredential(): Credential {
    return this.credential_;
  }
}

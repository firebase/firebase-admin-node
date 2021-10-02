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

import { AppOptions, App } from './core';
import { AppStore } from './lifecycle';
import { Credential } from './credential';
import { getApplicationDefault } from './credential-internal';
import * as validator from '../utils/validator';
import { deepCopy } from '../utils/deep-copy';
import { AppErrorCodes, FirebaseAppError } from '../utils/error';

const TOKEN_EXPIRY_THRESHOLD_MILLIS = 5 * 60 * 1000;

/**
 * Type representing a Firebase OAuth access token (derived from a Google OAuth2 access token) which
 * can be used to authenticate to Firebase services such as the Realtime Database and Auth.
 */
export interface FirebaseAccessToken {
  accessToken: string;
  expirationTime: number;
}

/**
 * Internals of a FirebaseApp instance.
 */
export class FirebaseAppInternals {
  private cachedToken_: FirebaseAccessToken;
  private tokenListeners_: Array<(token: string) => void>;

  constructor(private credential_: Credential) {
    this.tokenListeners_ = [];
  }

  public getToken(forceRefresh = false): Promise<FirebaseAccessToken> {
    if (forceRefresh || this.shouldRefresh()) {
      return this.refreshToken();
    }

    return Promise.resolve(this.cachedToken_);
  }

  public getCachedToken(): FirebaseAccessToken | null {
    return this.cachedToken_ || null;
  }

  private refreshToken(): Promise<FirebaseAccessToken> {
    return Promise.resolve(this.credential_.getAccessToken())
      .then((result) => {
        // Since the developer can provide the credential implementation, we want to weakly verify
        // the return type until the type is properly exported.
        if (!validator.isNonNullObject(result) ||
          typeof result.expires_in !== 'number' ||
          typeof result.access_token !== 'string') {
          throw new FirebaseAppError(
            AppErrorCodes.INVALID_CREDENTIAL,
            `Invalid access token generated: "${JSON.stringify(result)}". Valid access ` +
            'tokens must be an object with the "expires_in" (number) and "access_token" ' +
            '(string) properties.',
          );
        }

        const token = {
          accessToken: result.access_token,
          expirationTime: Date.now() + (result.expires_in * 1000),
        };
        if (!this.cachedToken_
          || this.cachedToken_.accessToken !== token.accessToken
          || this.cachedToken_.expirationTime !== token.expirationTime) {
          // Update the cache before firing listeners. Listeners may directly query the
          // cached token state.
          this.cachedToken_ = token;
          this.tokenListeners_.forEach((listener) => {
            listener(token.accessToken);
          });
        }

        return token;
      })
      .catch((error) => {
        let errorMessage = (typeof error === 'string') ? error : error.message;

        errorMessage = 'Credential implementation provided to initializeApp() via the ' +
          '"credential" property failed to fetch a valid Google OAuth2 access token with the ' +
          `following error: "${errorMessage}".`;

        if (errorMessage.indexOf('invalid_grant') !== -1) {
          errorMessage += ' There are two likely causes: (1) your server time is not properly ' +
          'synced or (2) your certificate key file has been revoked. To solve (1), re-sync the ' +
          'time on your server. To solve (2), make sure the key ID for your key file is still ' +
          'present at https://console.firebase.google.com/iam-admin/serviceaccounts/project. If ' +
          'not, generate a new key file at ' +
          'https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk.';
        }

        throw new FirebaseAppError(AppErrorCodes.INVALID_CREDENTIAL, errorMessage);
      });
  }

  private shouldRefresh(): boolean {
    return !this.cachedToken_ || (this.cachedToken_.expirationTime - Date.now()) <= TOKEN_EXPIRY_THRESHOLD_MILLIS;
  }

  /**
   * Adds a listener that is called each time a token changes.
   *
   * @param listener - The listener that will be called with each new token.
   */
  public addAuthTokenListener(listener: (token: string) => void): void {
    this.tokenListeners_.push(listener);
    if (this.cachedToken_) {
      listener(this.cachedToken_.accessToken);
    }
  }

  /**
   * Removes a token listener.
   *
   * @param listener - The listener to remove.
   */
  public removeAuthTokenListener(listener: (token: string) => void): void {
    this.tokenListeners_ = this.tokenListeners_.filter((other) => other !== listener);
  }
}

/**
 * Global context object for a collection of services using a shared authentication state.
 *
 * @internal
 */
export class FirebaseApp implements App {

  public INTERNAL: FirebaseAppInternals;

  private name_: string;
  private options_: AppOptions;
  private services_: {[name: string]: unknown} = {};
  private isDeleted_ = false;

  constructor(options: AppOptions, name: string, private readonly appStore?: AppStore) {
    this.name_ = name;
    this.options_ = deepCopy(options);

    if (!validator.isNonNullObject(this.options_)) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_OPTIONS,
        'Invalid Firebase app options passed as the first argument to initializeApp() for the ' +
        `app named "${this.name_}". Options must be a non-null object.`,
      );
    }

    const hasCredential = ('credential' in this.options_);
    if (!hasCredential) {
      this.options_.credential = getApplicationDefault(this.options_.httpAgent);
    }

    const credential = this.options_.credential;
    if (typeof credential !== 'object' || credential === null || typeof credential.getAccessToken !== 'function') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_OPTIONS,
        'Invalid Firebase app options passed as the first argument to initializeApp() for the ' +
        `app named "${this.name_}". The "credential" property must be an object which implements ` +
        'the Credential interface.',
      );
    }

    this.INTERNAL = new FirebaseAppInternals(credential);
  }

  /**
   * Returns the name of the FirebaseApp instance.
   *
   * @returns The name of the FirebaseApp instance.
   */
  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  /**
   * Returns the options for the FirebaseApp instance.
   *
   * @returns The options for the FirebaseApp instance.
   */
  get options(): AppOptions {
    this.checkDestroyed_();
    return deepCopy(this.options_);
  }

  /**
   * @internal
   */
  public getOrInitService<T>(name: string, init: (app: FirebaseApp) => T): T {
    return this.ensureService_(name, () => init(this));
  }

  /**
   * Deletes the FirebaseApp instance.
   *
   * @returns An empty Promise fulfilled once the FirebaseApp instance is deleted.
   */
  public delete(): Promise<void> {
    this.checkDestroyed_();

    // Also remove the instance from the AppStore. This is needed to support the existing
    // app.delete() use case. In the future we can remove this API, and deleteApp() will
    // become the only way to tear down an App.
    this.appStore?.removeApp(this.name);

    return Promise.all(Object.keys(this.services_).map((serviceName) => {
      const service = this.services_[serviceName];
      if (isStateful(service)) {
        return service.delete();
      }
      return Promise.resolve();
    })).then(() => {
      this.services_ = {};
      this.isDeleted_ = true;
    });
  }

  private ensureService_<T>(serviceName: string, initializer: () => T): T {
    this.checkDestroyed_();
    if (!(serviceName in this.services_)) {
      this.services_[serviceName] = initializer();
    }

    return this.services_[serviceName] as T;
  }

  /**
   * Throws an Error if the FirebaseApp instance has already been deleted.
   */
  private checkDestroyed_(): void {
    if (this.isDeleted_) {
      throw new FirebaseAppError(
        AppErrorCodes.APP_DELETED,
        `Firebase app named "${this.name_}" has already been deleted.`,
      );
    }
  }
}

interface StatefulFirebaseService {
  delete(): Promise<void>;
}

function isStateful(service: any): service is StatefulFirebaseService {
  return typeof service.delete === 'function';
}

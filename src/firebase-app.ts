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

import {Credential} from './auth/credential';
import * as validator from './utils/validator';
import {deepCopy, deepExtend} from './utils/deep-copy';
import {GoogleOAuthAccessToken} from './auth/credential';
import {FirebaseServiceInterface} from './firebase-service';
import {FirebaseNamespaceInternals} from './firebase-namespace';
import {AppErrorCodes, FirebaseAppError} from './utils/error';


/**
 * Type representing a callback which is called every time an app lifecycle event occurs.
 */
export type AppHook = (event: string, app: FirebaseApp) => void;


/**
 * Type representing the options object passed into initializeApp().
 */
export type FirebaseAppOptions = {
  credential?: Credential,
  databaseAuthVariableOverride?: Object
  databaseURL?: string,
  storageBucket?: string,
};

/**
 * Type representing a Firebase OAuth access token (derived from a Google OAuth2 access token) which
 * can be used to authenticate to Firebase services such as the Realtime Database and Auth.
 */
export type FirebaseAccessToken = {
  accessToken: string;
  expirationTime: number;
}

/**
 * Internals of a FirebaseApp instance.
 */
export class FirebaseAppInternals {
  private isDeleted_ = false;
  private cachedToken_: FirebaseAccessToken;
  private cachedTokenPromise_: Promise<FirebaseAccessToken>;
  private tokenListeners_: Array<(token: string) => void>;
  private tokenRefreshTimeout_: NodeJS.Timer;

  constructor(private credential_: Credential) {
    this.tokenListeners_ = [];
  }

  /**
   * Gets an auth token for the associated app.
   *
   * @param {boolean} forceRefresh Whether or not to force a token refresh.
   * @return {Promise<Object>} A Promise that will be fulfilled with the current or new token.
   */
  public getToken(forceRefresh?: boolean): Promise<FirebaseAccessToken> {
    const expired = this.cachedToken_ && this.cachedToken_.expirationTime < Date.now();
    if (this.cachedTokenPromise_ && !forceRefresh && !expired) {
      return this.cachedTokenPromise_
        .catch((error) => {
          // Update the cached token promise to avoid caching errors. Set it to resolve with the
          // cached token if we have one (and return that promise since the token has still not
          // expired).
          if (this.cachedToken_) {
            this.cachedTokenPromise_ = Promise.resolve(this.cachedToken_);
            return this.cachedTokenPromise_;
          }

          // Otherwise, set the cached token promise to null so that it will force a refresh next
          // time getToken() is called.
          this.cachedTokenPromise_ = null;

          // And re-throw the caught error.
          throw error;
        });
    } else {
      // Clear the outstanding token refresh timeout. This is a noop if the timeout is undefined.
      clearTimeout(this.tokenRefreshTimeout_);

      // this.credential_ may be an external class; resolving it in a promise helps us
      // protect against exceptions and upgrades the result to a promise in all cases.
      this.cachedTokenPromise_ = Promise.resolve(this.credential_.getAccessToken())
        .then((result: GoogleOAuthAccessToken) => {
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

          const token: FirebaseAccessToken = {
            accessToken: result.access_token,
            expirationTime: Date.now() + (result.expires_in * 1000),
          };

          const hasAccessTokenChanged = (this.cachedToken_ && this.cachedToken_.accessToken !== token.accessToken);
          const hasExpirationChanged = (this.cachedToken_ && this.cachedToken_.expirationTime !== token.expirationTime);
          if (!this.cachedToken_ || hasAccessTokenChanged || hasExpirationChanged) {
            this.cachedToken_ = token;
            this.tokenListeners_.forEach((listener) => {
              listener(token.accessToken);
            });
          }

          // Establish a timeout to proactively refresh the token every minute starting at five
          // minutes before it expires. Once a token refresh succeeds, no further retries are
          // needed; if it fails, retry every minute until the token expires (resulting in a total
          // of four retries: at 4, 3, 2, and 1 minutes).
          let refreshTimeInSeconds = (result.expires_in - (5 * 60));
          let numRetries = 4;

          // In the rare cases the token is short-lived (that is, it expires in less than five
          // minutes from when it was fetched), establish the timeout to refresh it after the
          // current minute ends and update the number of retries that should be attempted before
          // the token expires.
          if (refreshTimeInSeconds <= 0) {
            refreshTimeInSeconds = result.expires_in % 60;
            numRetries = Math.floor(result.expires_in / 60) - 1;
          }

          // The token refresh timeout keeps the Node.js process alive, so only create it if this
          // instance has not already been deleted.
          if (numRetries && !this.isDeleted_) {
            this.setTokenRefreshTimeout(refreshTimeInSeconds * 1000, numRetries);
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

      return this.cachedTokenPromise_;
    }
  }

  /**
   * Adds a listener that is called each time a token changes.
   *
   * @param {function(string)} listener The listener that will be called with each new token.
   */
  public addAuthTokenListener(listener: (token: string) => void) {
    this.tokenListeners_.push(listener);
    if (this.cachedToken_) {
      listener(this.cachedToken_.accessToken);
    }
  }

  /**
   * Removes a token listener.
   *
   * @param {function(string)} listener The listener to remove.
   */
  public removeAuthTokenListener(listener: (token: string) => void) {
    this.tokenListeners_ = this.tokenListeners_.filter((other) => other !== listener);
  }

  /**
   * Deletes the FirebaseAppInternals instance.
   */
  public delete(): void {
    this.isDeleted_ = true;

    // Clear the token refresh timeout so it doesn't keep the Node.js process alive.
    clearTimeout(this.tokenRefreshTimeout_);
  }

  /**
   * Establishes timeout to refresh the Google OAuth2 access token used by the SDK.
   *
   * @param {number} delayInMilliseconds The delay to use for the timeout.
   * @param {number} numRetries The number of times to retry fetching a new token if the prior fetch
   *   failed.
   */
  private setTokenRefreshTimeout(delayInMilliseconds: number, numRetries: number): void {
    this.tokenRefreshTimeout_ = setTimeout(() => {
      this.getToken(/* forceRefresh */ true)
        .catch((error) => {
          // Ignore the error since this might just be an intermittent failure. If we really cannot
          // refresh the token, an error will be logged once the existing token expires and we try
          // to fetch a fresh one.
          if (numRetries > 0) {
            this.setTokenRefreshTimeout(60 * 1000, numRetries - 1);
          }
        });
    }, delayInMilliseconds);
  }
}



/**
 * Global context object for a collection of services using a shared authentication state.
 */
export class FirebaseApp {
  public INTERNAL: FirebaseAppInternals;

  private name_: string;
  private options_: FirebaseAppOptions;
  private services_: {[name: string]: FirebaseServiceInterface} = {};
  private isDeleted_ = false;

  constructor(options: FirebaseAppOptions, name: string, private firebaseInternals_: FirebaseNamespaceInternals) {
    this.name_ = name;
    this.options_ = deepCopy(options) as FirebaseAppOptions;

    if (typeof this.options_ !== 'object' || this.options_ === null) {
      // Ensure the options are a non-null object
      this.options_ = {};
    }

    const hasCredential = ('credential' in this.options_);

    let errorMessage: string;
    if (!hasCredential) {
      errorMessage = 'Options must be an object containing at least a "credential" property.';
    }

    const credential = this.options_.credential;
    if (typeof credential !== 'object' || credential === null || typeof credential.getAccessToken !== 'function') {
      errorMessage = 'The "credential" property must be an object which implements the Credential interface.';
    }

    if (typeof errorMessage !== 'undefined') {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_OPTIONS,
        `Invalid Firebase app options passed as the first argument to initializeApp() for the ` +
        `app named "${this.name_}". ${errorMessage}`
      );
    }

    Object.keys(firebaseInternals_.serviceFactories).forEach((serviceName) => {
      // Defer calling createService() until the service is accessed
      this[serviceName] = this.getService_.bind(this, serviceName);
    });

    this.INTERNAL = new FirebaseAppInternals(this.options_.credential);
  }

  /**
   * Firebase services available off of a FirebaseApp instance. These are monkey-patched via
   * registerService(), but we need to include a dummy implementation to get TypeScript to
   * compile it without errors.
   */
  /* istanbul ignore next */
  public auth(): FirebaseServiceInterface {
    throw new FirebaseAppError(
      AppErrorCodes.INTERNAL_ERROR,
      'INTERNAL ASSERT FAILED: Firebase auth() service has not been registered.',
    );
  }

  /* istanbul ignore next */
  public database(): FirebaseServiceInterface {
    throw new FirebaseAppError(
      AppErrorCodes.INTERNAL_ERROR,
      'INTERNAL ASSERT FAILED: Firebase database() service has not been registered.',
    );
  }

  /* istanbul ignore next */
  public messaging(): FirebaseServiceInterface {
    throw new FirebaseAppError(
      AppErrorCodes.INTERNAL_ERROR,
      'INTERNAL ASSERT FAILED: Firebase messaging() service has not been registered.',
    );
  }

  /* istanbul ignore next */
  public storage(): FirebaseServiceInterface {
    throw new FirebaseAppError(
      AppErrorCodes.INTERNAL_ERROR,
      'INTERNAL ASSERT FAILED: Firebase storage() service has not been registered.',
    );
  }

  /**
   * Returns the name of the FirebaseApp instance.
   *
   * @returns {string} The name of the FirebaseApp instance.
   */
  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  /**
   * Returns the options for the FirebaseApp instance.
   *
   * @returns {FirebaseAppOptions} The options for the FirebaseApp instance.
   */
  get options(): FirebaseAppOptions {
    this.checkDestroyed_();
    return deepCopy(this.options_) as FirebaseAppOptions;
  }

  /**
   * Deletes the FirebaseApp instance.
   *
   * @returns {Promise<void>} An empty Promise fulfilled once the FirebaseApp instance is deleted.
   */
  public delete(): Promise<void> {
    this.checkDestroyed_();
    this.firebaseInternals_.removeApp(this.name_);

    this.INTERNAL.delete();

    return Promise.all(Object.keys(this.services_).map((serviceName) => {
      return this.services_[serviceName].INTERNAL.delete();
    })).then(() => {
      this.services_ = {};
      this.isDeleted_ = true;
    });
  }

  /**
   * Returns the service instance associated with this FirebaseApp instance (creating it on demand
   * if needed).
   *
   * @param {string} serviceName The name of the service instance to return.
   * @return {FirebaseServiceInterface} The service instance with the provided name.
   */
  private getService_(serviceName: string): FirebaseServiceInterface {
    this.checkDestroyed_();

    if (!(serviceName in this.services_)) {
      this.services_[serviceName] = this.firebaseInternals_.serviceFactories[serviceName](
        this,
        this.extendApp_.bind(this)
      );
    }

    return this.services_[serviceName];
  }

  /**
   * Callback function used to extend an App instance at the time of service instance creation.
   */
  private extendApp_(props: {[prop: string]: any}): void {
    deepExtend(this, props);
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

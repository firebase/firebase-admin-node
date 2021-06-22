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

import { AppOptions, app } from './firebase-namespace-api';
import { credential } from './credential/index';
import { getApplicationDefault } from './credential/credential-internal';
import * as validator from './utils/validator';
import { deepCopy } from './utils/deep-copy';
import { FirebaseNamespaceInternals } from './firebase-namespace';
import { AppErrorCodes, FirebaseAppError } from './utils/error';

import { Auth } from './auth/auth';
import { MachineLearning } from './machine-learning/machine-learning';
import { Messaging } from './messaging/messaging';
import { Storage } from './storage/storage';
import { database } from './database/index';
import { DatabaseService } from './database/database-internal';
import { Firestore } from '@google-cloud/firestore';
import { FirestoreService } from './firestore/firestore-internal';
import { Installations } from './installations/installations';
import { InstanceId } from './instance-id/instance-id';
import { ProjectManagement } from './project-management/project-management';
import { SecurityRules } from './security-rules/security-rules';
import { RemoteConfig } from './remote-config/remote-config';
import { AppCheck } from './app-check/app-check';

import Credential = credential.Credential;
import Database = database.Database;

const TOKEN_EXPIRY_THRESHOLD_MILLIS = 5 * 60 * 1000;

/**
 * Type representing a callback which is called every time an app lifecycle event occurs.
 */
export type AppHook = (event: string, app: app.App) => void;

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
   * @param listener The listener that will be called with each new token.
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
   * @param listener The listener to remove.
   */
  public removeAuthTokenListener(listener: (token: string) => void): void {
    this.tokenListeners_ = this.tokenListeners_.filter((other) => other !== listener);
  }
}

/**
 * Global context object for a collection of services using a shared authentication state.
 */
export class FirebaseApp implements app.App {
  public INTERNAL: FirebaseAppInternals;

  private name_: string;
  private options_: AppOptions;
  private services_: {[name: string]: unknown} = {};
  private isDeleted_ = false;

  constructor(options: AppOptions, name: string, private firebaseInternals_: FirebaseNamespaceInternals) {
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
   * Returns the Auth service instance associated with this app.
   *
   * @return The Auth service instance of this app.
   */
  public auth(): Auth {
    return this.ensureService_('auth', () => {
      const authService: typeof Auth = require('./auth/auth').Auth;
      return new authService(this);
    });
  }

  /**
   * Returns the Database service for the specified URL, and the current app.
   *
   * @return The Database service instance of this app.
   */
  public database(url?: string): Database {
    const service: DatabaseService = this.ensureService_('database', () => {
      const dbService: typeof DatabaseService = require('./database/database-internal').DatabaseService;
      return new dbService(this);
    });
    return service.getDatabase(url);
  }

  /**
   * Returns the Messaging service instance associated with this app.
   *
   * @return The Messaging service instance of this app.
   */
  public messaging(): Messaging {
    return this.ensureService_('messaging', () => {
      const messagingService: typeof Messaging = require('./messaging/messaging').Messaging;
      return new messagingService(this);
    });
  }

  /**
   * Returns the Storage service instance associated with this app.
   *
   * @return The Storage service instance of this app.
   */
  public storage(): Storage {
    return this.ensureService_('storage', () => {
      const storageService: typeof Storage = require('./storage/storage').Storage;
      return new storageService(this);
    });
  }

  public firestore(): Firestore {
    const service: FirestoreService = this.ensureService_('firestore', () => {
      const firestoreService: typeof FirestoreService = require('./firestore/firestore-internal').FirestoreService;
      return new firestoreService(this);
    });
    return service.client;
  }

  /**
   * Returns the `Installations` service instance associated with this app.
   *
   * @return The `Installations` service instance of this app.
   */
  public installations(): Installations {
    return this.ensureService_('installations', () => {
      const fisService: typeof Installations = require('./installations/installations').Installations;
      return new fisService(this);
    });
  }

  /**
   * Returns the InstanceId service instance associated with this app.
   *
   * This API is deprecated. Use the `installations()` API instead.
   *
   * @return The InstanceId service instance of this app.
   */
  public instanceId(): InstanceId {
    return this.ensureService_('iid', () => {
      const iidService: typeof InstanceId = require('./instance-id/instance-id').InstanceId;
      return new iidService(this);
    });
  }

  /**
   * Returns the MachineLearning service instance associated with this app.
   *
   * @return The Machine Learning service instance of this app
   */
  public machineLearning(): MachineLearning {
    return this.ensureService_('machine-learning', () => {
      const machineLearningService: typeof MachineLearning =
          require('./machine-learning/machine-learning').MachineLearning;
      return new machineLearningService(this);
    });
  }

  /**
   * Returns the ProjectManagement service instance associated with this app.
   *
   * @return The ProjectManagement service instance of this app.
   */
  public projectManagement(): ProjectManagement {
    return this.ensureService_('project-management', () => {
      const projectManagementService: typeof ProjectManagement =
          require('./project-management/project-management').ProjectManagement;
      return new projectManagementService(this);
    });
  }

  /**
   * Returns the SecurityRules service instance associated with this app.
   *
   * @return The SecurityRules service instance of this app.
   */
  public securityRules(): SecurityRules {
    return this.ensureService_('security-rules', () => {
      const securityRulesService: typeof SecurityRules =
          require('./security-rules/security-rules').SecurityRules;
      return new securityRulesService(this);
    });
  }

  /**
   * Returns the RemoteConfig service instance associated with this app.
   *
   * @return The RemoteConfig service instance of this app.
   */
  public remoteConfig(): RemoteConfig {
    return this.ensureService_('remoteConfig', () => {
      const remoteConfigService: typeof RemoteConfig = require('./remote-config/remote-config').RemoteConfig;
      return new remoteConfigService(this);
    });
  }

  /**
   * Returns the AppCheck service instance associated with this app.
   *
   * @return The AppCheck service instance of this app.
   */
  public appCheck(): AppCheck {
    return this.ensureService_('appCheck', () => {
      const appCheckService: typeof AppCheck = require('./app-check/app-check').AppCheck;
      return new appCheckService(this);
    });
  }

  /**
   * Returns the name of the FirebaseApp instance.
   *
   * @return The name of the FirebaseApp instance.
   */
  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  /**
   * Returns the options for the FirebaseApp instance.
   *
   * @return The options for the FirebaseApp instance.
   */
  get options(): AppOptions {
    this.checkDestroyed_();
    return deepCopy(this.options_);
  }

  /**
   * Deletes the FirebaseApp instance.
   *
   * @return An empty Promise fulfilled once the FirebaseApp instance is deleted.
   */
  public delete(): Promise<void> {
    this.checkDestroyed_();
    this.firebaseInternals_.removeApp(this.name_);

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

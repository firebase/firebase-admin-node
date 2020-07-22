/*!
 * Copyright 2020 Google Inc.
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

import { getApplicationDefault } from './auth/credential';
import * as validator from './utils/validator';
import { deepCopy, deepExtend } from './utils/deep-copy';
import { FirebaseServiceInterface } from './firebase-service';
import { FirebaseNamespaceInternals } from './firebase-namespace';
import { AppErrorCodes, FirebaseAppError } from './utils/error';

import { Auth } from './auth/auth';
import { MachineLearning } from './machine-learning/machine-learning';
import { Messaging } from './messaging/messaging';
import { Storage } from './storage/storage';
import { Database } from '@firebase/database';
import { DatabaseService } from './database/database-internal';
import { Firestore } from '@google-cloud/firestore';
import { FirestoreService } from './firestore/firestore';
import { InstanceId } from './instance-id/instance-id';

import { ProjectManagement } from './project-management/project-management';
import { SecurityRules } from './security-rules/security-rules';
import { RemoteConfig } from './remote-config/remote-config';

import { FirebaseAppInternals, FirebaseAppOptions } from './firebase-app-internal';


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

    if (!validator.isNonNullObject(this.options_)) {
      throw new FirebaseAppError(
        AppErrorCodes.INVALID_APP_OPTIONS,
        `Invalid Firebase app options passed as the first argument to initializeApp() for the ` +
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
        `Invalid Firebase app options passed as the first argument to initializeApp() for the ` +
        `app named "${this.name_}". The "credential" property must be an object which implements ` +
        `the Credential interface.`,
      );
    }

    Object.keys(firebaseInternals_.serviceFactories).forEach((serviceName) => {
      // Defer calling createService() until the service is accessed
      (this as {[key: string]: any})[serviceName] = this.getService_.bind(this, serviceName);
    });

    this.INTERNAL = new FirebaseAppInternals(credential);
  }

  /**
   * Returns the Auth service instance associated with this app.
   *
   * @return {Auth} The Auth service instance of this app.
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
   * @return {Database} The Database service instance of this app.
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
   * @return {Messaging} The Messaging service instance of this app.
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
   * @return {Storage} The Storage service instance of this app.
   */
  public storage(): Storage {
    return this.ensureService_('storage', () => {
      const storageService: typeof Storage = require('./storage/storage').Storage;
      return new storageService(this);
    });
  }

  public firestore(): Firestore {
    const service: FirestoreService = this.ensureService_('firestore', () => {
      const firestoreService: typeof FirestoreService = require('./firestore/firestore').FirestoreService;
      return new firestoreService(this);
    });
    return service.client;
  }

  /**
   * Returns the InstanceId service instance associated with this app.
   *
   * @return {InstanceId} The InstanceId service instance of this app.
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
   * @return {MachineLearning} The Machine Learning service instance of this app
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
   * @return {ProjectManagement} The ProjectManagement service instance of this app.
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
   * @return {SecurityRules} The SecurityRules service instance of this app.
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
   * @return {RemoteConfig} The RemoteConfig service instance of this app.
   */
  public remoteConfig(): RemoteConfig {
    return this.ensureService_('remoteConfig', () => {
      const remoteConfigService: typeof RemoteConfig = require('./remote-config/remote-config').RemoteConfig;
      return new remoteConfigService(this);
    });
  }

  /**
   * Returns the name of the FirebaseApp instance.
   *
   * @return {string} The name of the FirebaseApp instance.
   */
  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  /**
   * Returns the options for the FirebaseApp instance.
   *
   * @return {FirebaseAppOptions} The options for the FirebaseApp instance.
   */
  get options(): FirebaseAppOptions {
    this.checkDestroyed_();
    return deepCopy(this.options_) as FirebaseAppOptions;
  }

  /**
   * Deletes the FirebaseApp instance.
   *
   * @return {Promise<void>} An empty Promise fulfilled once the FirebaseApp instance is deleted.
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

  private ensureService_<T extends FirebaseServiceInterface>(serviceName: string, initializer: () => T): T {
    this.checkDestroyed_();

    let service: T;
    if (serviceName in this.services_) {
      service = this.services_[serviceName] as T;
    } else {
      service = initializer();
      this.services_[serviceName] = service;
    }
    return service;
  }

  /**
   * Returns the service instance associated with this FirebaseApp instance (creating it on demand
   * if needed). This is used for looking up monkeypatched service instances.
   *
   * @param {string} serviceName The name of the service instance to return.
   * @return {FirebaseServiceInterface} The service instance with the provided name.
   */
  private getService_(serviceName: string): FirebaseServiceInterface {
    this.checkDestroyed_();

    if (!(serviceName in this.services_)) {
      this.services_[serviceName] = this.firebaseInternals_.serviceFactories[serviceName](
        this,
        this.extendApp_.bind(this),
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

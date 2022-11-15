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

import { FirebaseFirestoreError } from '../utils/error';
import { ServiceAccountCredential, isApplicationDefault } from '../app/credential-internal';
import { Firestore, Settings } from '@google-cloud/firestore';

import * as validator from '../utils/validator';
import * as utils from '../utils/index';
import { App } from '../app';

export class FirestoreService {

  private readonly appInternal: App;
  private readonly databases: Map<string, Firestore> = new Map();

  constructor(app: App) {
    this.appInternal = app;
  }

  getDatabase(databaseId: string): Firestore {
    let database = this.databases.get(databaseId);
    if (database === undefined) {
      database = initFirestore(this.app, databaseId);
      this.databases.set(databaseId, database);
    }
    return database;
  }

  /**
   * Returns the app associated with this Storage instance.
   *
   * @returns The app associated with this Storage instance.
   */
  get app(): App {
    return this.appInternal;
  }
}

export function getFirestoreOptions(app: App): Settings {
  if (!validator.isNonNullObject(app) || !('options' in app)) {
    throw new FirebaseFirestoreError({
      code: 'invalid-argument',
      message: 'First argument passed to admin.firestore() must be a valid Firebase app instance.',
    });
  }

  const projectId: string | null = utils.getExplicitProjectId(app);
  const credential = app.options.credential;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version: firebaseVersion } = require('../../package.json');
  if (credential instanceof ServiceAccountCredential) {
    return {
      credentials: {
        private_key: credential.privateKey,
        client_email: credential.clientEmail,
      },
      // When the SDK is initialized with ServiceAccountCredentials an explicit projectId is
      // guaranteed to be available.
      projectId: projectId!,
      firebaseVersion,
    };
  } else if (isApplicationDefault(app.options.credential)) {
    // Try to use the Google application default credentials.
    // If an explicit project ID is not available, let Firestore client discover one from the
    // environment. This prevents the users from having to set GOOGLE_CLOUD_PROJECT in GCP runtimes.
    return validator.isNonEmptyString(projectId) ? { projectId, firebaseVersion } : { firebaseVersion };
  }

  throw new FirebaseFirestoreError({
    code: 'invalid-credential',
    message: 'Failed to initialize Google Cloud Firestore client with the available credentials. ' +
      'Must initialize the SDK with a certificate credential or application default credentials ' +
      'to use Cloud Firestore API.',
  });
}

function initFirestore(app: App, databaseId: string): Firestore {
  const options = getFirestoreOptions(app);
  options.databaseId = databaseId;
  let firestoreDatabase: typeof Firestore;
  try {
    // Lazy-load the Firestore implementation here, which in turns loads gRPC.
    firestoreDatabase = require('@google-cloud/firestore').Firestore;
  } catch (err) {
    throw new FirebaseFirestoreError({
      code: 'missing-dependencies',
      message: 'Failed to import the Cloud Firestore client library for Node.js. '
          + 'Make sure to install the "@google-cloud/firestore" npm package. '
          + `Original error: ${err}`,
    });
  }

  return new firestoreDatabase(options);
}

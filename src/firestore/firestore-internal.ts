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

import { FirebaseApp } from '../firebase-app';
import { FirebaseFirestoreError } from '../utils/error';
import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { ServiceAccountCredential, isApplicationDefault } from '../credential/credential-internal';
import { Firestore, Settings } from '@google-cloud/firestore';

import * as validator from '../utils/validator';
import * as utils from '../utils/index';

/**
 * Internals of a Firestore instance.
 */
class FirestoreInternals implements FirebaseServiceInternalsInterface {
  /**
   * Deletes the service and its associated resources.
   *
   * @return {Promise<()>} An empty Promise that will be fulfilled when the service is deleted.
   */
  public delete(): Promise<void> {
    // There are no resources to clean up.
    return Promise.resolve();
  }
}

export class FirestoreService implements FirebaseServiceInterface {
  public INTERNAL: FirestoreInternals = new FirestoreInternals();

  private appInternal: FirebaseApp;
  private firestoreClient: Firestore;

  constructor(app: FirebaseApp) {
    this.firestoreClient = initFirestore(app);
    this.appInternal = app;
  }

  /**
   * Returns the app associated with this Storage instance.
   *
   * @return {FirebaseApp} The app associated with this Storage instance.
   */
  get app(): FirebaseApp {
    return this.appInternal;
  }

  get client(): Firestore {
    return this.firestoreClient;
  }
}

export function getFirestoreOptions(app: FirebaseApp): Settings {
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
        private_key: credential.privateKey, // eslint-disable-line @typescript-eslint/camelcase
        client_email: credential.clientEmail, // eslint-disable-line @typescript-eslint/camelcase
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

function initFirestore(app: FirebaseApp): Firestore {
  const options = getFirestoreOptions(app);
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

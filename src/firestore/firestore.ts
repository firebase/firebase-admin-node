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

import { FirebaseApp } from '../firebase-app';
import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { Firestore } from '@google-cloud/firestore';
import { getFirestoreOptions } from './firestore-internal';
import { FirebaseFirestoreError } from '../utils/error';

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

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

import {FirebaseApp} from '../firebase-app';
import {FirebaseFirestoreError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {ApplicationDefaultCredential, Certificate} from '../auth/credential';
import {Firestore} from '@google-cloud/firestore';

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

function initFirestore(app: FirebaseApp): Firestore {
  if (!validator.isNonNullObject(app) || !('options' in app)) {
    throw new FirebaseFirestoreError({
      code: 'invalid-argument',
      message: 'First argument passed to admin.firestore() must be a valid Firebase app instance.',
    });
  }

  const projectId: string = utils.getProjectId(app);
  if (!validator.isNonEmptyString(projectId)) {
      throw new FirebaseFirestoreError({
          code: 'no-project-id',
          message: 'Failed to determine project ID for Firestore. Initialize the '
            + 'SDK with service account credentials or set project ID as an app option. '
            + 'Alternatively set the GCLOUD_PROJECT environment variable.',
      });
  }

  const cert: Certificate = app.options.credential.getCertificate();
  let firestore: Firestore;
  if (cert != null) {
    // cert is available when the SDK has been initialized with a service account JSON file,
    // or by setting the GOOGLE_APPLICATION_CREDENTIALS envrionment variable.
    firestore = new Firestore({
      credentials: {
        private_key: cert.privateKey,
        client_email: cert.clientEmail,
      },
      projectId,
    });
  } else if (app.options.credential instanceof ApplicationDefaultCredential) {
    // Try to use the Google application default credentials.
    firestore = new Firestore({
      projectId,
    });
  } else {
    throw new FirebaseFirestoreError({
      code: 'invalid-credential',
      message: 'Failed to initialize Google Cloud Firestore client with the available credentials. ' +
        'Must initialize the SDK with a certificate credential or application default credentials ' +
        'to use Cloud Firestore API.',
    });
  }
  return firestore;
}

/**
 * Creates a new Firestore service instance for the given FirebaseApp.
 *
 * @param {FirebaseApp} app The App for this Firestore service.
 * @return {FirebaseServiceInterface} A Firestore service instance.
 */
export function initFirestoreService(app: FirebaseApp): FirebaseServiceInterface {
  let firestore: any = initFirestore(app);

  // Extend the Firestore client object so it implements FirebaseServiceInterface.
  utils.addReadonlyGetter(firestore, 'app', app);
  firestore.INTERNAL = new FirestoreInternals();
  return firestore;
}

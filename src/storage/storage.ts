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
import {FirebaseError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';
import {ApplicationDefaultCredential, Certificate} from '../auth/credential';
import * as gcs from '@google-cloud/storage';

import * as validator from '../utils/validator';

/**
 * Internals of a Storage instance.
 */
class StorageInternals implements FirebaseServiceInternalsInterface {
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

/**
 * Storage service bound to the provided app.
 */
export class Storage implements FirebaseServiceInterface {
  public INTERNAL: StorageInternals = new StorageInternals();

  private appInternal: FirebaseApp;
  private storageClient: any;

  /**
   * @param {FirebaseApp} app The app for this Storage service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseError({
        code: 'storage/invalid-argument',
        message: 'First argument passed to admin.storage() must be a valid Firebase app instance.',
      });
    }

    let storage: typeof gcs;
    try {
      storage = require('@google-cloud/storage');
    } catch (err) {
      throw new FirebaseError({
        code: 'storage/missing-dependencies',
        message: 'Failed to import the Cloud Storage client library for Node.js. '
          + 'Make sure to install the "@google-cloud/storage" npm package. '
          + `Original error: ${err}`,
      });
    }

    const cert: Certificate = app.options.credential.getCertificate();
    if (cert != null) {
      // cert is available when the SDK has been initialized with a service account JSON file,
      // or by setting the GOOGLE_APPLICATION_CREDENTIALS envrionment variable.
      this.storageClient = storage({
        projectId: cert.projectId,
        credentials: {
          private_key: cert.privateKey,
          client_email: cert.clientEmail,
        },
      });
    } else if (app.options.credential instanceof ApplicationDefaultCredential) {
      // Try to use the Google application default credentials.
      this.storageClient = storage();
    } else {
      throw new FirebaseError({
        code: 'storage/invalid-credential',
        message: 'Failed to initialize Google Cloud Storage client with the available credential. ' +
          'Must initialize the SDK with a certificate credential or application default credentials ' +
          'to use Cloud Storage API.',
      });
    }
    this.appInternal = app;
  }

  /**
   * Returns a reference to a Google Cloud Storage bucket. Returned reference can be used to upload
   * and download content from Google Cloud Storage.
   *
   * @param {string=} name Optional name of the bucket to be retrieved. If name is not specified,
   *   retrieves a reference to the default bucket.
   * @return {Bucket} A Bucket object from the @google-cloud/storage library.
   */
  public bucket(name?: string): gcs.Bucket {
    const bucketName = (typeof name !== 'undefined')
      ? name :  this.appInternal.options.storageBucket;
    if (validator.isNonEmptyString(bucketName)) {
      return this.storageClient.bucket(bucketName);
    }
    throw new FirebaseError({
      code: 'storage/invalid-argument',
      message: 'Bucket name not specified or invalid. Specify a valid bucket name via the ' +
                'storageBucket option when initializing the app, or specify the bucket name ' +
                'explicitly when calling the getBucket() method.',
    });
  }

  /**
   * Returns the app associated with this Storage instance.
   *
   * @return {FirebaseApp} The app associated with this Storage instance.
   */
  get app(): FirebaseApp {
    return this.appInternal;
  }
}

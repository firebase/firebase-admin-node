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

import * as storage from '@google-cloud/storage';

import {FirebaseApp} from '../firebase-app';
import {FirebaseError} from '../utils/error';
import {FirebaseServiceInterface, FirebaseServiceInternalsInterface} from '../firebase-service';

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
    return Promise.resolve(undefined);
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
   * @param {Object} app The app for this Storage service.
   * @constructor
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      // TODO: create FirebaseStorageError and StorageClientErrorCode type
      // throw new FirebaseStorageError(
      //   StorageClientErrorCode.INVALID_ARGUMENT,
      //   'First argument passed to admin.storage() must be a valid Firebase app instance.'
      // );

      throw new FirebaseError({
        code: 'storage/invalid-argument',
        message: 'First argument passed to admin.storage() must be a valid Firebase app instance.',
      });
    }

    const cert = app.options.credential.getCertificate();
    if (cert != null) {
      // cert is available when the SDK has been initialized with a service account JSON file,
      // or by setting the GOOGLE_APPLICATION_CREDENTIALS envrionment variable.
      this.storageClient = storage({
        credentials: {
          private_key: cert.privateKey,
          client_email: cert.clientEmail,
        },
      });
    } else {
      // In all other cases try to use the Google application default credentials.
      this.storageClient = storage();
    }
    this.appInternal = app;
  }

  public bucket(name?: string): Promise<any> {
    let bucketName;
    if (typeof name !== 'undefined') {
      bucketName = name;
    } else {
      bucketName = this.appInternal.options.storageBucket;
    }
    if (typeof bucketName !== 'string' || bucketName === '') {
      throw new FirebaseError({
        code: 'storage/invalid-argument',
        message: 'Bucket name not specified or invalid. Specify a valid bucket name via the ' +
                 'storageBucket option when initializing the app, or specify the bucket name ' +
                 'explicitly when calling the getBucket() method.',
      });
    }
    const bucket = this.storageClient.bucket(bucketName);
    return bucket.exists()
      .then((data) => {
        if (data[0]) {
          return bucket;
        }
        throw new FirebaseError({
          code: 'storage/invalid-argument',
          message: 'Bucket ' + bucketName + ' does not exist.',
        });
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
};

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
import { FirebaseError } from '../utils/error';
import { FirebaseServiceInterface, FirebaseServiceInternalsInterface } from '../firebase-service';
import { ServiceAccountCredential, isApplicationDefault } from '../credential/credential-internal';
import { Bucket, Storage as StorageClient } from '@google-cloud/storage';
import * as utils from '../utils/index';
import * as validator from '../utils/validator';
import { storage } from './index';

import StorageInterface  = storage.Storage;

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
 * The default `Storage` service if no
 * app is provided or the `Storage` service associated with the provided
 * app.
 */
export class Storage implements FirebaseServiceInterface, StorageInterface {
  public readonly INTERNAL: StorageInternals = new StorageInternals();

  private readonly appInternal: FirebaseApp;
  private readonly storageClient: StorageClient;

  /**
   * @param {FirebaseApp} app The app for this Storage service.
   * @constructor
   * @internal
   */
  constructor(app: FirebaseApp) {
    if (!validator.isNonNullObject(app) || !('options' in app)) {
      throw new FirebaseError({
        code: 'storage/invalid-argument',
        message: 'First argument passed to admin.storage() must be a valid Firebase app instance.',
      });
    }

    let storage: typeof StorageClient;
    try {
      storage = require('@google-cloud/storage').Storage;
    } catch (err) {
      throw new FirebaseError({
        code: 'storage/missing-dependencies',
        message: 'Failed to import the Cloud Storage client library for Node.js. '
          + 'Make sure to install the "@google-cloud/storage" npm package. '
          + `Original error: ${err}`,
      });
    }

    const projectId: string | null = utils.getExplicitProjectId(app);
    const credential = app.options.credential;
    if (credential instanceof ServiceAccountCredential) {
      this.storageClient = new storage({
        // When the SDK is initialized with ServiceAccountCredentials an explicit projectId is
        // guaranteed to be available.
        projectId: projectId!,
        credentials: {
          private_key: credential.privateKey, // eslint-disable-line @typescript-eslint/camelcase
          client_email: credential.clientEmail, // eslint-disable-line @typescript-eslint/camelcase
        },
      });
    } else if (isApplicationDefault(app.options.credential)) {
      // Try to use the Google application default credentials.
      this.storageClient = new storage();
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
   * @param name Optional name of the bucket to be retrieved. If name is not specified,
   * retrieves a reference to the default bucket.
   * @returns A [Bucket](https://cloud.google.com/nodejs/docs/reference/storage/latest/Bucket)
   * instance as defined in the `@google-cloud/storage` package.
   */
  public bucket(name?: string): Bucket {
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
   * @return The app associated with this Storage instance.
   */
  get app(): FirebaseApp {
    return this.appInternal;
  }
}

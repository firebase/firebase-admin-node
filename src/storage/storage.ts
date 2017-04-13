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

  // TODO: get stricter type for this; check if gcloud export TypeScript types
  public bucket: any;

  private appInternal: FirebaseApp;

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

    // TODO: properly validate storageBucket option (although maybe this should be done in the
    //       FirebaseApp constructor instead?)
    // if (!validator.isNonEmptyString(app.options.storageBucket)) {
    // }

    const cert = app.options.credential.getCertificate();

    const gcs = storage({
      // TODO: as far as I can tell, this is not required...
      // projectId: cert.projectId,

      // TODO: this will only work for cert credential; need to figure out a way to authenticate
      //       gcloud via our existing credentials.
      // Relevant code:
      //       https://github.com/GoogleCloudPlatform/google-cloud-node/blob/
      //       895529e11318bb849777cf9fa94e7117e5b3b203/packages/common/src/util.js#L326
      credentials: {
        private_key: cert.privateKey,
        client_email: cert.clientEmail,
      },
    });

    this.bucket = gcs.bucket(app.options.storageBucket);

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
};

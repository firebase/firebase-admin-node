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

/**
 * Cloud Storage for Firebase.
 *
 * @packageDocumentation
 */

import { File } from '@google-cloud/storage';
import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { Storage } from './storage';
import { FirebaseError } from '../utils/error';
import { getFirebaseMetadata } from './utils';

export { Storage } from './storage';


/**
 * Gets the {@link Storage} service for the default app or a given app.
 *
 * `getStorage()` can be called with no arguments to access the default
 * app's `Storage` service or as `getStorage(app)` to access the
 * `Storage` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Storage service for the default app
 * const defaultStorage = getStorage();
 * ```
 *
 * @example
 * ```javascript
 * // Get the Storage service for a given app
 * const otherStorage = getStorage(otherApp);
 * ```
 */
export function getStorage(app?: App): Storage {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService('storage', (app) => new Storage(app));
}



/**
 * Gets the download URL for the given {@link @google-cloud/storage#File}.
 * 
 * @example
 * ```javascript
 * // Get the downloadUrl for a given file ref
 * const storage = getStorage();
 * const myRef = ref(storage, 'images/mountains.jpg');
 * const downloadUrl = await getDownloadUrl(myRef);
 * ```
 */
export async function getDownloadUrl(file: File): Promise<string> {
  const endpoint =
    (process.env.STORAGE_EMULATOR_HOST ||
      'https://firebasestorage.googleapis.com') + '/v0';
  const { downloadTokens } = await getFirebaseMetadata(endpoint, file);
  if (!downloadTokens) {
    throw new FirebaseError({
      code: 'storage/no-download-token',
      message:
        'No download token available. Please create one in the Firebase Console.',
    });
  }
  const [token] = downloadTokens.split(',');
  return `${endpoint}/b/${file.bucket.name}/o/${encodeURIComponent(
    file.name
  )}?alt=media&token=${token}`;
}

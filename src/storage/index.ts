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

import { File } from "@google-cloud/storage";
import { App, getApp } from "../app";
import { FirebaseApp } from "../app/firebase-app";
import { Storage } from "./storage";
import { FirebaseError } from "../utils/error";

export { Storage } from "./storage";

interface FirebaseMetadata {
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  timeCreated: string;
  updated: string;
  storageClass: string;
  size: string;
  md5Hash: string;
  contentEncoding: string;
  contentDisposition: string;
  crc32c: string;
  etag: string;
  downloadTokens?: string;
}

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
  if (typeof app === "undefined") {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  return firebaseApp.getOrInitService("storage", (app) => new Storage(app));
}
/**
 * Gets metadata from Firebase backend instead of GCS
 * @returns {FirebaseMetadata}
 */
function getFirebaseMetadata(
  endpoint: string,
  file: File
): Promise<FirebaseMetadata> {
  // Build any custom headers based on the defined interceptors on the parent
  // storage object and this object
  const uri = `${endpoint}/b/${file.bucket.name}/o/${encodeURIComponent(
    file.name
  )}`;

  return new Promise((resolve, reject) => {
    file.storage.makeAuthenticatedRequest(
      {
        method: "GET",
        uri,
      },
      (err, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      }
    );
  });
}

/**
 * Gets the download URL for a given file. Will throw a `FirebaseError` if there are no download tokens available.
 * @returns {Promise<string>}
 */

export async function getDownloadUrl(file: File) {
  const endpoint =
    (process.env.STORAGE_EMULATOR_HOST ||
      process.env.STORAGE_HOST_OVERRIDE ||
      "https://firebasestorage.googleapis.com") + "/v0";
  const { downloadTokens } = await getFirebaseMetadata(endpoint, file);
  if (!downloadTokens) {
    throw new FirebaseError({
      code: "storage/no-download-token",
      message:
        "No download token available. Please create one in the Firebase Console.",
    });
  }
  const [token] = downloadTokens.split(",");
  return `${endpoint}/b/${file.bucket.name}/o/${encodeURIComponent(
    file.name
  )}?alt=media&token=${token}`;
}

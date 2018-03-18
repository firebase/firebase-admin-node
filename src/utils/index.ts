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

import {FirebaseApp, FirebaseAppOptions} from '../firebase-app';
import {Certificate} from '../auth/credential';

import * as validator from './validator';

/**
 * Renames properties on an object given a mapping from old to new property names.
 *
 * For example, this can be used to map underscore_cased properties to camelCase.
 *
 * @param {object} obj The object whose properties to rename.
 * @param {object} keyMap The mapping from old to new property names.
 */
export function renameProperties(obj: object, keyMap: { [key: string]: string }): void {
  Object.keys(keyMap).forEach((oldKey) => {
    if (oldKey in obj) {
      const newKey = keyMap[oldKey];
      // The old key's value takes precedence over the new key's value.
      obj[newKey] = obj[oldKey];
      delete obj[oldKey];
    }
  });
}

/**
 * Defines a new read-only property directly on an object and returns the object.
 *
 * @param {object} obj The object on which to define the property.
 * @param {string} prop The name of the property to be defined or modified.
 * @param {any} value The value associated with the property.
 */
export function addReadonlyGetter(obj: object, prop: string, value: any): void {
  Object.defineProperty(obj, prop, {
    value,
    // Make this property read-only.
    writable: false,
    // Include this property during enumeration of obj's properties.
    enumerable: true,
  });
}

/**
 * Determines the Google Cloud project ID associated with a Firebase app by examining
 * the Firebase app options, credentials and the local environment in that order.
 *
 * @param {FirebaseApp} app A Firebase app to get the project ID from.
 *
 * @return {string} A project ID string or null.
 */
export function getProjectId(app: FirebaseApp): string {
  const options: FirebaseAppOptions = app.options;
  if (validator.isNonEmptyString(options.projectId)) {
    return options.projectId;
  }

  const cert: Certificate = options.credential.getCertificate();
  if (cert != null && validator.isNonEmptyString(cert.projectId)) {
    return cert.projectId;
  }

  const projectId = process.env.GCLOUD_PROJECT;
  if (validator.isNonEmptyString(projectId)) {
    return projectId;
  }
  return null;
}

/**
 * Encodes data using web-safe-base64.
 *
 * @param {Buffer} data The raw data byte input.
 * @return {string} The base64-encoded result.
 */
export function toWebSafeBase64(data: Buffer): string {
  return data.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
}

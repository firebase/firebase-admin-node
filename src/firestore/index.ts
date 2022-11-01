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
 * Cloud Firestore.
 *
 * @packageDocumentation
 */

import { Firestore } from '@google-cloud/firestore';
import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { FirestoreService } from './firestore-internal';
import { DEFAULT_DATABASE_ID } from '@google-cloud/firestore/build/src/path';

export {
  AddPrefixToKeys,
  BulkWriter,
  BulkWriterOptions,
  BundleBuilder,
  ChildUpdateFields,
  CollectionGroup,
  CollectionReference,
  DocumentChange,
  DocumentChangeType,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FieldPath,
  FieldValue,
  Firestore,
  FirestoreDataConverter,
  GeoPoint,
  GrpcStatus,
  NestedUpdateFields,
  OrderByDirection,
  PartialWithFieldValue,
  Precondition,
  Primitive,
  Query,
  QueryDocumentSnapshot,
  QueryPartition,
  QuerySnapshot,
  ReadOptions,
  ReadOnlyTransactionOptions,
  ReadWriteTransactionOptions,
  Settings,
  SetOptions,
  Timestamp,
  Transaction,
  UpdateData,
  UnionToIntersection,
  WhereFilterOp,
  WithFieldValue,
  WriteBatch,
  WriteResult,
  v1,
  setLogFunction,
} from '@google-cloud/firestore';

/**
 * Gets the {@link https://googleapis.dev/nodejs/firestore/latest/Firestore.html | Firestore}
 * service for the default app.
 *
 * `getFirestore()` can be called with no arguments to access the default
 * app's `Firestore` service or as `getFirestore(app)` to access the
 * `Firestore` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Firestore service for the default app
 * const defaultFirestore = getFirestore();
 * ```

 * @returns The default {@link https://googleapis.dev/nodejs/firestore/latest/Firestore.html | Firestore}
 *   service if no app is provided or the `Firestore` service associated with the
 *   provided app.
 */
export function getFirestore(): Firestore;

/**
 * Gets the {@link https://googleapis.dev/nodejs/firestore/latest/Firestore.html | Firestore}
 * service for the given app.
 *
 * `getFirestore()` can be called with no arguments to access the default
 * app's `Firestore` service or as `getFirestore(app)` to access the
 * `Firestore` service associated with a specific app.
 *
 * @example
 * ```javascript
 * // Get the Firestore service for a specific app
 * const otherFirestore = getFirestore(app);
 * ```
 *
 * @param App - whose `Firestore` service to
 *   return. If not provided, the default `Firestore` service will be returned.
 *
 * @returns The default {@link https://googleapis.dev/nodejs/firestore/latest/Firestore.html | Firestore}
 *   service if no app is provided or the `Firestore` service associated with the
 *   provided app.
 */
export function getFirestore(app: App): Firestore;

/**
 * @param databaseId
 * @internal
 */
export function getFirestore(databaseId: string): Firestore;

/**
 * @param app
 * @param databaseId
 * @internal
 */
export function getFirestore(app: App, databaseId: string): Firestore;

export function getFirestore(
  appOrDatabaseId?: App | string,
  optionalDatabaseId?: string
): Firestore {
  const app: App = typeof appOrDatabaseId === 'object' ? appOrDatabaseId : getApp();
  const databaseId =
    (typeof appOrDatabaseId === 'string' ? appOrDatabaseId : optionalDatabaseId) || DEFAULT_DATABASE_ID;
  const firebaseApp: FirebaseApp = app as FirebaseApp;
  const firestoreService = firebaseApp.getOrInitService(
    'firestore', (app) => new FirestoreService(app));
  return firestoreService.getDatabase(databaseId);
}

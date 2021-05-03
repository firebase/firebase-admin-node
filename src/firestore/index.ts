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

import { Firestore } from '@google-cloud/firestore';
import { App, getApp } from '../app';
import { FirebaseApp } from '../app/firebase-app';
import { FirestoreService } from './firestore-internal';

export {
  BulkWriter,
  BulkWriterOptions,
  CollectionGroup,
  CollectionReference,
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
  Precondition,
  Query,
  QueryDocumentSnapshot,
  QueryPartition,
  QuerySnapshot,
  ReadOptions,
  Settings,
  Timestamp,
  Transaction,
  UpdateData,
  WriteBatch,
  WriteResult,
  v1,
  setLogFunction,
} from '@google-cloud/firestore';

export function getFirestore(app?: App): Firestore {
  if (typeof app === 'undefined') {
    app = getApp();
  }

  const firebaseApp: FirebaseApp = app as FirebaseApp;
  const firestoreService = firebaseApp.getOrInitService(
    'firestore', (app) => new FirestoreService(app));
  return firestoreService.client;
}

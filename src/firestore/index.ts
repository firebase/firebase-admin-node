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

import { app } from '../firebase-namespace-api';
import * as _firestore from '@google-cloud/firestore';

export declare function firestore(app?: app.App): _firestore.Firestore;

/* eslint-disable @typescript-eslint/no-namespace */
export namespace firestore {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // See https://github.com/typescript-eslint/typescript-eslint/issues/363
  export import v1beta1 = _firestore.v1beta1;
  export import v1 = _firestore.v1;

  export import BulkWriter = _firestore.BulkWriter;
  export import BulkWriterOptions = _firestore.BulkWriterOptions;
  export import CollectionGroup = _firestore.CollectionGroup;
  export import CollectionReference = _firestore.CollectionReference;
  export import DocumentChangeType = _firestore.DocumentChangeType;
  export import DocumentData = _firestore.DocumentData;
  export import DocumentReference = _firestore.DocumentReference;
  export import DocumentSnapshot = _firestore.DocumentSnapshot;
  export import FieldPath = _firestore.FieldPath;
  export import FieldValue = _firestore.FieldValue;
  export import Firestore = _firestore.Firestore;
  export import FirestoreDataConverter = _firestore.FirestoreDataConverter;
  export import GeoPoint = _firestore.GeoPoint;
  export import GrpcStatus = _firestore.GrpcStatus;
  export import Precondition = _firestore.Precondition;
  export import Query = _firestore.Query;
  export import QueryDocumentSnapshot = _firestore.QueryDocumentSnapshot;
  export import QueryPartition = _firestore.QueryPartition;
  export import QuerySnapshot = _firestore.QuerySnapshot;
  export import ReadOptions = _firestore.ReadOptions;
  export import Settings = _firestore.Settings;
  export import Timestamp = _firestore.Timestamp;
  export import Transaction = _firestore.Transaction;
  export import UpdateData = _firestore.UpdateData;
  export import WriteBatch = _firestore.WriteBatch;
  export import WriteResult = _firestore.WriteResult;

  export import setLogFunction = _firestore.setLogFunction;
}

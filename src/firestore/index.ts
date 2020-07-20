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
export * from './firestore';

import * as cloudFirestore from '@google-cloud/firestore';

/* eslint-disable @typescript-eslint/no-unused-vars */
// For context: github.com/typescript-eslint/typescript-eslint/issues/363

export import v1beta1 = cloudFirestore.v1beta1;
export import v1 = cloudFirestore.v1;
export import CollectionReference = cloudFirestore.CollectionReference;
export import DocumentData = cloudFirestore.DocumentData;
export import DocumentReference = cloudFirestore.DocumentReference;
export import DocumentSnapshot = cloudFirestore.DocumentSnapshot;
export import FieldPath = cloudFirestore.FieldPath;
export import FieldValue = cloudFirestore.FieldValue;
export import Firestore = cloudFirestore.Firestore;
export import GeoPoint = cloudFirestore.GeoPoint;
export import Query = cloudFirestore.Query;
export import QueryDocumentSnapshot = cloudFirestore.QueryDocumentSnapshot;
export import QuerySnapshot = cloudFirestore.QuerySnapshot;
export import Timestamp = cloudFirestore.Timestamp;
export import Transaction = cloudFirestore.Transaction;
export import WriteBatch = cloudFirestore.WriteBatch;
export import WriteResult = cloudFirestore.WriteResult;
export import setLogFunction = cloudFirestore.setLogFunction;

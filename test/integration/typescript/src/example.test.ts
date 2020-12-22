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

import initApp from './example';
import { expect } from 'chai';
import { Bucket } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';

import * as admin from 'firebase-admin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../mock.key.json');

describe('Init App', () => {
  const app: admin.app.App = initApp(serviceAccount, 'TestApp');

  after(() => {
    return app.delete();
  });

  it('Should return an initialized App', () => {
    expect(app.name).to.equal('TestApp');
  });

  it('Should return an Auth client', () => {
    const client = admin.auth(app);
    expect(client).to.be.instanceOf((admin.auth as any).Auth);
  });

  it('Should return a Messaging client', () => {
    const client = admin.messaging(app);
    expect(client).to.be.instanceOf((admin.messaging as any).Messaging);
  });

  it('Should return a ProjectManagement client', () => {
    const client = admin.projectManagement(app);
    expect(client).to.be.instanceOf((admin.projectManagement as any).ProjectManagement);
  });

  it('Should return a SecurityRules client', () => {
    const client = admin.securityRules(app);
    expect(client).to.be.instanceOf((admin.securityRules as any).SecurityRules);
  });

  it('Should return a Database client', () => {
    const db = admin.database(app);
    expect(db).to.be.instanceOf((admin.database as any).Database);
  });

  it('Should return a Database client for URL', () => {
    const db = app.database('https://other-mock.firebaseio.com');
    expect(db).to.be.instanceOf((admin.database as any).Database);
  });

  it('Should return a Database ServerValue', () => {
    const serverValue = admin.database.ServerValue;
    expect(serverValue).to.not.be.null;
  });

  it('Should return a Cloud Storage client', () => {
    const storage: admin.storage.Storage = app.storage();
    const bucket: Bucket = storage.bucket('TestBucket');
    expect(bucket.name).to.equal('TestBucket');
  });

  it('Should return a Firestore client from the app', () => {
    const firestore: Firestore = app.firestore();
    expect(firestore).to.be.instanceOf(admin.firestore.Firestore);
  });

  it('Should return a Firestore client', () => {
    const firestore: Firestore = admin.firestore(app);
    expect(firestore).to.be.instanceOf(admin.firestore.Firestore);
  });

  it('Should return a Firestore FieldValue', () => {
    const fieldValue = admin.firestore.FieldValue;
    expect(fieldValue).to.not.be.null;
  });

  it('Should return a DocumentReference', () => {
    const ref: admin.firestore.DocumentReference = admin.firestore(app).collection('test').doc();
    expect(ref).to.not.be.null;
  });
});

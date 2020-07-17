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

import initApp from './example';
import { expect } from 'chai';
// import {Bucket} from '@google-cloud/storage';

import { FirebaseApp } from 'firebase-admin';
import { auth } from 'firebase-admin/auth';
import { database, Database, ServerValue } from 'firebase-admin/database';
import { Firestore, firestore, FieldValue, DocumentReference } from 'firebase-admin/firestore';


// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../mock.key.json');

describe('Init App', () => {
  const app: FirebaseApp = initApp(serviceAccount, 'TestApp');

  after(() => {
    return app.delete();
  });

  it('Should return an initialized App', () => {
    expect(app.name).to.equal('TestApp');
  });

  it('Should return an Auth client', () => {
    const client = auth(app);
    expect(client).to.not.be.null;
  });

  /*it('Should return a Messaging client', () => {
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
  }); */

  it('Should return a Database client', () => {
    const db = database(app);
    expect(db).to.be.instanceOf(Database);
  });

  it('Should return a Database client for URL', () => {
    const db = database(app, 'https://other-mock.firebaseio.com');
    expect(db).to.be.instanceOf(Database);
  });

  /*
  //  Error: Credential implementation provided to initializeApp() via the "credential" property failed .. .
  it('Should return a Database client rules for URL', () => {
    return database(app).getRulesJSON().then((result) => {
      return expect(result).to.be.not.undefined;
    });
  }); */

  it('Should return a Database ServerValue', () => {
    const serverValue = ServerValue;
    expect(serverValue).to.not.be.null;
  });

  /*it('Should return a Cloud Storage client', () => {
    const bucket: Bucket = app.storage().bucket('TestBucket');
    expect(bucket.name).to.equal('TestBucket');
  }); */

  it('Should return a Firestore client from the app', () => {
    const fs: Firestore = firestore(app);
    expect(fs).to.be.instanceOf(Firestore);
  });

  it('Should return a Firestore client', () => {
    const fs: Firestore = firestore(app);
    expect(fs).to.be.instanceOf(Firestore);
  });

  it('Should return a Firestore FieldValue', () => {
    const fieldValue = FieldValue;
    expect(fieldValue).to.not.be.null;
  });

  it('Should return a DocumentReference', () => {
    const ref: DocumentReference = firestore(app).collection('test').doc();
    expect(ref).to.not.be.null;
  });
});

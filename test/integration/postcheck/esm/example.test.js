/*!
 * @license
 * Copyright 2021 Google Inc.
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

import { expect } from 'chai';

import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAppCheck, AppCheck } from 'firebase-admin/app-check';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getDatabase, getDatabaseWithUrl, ServerValue } from 'firebase-admin/database';
import { getFirestore, DocumentReference, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getInstanceId, InstanceId } from 'firebase-admin/instance-id';
import { getMachineLearning, MachineLearning } from 'firebase-admin/machine-learning';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getProjectManagement, ProjectManagement } from 'firebase-admin/project-management';
import { getRemoteConfig, RemoteConfig } from 'firebase-admin/remote-config';
import { getSecurityRules, SecurityRules } from 'firebase-admin/security-rules';
import { getStorage, Storage } from 'firebase-admin/storage';

describe('ESM entry points', () => {
  let app;

  before(() => {
    app = initializeApp({
      credential: cert('mock.key.json'),
      databaseURL: 'https://mock.firebaseio.com'
    }, 'TestApp');
  });

  after(() => {
    return deleteApp(app);
  });

  it('Should return an initialized App', () => {
    expect(app.name).to.equal('TestApp');
  });

  it('Should return an AppCheck client', () => {
    const client = getAppCheck(app);
    expect(client).to.be.instanceOf(AppCheck);
  });

  it('Should return an Auth client', () => {
    const client = getAuth(app);
    expect(client).to.be.instanceOf(Auth);
  });

  it('Should return a Messaging client', () => {
    const client = getMessaging(app);
    expect(client).to.be.instanceOf(Messaging);
  });

  it('Should return a ProjectManagement client', () => {
    const client = getProjectManagement(app);
    expect(client).to.be.instanceOf(ProjectManagement);
  });

  it('Should return a SecurityRules client', () => {
    const client = getSecurityRules(app);
    expect(client).to.be.instanceOf(SecurityRules);
  });

  it('Should return a Database client', () => {
    const db = getDatabase(app);
    expect(db).to.be.not.undefined;
    expect(typeof db.getRules).to.equal('function');
  });

  it('Should return a Database client for URL', () => {
    const db = getDatabaseWithUrl('https://other-mock.firebaseio.com', app);
    expect(db).to.be.not.undefined;
    expect(typeof db.getRules).to.equal('function');
  });

  it('Should return a Database ServerValue', () => {
    expect(ServerValue.increment(1)).to.be.not.undefined;
  });

  it('Should return a Cloud Storage client', () => {
    const storage = getStorage(app);
    expect(storage).to.be.instanceOf(Storage)
    const bucket = storage.bucket('TestBucket');
    expect(bucket.name).to.equal('TestBucket');
  });

  it('Should return a Firestore client', () => {
    const firestore = getFirestore(app);
    expect(firestore).to.be.instanceOf(Firestore);
  });

  it('Should return a Firestore FieldValue', () => {
    expect(FieldValue.increment(1)).to.be.not.undefined;
  });

  it('Should return a DocumentReference', () => {
    const ref = getFirestore(app).collection('test').doc();
    expect(ref).to.be.instanceOf(DocumentReference);
  });

  it('Should return an InstanceId client', () => {
    const client = getInstanceId(app);
    expect(client).to.be.instanceOf(InstanceId);
  });

  it('Should return a MachineLearning client', () => {
    const client = getMachineLearning(app);
    expect(client).to.be.instanceOf(MachineLearning);
  });

  it('Should return a RemoteConfig client', () => {
    const client = getRemoteConfig(app);
    expect(client).to.be.instanceOf(RemoteConfig);
  });
});

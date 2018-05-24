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

'use strict';

import path = require('path');
import * as _ from 'lodash';
import {expect} from 'chai';

import * as mocks from '../../resources/mocks';
import {FirebaseApp} from '../../../src/firebase-app';
import {ApplicationDefaultCredential} from '../../../src/auth/credential';
import {FirestoreService, getFirestoreOptions} from '../../../src/firestore/firestore';

describe('Firestore', () => {
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;
  let defaultCredentialApp: FirebaseApp;
  let projectIdApp: FirebaseApp;
  let firestore: any;

  let appCredentials: string;
  let gcloudProject: string;

  const invalidCredError = 'Failed to initialize Google Cloud Firestore client with the available '
    + 'credentials. Must initialize the SDK with a certificate credential or application default '
    + 'credentials to use Cloud Firestore API.';

  const mockServiceAccount = path.resolve(__dirname, '../../resources/mock.key.json');

  beforeEach(() => {
    appCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    gcloudProject = process.env.GCLOUD_PROJECT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    defaultCredentialApp = mocks.appWithOptions({
      credential: new ApplicationDefaultCredential(),
    });
    projectIdApp = mocks.appWithOptions({
      credential: mocks.credential,
      projectId: 'explicit-project-id',
    });
    firestore = new FirestoreService(mockApp);
  });

  afterEach(() => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = appCredentials;
    process.env.GCLOUD_PROJECT = gcloudProject;
    return mockApp.delete();
  });

  describe('Initializer', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it(`should throw given invalid app: ${ JSON.stringify(invalidApp) }`, () => {
        expect(() => {
          const firestoreAny: any = FirestoreService;
          return new firestoreAny(invalidApp);
        }).to.throw('First argument passed to admin.firestore() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const firestoreAny: any = FirestoreService;
        return new firestoreAny();
      }).to.throw('First argument passed to admin.firestore() must be a valid Firebase app instance.');
    });

    it('should throw given an invalid credential with project ID', () => {
      // Project ID is read from the environment variable, but the credential is unsupported.
      process.env.GCLOUD_PROJECT = 'project_id';
      expect(() => {
        return new FirestoreService(mockCredentialApp);
      }).to.throw(invalidCredError);
    });

    it('should throw given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GCLOUD_PROJECT;
      expect(() => {
        return new FirestoreService(mockCredentialApp);
      }).to.throw(invalidCredError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new FirestoreService(mockApp);
      }).not.to.throw();
    });

    it('should not throw given application default credentials without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GCLOUD_PROJECT;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = mockServiceAccount;
      expect(() => {
        return new FirestoreService(defaultCredentialApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(firestore.app).to.equal(mockApp);
    });

    it('is read-only', () => {
      expect(() => {
        firestore.app = mockApp;
      }).to.throw('Cannot set property app of #<FirestoreService> which has only a getter');
    });
  });

  describe('client', () => {
    it('returns the client from the constructor', () => {
      // We expect referential equality here
      expect(firestore.client).to.not.be.null;
    });

    it('is read-only', () => {
      expect(() => {
        firestore.client = mockApp;
      }).to.throw('Cannot set property client of #<FirestoreService> which has only a getter');
    });
  });

  describe('client.projectId', () => {
    it('should return a string when project ID is present in credential', () => {
      const options = getFirestoreOptions(mockApp);
      expect(options.projectId).to.equal('project_id');
    });

    it('should return a string when project ID is present in app options', () => {
      const options = getFirestoreOptions(projectIdApp);
      expect(options.projectId).to.equal('explicit-project-id');
    });

    it('should return a string when project ID is present in environment', () => {
      process.env.GCLOUD_PROJECT = 'env-project-id';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = mockServiceAccount;
      const options = getFirestoreOptions(defaultCredentialApp);
      expect(options.projectId).to.equal('env-project-id');
    });
  });
});

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

'use strict';

import * as _ from 'lodash';
import { expect } from 'chai';

import * as mocks from '../../resources/mocks';
import { FirebaseApp } from '../../../src/firebase-app';
import {
  ComputeEngineCredential, RefreshTokenCredential
} from '../../../src/credential/credential-internal';
import { FirestoreService, getFirestoreOptions } from '../../../src/firestore/firestore-internal';

describe('Firestore', () => {
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;
  let projectIdApp: FirebaseApp;
  let firestore: any;

  let appCredentials: string | undefined;
  let googleCloudProject: string | undefined;
  let gcloudProject: string | undefined;

  const invalidCredError = 'Failed to initialize Google Cloud Firestore client with the available '
    + 'credentials. Must initialize the SDK with a certificate credential or application default '
    + 'credentials to use Cloud Firestore API.';

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version: firebaseVersion } = require('../../../package.json');
  const defaultCredentialApps = [
    {
      name: 'ComputeEngineCredentials',
      app: mocks.appWithOptions({
        credential: new ComputeEngineCredential(),
      }),
    },
    {
      name: 'RefreshTokenCredentials',
      app: mocks.appWithOptions({
        credential: new RefreshTokenCredential(mocks.refreshToken, undefined, true),
      }),
    },
  ];

  beforeEach(() => {
    appCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
    gcloudProject = process.env.GCLOUD_PROJECT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    projectIdApp = mocks.appWithOptions({
      credential: mocks.credential,
      projectId: 'explicit-project-id',
    });
    firestore = new FirestoreService(mockApp);
  });

  afterEach(() => {
    if (appCredentials) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = appCredentials;
    } else {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    if (googleCloudProject) {
      process.env.GOOGLE_CLOUD_PROJECT = googleCloudProject;
    } else {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    }
    if (gcloudProject) {
      process.env.GCLOUD_PROJECT = gcloudProject;
    } else {
      delete process.env.GCLOUD_PROJECT;
    }
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
      process.env.GOOGLE_CLOUD_PROJECT = 'project_id';
      expect(() => {
        return new FirestoreService(mockCredentialApp);
      }).to.throw(invalidCredError);
    });

    it('should throw given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
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

    defaultCredentialApps.forEach((config) => {
      it(`should not throw given default ${config.name} without project ID`, () => {
        // Project ID not set in the environment.
        delete process.env.GOOGLE_CLOUD_PROJECT;
        delete process.env.GCLOUD_PROJECT;
        expect(() => {
          return new FirestoreService(config.app);
        }).not.to.throw();
      });
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

  describe('options.projectId', () => {
    it('should return a string when project ID is present in credential', () => {
      const options = getFirestoreOptions(mockApp);
      expect(options.projectId).to.equal('project_id');
    });

    it('should return a string when project ID is present in app options', () => {
      const options = getFirestoreOptions(projectIdApp);
      expect(options.projectId).to.equal('explicit-project-id');
    });

    defaultCredentialApps.forEach((config) => {
      it(`should return a string when GOOGLE_CLOUD_PROJECT is set with ${config.name}`, () => {
        process.env.GOOGLE_CLOUD_PROJECT = 'env-project-id';
        const options = getFirestoreOptions(config.app);
        expect(options.projectId).to.equal('env-project-id');
      });

      it(`should return a string when GCLOUD_PROJECT is set with ${config.name}`, () => {
        process.env.GCLOUD_PROJECT = 'env-project-id';
        const options = getFirestoreOptions(config.app);
        expect(options.projectId).to.equal('env-project-id');
      });
    });
  });

  describe('options.firebaseVersion', () => {
    it('should return firebaseVersion when using credential with service account certificate', () => {
      const options = getFirestoreOptions(mockApp);
      expect(options.firebaseVersion).to.equal(firebaseVersion);
    });

    defaultCredentialApps.forEach((config) => {
      it(`should return firebaseVersion when using default ${config.name}`, () => {
        const options = getFirestoreOptions(config.app);
        expect(options.firebaseVersion).to.equal(firebaseVersion);
      });
    });
  });
});

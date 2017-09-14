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

import * as _ from 'lodash';
import {expect} from 'chai';

import * as mocks from '../../resources/mocks';
import {FirebaseApp} from '../../../src/firebase-app';
import {initFirestore} from '../../../src/firestore/firestore';

describe('Firestore', () => {
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;
  let projectIdApp: FirebaseApp;
  let firestore: any;
  let gcloudProject: string;

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    projectIdApp = mocks.appWithOptions({
      credential: mocks.credential,
      projectId: 'explicit-project-id',
    });
    firestore = initFirestore(mockApp);
    gcloudProject = process.env.GCLOUD_PROJECT;
  });

  afterEach(() => {
    process.env.GCLOUD_PROJECT = gcloudProject;
    return mockApp.delete();
  });

  describe('Initializer', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it(`should throw given invalid app: ${ JSON.stringify(invalidApp) }`, () => {
        expect(() => {
          const firestoreAny: any = initFirestore;
          return firestoreAny(invalidApp);
        }).to.throw('First argument passed to admin.firestore() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const firestoreAny: any = initFirestore;
        return firestoreAny();
      }).to.throw('First argument passed to admin.firestore() must be a valid Firebase app instance.');
    });

    it('should throw given an invalid credential', () => {
      // Project ID is read from the environment variable, but the credential is unsupported.
      process.env.GCLOUD_PROJECT = 'project_id';
      const expectedError = 'Failed to initialize Google Cloud Firestore client with the available credentials. '
        + 'Must initialize the SDK with a certificate credential or application default credentials '
        + 'to use Cloud Firestore API.';
      expect(() => {
        return initFirestore(mockCredentialApp);
      }).to.throw(expectedError);
    });

    it('should throw given no project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GCLOUD_PROJECT;
      const expectedError = 'Failed to determine project ID for Firestore. Initialize the SDK with service '
        + 'account credentials or set project ID as an app option. Alternatively set the GCLOUD_PROJECT '
        + 'environment variable.';
      expect(() => {
        return initFirestore(mockCredentialApp);
      }).to.throw(expectedError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return initFirestore(mockApp);
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
      }).to.throw('Cannot set property app of #<Firestore> which has only a getter');
    });
  });

  describe('projectId', () => {
    it('should return a string when project ID is present in credential', () => {
      expect(firestore.projectId).to.equal('project_id');
    });

    it('should return a string when project ID is present in app options', () => {
      expect((initFirestore(projectIdApp) as any).projectId).to.equal('explicit-project-id');
    });
  });
});

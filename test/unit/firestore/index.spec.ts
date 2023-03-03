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

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { App } from '../../../src/app/index';
import { getFirestore, initializeFirestore, Firestore } from '../../../src/firestore/index';
import { DEFAULT_DATABASE_ID } from '@google-cloud/firestore/build/src/path';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Firestore', () => {
  let mockAppOne: App;
  let mockAppTwo: App;
  let mockCredentialApp: App;

  const noProjectIdError = 'Failed to initialize Google Cloud Firestore client with the '
  + 'available credentials. Must initialize the SDK with a certificate credential or '
  + 'application default credentials to use Cloud Firestore API.';

  beforeEach(() => {
    mockAppOne = mocks.app();
    mockAppTwo = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
  });

  describe('getFirestore()', () => {
    it('should throw when default app is not available', () => {
      expect(() => {
        return getFirestore();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should reject given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      expect(() => getFirestore(mockCredentialApp)).to.throw(noProjectIdError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return getFirestore(mockAppOne);
      }).not.to.throw();
    });

    it('should return the same instance for a given app instance', () => {
      const db1: Firestore = getFirestore(mockAppOne);
      const db2: Firestore = getFirestore(mockAppOne, DEFAULT_DATABASE_ID);
      expect(db1).to.equal(db2);
    });

    it('should return the same instance for a given app instance and databaseId', () => {
      const db1: Firestore = getFirestore(mockAppOne, 'db');
      const db2: Firestore = getFirestore(mockAppOne, 'db');
      expect(db1).to.equal(db2);
    });

    it('should return the different instance for given same app instance, but different databaseId', () => {
      const db0: Firestore = getFirestore(mockAppOne, DEFAULT_DATABASE_ID);
      const db1: Firestore = getFirestore(mockAppOne, 'db1');
      const db2: Firestore = getFirestore(mockAppOne, 'db2');
      expect(db0).to.not.equal(db1);
      expect(db0).to.not.equal(db2);
      expect(db1).to.not.equal(db2);
    });
  });

  describe('initializeFirestore()', () => {
    it('should reject given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      expect(() => initializeFirestore(mockCredentialApp)).to.throw(noProjectIdError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return initializeFirestore(mockAppOne);
      }).not.to.throw();
    });

    it('should return the same instance for a given app instance', () => {
      const db1: Firestore = initializeFirestore(mockAppOne);
      const db2: Firestore = initializeFirestore(mockAppOne, {}, DEFAULT_DATABASE_ID);

      const db3: Firestore = initializeFirestore(mockAppTwo, { preferRest: true });
      const db4: Firestore = initializeFirestore(mockAppTwo, { preferRest: true }, DEFAULT_DATABASE_ID);

      expect(db1).to.equal(db2);
      expect(db3).to.equal(db4);
    });

    it('should return the same instance for a given app instance and databaseId', () => {
      const db1: Firestore = initializeFirestore(mockAppOne, {}, 'db');
      const db2: Firestore = initializeFirestore(mockAppOne, {}, 'db');

      const db3: Firestore = initializeFirestore(mockAppTwo, { preferRest: true }, 'db');
      const db4: Firestore = initializeFirestore(mockAppTwo, { preferRest: true }, 'db');

      expect(db1).to.equal(db2);
      expect(db3).to.equal(db4);
    });

    it('should return a different instance for given same app instance, but different databaseId', () => {
      const db0: Firestore = initializeFirestore(mockAppOne, {}, DEFAULT_DATABASE_ID);
      const db1: Firestore = initializeFirestore(mockAppOne, {}, 'db1');
      const db2: Firestore = initializeFirestore(mockAppOne, {}, 'db2');

      const db3: Firestore = initializeFirestore(mockAppTwo, { preferRest: true }, DEFAULT_DATABASE_ID);
      const db4: Firestore = initializeFirestore(mockAppTwo, { preferRest: true }, 'db1');
      const db5: Firestore = initializeFirestore(mockAppTwo, { preferRest: true }, 'db2');

      expect(db0).to.not.equal(db1);
      expect(db0).to.not.equal(db2);
      expect(db1).to.not.equal(db2);

      expect(db3).to.not.equal(db4);
      expect(db3).to.not.equal(db5);
      expect(db4).to.not.equal(db5);
    });

    it('getFirestore should return the same instance as initializeFirestore returned earlier', () => {
      const db1: Firestore = initializeFirestore(mockAppOne, {}, 'db');
      const db2: Firestore = getFirestore(mockAppOne, 'db');
      
      const db3: Firestore = initializeFirestore(mockAppTwo, { preferRest: true });
      const db4: Firestore = getFirestore(mockAppTwo);

      expect(db1).to.equal(db2);
      expect(db3).to.equal(db4);
    });

    it('initializeFirestore should not allow create an instance with different settings', () => {
      initializeFirestore(mockAppTwo, {}, 'db');
      expect(() => {
        return initializeFirestore(mockAppTwo, { preferRest: true }, 'db');
      }).to.throw(/has already been called with different options/);
    });
  });
});

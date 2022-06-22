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
import { getFirestore, Firestore } from '../../../src/firestore/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Firestore', () => {
  let mockApp: App;
  let mockCredentialApp: App;

  const noProjectIdError = 'Failed to initialize Google Cloud Firestore client with the '
  + 'available credentials. Must initialize the SDK with a certificate credential or '
  + 'application default credentials to use Cloud Firestore API.';

  beforeEach(() => {
    mockApp = mocks.app();
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
        return getFirestore(mockApp);
      }).not.to.throw();
    });

    it('should return the same instance for a given app instance', () => {
      const db1: Firestore = getFirestore(mockApp);
      const db2: Firestore = getFirestore(mockApp);
      expect(db1).to.equal(db2);
    });
  });
});

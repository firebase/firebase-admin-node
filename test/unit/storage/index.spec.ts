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
import { getStorage, Storage } from '../../../src/storage/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Storage', () => {
  let mockApp: App;
  let mockCredentialApp: App;

  const noProjectIdError = 'Failed to initialize Google Cloud Storage client with the '
  + 'available credential. Must initialize the SDK with a certificate credential or '
  + 'application default credentials to use Cloud Storage API.';

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
  });

  describe('getStorage()', () => {
    it('should throw when default app is not available', () => {
      expect(() => {
        return getStorage();
      }).to.throw('The default Firebase app does not exist.');
    });

    it('should reject given an invalid credential without project ID', () => {
      // Project ID not set in the environment.
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GCLOUD_PROJECT;
      expect(() => getStorage(mockCredentialApp)).to.throw(noProjectIdError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return getStorage(mockApp);
      }).not.to.throw();
    });

    it('should return the same instance for a given app instance', () => {
      const storage1: Storage = getStorage(mockApp);
      const storage2: Storage = getStorage(mockApp);
      expect(storage1).to.equal(storage2);
    });
  });
});

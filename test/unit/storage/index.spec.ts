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
import { createSandbox, SinonSandbox } from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from '../../resources/mocks';
import { App } from '../../../src/app/index';
import * as StorageUtils from '../../../src/storage/utils';
import { getStorage, Storage, getDownloadUrl } from '../../../src/storage/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Storage', () => {
  let mockApp: App;
  let mockCredentialApp: App;

  const noProjectIdError =
    'Failed to initialize Google Cloud Storage client with the ' +
    'available credential. Must initialize the SDK with a certificate credential or ' +
    'application default credentials to use Cloud Storage API.';

  let sandbox: SinonSandbox;
  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    sandbox = createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
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

    it('should return an error when no metadata is available', async () => {
      sandbox
        .stub(StorageUtils, 'getFirebaseMetadata')
        .returns(Promise.resolve({} as StorageUtils.FirebaseMetadata));
      const storage1 = getStorage(mockApp);
      const fileRef = storage1.bucket('gs://mock').file('abc');
      await expect(getDownloadUrl(fileRef)).to.be.rejectedWith(
        'No download token available. Please create one in the Firebase Console.'
      );
    });

    it('should return an error when unable to fetch metadata', async () => {
      const error = new Error('Could not get metadata');
      sandbox
        .stub(StorageUtils, 'getFirebaseMetadata')
        .returns(Promise.reject(error));
      const storage1 = getStorage(mockApp);
      const fileRef = storage1.bucket('gs://mock').file('abc');
      await expect(getDownloadUrl(fileRef)).to.be.rejectedWith(
        error
      );
    });
    it('should return the proper download url when metadata is available', async () => {
      const downloadTokens = ['abc', 'def'];
      sandbox
        .stub(StorageUtils, 'getFirebaseMetadata')
        .returns(
          Promise.resolve({
            downloadTokens: downloadTokens.join(','),
          } as StorageUtils.FirebaseMetadata)
        );
      const storage1 = getStorage(mockApp);
      const fileRef = storage1.bucket('gs://mock').file('abc');
      await expect(getDownloadUrl(fileRef)).to.eventually.eq(
        `https://firebasestorage.googleapis.com/v0/b/${fileRef.bucket.name}/o/${encodeURIComponent(fileRef.name)}?alt=media&token=${downloadTokens[0]}`
      );
    });
    it('should use the emulator host name when either envs are set', async () => {
      const HOST = 'localhost:9091';
      const envsToCheck = [
        { envName: 'FIREBASE_STORAGE_EMULATOR_HOST', value: HOST },
        { envName: 'STORAGE_EMULATOR_HOST', value: `http://${HOST}` },
      ];
      const downloadTokens = ['abc', 'def'];
      sandbox.stub(StorageUtils, 'getFirebaseMetadata').returns(
        Promise.resolve({
          downloadTokens: downloadTokens.join(','),
        } as StorageUtils.FirebaseMetadata)
      );
      for (const { envName, value } of envsToCheck) {
        
        delete process.env.STORAGE_EMULATOR_HOST;
        delete process.env[envName];
        process.env[envName] = value;
        
        // Need to create a new mock app to force `getStorage`'s checking of env vars.
        const storage1 = getStorage(mocks.app(envName));
        const fileRef = storage1.bucket('gs://mock').file('abc');
        await expect(getDownloadUrl(fileRef)).to.eventually.eq(
          `http://${HOST}/v0/b/${fileRef.bucket.name}/o/${encodeURIComponent(
            fileRef.name
          )}?alt=media&token=${downloadTokens[0]}`
        );
        delete process.env[envName];
      }
    });
  });
});

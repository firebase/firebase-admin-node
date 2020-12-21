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
import { Storage } from '../../../src/storage/storage';

describe('Storage', () => {
  let mockApp: FirebaseApp;
  let mockCredentialApp: FirebaseApp;
  let storage: Storage;

  beforeEach(() => {
    mockApp = mocks.app();
    mockCredentialApp = mocks.mockCredentialApp();
    storage = new Storage(mockApp);
  });

  afterEach(() => {
    return mockApp.delete();
  });

  describe('Constructor', () => {
    const invalidApps = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidApps.forEach((invalidApp) => {
      it(`should throw given invalid app: ${ JSON.stringify(invalidApp) }`, () => {
        expect(() => {
          const storageAny: any = Storage;
          return new storageAny(invalidApp);
        }).to.throw('First argument passed to admin.storage() must be a valid Firebase app instance.');
      });
    });

    it('should throw given no app', () => {
      expect(() => {
        const storageAny: any = Storage;
        return new storageAny();
      }).to.throw('First argument passed to admin.storage() must be a valid Firebase app instance.');
    });

    it('should throw given invalid credential', () => {
      const expectedError = 'Failed to initialize Google Cloud Storage client with the available ' +
        'credential. Must initialize the SDK with a certificate credential or application default ' +
        'credentials to use Cloud Storage API.';
      expect(() => {
        const storageAny: any = Storage;
        return new storageAny(mockCredentialApp);
      }).to.throw(expectedError);
    });

    it('should not throw given a valid app', () => {
      expect(() => {
        return new Storage(mockApp);
      }).not.to.throw();
    });
  });

  describe('app', () => {
    it('returns the app from the constructor', () => {
      // We expect referential equality here
      expect(storage.app).to.equal(mockApp);
    });

    it('is read-only', () => {
      expect(() => {
        (storage as any).app = mockApp;
      }).to.throw('Cannot set property app of #<Storage> which has only a getter');
    });
  });

  describe('bucket(invalid)', () => {
    const expectedError = 'Bucket name not specified or invalid. Specify a valid bucket name via ' +
        'the storageBucket option when initializing the app, or specify the bucket name ' +
        'explicitly when calling the getBucket() method.';
    const invalidNames = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidNames.forEach((invalidName) => {
      it(`should throw given invalid bucket name: ${ JSON.stringify(invalidName) }`, () => {
        expect(() => {
          const bucketAny: any = storage.bucket;
          bucketAny(invalidName);
        }).to.throw(expectedError);
      });
    });
  });

  describe('bucket()', () => {
    it('should return a bucket object', () => {
      expect(storage.bucket().name).to.equal('bucketName.appspot.com');
    });
  });

  describe('bucket(valid)', () => {
    it('should return a bucket object', () => {
      expect(storage.bucket('foo').name).to.equal('foo');
    });
  });
});

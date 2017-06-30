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
import {Storage} from '../../../src/storage/storage';

describe('Messaging', () => {
  let mockApp: FirebaseApp;
  let storage: Storage;

  beforeEach(() => {
    mockApp = mocks.app();
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

  describe('bucket()', () => {
    const expectedError = 'Bucket name not specified or invalid. Specify a valid bucket name via ' +
        'the storageBucket option when initializing the app, or specify the bucket name ' +
        'explicitly when calling the getBucket() method.';
    const invalidNames = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1}, _.noop];
    invalidNames.forEach((invalidName) => {
        it(`should throw given invalid bucket name: ${ JSON.stringify(invalidName) }`, () => {
            expect(() => {
                const bucketAny: any = storage.bucket;
                bucketAny(invalidName);
            }).to.throw(expectedError);
        });
    });
  });

});

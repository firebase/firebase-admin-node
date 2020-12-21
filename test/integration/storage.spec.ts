/*!
 * Copyright 2018 Google Inc.
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

import * as admin from '../../lib/index';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Bucket, File } from '@google-cloud/storage';

import { projectId } from './setup';

chai.should();
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('admin.storage', () => {
  it('bucket() returns a handle to the default bucket', () => {
    const bucket: Bucket = admin.storage().bucket();
    return verifyBucket(bucket, 'storage().bucket()')
      .should.eventually.be.fulfilled;
  });

  it('bucket(string) returns a handle to the specified bucket', () => {
    const bucket: Bucket = admin.storage().bucket(projectId + '.appspot.com');
    return verifyBucket(bucket, 'storage().bucket(string)')
      .should.eventually.be.fulfilled;
  });

  it('bucket(non-existing) returns a handle which can be queried for existence', () => {
    const bucket: Bucket = admin.storage().bucket('non.existing');
    return bucket.exists()
      .then((data) => {
        expect(data[0]).to.be.false;
      });
  });
});

function verifyBucket(bucket: Bucket, testName: string): Promise<void> {
  const expected: string = 'Hello World: ' + testName;
  const file: File = bucket.file('data_' + Date.now() + '.txt');
  return file.save(expected)
    .then(() => {
      return file.download();
    })
    .then((data) => {
      expect(data[0].toString()).to.equal(expected);
      return file.delete();
    })
    .then(() => {
      return file.exists();
    })
    .then((data) => {
      expect(data[0], 'File not deleted').to.be.false;
    });
}

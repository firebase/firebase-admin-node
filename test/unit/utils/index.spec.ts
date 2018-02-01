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

import {expect} from 'chai';

import * as mocks from '../../resources/mocks';
import {addReadonlyGetter, getProjectId} from '../../../src/utils/index';
import {isNonEmptyString} from '../../../src/utils/validator';
import {FirebaseApp, FirebaseAppOptions} from '../../../src/firebase-app';

interface Obj {
  [key: string]: any;
}

describe('addReadonlyGetter()', () => {
  it('should add a new property to the provided object', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(obj.foo).to.be.true;
  });

  it('should make the new property read-only', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(() => {
      obj.foo = false;
    }).to.throw(/Cannot assign to read only property \'foo\' of/);
  });

  it('should make the new property enumerable', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(obj).to.have.keys(['foo']);
  });
});

describe('getProjectId()', () => {
  let gcloudProject: string;

  before(() => {
    gcloudProject = process.env.GCLOUD_PROJECT;
  });

  after(() => {
    if (isNonEmptyString(gcloudProject)) {
      process.env.GCLOUD_PROJECT = gcloudProject;
    } else {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  it('should return the explicitly specified project ID from app options', () => {
    const options: FirebaseAppOptions = {
      credential: new mocks.MockCredential(),
      projectId: 'explicit-project-id',
    };
    const app: FirebaseApp = mocks.appWithOptions(options);
    expect(getProjectId(app)).to.equal(options.projectId);
  });

  it('should return the project ID from service account', () => {
    const app: FirebaseApp = mocks.app();
    expect(getProjectId(app)).to.equal('project_id');
  });

  it('should return the project ID set in environment', () => {
    process.env.GCLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    expect(getProjectId(app)).to.equal('env-var-project-id');
  });

  it('should return null when project ID is not set', () => {
    delete process.env.GCLOUD_PROJECT;
    const app: FirebaseApp = mocks.mockCredentialApp();
    expect(getProjectId(app)).to.be.null;
  });
});

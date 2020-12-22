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

import * as _ from 'lodash';
import { expect } from 'chai';
import * as sinon from 'sinon';

import * as mocks from '../../resources/mocks';
import {
  addReadonlyGetter, getExplicitProjectId, findProjectId,
  toWebSafeBase64, formatString, generateUpdateMask,
} from '../../../src/utils/index';
import { isNonEmptyString } from '../../../src/utils/validator';
import { FirebaseApp } from '../../../src/firebase-app';
import { ComputeEngineCredential } from '../../../src/credential/credential-internal';
import { HttpClient } from '../../../src/utils/api-request';
import * as utils from '../utils';
import { FirebaseAppError } from '../../../src/utils/error';
import { getSdkVersion } from '../../../src/utils/index';

interface Obj {
  [key: string]: any;
}

describe('SDK_VERSION', () => {
  it('utils index should retrieve the SDK_VERSION from package.json', () => {
    const { version } = require('../../../package.json'); // eslint-disable-line @typescript-eslint/no-var-requires
    expect(getSdkVersion()).to.equal(version);
  });
});

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
    }).to.throw(/Cannot assign to read only property 'foo' of/);
  });

  it('should make the new property enumerable', () => {
    const obj: Obj = {};
    addReadonlyGetter(obj, 'foo', true);

    expect(obj).to.have.keys(['foo']);
  });
});

describe('toWebSafeBase64()', () => {
  it('should convert a byte buffer to a web-safe base64 encoded string', () => {
    const inputBuffer = Buffer.from('hello');
    expect(toWebSafeBase64(inputBuffer)).to.equal(inputBuffer.toString('base64'));
  });

  it('should convert to web safe base64 encoded with plus signs and slashes replaced', () => {
    // This converts to base64 encoded string: b++/vQ==
    const inputBuffer = Buffer.from('o�');
    expect(toWebSafeBase64(inputBuffer)).to.equal('b--_vQ==');
  });
});

describe('getExplicitProjectId()', () => {
  let googleCloudProject: string | undefined;
  let gcloudProject: string | undefined;

  before(() => {
    googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
    gcloudProject = process.env.GCLOUD_PROJECT;
  });

  after(() => {
    if (isNonEmptyString(googleCloudProject)) {
      process.env.GOOGLE_CLOUD_PROJECT = googleCloudProject;
    } else {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    }

    if (isNonEmptyString(gcloudProject)) {
      process.env.GCLOUD_PROJECT = gcloudProject;
    } else {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  it('should return the explicitly specified project ID from app options', () => {
    const options = {
      credential: new mocks.MockCredential(),
      projectId: 'explicit-project-id',
    };
    const app: FirebaseApp = mocks.appWithOptions(options);
    expect(getExplicitProjectId(app)).to.equal(options.projectId);
  });

  it('should return the project ID from service account', () => {
    const app: FirebaseApp = mocks.app();
    expect(getExplicitProjectId(app)).to.equal('project_id');
  });

  it('should return the project ID set in GOOGLE_CLOUD_PROJECT environment variable', () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    expect(getExplicitProjectId(app)).to.equal('env-var-project-id');
  });

  it('should return the project ID set in GCLOUD_PROJECT environment variable', () => {
    process.env.GCLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    expect(getExplicitProjectId(app)).to.equal('env-var-project-id');
  });

  it('should return null when project ID is not set', () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    const app: FirebaseApp = mocks.mockCredentialApp();
    expect(getExplicitProjectId(app)).to.be.null;
  });
});

describe('findProjectId()', () => {
  let googleCloudProject: string | undefined;
  let gcloudProject: string | undefined;
  let httpStub: sinon.SinonStub;

  before(() => {
    googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
    gcloudProject = process.env.GCLOUD_PROJECT;
  });

  after(() => {
    if (isNonEmptyString(googleCloudProject)) {
      process.env.GOOGLE_CLOUD_PROJECT = googleCloudProject;
    } else {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    }

    if (isNonEmptyString(gcloudProject)) {
      process.env.GCLOUD_PROJECT = gcloudProject;
    } else {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  beforeEach(() => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    httpStub = sinon.stub(HttpClient.prototype, 'send');
  });

  afterEach(() => {
    httpStub.restore();
  });

  it('should return the explicitly specified project ID from app options', () => {
    const options = {
      credential: new mocks.MockCredential(),
      projectId: 'explicit-project-id',
    };
    const app: FirebaseApp = mocks.appWithOptions(options);
    return findProjectId(app).should.eventually.equal(options.projectId);
  });

  it('should return the project ID from service account', () => {
    const app: FirebaseApp = mocks.app();
    return findProjectId(app).should.eventually.equal('project_id');
  });

  it('should return the project ID set in GOOGLE_CLOUD_PROJECT environment variable', () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    return findProjectId(app).should.eventually.equal('env-var-project-id');
  });

  it('should return the project ID set in GCLOUD_PROJECT environment variable', () => {
    process.env.GCLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    return findProjectId(app).should.eventually.equal('env-var-project-id');
  });

  it('should return the project ID discovered from the metadata service', () => {
    const expectedProjectId = 'test-project-id';
    const response = utils.responseFrom(expectedProjectId);
    httpStub.resolves(response);
    const app: FirebaseApp = mocks.appWithOptions({
      credential: new ComputeEngineCredential(),
    });
    return findProjectId(app).should.eventually.equal(expectedProjectId);
  });

  it('should reject when the metadata service is not available', () => {
    httpStub.rejects(new FirebaseAppError('network-error', 'Failed to connect'));
    const app: FirebaseApp = mocks.appWithOptions({
      credential: new ComputeEngineCredential(),
    });
    return findProjectId(app).should.eventually
      .rejectedWith('Failed to determine project ID: Failed to connect');
  });

  it('should return null when project ID is not set and discoverable', () => {
    const app: FirebaseApp = mocks.mockCredentialApp();
    return findProjectId(app).should.eventually.be.null;
  });
});

describe('findProjectId()', () => {
  let googleCloudProject: string | undefined;
  let gcloudProject: string | undefined;

  before(() => {
    googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
    gcloudProject = process.env.GCLOUD_PROJECT;
  });

  after(() => {
    if (isNonEmptyString(googleCloudProject)) {
      process.env.GOOGLE_CLOUD_PROJECT = googleCloudProject;
    } else {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    }

    if (isNonEmptyString(gcloudProject)) {
      process.env.GCLOUD_PROJECT = gcloudProject;
    } else {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  it('should return the explicitly specified project ID from app options', () => {
    const options = {
      credential: new mocks.MockCredential(),
      projectId: 'explicit-project-id',
    };
    const app: FirebaseApp = mocks.appWithOptions(options);
    return findProjectId(app).should.eventually.equal(options.projectId);
  });

  it('should return the project ID from service account', () => {
    const app: FirebaseApp = mocks.app();
    return findProjectId(app).should.eventually.equal('project_id');
  });

  it('should return the project ID set in GOOGLE_CLOUD_PROJECT environment variable', () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    return findProjectId(app).should.eventually.equal('env-var-project-id');
  });

  it('should return the project ID set in GCLOUD_PROJECT environment variable', () => {
    process.env.GCLOUD_PROJECT = 'env-var-project-id';
    const app: FirebaseApp = mocks.mockCredentialApp();
    return findProjectId(app).should.eventually.equal('env-var-project-id');
  });

  it('should return null when project ID is not set', () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    const app: FirebaseApp = mocks.mockCredentialApp();
    return findProjectId(app).should.eventually.be.null;
  });
});

describe('formatString()', () => {
  it('should keep string as is if not parameters are provided', () =>  {
    const str = 'projects/{projectId}/{api}/path/api/projectId';
    expect(formatString(str)).to.equal(str);
  });

  it('should substitute parameters in string', () => {
    const str = 'projects/{projectId}/{api}/path/api/projectId';
    const expectedOutput = 'projects/PROJECT_ID/API/path/api/projectId';
    const params = {
      projectId: 'PROJECT_ID',
      api: 'API',
      notFound: 'NOT_FOUND',
    };
    expect(formatString(str, params)).to.equal(expectedOutput);
  });

  it('should keep string as is if braces are not matching', () =>  {
    const str = 'projects/projectId}/{api/path/api/projectId';
    const params = {
      projectId: 'PROJECT_ID',
      api: 'API',
    };
    expect(formatString(str, params)).to.equal(str);
  });

  it('should handle multiple successive braces', () =>  {
    const str = 'projects/{{projectId}}/path/{{api}}/projectId';
    const expectedOutput = 'projects/{PROJECT_ID}/path/{API}/projectId';
    const params = {
      projectId: 'PROJECT_ID',
      api: 'API',
    };
    expect(formatString(str, params)).to.equal(expectedOutput);
  });

  it('should substitute multiple occurrences of the same parameter', () => {
    const str = 'projects/{projectId}/{api}/path/api/{projectId}';
    const expectedOutput = 'projects/PROJECT_ID/API/path/api/PROJECT_ID';
    const params = {
      projectId: 'PROJECT_ID',
      api: 'API',
    };
    expect(formatString(str, params)).to.equal(expectedOutput);
  });

  it('should keep string as is if parameters are not found', () => {
    const str = 'projects/{projectId}/{api}/path/api/projectId';
    const params = {
      notFound: 'value',
    };
    expect(formatString(str, params)).to.equal(str);
  });
});

describe('generateUpdateMask()', () => {
  const obj: any = {
    a: undefined,
    b: 'something',
    c: ['stuff'],
    d: false,
    e: {},
    f: {
      g: 1,
      h: 0,
      i: {
        j: 2,
      },
    },
    k: {
      i: null,
      j: undefined,
    },
    l: {
      m: undefined,
    },
    n: [],
  };
  const nonObjects = [null, NaN, 0, 1, true, false, '', 'a', [], [1, 'a'], _.noop];
  nonObjects.forEach((nonObject) => {
    it(`should return empty array for non object ${JSON.stringify(nonObject)}`, () => {
      expect(generateUpdateMask(nonObject)).to.deep.equal([]);
    });
  });

  it('should return empty array for empty object', () => {
    expect(generateUpdateMask({})).to.deep.equal([]);
  });

  it('should return expected update mask array for nested object', () => {
    const expectedMaskArray = [
      'b', 'c', 'd', 'e', 'f.g', 'f.h', 'f.i.j', 'k.i', 'l', 'n',
    ];
    expect(generateUpdateMask(obj)).to.deep.equal(expectedMaskArray);
  });

  it('should return expected update mask array with max paths for nested object', () => {
    expect(generateUpdateMask(obj, ['f.i', 'k']))
      .to.deep.equal(['b', 'c', 'd', 'e', 'f.g', 'f.h', 'f.i', 'k', 'l', 'n']);
    expect(generateUpdateMask(obj, ['notfound', 'b', 'f', 'k', 'l']))
      .to.deep.equal(['b', 'c', 'd', 'e', 'f', 'k', 'l', 'n']);
  });
});

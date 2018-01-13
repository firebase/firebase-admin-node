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

import * as admin from '../../lib/index'
import {expect} from 'chai';
import {
  defaultApp, nullApp, nonNullApp, databaseUrl, projectId, storageBucket
} from './setup';

describe('SDK Initialization', () => {
  it('populates required parameters', () => {
    expect(databaseUrl).to.be.not.empty;
    expect(projectId).to.be.not.empty;
    expect(storageBucket).to.be.not.empty;
  });

  it('does not load Firestore by default', () => {
    var gcloud = require.cache[require.resolve('@google-cloud/firestore')];
    expect(gcloud).to.be.undefined;
  });

  it('calling admin.firestore loads Firestore', () => {
    const firestoreNamespace = admin.firestore;
    expect(firestoreNamespace).to.not.be.null;
    var gcloud = require.cache[require.resolve('@google-cloud/firestore')];
    expect(gcloud).to.not.be.undefined;
  });
});

describe('admin.app()', () => {
  it('returns the default App', () => {
    let app = admin.app();
    expect(app).to.deep.equal(defaultApp);
    expect(app.name).to.equal('[DEFAULT]');    
    expect(app.options.databaseURL).to.equal(databaseUrl);
    expect(app.options.databaseAuthVariableOverride).to.be.undefined;
    expect(app.options.storageBucket).to.equal(storageBucket);
  });

  it('returns the App named "null"', () => {
    let app = admin.app('null');
    expect(app).to.deep.equal(nullApp);
    expect(app.name).to.equal('null');    
    expect(app.options.databaseURL).to.equal(databaseUrl);
    expect(app.options.databaseAuthVariableOverride).to.be.null;
    expect(app.options.storageBucket).to.equal(storageBucket);
  });

  it('returns the App named "nonNull"', () => {
    let app = admin.app('nonNull');
    expect(app).to.deep.equal(nonNullApp);
    expect(app.name).to.equal('nonNull');    
    expect(app.options.databaseURL).to.equal(databaseUrl);
    expect((app.options.databaseAuthVariableOverride as any).uid).to.be.ok;    
    expect(app.options.storageBucket).to.equal(storageBucket);
  });

  it('is same as the app obtained from namespace services', () => {
    let app = admin.app();
    expect(admin.auth(app).app).to.deep.equal(app);
    expect(admin.database(app).app).to.deep.equal(app);
    expect(admin.messaging(app).app).to.deep.equal(app);
    expect(admin.storage(app).app).to.deep.equal(app);
  });
});

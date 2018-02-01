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

// Use untyped import syntax for Node built-ins
import https = require('https');

import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from './utils';
import * as mocks from '../resources/mocks';

import {ApplicationDefaultCredential, CertCredential, GoogleOAuthAccessToken} from '../../src/auth/credential';
import {FirebaseServiceInterface} from '../../src/firebase-service';
import {FirebaseApp, FirebaseAccessToken} from '../../src/firebase-app';
import {FirebaseNamespace, FirebaseNamespaceInternals, FIREBASE_CONFIG_VAR} from '../../src/firebase-namespace';

import {Auth} from '../../src/auth/auth';
import {Messaging} from '../../src/messaging/messaging';
import {Storage} from '../../src/storage/storage';
import {Firestore} from '@google-cloud/firestore';
import {Database} from '@firebase/database';
import {InstanceId} from '../../src/instance-id/instance-id';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const ONE_HOUR_IN_SECONDS = 60 * 60;
const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

const deleteSpy = sinon.spy();
function mockServiceFactory(app: FirebaseApp): FirebaseServiceInterface {
  return {
    app,
    INTERNAL: {
      delete: deleteSpy.bind(null, app.name),
    },
  };
}


describe('FirebaseApp', () => {
  let mockApp: FirebaseApp;
  let mockedRequests: nock.Scope[] = [];
  let firebaseNamespace: FirebaseNamespace;
  let firebaseNamespaceInternals: FirebaseNamespaceInternals;
  let firebaseConfigVar: string;

  beforeEach(() => {
    utils.mockFetchAccessTokenRequests();

    this.clock = sinon.useFakeTimers(1000);

    mockApp = mocks.app();

    firebaseConfigVar = process.env[FIREBASE_CONFIG_VAR];
    delete process.env[FIREBASE_CONFIG_VAR];
    firebaseNamespace = new FirebaseNamespace();
    firebaseNamespaceInternals = firebaseNamespace.INTERNAL;

    sinon.stub(firebaseNamespaceInternals, 'removeApp');
    mockApp = new FirebaseApp(mocks.appOptions, mocks.appName, firebaseNamespaceInternals);
  });

  afterEach(() => {
    this.clock.restore();
    if (firebaseConfigVar) {
      process.env[FIREBASE_CONFIG_VAR] = firebaseConfigVar;
    } else {
      delete process.env[FIREBASE_CONFIG_VAR];
    }

    deleteSpy.reset();
    (firebaseNamespaceInternals.removeApp as any).restore();

    _.forEach(mockedRequests, (mockedRequest) => mockedRequest.done());
    mockedRequests = [];

    nock.cleanAll();
  });

  describe('#name', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.name;
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the app\'s name', () => {
      expect(mockApp.name).to.equal(mocks.appName);
    });

    it('should be case sensitive', () => {
      const newMockAppName = mocks.appName.toUpperCase();
      mockApp = new FirebaseApp(mocks.appOptions, newMockAppName, firebaseNamespaceInternals);
      expect(mockApp.name).to.not.equal(mocks.appName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should respect leading and trailing whitespace', () => {
      const newMockAppName = '  ' + mocks.appName + '  ';
      mockApp = new FirebaseApp(mocks.appOptions, newMockAppName, firebaseNamespaceInternals);
      expect(mockApp.name).to.not.equal(mocks.appName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should be read-only', () => {
      expect(() => {
        (mockApp as any).name = 'foo';
      }).to.throw(`Cannot set property name of #<FirebaseApp> which has only a getter`);
    });
  });

  describe('#options', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.options;
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the app\'s options', () => {
      expect(mockApp.options).to.deep.equal(mocks.appOptions);
    });

    it('should be read-only', () => {
      expect(() => {
        (mockApp as any).options = {};
      }).to.throw(`Cannot set property options of #<FirebaseApp> which has only a getter`);
    });

    it('should not return an object which can mutate the underlying options', () => {
      const original = _.clone(mockApp.options);
      (mockApp.options as any).foo = 'changed';
      expect(mockApp.options).to.deep.equal(original);
    });

    it('should ignore the config file when options is not null', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      const app = firebaseNamespace.initializeApp(mocks.appOptionsNoDatabaseUrl, mocks.appName);
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.undefined;
    });

    it('should throw when the environment variable points to non existing file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/non_existant.json';
      expect(() => {
        firebaseNamespace.initializeApp();
      }).to.throw(`Failed to parse app options file: Error: ENOENT: no such file or directory`);
    });

    it('should throw when the environment variable contains bad json', () => {
      process.env[FIREBASE_CONFIG_VAR] = '{,,';
      expect(() => {
        firebaseNamespace.initializeApp();
      }).to.throw(`Failed to parse app options file: SyntaxError: Unexpected token ,`);
    });

    it('should throw when the environment variable points to an empty file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_empty.json';
      expect(() => {
        firebaseNamespace.initializeApp();
      }).to.throw(`Failed to parse app options file`);
    });

    it('should throw when the environment variable points to bad json', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_bad.json';
      expect(() => {
        firebaseNamespace.initializeApp();
      }).to.throw(`Failed to parse app options file`);
    });

    it('should ignore a bad config key in the config file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_bad_key.json';
      const app = firebaseNamespace.initializeApp();
      expect(app.options.projectId).to.equal('hipster-chat-mock');
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.undefined;
      expect(app.options.storageBucket).to.undefined;
    });

    it('should ignore a bad config key in the json string', () => {
      process.env[FIREBASE_CONFIG_VAR] =
        `{
          "notAValidKeyValue": "The key value here is not valid.",
          "projectId": "hipster-chat-mock"
        }`;
      const app = firebaseNamespace.initializeApp();
      expect(app.options.projectId).to.equal('hipster-chat-mock');
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.undefined;
      expect(app.options.storageBucket).to.undefined;
    });

    it('should not throw when the config file has a bad key and the config file is unused', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_bad_key.json';
      const app = firebaseNamespace.initializeApp(mocks.appOptionsWithOverride, mocks.appName);
      expect(app.options.projectId).to.equal('project_id');
      expect(app.options.databaseAuthVariableOverride).to.deep.equal({ 'some#string': 'some#val' });
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.storageBucket).to.equal('bucketName.appspot.com');
    });

    it('should not throw when the config json has a bad key and the config json is unused', () => {
      process.env[FIREBASE_CONFIG_VAR] =
        `{
          "notAValidKeyValue": "The key value here is not valid.",
          "projectId": "hipster-chat-mock"
        }`;
      const app = firebaseNamespace.initializeApp(mocks.appOptionsWithOverride, mocks.appName);
      expect(app.options.projectId).to.equal('project_id');
      expect(app.options.databaseAuthVariableOverride).to.deep.equal({ 'some#string': 'some#val' });
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.storageBucket).to.equal('bucketName.appspot.com');
    });

    it('should use explicitly specified options when available and ignore the config file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      expect(app.options.credential).to.be.instanceOf(CertCredential);
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.equal('bucketName.appspot.com');
    });

    it('should not throw if some fields are missing', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_partial.json';
      const app = firebaseNamespace.initializeApp(mocks.appOptionsAuthDB, mocks.appName);
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should not throw when the config environment variable is not set, and some options are present', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptionsNoDatabaseUrl, mocks.appName);
      expect(app.options.credential).to.be.instanceOf(CertCredential);
      expect(app.options.databaseURL).to.be.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should init with application default creds when no options provided and env variable is not set', () => {
      const app = firebaseNamespace.initializeApp();
      expect(app.options.credential).to.be.instanceOf(ApplicationDefaultCredential);
      expect(app.options.databaseURL).to.be.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should init with application default creds when no options provided and env variable is an empty json', () => {
      process.env[FIREBASE_CONFIG_VAR] = '{}';
      const app = firebaseNamespace.initializeApp();
      expect(app.options.credential).to.be.instanceOf(ApplicationDefaultCredential);
      expect(app.options.databaseURL).to.be.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should init when no init arguments are provided and config var points to a file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      const app = firebaseNamespace.initializeApp();
      expect(app.options.credential).to.be.instanceOf(ApplicationDefaultCredential);
      expect(app.options.databaseAuthVariableOverride).to.deep.equal({ 'some#key': 'some#val' });
      expect(app.options.databaseURL).to.equal('https://hipster-chat.firebaseio.mock');
      expect(app.options.projectId).to.equal('hipster-chat-mock');
      expect(app.options.storageBucket).to.equal('hipster-chat.appspot.mock');
    });

    it('should init when no init arguments are provided and config var is json', () => {
      process.env[FIREBASE_CONFIG_VAR] = `{
        "databaseAuthVariableOverride":  { "some#key": "some#val" },
        "databaseURL": "https://hipster-chat.firebaseio.mock",
        "projectId": "hipster-chat-mock",
        "storageBucket": "hipster-chat.appspot.mock"
      }`;
      const app = firebaseNamespace.initializeApp();
      expect(app.options.credential).to.be.instanceOf(ApplicationDefaultCredential);
      expect(app.options.databaseAuthVariableOverride).to.deep.equal({ 'some#key': 'some#val' });
      expect(app.options.databaseURL).to.equal('https://hipster-chat.firebaseio.mock');
      expect(app.options.projectId).to.equal('hipster-chat-mock');
      expect(app.options.storageBucket).to.equal('hipster-chat.appspot.mock');
    });
  });

  describe('#delete()', () => {
    it('should throw if the app has already been deleted', () => {
      return mockApp.delete().then(() => {
        expect(() => {
          return mockApp.delete();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should call removeApp() on the Firebase namespace internals', () => {
      return mockApp.delete().then(() => {
        expect(firebaseNamespaceInternals.removeApp)
          .to.have.been.calledOnce
          .and.calledWith(mocks.appName);
      });
    });

    it('should call delete() on each service\'s internals', () => {
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, mockServiceFactory);
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName + '2', mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      app[mocks.serviceName]();
      app[mocks.serviceName + '2']();

      return app.delete().then(() => {
        expect(deleteSpy).to.have.been.calledTwice;
        expect(deleteSpy.firstCall.args).to.deep.equal([mocks.appName]);
        expect(deleteSpy.secondCall.args).to.deep.equal([mocks.appName]);
      });
    });
  });

  describe('auth()', () => {
    it('should throw if the app has already been deleted', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app.auth();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the Auth namespace', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const authNamespace: Auth = app.auth();
      expect(authNamespace).not.be.null;
    });

    it('should return a cached version of Auth on subsequent calls', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const serviceNamespace1: Auth = app.auth();
      const serviceNamespace2: Auth = app.auth();
      expect(serviceNamespace1).to.deep.equal(serviceNamespace2);
    });
  });

  describe('messaging()', () => {
    it('should throw if the app has already been deleted', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app.messaging();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the Messaging namespace', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const fcmNamespace: Messaging = app.messaging();
      expect(fcmNamespace).not.be.null;
    });

    it('should return a cached version of Messaging on subsequent calls', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const serviceNamespace1: Messaging = app.messaging();
      const serviceNamespace2: Messaging = app.messaging();
      expect(serviceNamespace1).to.deep.equal(serviceNamespace2);
    });
  });

  describe('database()', () => {
    afterEach(() => {
      try {
        firebaseNamespace.app(mocks.appName).delete();
      } catch (e) {
        // ignore
      }
    });

    it('should throw if the app has already been deleted', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app.database();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the Database', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const db: Database = app.database();
      expect(db).not.be.null;
    });

    it('should return the Database for different apps', () => {
      const app1 = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const app2 = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName + '-other');
      const db1: Database = app1.database();
      const db2: Database = app2.database();
      expect(db1).to.not.deep.equal(db2);
      expect(db1.ref().toString()).to.equal('https://databasename.firebaseio.com/');
      expect(db2.ref().toString()).to.equal('https://databasename.firebaseio.com/');
      return app2.delete();
    });

    it('should throw when databaseURL is not set', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptionsNoDatabaseUrl, mocks.appName);
      expect(() => {
        app.database();
      }).to.throw('Can\'t determine Firebase Database URL.');
    });

    it('should return a cached version of Database on subsequent calls', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const db1: Database = app.database();
      const db2: Database = app.database();
      const db3: Database = app.database(mocks.appOptions.databaseURL);
      expect(db1).to.equal(db2);
      expect(db1).to.equal(db3);
      expect(db1.ref().toString()).to.equal('https://databasename.firebaseio.com/');
    });

    it('should return a Database instance for the specified URL', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const db1: Database = app.database();
      const db2: Database = app.database('https://other-database.firebaseio.com');
      expect(db1.ref().toString()).to.equal('https://databasename.firebaseio.com/');
      expect(db2.ref().toString()).to.equal('https://other-database.firebaseio.com/');
    });

    const invalidArgs = [null, NaN, 0, 1, true, false, '', [], [1, 'a'], {}, { a: 1 }, _.noop];
    invalidArgs.forEach((url) => {
      it(`should throw given invalid URL argument: ${JSON.stringify(url)}`, () => {
        const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
        expect(() => {
          (app as any).database(url);
        }).to.throw('Database URL must be a valid, non-empty URL string.');
      });
    });

    const invalidUrls = ['a', 'foo', 'google.com'];
    invalidUrls.forEach((url) => {
      it(`should throw given invalid URL string: '${url}'`, () => {
        const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
        expect(() => {
          app.database(url);
        }).to.throw('FIREBASE FATAL ERROR: Cannot parse Firebase url. ' +
                    'Please use https://<YOUR FIREBASE>.firebaseio.com');
      });
    });
  });

  describe('storage()', () => {
    it('should throw if the app has already been deleted', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app.storage();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the Storage namespace', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const gcsNamespace: Storage = app.storage();
      expect(gcsNamespace).not.be.null;
    });

    it('should return a cached version of Messaging on subsequent calls', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const serviceNamespace1: Storage = app.storage();
      const serviceNamespace2: Storage = app.storage();
      expect(serviceNamespace1).to.deep.equal(serviceNamespace2);
    });
  });

  describe('firestore()', () => {
    it('should throw if the app has already been deleted', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app.firestore();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the Firestore client', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const fs: Firestore = app.firestore();
      expect(fs).not.be.null;
    });

    it('should return a cached version of Firestore on subsequent calls', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const service1: Firestore = app.firestore();
      const service2: Firestore = app.firestore();
      expect(service1).to.deep.equal(service2);
    });
  });

  describe('instanceId()', () => {
    it('should throw if the app has already been deleted', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app.instanceId();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the InstanceId client', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const iid: InstanceId = app.instanceId();
      expect(iid).not.be.null;
    });

    it('should return a cached version of InstanceId on subsequent calls', () => {
      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);
      const service1: InstanceId = app.instanceId();
      const service2: InstanceId = app.instanceId();
      expect(service1).to.equal(service2);
    });
  });

  describe('#[service]()', () => {
    it('should throw if the app has already been deleted', () => {
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      return app.delete().then(() => {
        expect(() => {
          return app[mocks.serviceName]();
        }).to.throw(`Firebase app named "${mocks.appName}" has already been deleted.`);
      });
    });

    it('should return the service namespace', () => {
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, mockServiceFactory);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      const serviceNamespace = app[mocks.serviceName]();
      expect(serviceNamespace).to.have.keys(['app', 'INTERNAL']);
    });

    it('should return a cached version of the service on subsequent calls', () => {
      const createServiceSpy = sinon.spy();
      firebaseNamespace.INTERNAL.registerService(mocks.serviceName, createServiceSpy);

      const app = firebaseNamespace.initializeApp(mocks.appOptions, mocks.appName);

      expect(createServiceSpy).to.not.have.been.called;

      const serviceNamespace1 = app[mocks.serviceName]();
      expect(createServiceSpy).to.have.been.calledOnce;

      const serviceNamespace2 = app[mocks.serviceName]();
      expect(createServiceSpy).to.have.been.calledOnce;
      expect(serviceNamespace1).to.deep.equal(serviceNamespace2);
    });
  });

  describe('INTERNAL.getToken()', () => {
    let httpsSpy: sinon.SinonSpy;
    let getAccessTokenSpy: sinon.SinonSpy;
    let getAccessTokenStub: sinon.SinonStub;

    beforeEach(() => {
      httpsSpy = sinon.spy(https, 'request');
    });

    afterEach(() => {
      httpsSpy.restore();

      if (typeof getAccessTokenSpy !== 'undefined') {
        getAccessTokenSpy.restore();
      }

      if (typeof getAccessTokenStub !== 'undefined') {
        getAccessTokenStub.restore();
      }
    });

    it('throws a custom credential implementation which returns invalid access tokens', () => {
      const credential = {
        getAccessToken: () => 5,
      };

      const app = utils.createAppWithOptions({
        credential: credential as any,
      });

      return app.INTERNAL.getToken().then(() => {
        throw new Error('Unexpected success');
      }, (err) => {
        expect(err.toString()).to.include('Invalid access token generated');
      });
    });

    it('returns a valid token given a well-formed custom credential implementation', () => {
      const oracle: GoogleOAuthAccessToken = {
        access_token: 'This is a custom token',
        expires_in: ONE_HOUR_IN_SECONDS,
      };
      const credential = {
        getAccessToken: () => Promise.resolve(oracle),
      };

      const app = utils.createAppWithOptions({credential});

      return app.INTERNAL.getToken().then((token) => {
        expect(token.accessToken).to.equal(oracle.access_token);
        expect(+token.expirationTime).to.equal((ONE_HOUR_IN_SECONDS + 1) * 1000);
      });
    });

    it('returns a valid token given no arguments', () => {
      return mockApp.INTERNAL.getToken().then((token) => {
        expect(token).to.have.keys(['accessToken', 'expirationTime']);
        expect(token.accessToken).to.be.a('string').and.to.not.be.empty;
        expect(token.expirationTime).to.be.a('number');
      });
    });

    it('returns a valid token with force refresh', () => {
      return mockApp.INTERNAL.getToken(true).then((token) => {
        expect(token).to.have.keys(['accessToken', 'expirationTime']);
        expect(token.accessToken).to.be.a('string').and.to.not.be.empty;
        expect(token.expirationTime).to.be.a('number');
      });
    });

    it('returns the cached token given no arguments', () => {
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        this.clock.tick(1000);
        return mockApp.INTERNAL.getToken().then((token2) => {
          expect(token1).to.deep.equal(token2);
          expect(httpsSpy).to.have.been.calledOnce;
        });
      });
    });

    it('returns a new token with force refresh', () => {
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        this.clock.tick(1000);
        return mockApp.INTERNAL.getToken(true).then((token2) => {
          expect(token1).to.not.deep.equal(token2);
          expect(httpsSpy).to.have.been.calledTwice;
        });
      });
    });

    it('proactively refreshes the token five minutes before it expires', () => {
      // Force a token refresh.
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        // Forward the clock to five minutes and one second before expiry.
        const expiryInMilliseconds = token1.expirationTime - Date.now();
        this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS) - 1000);

        return mockApp.INTERNAL.getToken().then((token2) => {
          // Ensure the token has not been proactively refreshed.
          expect(token1).to.deep.equal(token2);
          expect(httpsSpy).to.have.been.calledOnce;

          // Forward the clock to exactly five minutes before expiry.
          this.clock.tick(1000);

          return mockApp.INTERNAL.getToken().then((token3) => {
            // Ensure the token was proactively refreshed.
            expect(token1).to.not.deep.equal(token3);
            expect(httpsSpy).to.have.been.calledTwice;
          });
        });
      });
    });

    it('retries to proactively refresh the token if a proactive refresh attempt fails', () => {
      // Force a token refresh.
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        // Stub the getToken() method to return a rejected promise.
        getAccessTokenStub = sinon.stub(mockApp.options.credential, 'getAccessToken');
        getAccessTokenStub.returns(Promise.reject(new Error('Intentionally rejected')));

        // Forward the clock to exactly five minutes before expiry.
        const expiryInMilliseconds = token1.expirationTime - Date.now();
        this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS));

        // Forward the clock to exactly four minutes before expiry.
        this.clock.tick(60 * 1000);

        // Restore the stubbed getAccessToken() method.
        getAccessTokenStub.restore();
        getAccessTokenStub = undefined;

        return mockApp.INTERNAL.getToken().then((token2) => {
          // Ensure the token has not been proactively refreshed.
          expect(token1).to.deep.equal(token2);
          expect(httpsSpy).to.have.been.calledOnce;

          // Forward the clock to exactly three minutes before expiry.
          this.clock.tick(60 * 1000);

          return mockApp.INTERNAL.getToken().then((token3) => {
            // Ensure the token was proactively refreshed.
            expect(token1).to.not.deep.equal(token3);
            expect(httpsSpy).to.have.been.calledTwice;
          });
        });
      });
    });

    it('stops retrying to proactively refresh the token after five attempts', () => {
      // Force a token refresh.
      let originalToken;
      return mockApp.INTERNAL.getToken(true).then((token) => {
        originalToken = token;

        // Stub the credential's getAccessToken() method to always return a rejected promise.
        getAccessTokenStub = sinon.stub(mockApp.options.credential, 'getAccessToken');
        getAccessTokenStub.returns(Promise.reject(new Error('Intentionally rejected')));

        // Expect the call count to initially be zero.
        expect(getAccessTokenStub.callCount).to.equal(0);

        // Forward the clock to exactly five minutes before expiry.
        const expiryInMilliseconds = token.expirationTime - Date.now();
        this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS));

        // Due to synchronous timing issues when the timer is mocked, make a call to getToken()
        // without forcing a refresh to ensure there is enough time for the underlying token refresh
        // timeout to fire and complete.
        return mockApp.INTERNAL.getToken();
      }).then((token) => {
        // Ensure the token was attempted to be proactively refreshed one time.
        expect(getAccessTokenStub.callCount).to.equal(1);

        // Ensure the proactive refresh failed.
        expect(token).to.deep.equal(originalToken);

        // Forward the clock to four minutes before expiry.
        this.clock.tick(ONE_MINUTE_IN_MILLISECONDS);

        // See note above about calling getToken().
        return mockApp.INTERNAL.getToken();
      }).then((token) => {
        // Ensure the token was attempted to be proactively refreshed two times.
        expect(getAccessTokenStub.callCount).to.equal(2);

        // Ensure the proactive refresh failed.
        expect(token).to.deep.equal(originalToken);

        // Forward the clock to three minutes before expiry.
        this.clock.tick(ONE_MINUTE_IN_MILLISECONDS);

        // See note above about calling getToken().
        return mockApp.INTERNAL.getToken();
      }).then((token) => {
        // Ensure the token was attempted to be proactively refreshed three times.
        expect(getAccessTokenStub.callCount).to.equal(3);

        // Ensure the proactive refresh failed.
        expect(token).to.deep.equal(originalToken);

        // Forward the clock to two minutes before expiry.
        this.clock.tick(ONE_MINUTE_IN_MILLISECONDS);

        // See note above about calling getToken().
        return mockApp.INTERNAL.getToken();
      }).then((token) => {
        // Ensure the token was attempted to be proactively refreshed four times.
        expect(getAccessTokenStub.callCount).to.equal(4);

        // Ensure the proactive refresh failed.
        expect(token).to.deep.equal(originalToken);

        // Forward the clock to one minute before expiry.
        this.clock.tick(ONE_MINUTE_IN_MILLISECONDS);

        // See note above about calling getToken().
        return mockApp.INTERNAL.getToken();
      }).then((token) => {
        // Ensure the token was attempted to be proactively refreshed five times.
        expect(getAccessTokenStub.callCount).to.equal(5);

        // Ensure the proactive refresh failed.
        expect(token).to.deep.equal(originalToken);

        // Forward the clock to expiry.
        this.clock.tick(ONE_MINUTE_IN_MILLISECONDS);

        // See note above about calling getToken().
        return mockApp.INTERNAL.getToken();
      }).then((token) => {
        // Ensure the token was not attempted to be proactively refreshed a sixth time.
        expect(getAccessTokenStub.callCount).to.equal(5);

        // Ensure the token has never been refresh.
        expect(token).to.deep.equal(originalToken);
      });
    });

    it('resets the proactive refresh timeout upon a force refresh', () => {
      // Force a token refresh.
      return mockApp.INTERNAL.getToken(true).then((token1) => {
         // Forward the clock to five minutes and one second before expiry.
        let expiryInMilliseconds = token1.expirationTime - Date.now();
        this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS) - 1000);

        // Force a token refresh.
        return mockApp.INTERNAL.getToken(true).then((token2) => {
          // Ensure the token was force refreshed.
          expect(token1).to.not.deep.equal(token2);
          expect(httpsSpy).to.have.been.calledTwice;

          // Forward the clock to exactly five minutes before the original token's expiry.
          this.clock.tick(1000);

          return mockApp.INTERNAL.getToken().then((token3) => {
            // Ensure the token hasn't changed, meaning the proactive refresh was canceled.
            expect(token2).to.deep.equal(token3);
            expect(httpsSpy).to.have.been.calledTwice;

            // Forward the clock to exactly five minutes before the refreshed token's expiry.
            expiryInMilliseconds = token3.expirationTime - Date.now();
            this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS));

            return mockApp.INTERNAL.getToken().then((token4) => {
              // Ensure the token was proactively refreshed.
              expect(token3).to.not.deep.equal(token4);
              expect(httpsSpy).to.have.been.calledThrice;
            });
          });
        });
      });
    });

    it('proactively refreshes the token at the next full minute if it expires in five minutes or less', () => {
      // Turn off default mocking of one hour access tokens and replace it with a short-lived token.
      nock.cleanAll();
      utils.mockFetchAccessTokenRequests(/* token */ undefined, /* expiresIn */ 3 * 60 + 10);

      // Force a token refresh.
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        getAccessTokenSpy = sinon.spy(mockApp.options.credential, 'getAccessToken');

        // Move the clock forward to three minutes and one second before expiry.
        this.clock.tick(9 * 1000);

        // Expect the call count to initially be zero.
        expect(getAccessTokenSpy.callCount).to.equal(0);

        // Move the clock forward to exactly three minutes before expiry.
        this.clock.tick(1000);

        // Expect the underlying getAccessToken() method to have been called once.
        expect(getAccessTokenSpy.callCount).to.equal(1);

        return mockApp.INTERNAL.getToken().then((token2) => {
          // Ensure the token was proactively refreshed.
          expect(token1).to.not.deep.equal(token2);
        });
      });
    });
  });

  describe('INTERNAL.addAuthTokenListener()', () => {
    let addAuthTokenListenerSpy: sinon.SinonSpy;

    before(() => {
      addAuthTokenListenerSpy = sinon.spy();
    });

    afterEach(() => {
      addAuthTokenListenerSpy.reset();
    });

    it('is notified when the token changes', () => {
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpy);

      return mockApp.INTERNAL.getToken().then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpy).to.have.been.calledOnce.and.calledWith(token.accessToken);
      });
    });

    it('can be called twice', () => {
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpy);
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpy);

      return mockApp.INTERNAL.getToken().then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpy).to.have.been.calledTwice;
        expect(addAuthTokenListenerSpy.firstCall).to.have.been.calledWith(token.accessToken);
        expect(addAuthTokenListenerSpy.secondCall).to.have.been.calledWith(token.accessToken);
      });
    });

    it('will be called on token refresh', () => {
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpy);

      return mockApp.INTERNAL.getToken().then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpy).to.have.been.calledOnce.and.calledWith(token.accessToken);

        this.clock.tick(1000);

        return mockApp.INTERNAL.getToken(true);
      }).then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpy).to.have.been.calledTwice;
        expect(addAuthTokenListenerSpy.secondCall).to.have.been.calledWith(token.accessToken);
      });
    });

    it('will fire with the initial token if it exists', () => {
      return mockApp.INTERNAL.getToken().then((getTokenResult: FirebaseAccessToken) => {
        return new Promise((resolve) => {
          mockApp.INTERNAL.addAuthTokenListener(resolve);
        }).then((addAuthTokenListenerArgument) => {
          expect(addAuthTokenListenerArgument).to.equal(getTokenResult.accessToken);
        });
      });
    });
  });

  describe('INTERNAL.removeTokenListener()', () => {
    const addAuthTokenListenerSpies: sinon.SinonSpy[] = [];

    before(() => {
      addAuthTokenListenerSpies[0] = sinon.spy();
      addAuthTokenListenerSpies[1] = sinon.spy();
    });

    afterEach(() => {
      addAuthTokenListenerSpies.forEach((spy) => spy.reset());
    });

    it('removes the listener', () => {
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpies[0]);
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpies[1]);

      return mockApp.INTERNAL.getToken().then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpies[0]).to.have.been.calledOnce.and.calledWith(token.accessToken);
        expect(addAuthTokenListenerSpies[1]).to.have.been.calledOnce.and.calledWith(token.accessToken);

        mockApp.INTERNAL.removeAuthTokenListener(addAuthTokenListenerSpies[0]);

        this.clock.tick(1000);

        return mockApp.INTERNAL.getToken(true);
      }).then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpies[0]).to.have.been.calledOnce;
        expect(addAuthTokenListenerSpies[1]).to.have.been.calledTwice;
        expect(addAuthTokenListenerSpies[1].secondCall).to.have.been.calledWith(token.accessToken);
      });
    });
  });
});

/*!
 * @license
 * Copyright 2017 Google LLC
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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from '../utils';
import * as mocks from '../../resources/mocks';

import { GoogleOAuthAccessToken } from '../../../src/app/index';
import { ServiceAccountCredential } from '../../../src/app/credential-internal';
import { FirebaseApp, FirebaseAccessToken } from '../../../src/app/firebase-app';
import { AppStore, FIREBASE_CONFIG_VAR, initializeApp, defaultAppStore } from '../../../src/app/lifecycle';
import { FirebaseAppError, AppErrorCode } from '../../../src/app/error';


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

const ONE_HOUR_IN_SECONDS = 60 * 60;
const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

const deleteSpy = sinon.spy();

class TestService {
  public deleted = false;

  public delete(): Promise<void> {
    this.deleted = true;
    return Promise.resolve();
  }
}


describe('FirebaseApp', () => {
  let mockApp: FirebaseApp;
  let clock: sinon.SinonFakeTimers;
  let getTokenStub: sinon.SinonStub;
  let firebaseConfigVar: string | undefined;

  beforeEach(() => {
    getTokenStub = sinon.stub(ServiceAccountCredential.prototype, 'getAccessToken').resolves({
      access_token: 'mock-access-token',
      expires_in: 3600,
    });

    clock = sinon.useFakeTimers(1000);
    firebaseConfigVar = process.env[FIREBASE_CONFIG_VAR];
    delete process.env[FIREBASE_CONFIG_VAR];
    mockApp = new FirebaseApp(mocks.appOptions, mocks.appName);
  });

  afterEach(() => {
    getTokenStub.restore();
    clock.restore();
    if (firebaseConfigVar) {
      process.env[FIREBASE_CONFIG_VAR] = firebaseConfigVar;
    } else {
      delete process.env[FIREBASE_CONFIG_VAR];
    }

    deleteSpy.resetHistory();
    return defaultAppStore.clearAllApps();
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
      mockApp = new FirebaseApp(mocks.appOptions, newMockAppName);
      expect(mockApp.name).to.not.equal(mocks.appName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should respect leading and trailing whitespace', () => {
      const newMockAppName = '  ' + mocks.appName + '  ';
      mockApp = new FirebaseApp(mocks.appOptions, newMockAppName);
      expect(mockApp.name).to.not.equal(mocks.appName);
      expect(mockApp.name).to.equal(newMockAppName);
    });

    it('should be read-only', () => {
      expect(() => {
        (mockApp as any).name = 'foo';
      }).to.throw('Cannot set property name of #<FirebaseApp> which has only a getter');
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
      }).to.throw('Cannot set property options of #<FirebaseApp> which has only a getter');
    });

    it('should not return an object which can mutate the underlying options', () => {
      const original = _.clone(mockApp.options);
      (mockApp.options as any).foo = 'changed';
      expect(mockApp.options).to.deep.equal(original);
    });

    it('should ignore the config file when options is not null', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      const app = initializeApp(mocks.appOptionsNoDatabaseUrl, mocks.appName);
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.undefined;
    });

    it('should throw when the environment variable points to non existing file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/non_existant.json';
      try {
        initializeApp();
        expect.fail('Should have failed');
      } catch (err: any) {
        expect(err).to.be.instanceOf(FirebaseAppError);
        expect(err.message).to.match(/^Failed to parse app options file: /);
        expect(err.cause).to.have.property('code', 'ENOENT');
      }
    });

    it('should throw when the environment variable contains bad json', () => {
      process.env[FIREBASE_CONFIG_VAR] = '{,,';
      try {
        initializeApp();
        expect.fail('Should have failed');
      } catch (err: any) {
        expect(err).to.be.instanceOf(FirebaseAppError);
        expect(err.message).to.match(/^Failed to parse app options file: /);
        expect(err.cause).to.be.instanceOf(SyntaxError);
      }
    });

    it('should throw when the environment variable points to an empty file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_empty.json';
      try {
        initializeApp();
        expect.fail('Should have failed');
      } catch (err: any) {
        expect(err).to.be.instanceOf(FirebaseAppError);
        expect(err.message).to.match(/^Failed to parse app options file: /);
        expect(err.cause).to.be.instanceOf(SyntaxError);
      }
    });

    it('should throw when the environment variable points to bad json', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_bad.json';
      try {
        initializeApp();
        expect.fail('Should have failed');
      } catch (err: any) {
        expect(err).to.be.instanceOf(FirebaseAppError);
        expect(err.message).to.match(/^Failed to parse app options file: /);
        expect(err.cause).to.be.instanceOf(SyntaxError);
      }
    });

    it('should ignore a bad config key in the config file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_bad_key.json';
      const app = initializeApp();
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
      const app = initializeApp();
      expect(app.options.projectId).to.equal('hipster-chat-mock');
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.undefined;
      expect(app.options.storageBucket).to.undefined;
    });

    it('should not throw when the config file has a bad key and the config file is unused', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_bad_key.json';
      const app = initializeApp(mocks.appOptionsWithOverride, mocks.appName);
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
      const app = initializeApp(mocks.appOptionsWithOverride, mocks.appName);
      expect(app.options.projectId).to.equal('project_id');
      expect(app.options.databaseAuthVariableOverride).to.deep.equal({ 'some#string': 'some#val' });
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.storageBucket).to.equal('bucketName.appspot.com');
    });

    it('should use explicitly specified options when available and ignore the config file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      const app = initializeApp(mocks.appOptions, mocks.appName);
      expect(app.options.credential).to.be.instanceOf(ServiceAccountCredential);
      expect(app.options.databaseAuthVariableOverride).to.be.undefined;
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.equal('bucketName.appspot.com');
    });

    it('should not throw if some fields are missing', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config_partial.json';
      const app = initializeApp(mocks.appOptionsAuthDB, mocks.appName);
      expect(app.options.databaseURL).to.equal('https://databaseName.firebaseio.com');
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should not throw when the config environment variable is not set, and some options are present', () => {
      const app = initializeApp(mocks.appOptionsNoDatabaseUrl, mocks.appName);
      expect(app.options.credential).to.be.instanceOf(ServiceAccountCredential);
      expect(app.options.databaseURL).to.be.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should not throw if initializeApp invoked with the same options', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      expect(() => {
        const app = initializeApp(mocks.appOptionsWithoutCredential, mocks.appName);
        const app2 = initializeApp(mocks.appOptionsWithoutCredential, mocks.appName);
        expect(app2).to.equal(app);
      }).to.not.throw();
    });

    it('should init with application default creds when no options provided and env variable is not set', () => {
      const app = initializeApp();
      expect(app.options.credential).to.not.be.undefined;
      expect(app.options.databaseURL).to.be.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should init with application default creds when no options provided and env variable is an empty json', () => {
      process.env[FIREBASE_CONFIG_VAR] = '{}';
      const app = initializeApp();
      expect(app.options.credential).to.not.be.undefined;
      expect(app.options.databaseURL).to.be.undefined;
      expect(app.options.projectId).to.be.undefined;
      expect(app.options.storageBucket).to.be.undefined;
    });

    it('should init when no init arguments are provided and config var points to a file', () => {
      process.env[FIREBASE_CONFIG_VAR] = './test/resources/firebase_config.json';
      const app = initializeApp();
      expect(app.options.credential).to.not.be.undefined;
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
      const app = initializeApp();
      expect(app.options.credential).to.not.be.undefined;
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
      const store = new AppStore();
      const stub = sinon.stub(store, 'removeApp').resolves();
      const app = new FirebaseApp(mockApp.options, mockApp.name, /*autoInit=*/false, store);
      return app.delete().then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mocks.appName);
      });
    });

    it('should call delete() on each service\'s internals', () => {
      const app = initializeApp(mocks.appOptions, mocks.appName);
      const svc1 = new TestService();
      const svc2 = new TestService();
      (app as any).ensureService_(mocks.serviceName, () => svc1);
      (app as any).ensureService_(mocks.serviceName + '2', () => svc2);

      return (app as FirebaseApp).delete().then(() => {
        expect(svc1.deleted).to.be.true;
        expect(svc2.deleted).to.be.true;
      });
    });
  });



  describe('INTERNAL.getToken()', () => {

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

      const app = utils.createAppWithOptions({ credential });

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
        clock.tick(1000);
        return mockApp.INTERNAL.getToken().then((token2) => {
          expect(token1).to.deep.equal(token2);
          expect(getTokenStub).to.have.been.calledOnce;
        });
      });
    });

    it('returns a new token with force refresh', () => {
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        clock.tick(1000);
        return mockApp.INTERNAL.getToken(true).then((token2) => {
          expect(token1).to.not.deep.equal(token2);
          expect(getTokenStub).to.have.been.calledTwice;
        });
      });
    });

    it('proactively refreshes the token five minutes before it expires', () => {
      // Force a token refresh.
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        // Forward the clock to five minutes and one second before expiry.
        const expiryInMilliseconds = token1.expirationTime - Date.now();
        clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS) - 1000);

        return mockApp.INTERNAL.getToken().then((token2) => {
          // Ensure the token has not been proactively refreshed.
          expect(token1).to.deep.equal(token2);
          expect(getTokenStub).to.have.been.calledOnce;

          // Forward the clock to exactly five minutes before expiry.
          clock.tick(1000);

          return mockApp.INTERNAL.getToken().then((token3) => {
            // Ensure the token was proactively refreshed.
            expect(token1).to.not.deep.equal(token3);
            expect(getTokenStub).to.have.been.calledTwice;
          });
        });
      });
    });

    it('only refreshes the token once for concurrent calls', () => {
      const promise1 = mockApp.INTERNAL.getToken();
      const promise2 = mockApp.INTERNAL.getToken();
      expect(getTokenStub).to.have.been.calledOnce;
      return Promise.all([promise1, promise2]).then((tokens) => {
        expect(tokens[0]).to.equal(tokens[1]);
        expect(getTokenStub).to.have.been.calledOnce;
      })
    });

    it('Includes the original error in exception', async () => {
      getTokenStub.restore();
      const mockError = new FirebaseAppError({
        code: AppErrorCode.INVALID_CREDENTIAL,
        message: 'Something went wrong'
      });
      getTokenStub = sinon.stub(ServiceAccountCredential.prototype, 'getAccessToken').rejects(mockError);
      const detailedMessage = 'Credential implementation provided to initializeApp() via the "credential" property'
        + ' failed to fetch a valid Google OAuth2 access token with the following error: "Something went wrong".';
      
      try {
        await mockApp.INTERNAL.getToken(true);
        expect.fail('Should have failed');
      } catch (err: any) {
        expect(err.message).to.equal(detailedMessage);
        expect(err.cause).to.equal(mockError);
      }
    });

    it('Returns a detailed message when an error is due to an invalid_grant', async () => {
      getTokenStub.restore();
      const mockError = new FirebaseAppError({
        code: AppErrorCode.INVALID_CREDENTIAL,
        message: 'Failed to get credentials: invalid_grant (reason)'
      });
      getTokenStub = sinon.stub(ServiceAccountCredential.prototype, 'getAccessToken').rejects(mockError);
      const detailedMessage = 'Credential implementation provided to initializeApp() via the "credential" property'
        + ' failed to fetch a valid Google OAuth2 access token with the following error: "Failed to get credentials:'
        + ' invalid_grant (reason)". There are two likely causes: (1) your server time is not properly synced or (2)'
        + ' your certificate key file has been revoked. To solve (1), re-sync the time on your server. To solve (2),'
        + ' make sure the key ID for your key file is still present at '
        + 'https://console.firebase.google.com/iam-admin/serviceaccounts/project. If not, generate a new key file '
        + 'at https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk.';
      
      try {
        await mockApp.INTERNAL.getToken(true);
        expect.fail('Should have failed');
      } catch (err: any) {
        expect(err.message).to.equal(detailedMessage);
        expect(err.cause).to.equal(mockError);
      }
    });
  });

  describe('INTERNAL.addAuthTokenListener()', () => {
    let addAuthTokenListenerSpy: sinon.SinonSpy;

    before(() => {
      addAuthTokenListenerSpy = sinon.spy();
    });

    afterEach(() => {
      addAuthTokenListenerSpy.resetHistory();
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

        clock.tick(1000);

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
      addAuthTokenListenerSpies.forEach((spy) => spy.resetHistory());
    });

    it('removes the listener', () => {
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpies[0]);
      mockApp.INTERNAL.addAuthTokenListener(addAuthTokenListenerSpies[1]);

      return mockApp.INTERNAL.getToken().then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpies[0]).to.have.been.calledOnce.and.calledWith(token.accessToken);
        expect(addAuthTokenListenerSpies[1]).to.have.been.calledOnce.and.calledWith(token.accessToken);

        mockApp.INTERNAL.removeAuthTokenListener(addAuthTokenListenerSpies[0]);

        clock.tick(1000);

        return mockApp.INTERNAL.getToken(true);
      }).then((token: FirebaseAccessToken) => {
        expect(addAuthTokenListenerSpies[0]).to.have.been.calledOnce;
        expect(addAuthTokenListenerSpies[1]).to.have.been.calledTwice;
        expect(addAuthTokenListenerSpies[1].secondCall).to.have.been.calledWith(token.accessToken);
      });
    });
  });
});

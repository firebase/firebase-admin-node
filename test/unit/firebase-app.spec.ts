'use strict';

// Use untyped import syntax for Node built-ins
import https = require('https');

import {expect} from 'chai';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as utils from './utils';
import * as mocks from '../resources/mocks';

import {GoogleOAuthAccessToken} from '../../src/auth/credential';
import {FirebaseServiceInterface} from '../../src/firebase-service';
import {FirebaseApp, FirebaseAccessToken} from '../../src/firebase-app';
import {FirebaseNamespace, FirebaseNamespaceInternals} from '../../src/firebase-namespace';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const ONE_HOUR_IN_SECONDS = 60 * 60;
const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

const deleteSpy = sinon.spy();
function mockServiceFactory(app: FirebaseApp): FirebaseServiceInterface {
  return {
    app,
    INTERNAL: {
      delete: deleteSpy.bind(null, app.name),
    },
  } as FirebaseServiceInterface;
}


describe('FirebaseApp', () => {
  let mockApp: FirebaseApp;
  let mockedRequests: nock.Scope[] = [];
  let firebaseNamespace: FirebaseNamespace;
  let firebaseNamespaceInternals: FirebaseNamespaceInternals;

  beforeEach(() => {
    utils.mockFetchAccessTokenRequests();

    this.clock = sinon.useFakeTimers(1000);

    mockApp = mocks.app();

    firebaseNamespace = new FirebaseNamespace();
    firebaseNamespaceInternals = firebaseNamespace.INTERNAL;

    sinon.stub(firebaseNamespaceInternals, 'removeApp');
    mockApp = new FirebaseApp(mocks.appOptions, mocks.appName, firebaseNamespaceInternals);
  });

  afterEach(() => {
    this.clock.restore();

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
    let getTokenSpy: sinon.SinonSpy;
    let getTokenStub: sinon.SinonStub;

    beforeEach(() => {
      httpsSpy = sinon.spy(https, 'request');
    });

    afterEach(() => {
      httpsSpy.restore();
      if (typeof (mockApp.INTERNAL.getToken as any).restore === 'function') {
        (mockApp.INTERNAL.getToken as any).restore();
        getTokenSpy = undefined;
        getTokenStub = undefined;
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
        getTokenStub = sinon.stub(mockApp.INTERNAL, 'getToken');
        getTokenStub.returns(Promise.reject(new Error('Intentionally rejected')));

        // Forward the clock to exactly five minutes before expiry.
        const expiryInMilliseconds = token1.expirationTime - Date.now();
        this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS));

        // Forward the clock to exactly four minutes before expiry.
        this.clock.tick(60 * 1000);

        // Restore the stubbed getToken() method.
        getTokenStub.restore();

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

    // TODO(jwenger): I simply cannot get this test to pass although it should.
    xit('stops retrying to proactively refresh the token after five attempts', () => {
      // Force a token refresh.
      return mockApp.INTERNAL.getToken(true).then((token1) => {
        // Stub the getToken() method to return a rejected promise.
        getTokenStub = sinon.stub(mockApp.INTERNAL, 'getToken');
        getTokenStub.returns(Promise.reject(new Error('Intentionally rejected')));

        expect(getTokenStub.callCount).to.equal(0);

        // Forward the clock to exactly five minutes before expiry.
        const expiryInMilliseconds = token1.expirationTime - Date.now();
        this.clock.tick(expiryInMilliseconds - (5 * ONE_MINUTE_IN_MILLISECONDS));

        // Ensure the token was attempted to be proactively refreshed one time.
        expect(getTokenStub.callCount).to.equal(1);

        // Forward the clock to four minutes before expiry.
        this.clock.tick(ONE_MINUTE_IN_MILLISECONDS);

        // Ensure the token was attempted to be proactively refreshed two times.
        expect(getTokenStub.callCount).to.equal(2);

        // Forward the clock to expiry.
        this.clock.tick(4 * ONE_MINUTE_IN_MILLISECONDS);

        // Ensure the token was attempted to be proactively refreshed five times.
        expect(getTokenStub.callCount).to.equal(5);
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
        getTokenSpy = sinon.spy(mockApp.INTERNAL, 'getToken');

        // Move the clock forward to three minutes and one second before expiry.
        this.clock.tick(9 * 1000);

        // Ensure getToken() was not called.
        expect(getTokenSpy).to.not.have.been.called;

        // Move the clock forward to exactly three minutes before expiry.
        this.clock.tick(1000);

        // Ensure getToken() was called.
        expect(getTokenSpy).to.have.been.calledOnce.and.calledWith(true);

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
    let addAuthTokenListenerSpies: sinon.SinonSpy[] = [];

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

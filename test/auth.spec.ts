'use strict';

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import path = require('path');
import https = require('https');

import * as _ from 'lodash';
import {expect} from 'chai';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

import * as mocks from './resources/mocks';
import {FirebaseApp} from '../src/firebase-app';
import {FirebaseNamespace} from '../src/firebase-namespace';
import {Auth, FirebaseAccessToken} from '../src/auth/auth';
import {FirebaseTokenGenerator} from '../src/auth/token-generator';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

let TEST_CERTIFICATE_OBJECT;
try {
  const certPath = path.resolve(__dirname, 'resources/key.json');
  TEST_CERTIFICATE_OBJECT = JSON.parse(fs.readFileSync(certPath).toString());
} catch (error) {
  throw new Error('key.json not found. Have you added a key.json file to your resources yet?');
}

const ONE_HOUR_IN_SECONDS = 60 * 60;


/**
 * Returns a new FirebaseApp instance with the provided options.
 *
 * @param {Object} options The options for the FirebaseApp instance to create.
 * @return {FirebaseApp} A new FirebaseApp instance with the provided options.
 */
function createAppWithOptions(options: Object) {
  const mockAppName = 'mock-app-name';
  const mockFirebaseNamespaceInternals = new FirebaseNamespace().INTERNAL;
  return new FirebaseApp(options as FirebaseAppOptions, mockAppName, mockFirebaseNamespaceInternals);
}

/**
 * Returns a new Auth instance from a service account in object form.
 *
 * @return {Auth} A new Auth instance.
 */
function createAuthWithObject() {
  const app = createAppWithOptions({
    serviceAccount: {
      project_id: mocks.projectId,
      private_key: TEST_CERTIFICATE_OBJECT.private_key,
      client_email: TEST_CERTIFICATE_OBJECT.client_email,
    },
  });
  return new Auth(app);
}

/**
 * Returns a new Auth instance from a service account in path form.
 *
 * @return {Auth} A new Auth instance.
 */
function createAuthWithPath() {
  const app = createAppWithOptions({
    serviceAccount: path.resolve(__dirname, 'resources/key.json'),
  });
  return new Auth(app);
}

/**
 * Google OAuth returns the same access token if the expiration time didn't
 * change. Since expiration time has second resolution, we need to wait a
 * second until we are guaranteed to receive a new access token.
 */
function forceCompleteRefresh(auth): Promise<FirebaseAccessToken> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      auth.INTERNAL.getToken(true).then(resolve, reject);
    }, 1000);
  });
}

describe('Auth', () => {
  describe('Constructor', () => {
    it('should throw given no app', () => {
      expect(() => {
        // We must defeat the type system to successfully even compile this line.
        const authAny: any = Auth;
        return new authAny();
      }).to.throw('First parameter to Auth constructor must be an instance of firebase.App');
    });

    describe('with service account', () => {
      const invalidServiceAccounts = [null, NaN, 0, 1, true, false, '', 'a', [], {}, { a: 1 }, _.noop];
      invalidServiceAccounts.forEach((invalidServiceAccount) => {
        it('should throw given invalid service account: ' + JSON.stringify(invalidServiceAccount), () => {
          const app = createAppWithOptions({
            serviceAccount: invalidServiceAccount,
          });

          expect(() => {
            return new Auth(app);
          }).to.throw(Error);
        });
      });

      it('should throw if service account points to an invalid path', () => {
        const app = createAppWithOptions({
          serviceAccount: 'invalid-file',
        });

        expect(() => {
          return new Auth(app);
        }).to.throw('Failed to parse service account key file');
      });

      it('should throw if service account is an empty string', () => {
        const app = createAppWithOptions({
          serviceAccount: '',
        });

        expect(() => {
          return new Auth(app);
        }).to.throw('Failed to parse service account key file');
      });

      it('should throw if service account is does not contain a valid "client_email"', () => {
        let app = createAppWithOptions({
          serviceAccount: {
            client_email: '',
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
          },
        });

        expect(() => {
          return new Auth(app);
        }).to.throw('Service account key must contain a string "client_email" field');

        app = createAppWithOptions({
          serviceAccount: {
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
          },
        });

        expect(() => {
          return new Auth(app);
        }).to.throw('Service account key must contain a string "client_email" field');
      });

      it('should throw if service account is does not contain a valid "private_key"', () => {
        let app = createAppWithOptions({
          serviceAccount: {
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
            private_key: '',
          },
        });

        expect(() => {
          return new Auth(app);
        }).to.throw('Service account key must contain a string "private_key" field');

        app = createAppWithOptions({
          serviceAccount: {
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
          },
        });

        expect(() => {
          return new Auth(app);
        }).to.throw('Service account key must contain a string "private_key" field');
      });

      it('should not throw given a valid path to a service account', () => {
        const app = createAppWithOptions({
          serviceAccount: path.resolve(__dirname, 'resources/key.json'),
        });

        expect(() => {
          return new Auth(app);
        }).not.to.throw();
      });

      it('should not throw given a valid service account object', () => {
        const app = createAppWithOptions({
          serviceAccount: {
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
          },
        });

        expect(() => {
          return new Auth(app);
        }).not.to.throw();
      });

      it('should accept "clientEmail" in place of "client_email" for the service account', () => {
        const app = createAppWithOptions({
          serviceAccount: {
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
            clientEmail: TEST_CERTIFICATE_OBJECT.client_email,
          },
        });

        expect(() => {
          return new Auth(app);
        }).not.to.throw();
      });

      it('should accept "privateKey" in place of "private_key" for the service account', () => {
        const app = createAppWithOptions({
          serviceAccount: {
            privateKey: TEST_CERTIFICATE_OBJECT.private_key,
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
          },
        });

        expect(() => {
          return new Auth(app);
        }).not.to.throw();
      });

      it('should not mutate the provided service account object', () => {
        const serviceAccount = {
          privateKey: TEST_CERTIFICATE_OBJECT.private_key,
          clientEmail: TEST_CERTIFICATE_OBJECT.client_email,
        };
        const serviceAccountClone = _.clone(serviceAccount);

        const app = createAppWithOptions({
          serviceAccount,
        });

        expect(() => {
          return new Auth(app);
        }).not.to.throw();

        expect(serviceAccount).to.deep.equal(serviceAccountClone);
      });
    });
  });

  describe('without any authentication', () => {
    it('should be able to construct an app but not get a token', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const app = createAppWithOptions({});
      const auth = new Auth(app);

      return auth.INTERNAL.getToken().then((token) => {
        expect(token).to.be.null;
      });
    });
  });

  describe('with explicit credentials', () => {
    beforeEach(() => {
      this.clock = sinon.useFakeTimers(1000);
    });

    afterEach(() => {
      this.clock.restore();
    });

    it('should throw if credential is provided but does not conform to Credential', () => {
      let app = createAppWithOptions({
        credential: {} as any,
      });

      expect(() => {
        return new Auth(app);
      }).to.throw('Called firebase.initializeApp() with an invalid credential parameter');

      app = createAppWithOptions({
        credential: true as any,
      });

      expect(() => {
        return new Auth(app);
      }).to.throw('Called firebase.initializeApp() with an invalid credential parameter');
    });

    it('should cause getToken to cleanly fail if the custom credential returns invalid AccessTokens', () => {
      const credential = {
        getAccessToken: () => 5,
      };

      const app = createAppWithOptions({
        credential: credential as any,
      });

      const auth = new Auth(app);

      return auth.INTERNAL.getToken().then(() => {
        throw new Error('Unexpected success');
      }, (err) => {
        expect(err.toString()).to.include('firebase.initializeApp was called with a credential ' +
        'that creates invalid access tokens');
      });
    });

    it('should accept a well-formed custom credential implementation', () => {
      const oracle = {
        access_token: 'This is a custom token',
        expires_in: ONE_HOUR_IN_SECONDS,
      };
      const credential = {
        getAccessToken: () => Promise.resolve(oracle),
      };

      const app = createAppWithOptions({
        credential,
      });

      const auth = new Auth(app);

      return auth.INTERNAL.getToken().then((token) => {
        expect(token.accessToken).to.equal(oracle.access_token);
        expect(+token.expirationTime).to.equal((ONE_HOUR_IN_SECONDS + 1) * 1000);
      });
    });
  });

  describe('app', () => {
    const app = createAppWithOptions({
      serviceAccount: path.resolve(__dirname, 'resources/key.json'),
    });

    it('returns the app from the constructor', () => {
      const auth = new Auth(app);
      // We expect referential equality here
      expect(auth.app).to.equal(app);
    });

    it('is read-only', () => {
      const auth = new Auth(app);
      expect(() => {
        auth.app = app as FirebaseApp;
      }).to.throw('Cannot set property app of #<Auth> which has only a getter');
    });
  });

  describe('createCustomToken()', () => {
    let stub: Sinon.SinonStub;
    beforeEach(() => {
      stub = sinon.stub(FirebaseTokenGenerator.prototype, 'createCustomToken', _.noop);
    });

    afterEach(() => {
      stub.restore();
    });

    it('should throw if service account is not specified (and env not set)', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const app = createAppWithOptions({});
      const auth = new Auth(app);
      expect(() => {
        auth.createCustomToken(mocks.uid, mocks.developerClaims);
      }).to.throw('Must initialize FirebaseApp with a service account to call auth().createCustomToken()');
    });

    it('should forward on the call to the token generator\'s createCustomToken() method', () => {
      const auth = createAuthWithObject();
      auth.createCustomToken(mocks.uid, mocks.developerClaims);
      expect(FirebaseTokenGenerator.prototype.createCustomToken)
        .to.have.been.calledOnce
        .and.calledWith(mocks.uid, mocks.developerClaims);
    });
  });

  describe('verifyIdToken()', () => {
    let stub: Sinon.SinonStub;
    beforeEach(() => stub = sinon.stub(FirebaseTokenGenerator.prototype, 'verifyIdToken').returns(Promise.resolve()));
    afterEach(() => stub.restore());

    it('should throw if service account is not specified (and env not set)', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const app = createAppWithOptions({});
      const auth = new Auth(app);
      const mockIdToken = mocks.generateIdToken();
      expect(() => {
        auth.verifyIdToken(mockIdToken);
      }).to.throw('Must initialize FirebaseApp with a service account to call auth().verifyIdToken()');
    });

    it('should forward on the call to the token generator\'s verifyIdToken() method', () => {
      const auth = createAuthWithObject();
      const mockIdToken = mocks.generateIdToken();
      return auth.verifyIdToken(mockIdToken).then(() => {
        expect(stub).to.have.been.calledOnce.and.calledWith(mockIdToken);
      });
    });
  });

  describe('INTERNAL.delete()', () => {
    it('should delete auth instance', () => {
      const auth = createAuthWithObject();
      auth.INTERNAL.delete().should.eventually.be.fulfilled;
    });
  });

  describe('INTERNAL.getToken()', () => {
    let spy: Sinon.SinonSpy;
    beforeEach(() => spy = sinon.spy(https, 'request'));
    afterEach(() => spy.restore());

    it('returns a valid token with options object', () => {
      return createAuthWithObject().INTERNAL.getToken().then((token) => {
        expect(token.accessToken).to.be.a('string').and.to.not.be.empty;
      });
    });

    it('returns a valid token with options path', () => {
      return createAuthWithPath().INTERNAL.getToken().then((token) => {
        expect(token.accessToken).to.be.a('string').and.to.not.be.empty;
      });
    });

    it('returns the cached token', () => {
      const auth = createAuthWithPath();
      return auth.INTERNAL.getToken().then((token1) => {
        return auth.INTERNAL.getToken().then((token2) => {
          expect(token1.accessToken).to.equal(token2.accessToken);
          expect(https.request).to.have.been.calledOnce;
        });
      });
    });

    it('returns a new token with force refresh', () => {
      const auth = createAuthWithPath();
      return auth.INTERNAL.getToken()
        .then((token1) => {
          return forceCompleteRefresh(auth).then((token2) => {
            expect(token1.accessToken).to.not.equal(token2.accessToken);
            expect(https.request).to.have.been.calledTwice;
          });
        });
    });
  });

  describe('INTERNAL.addAuthTokenListener()', () => {
    it('does not fire if there is no cached token', () => {
      const events = [];
      const auth = createAuthWithPath();
      auth.INTERNAL.addAuthTokenListener(events.push.bind(events));
      expect(events).to.be.empty;
    });

    it('is notified when the token changes', () => {
      const events = [];
      const auth = createAuthWithPath();
      auth.INTERNAL.addAuthTokenListener(events.push.bind(events));
      return auth.INTERNAL.getToken().then((token) => {
        expect(events).to.deep.equal([token.accessToken]);
      });
    });

    it('can be called twice', () => {
      const events1 = [];
      const events2 = [];
      const auth = createAuthWithPath();
      auth.INTERNAL.addAuthTokenListener(events1.push.bind(events1));
      auth.INTERNAL.addAuthTokenListener(events2.push.bind(events2));
      return auth.INTERNAL.getToken().then((token) => {
        expect(events1).to.deep.equal([token.accessToken]);
        expect(events2).to.deep.equal([token.accessToken]);
      });
    });

    it('will be called on token refresh', () => {
      const events = [];
      const auth = createAuthWithPath();
      auth.INTERNAL.addAuthTokenListener(events.push.bind(events));
      return auth.INTERNAL.getToken().then((token) => {
        expect(events).to.deep.equal([token.accessToken]);
        return forceCompleteRefresh(auth).then((newToken) => {
          expect(events).to.deep.equal([token.accessToken, newToken.accessToken]);
        });
      });
    });

    it('will fire with the initial token if it exists', () => {
      const auth = createAuthWithPath();
      return auth.INTERNAL.getToken().then(() => {
        return new Promise((resolve) => {
          auth.INTERNAL.addAuthTokenListener(resolve);
        });
      }).should.eventually.be.fulfilled.and.not.be.empty;
    });
  });

  describe('INTERNAL.removeTokenListener()', () => {
    it('removes the listener', () => {
      const events1 = [];
      const events2 = [];
      const auth = createAuthWithPath();
      const listener1 = (token) => { events1.push(token); };
      const listener2 = (token) => { events2.push(token); };
      auth.INTERNAL.addAuthTokenListener(listener1);
      auth.INTERNAL.addAuthTokenListener(listener2);
      return auth.INTERNAL.getToken().then((token) => {
        expect(events1).to.deep.equal([token.accessToken]);
        expect(events2).to.deep.equal([token.accessToken]);
        auth.INTERNAL.removeAuthTokenListener(listener1);
        return forceCompleteRefresh(auth).then((newToken) => {
          expect(events1).to.deep.equal([token.accessToken]);
          expect(events2).to.deep.equal([token.accessToken, newToken.accessToken]);
        });
      });
    });
  });
});
